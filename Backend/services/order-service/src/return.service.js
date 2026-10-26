import { randomUUID } from 'node:crypto';
import { OrderError } from './service.js';
import { normalizeImage } from '../../../packages/contracts/image-validation.js';
import { scanWithClamAv } from '../../identity-service/src/services/clam-scanner.service.js';
import { requireCasePermission, caseError, caseAudit } from './case-contract.js';

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fail=(status,code,message)=>new OrderError(status,code,message);
const validText=(value,min,max)=>typeof value==='string'&&value.trim().length>=min&&
  value.trim().length<=max&&!/<[^>]*>|https?:\/\/|\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b|(?:\+?\d[\s().-]*){9,}/i.test(value);
export function proratedRefund(lineTotal,ordered,quantity,usedQuantity=0,usedAmount=0){
  if(![lineTotal,ordered,quantity,usedQuantity,usedAmount].every(Number.isSafeInteger)||
    lineTotal<0||ordered<1||quantity<1||usedQuantity<0||usedQuantity+quantity>ordered||usedAmount<0||usedAmount>lineTotal)
    throw fail(400,'INVALID_QUANTITY','Số lượng trả không hợp lệ.');
  return usedQuantity+quantity===ordered ? lineTotal-usedAmount : Number(BigInt(lineTotal)*BigInt(quantity)/BigInt(ordered));
}
export function validateReturnInput(input){
  if(!input||!validText(input.reason,10,1000)||
    !['DAMAGED','WRONG_ITEM','NOT_AS_DESCRIBED','OTHER'].includes(input.reasonCode)||input.resolution!=='REFUND'||
    !Array.isArray(input.items)||input.items.length<1||input.items.length>30||
    input.items.some(item=>!item||!uuid.test(String(item.orderItemId))||!Number.isSafeInteger(item.quantity)||item.quantity<1)||
    new Set(input.items.map(item=>item.orderItemId)).size!==input.items.length)
    throw fail(400,'INVALID_RETURN','Yêu cầu trả hàng không hợp lệ.');
  return {reason:input.reason.trim(),reasonCode:input.reasonCode,resolution:'REFUND',
    items:input.items.map(item=>({orderItemId:item.orderItemId,quantity:item.quantity})).sort((a,b)=>a.orderItemId.localeCompare(b.orderItemId))};
}
export class ReturnService {
  constructor(order,options={}){this.order=order;this.pool=order.pool;
    this.paymentUrl=options.paymentUrl||'http://127.0.0.1:5104';this.paymentToken=options.paymentToken||'';
    this.scanner=options.scanner||null;}
  dto(row){return {id:row.id,shopOrderId:row.shop_order_id,buyerId:row.buyer_id,storeId:row.store_id,
    reason:row.reason,reasonCode:row.reason_code,resolution:row.resolution,status:row.status,version:row.version,
    sellerResponse:row.seller_response,adminResponse:row.admin_response || null,eligibleRefundMinor:Number(row.eligible_refund_minor),
    shippingRefundMinor:Number(row.shipping_refund_minor),requestedAt:row.requested_at,
    policyVersion:row.policy_version,windowDays:row.window_days,deliveredAt:row.delivered_at_snapshot,
    exceptionId:row.exception_id||null,updatedAt:row.updated_at};}
  async create(buyerId,shopOrderId,input,exceptionContext=null){
    if(!uuid.test(String(shopOrderId))) throw fail(400,'INVALID_RETURN','Yêu cầu trả hàng không hợp lệ.');
    input=validateReturnInput(input);
    const db=await this.pool.connect();try{await db.query('BEGIN');
      const order=(await db.query('SELECT * FROM order_service.orders WHERE id=$1 AND user_id=$2 FOR UPDATE',
        [shopOrderId,buyerId])).rows[0];
      if(!order) throw fail(404,'ORDER_NOT_FOUND','Không tìm thấy đơn hàng.');
      if(!['DELIVERED','COMPLETED'].includes(order.status))
        throw fail(409,'RETURN_NOT_ELIGIBLE','Đơn chưa giao hoặc đã hủy.');
      const delivered=(await db.query(`SELECT min(occurred_at) AS occurred_at FROM order_service.order_status_history
        WHERE shop_order_id=$1 AND to_status='DELIVERED'`,[shopOrderId])).rows[0];
      if(!delivered?.occurred_at || new Date(delivered.occurred_at).getTime()>Date.now())
        throw fail(409,'RETURN_NOT_ELIGIBLE','Chưa có mốc giao hàng hợp lệ.');
      const policy=(await db.query(`SELECT * FROM order_service.return_policies WHERE effective_at<=$1
        ORDER BY effective_at DESC LIMIT 1`,[delivered.occurred_at])).rows[0];
      if(!policy) throw fail(409,'RETURN_POLICY_MISSING','Chưa có chính sách áp dụng cho thời điểm giao hàng.');
      const expired=Date.now()-new Date(delivered.occurred_at).getTime()>policy.window_days*86400000;
      if(expired&&!exceptionContext) throw fail(409,'RETURN_WINDOW_CLOSED',`Đã quá ${policy.window_days} ngày từ khi giao hàng.`);
      if(exceptionContext){
        const exception=(await db.query('SELECT * FROM order_service.return_exceptions WHERE id=$1 FOR UPDATE',[exceptionContext.id])).rows[0];
        await requireCasePermission(db,exceptionContext.actorId,'exception.approve');
        if(!expired||!exception||exception.status!=='REQUESTED'||exception.version!==exceptionContext.version||
          exception.shop_order_id!==shopOrderId||exception.buyer_id!==buyerId||exception.requested_by===exceptionContext.actorId||
          buyerId===exceptionContext.actorId||JSON.stringify(validateReturnInput(exception.request_payload))!==JSON.stringify(input))
          throw caseError(409,'INVALID_RETURN_EXCEPTION','Ngoại lệ không hợp lệ, đã được xử lý hoặc người duyệt không độc lập.');
        await requireCasePermission(db,exception.requested_by,'exception.request');
        if(exception.policy_version!==policy.id||new Date(exception.delivered_at_snapshot).getTime()!==new Date(delivered.occurred_at).getTime())
          throw caseError(409,'EXCEPTION_POLICY_CHANGED','Mốc giao hàng hoặc chính sách đã thay đổi; cần lập đề nghị mới.');
      }
      const ordered=(await db.query('SELECT * FROM order_service.order_items WHERE order_id=$1 FOR UPDATE',[shopOrderId])).rows;
      const previous=(await db.query(`SELECT ri.order_item_id,sum(ri.quantity)::int AS used_quantity,
        sum(ri.eligible_refund_minor)::bigint AS used_amount FROM order_service.return_items ri
        JOIN order_service.return_requests r ON r.id=ri.request_id
        WHERE r.shop_order_id=$1 AND r.status<>'REJECTED' AND r.reservation_released_at IS NULL GROUP BY ri.order_item_id`,[shopOrderId])).rows;
      const used=new Map(previous.map(row=>[row.order_item_id,row]));
      let amount=0,returnedAllInThisRequest=true;
      const lines=input.items.map(requested=>{
        const item=ordered.find(row=>row.id===requested.orderItemId);
        if(!item) throw fail(400,'ITEM_NOT_IN_ORDER','Sản phẩm không thuộc đơn hàng.');
        const prior=used.get(item.id),usedQuantity=prior?.used_quantity||0,usedAmount=Number(prior?.used_amount||0);
        const refund=proratedRefund(Number(item.line_total_minor),item.quantity,requested.quantity,usedQuantity,usedAmount);
        amount+=refund;return {id:item.id,quantity:requested.quantity,refund};
      });
      for(const item of ordered){
        const prior=used.get(item.id),line=lines.find(row=>row.id===item.id);
        if((prior?.used_quantity||0)>0||line?.quantity!==item.quantity) returnedAllInThisRequest=false;
      }
      const priorShipping=(await db.query(`SELECT coalesce(sum(shipping_refund_minor),0)::bigint AS used
        FROM order_service.return_requests WHERE shop_order_id=$1 AND status<>'REJECTED' AND reservation_released_at IS NULL`,[shopOrderId])).rows[0].used;
      const shipping=returnedAllInThisRequest&&['DAMAGED','WRONG_ITEM'].includes(input.reasonCode)&&Number(priorShipping)===0
        ? Number(order.shipping_estimate_minor):0;
      amount+=shipping;
      const budget=(await db.query(`SELECT
        coalesce(sum(eligible_refund_minor) FILTER(WHERE refund_confirmed_at IS NULL AND status<>'REFUNDED'),0) AS held,
        coalesce(sum(eligible_refund_minor) FILTER(WHERE refund_confirmed_at IS NOT NULL OR status='REFUNDED'),0) AS confirmed
        FROM order_service.return_requests WHERE shop_order_id=$1 AND status<>'REJECTED' AND reservation_released_at IS NULL`,[shopOrderId])).rows[0];
      if(!Number.isSafeInteger(amount)||amount<1||amount+Number(budget.held)+Math.max(Number(budget.confirmed),Number(order.refunded_minor||0))>Number(order.payable_total_minor))
        throw fail(409,'REFUND_LIMIT','Số tiền hoàn vượt giá trị đơn.');
      const row=(await db.query(`INSERT INTO order_service.return_requests
        (shop_order_id,buyer_id,store_id,reason,reason_code,resolution,eligible_refund_minor,shipping_refund_minor,
          policy_version,window_days,delivered_at_snapshot,exception_id)
        VALUES ($1,$2,$3,$4,$5,'REFUND',$6,$7,$8,$9,$10,$11) RETURNING *`,
        [shopOrderId,buyerId,order.store_id,input.reason,input.reasonCode,amount,shipping,
          policy.id,policy.window_days,delivered.occurred_at,exceptionContext?.id||null])).rows[0];
      for(const line of lines) await db.query(`INSERT INTO order_service.return_items
        (request_id,order_item_id,quantity,eligible_refund_minor) VALUES ($1,$2,$3,$4)`,
        [row.id,line.id,line.quantity,line.refund]);
      await this.history(db,row.id,null,'REQUESTED',exceptionContext?.actorId||buyerId,exceptionContext?'platform_admin':'buyer',input.reason);
      if(exceptionContext){
        await db.query(`UPDATE order_service.return_exceptions SET status='CONSUMED',approved_by=$2,decision_reason=$3,
          result_return_id=$4,version=version+1,decided_at=now() WHERE id=$1`,[exceptionContext.id,exceptionContext.actorId,exceptionContext.reason,row.id]);
        await db.query('UPDATE order_service.admin_cases SET assignee_id=$2 WHERE id=$1',[row.id,exceptionContext.actorId]);
        await db.query(`INSERT INTO order_service.return_exception_actions(exception_id,actor_id,action,reason,read_version,result_version,next_status)
          VALUES($1,$2,'approved',$3,$4,$5,'CONSUMED')`,[exceptionContext.id,exceptionContext.actorId,exceptionContext.reason,exceptionContext.version,exceptionContext.version+1]);
        await caseAudit(db,row.id,{id:exceptionContext.actorId},'exception_approved',exceptionContext.reason,{exceptionId:exceptionContext.id});
      }
      await db.query(`INSERT INTO order_service.order_outbox(event_type,aggregate_id,payload)
        VALUES ('ReturnRequested.v1',$1,$2)`,[shopOrderId,{returnId:row.id,
          shopOrderId,groupId:order.group_id,buyerId,storeId:order.store_id}]);
      await db.query('COMMIT');return {returnRequest:this.dto(row)};
    }catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();}
  }
  async history(db,id,from,to,actorId,actorType,note=''){
    await db.query(`INSERT INTO order_service.return_history
      (request_id,from_status,to_status,actor_id,actor_type,note) VALUES ($1,$2,$3,$4,$5,$6)`,
      [id,from,to,actorId,actorType,note]);
  }
  async authorized(userId,id){
    if(!uuid.test(String(id))) throw fail(404,'RETURN_NOT_FOUND','Không tìm thấy yêu cầu.');
    const row=(await this.pool.query('SELECT * FROM order_service.return_requests WHERE id=$1',[id])).rows[0];
    if(!row) throw fail(404,'RETURN_NOT_FOUND','Không tìm thấy yêu cầu.');
    if(row.buyer_id!==userId) await this.order.inventory('/stores/'+row.store_id+'/membership?userId='+
      encodeURIComponent(userId));
    return row;
  }
  async detail(userId,id){
    const row=await this.authorized(userId,id);
    const [items,evidence,history]=await Promise.all([
      this.pool.query(`SELECT ri.order_item_id,ri.quantity,ri.eligible_refund_minor,i.product_name
        FROM order_service.return_items ri JOIN order_service.order_items i ON i.id=ri.order_item_id
        WHERE ri.request_id=$1`,[id]),
      this.pool.query('SELECT id,actor_id,created_at FROM order_service.return_evidence WHERE request_id=$1 ORDER BY created_at',[id]),
      this.pool.query('SELECT from_status,to_status,actor_type,note,created_at FROM order_service.return_history WHERE request_id=$1 ORDER BY id',[id])]);
    return {returnRequest:{...this.dto(row),items:items.rows.map(item=>({orderItemId:item.order_item_id,
      name:item.product_name,quantity:item.quantity,eligibleRefundMinor:Number(item.eligible_refund_minor)})),
      evidence:evidence.rows.map(image=>({id:image.id,actorId:image.actor_id,
        url:`/api/v2/returns/${id}/evidence/${image.id}`,createdAt:image.created_at})),
      history:history.rows.map(event=>({fromStatus:event.from_status,toStatus:event.to_status,
        actorType:event.actor_type,note:event.note,createdAt:event.created_at}))}};
  }
  async buyerList(userId,shopOrderId=null){
    if(shopOrderId&&!uuid.test(String(shopOrderId))) throw fail(400,'INVALID_ORDER','Đơn hàng không hợp lệ.');
    const rows=(await this.pool.query(`SELECT * FROM order_service.return_requests
    WHERE buyer_id=$1 AND ($2::uuid IS NULL OR shop_order_id=$2)
    ORDER BY requested_at DESC LIMIT 100`,[userId,shopOrderId])).rows;
    return {returns:rows.map(row=>this.dto(row))};}
  async sellerList(userId,storeId,shopOrderId=null){
    if(!uuid.test(String(storeId))) throw fail(404,'STORE_NOT_FOUND','Không tìm thấy shop.');
    if(shopOrderId&&!uuid.test(String(shopOrderId))) throw fail(400,'INVALID_ORDER','Đơn hàng không hợp lệ.');
    await this.order.inventory('/stores/'+storeId+'/membership?userId='+encodeURIComponent(userId));
    const rows=(await this.pool.query(`SELECT * FROM order_service.return_requests
      WHERE store_id=$1 AND ($2::uuid IS NULL OR shop_order_id=$2)
      ORDER BY requested_at DESC LIMIT 100`,[storeId,shopOrderId])).rows;
    return {returns:rows.map(row=>this.dto(row))};
  }
  async transition(userId,id,action,input={}){
    const row=await this.authorized(userId,id);
    const seller=row.buyer_id!==userId;
    const rules={review:{from:'REQUESTED',to:'UNDER_REVIEW',seller:true},
      approve:{from:'UNDER_REVIEW',to:'APPROVED',seller:true},
      reject:{from:'UNDER_REVIEW',to:'REJECTED',seller:true},
      ship:{from:'APPROVED',to:'RETURNING',seller:false},
      receive:{from:'RETURNING',to:'RECEIVED',seller:true},
      close:{from:['REFUNDED','REJECTED'],to:'CLOSED',seller:false}};
    const rule=rules[action];
    if(!rule||rule.seller!==seller||!Number.isInteger(input.expectedVersion)||input.expectedVersion<1||
      ((action==='reject'||action==='approve')&&!validText(input.response,10,1000)))
      throw fail(400,'INVALID_RETURN_COMMAND','Thao tác trả hàng không hợp lệ.');
    if(action==='receive'&&input.inspectionCondition&&!['ACCEPTED','ISSUE_FOUND'].includes(input.inspectionCondition))throw fail(400,'INVALID_INSPECTION','Kết quả kiểm tra không hợp lệ.');
    if(action==='receive'&&input.inspectionNote&&!validText(input.inspectionNote,10,1000))throw fail(400,'INVALID_INSPECTION','Ghi chú kiểm tra phải có 10–1000 ký tự hợp lệ.');
    const db=await this.pool.connect();try{await db.query('BEGIN');
      const current=(await db.query('SELECT * FROM order_service.return_requests WHERE id=$1 FOR UPDATE',[id])).rows[0];
      if(!(Array.isArray(rule.from)?rule.from.includes(current.status):current.status===rule.from)||
        current.version!==input.expectedVersion)
        throw fail(409,'RETURN_STATE_CHANGED','Trạng thái yêu cầu đã thay đổi.');
      if(action==='close'&&((await db.query("SELECT 1 FROM order_service.case_decisions WHERE case_id=$1 AND status='PUBLISHED' AND appeal_until>now()",[id])).rowCount||
        (await db.query("SELECT 1 FROM order_service.case_appeals WHERE case_id=$1 AND status IN ('SUBMITTED','UNDER_REVIEW')",[id])).rowCount))throw fail(409,'APPEAL_WINDOW_ACTIVE','Chưa hết hạn hoặc đang có kháng nghị cần xử lý.');
      const updated=(await db.query(`UPDATE order_service.return_requests SET status=$2,version=version+1,
        seller_response=COALESCE($3,seller_response),
        reservation_released_at=CASE WHEN $2='REJECTED' THEN now() ELSE reservation_released_at END,
        ship_by=CASE WHEN $2='APPROVED' THEN now()+interval '7 days' ELSE ship_by END,
        seller_receive_by=CASE WHEN $2='RETURNING' THEN now()+interval '72 hours' ELSE seller_receive_by END,
        updated_at=now() WHERE id=$1 RETURNING *`,
        [id,rule.to,input.response?.trim()||null])).rows[0];
      await this.history(db,id,current.status,rule.to,userId,seller?'seller':'buyer',input.response?.trim()||'');
      if(rule.to==='APPROVED') await db.query(`INSERT INTO order_service.order_outbox(event_type,aggregate_id,payload)
        VALUES ('ReturnApproved.v1',$1,$2)`,[current.shop_order_id,{returnId:id,shopOrderId:current.shop_order_id}]);
      if(rule.to==='RECEIVED'){
        await db.query(`INSERT INTO order_service.return_inspections(request_id,actor_id,actor_type,condition,note)
          VALUES($1,$2,'SELLER',$3,$4)`,[id,userId,input.inspectionCondition||'ACCEPTED',input.inspectionNote?.trim()||'Seller xác nhận đã nhận và kiểm tra theo lệnh nhận hàng.']);
      }
      if(rule.to==='RECEIVED'&&(!input.inspectionCondition||input.inspectionCondition==='ACCEPTED')){
        await db.query(`UPDATE order_service.return_requests SET status='REFUND_PENDING',version=version+1,
          updated_at=now() WHERE id=$1`,[id]);
        await this.history(db,id,'RECEIVED','REFUND_PENDING',null,'system','Awaiting verified refund');
        await db.query(`INSERT INTO order_service.order_outbox(event_type,aggregate_id,payload)
          VALUES ('RefundRequested.v1',$1,$2)`,[current.shop_order_id,
            {returnId:id,shopOrderId:current.shop_order_id,amountMinor:Number(current.eligible_refund_minor)}]);
      }
      await db.query('COMMIT');
      if(rule.to==='RECEIVED'&&(!input.inspectionCondition||input.inspectionCondition==='ACCEPTED')) await this.triggerRefund(id).catch(error=>
        console.error('Return refund pending retry:'));
      return this.detail(userId,id);
    }catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();}
  }
  async triggerRefund(id){
    const row=(await this.pool.query(`SELECT r.*,o.group_id,o.payment_method,o.payment_status
      FROM order_service.return_requests r JOIN order_service.orders o ON o.id=r.shop_order_id
      WHERE r.id=$1 AND r.status='REFUND_PENDING' AND (SELECT condition FROM order_service.return_inspections i
        WHERE i.request_id=r.id ORDER BY created_at DESC,id DESC LIMIT 1)='ACCEPTED'`,[id])).rows[0];
    if(!row||row.payment_method==='COD'||row.payment_status!=='PAID'||!this.paymentToken||
      row.refund_attempts>=3) return;
    if(row.payment_method==='MOMO'&&Number(row.eligible_refund_minor)<1000){
      await this.pool.query(`UPDATE order_service.return_requests SET refund_attempts=3,
        last_refund_error='Provider minimum; manual refund required' WHERE id=$1`,[id]);
      return;
    }
    const response=await fetch(new URL('/api/v2/internal/refunds',this.paymentUrl),{
      method:'POST',headers:{'Content-Type':'application/json','X-Payment-Internal-Token':this.paymentToken},
      body:JSON.stringify({groupId:row.group_id,shopOrderId:row.shop_order_id,
        amountMinor:Number(row.eligible_refund_minor),reason:'Return '+id,returnRequestId:id,
        idempotencyKey:`return:${id}:${row.refund_attempts}`}),
      signal:AbortSignal.timeout(5000)});
    const result=await response.json().catch(()=>({}));
    if(!response.ok) throw fail(503,'REFUND_UNAVAILABLE',result.message||'Chưa thể gửi yêu cầu hoàn tiền.');
    if(result.refund?.id) await this.pool.query(`UPDATE order_service.return_requests
      SET refund_reference=$2,last_refund_error=$3,
      refund_attempts=refund_attempts+$4 WHERE id=$1 AND status='REFUND_PENDING'
      AND refund_reference IS DISTINCT FROM $2`,
      [id,result.refund.id,result.refund.status==='FAILED'?'Provider refund failed':null,
        result.refund.status==='FAILED'?1:0]);
    if(result.refund?.status==='SUCCEEDED') await this.markRefunded(id);
  }
  async refundContext(id){
    if(!uuid.test(String(id))) throw fail(404,'RETURN_NOT_FOUND','Không tìm thấy yêu cầu.');
    const row=(await this.pool.query(`SELECT r.id,r.shop_order_id,r.status,r.eligible_refund_minor,o.group_id,
      ((SELECT condition FROM order_service.return_inspections i WHERE i.request_id=r.id ORDER BY created_at DESC,id DESC LIMIT 1)='ACCEPTED') AS receipt_verified
      FROM order_service.return_requests r JOIN order_service.orders o ON o.id=r.shop_order_id
      WHERE r.id=$1`,[id])).rows[0];
    if(!row) throw fail(404,'RETURN_NOT_FOUND','Không tìm thấy yêu cầu.');
    if(row.status==='REFUND_PENDING'&&!row.receipt_verified)throw fail(409,'REFUND_NOT_READY','Chưa xác minh nhận hàng/kiểm tra chấp nhận.');
    return {id:row.id,shopOrderId:row.shop_order_id,groupId:row.group_id,status:row.status,
      amountMinor:Number(row.eligible_refund_minor)};
  }
  async markRefunded(id){
    const db=await this.pool.connect();try{await db.query('BEGIN');
      const row=(await db.query('SELECT status FROM order_service.return_requests WHERE id=$1 FOR UPDATE',[id])).rows[0];
      if(row?.status==='REFUND_PENDING'){
        await db.query("UPDATE order_service.return_requests SET status='REFUNDED',refund_confirmed_at=now(),version=version+1,updated_at=now() WHERE id=$1",[id]);
        await this.history(db,id,'REFUND_PENDING','REFUNDED',null,'payment','Verified refund');
      }
      await db.query('COMMIT');
    }catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();}
  }
  async reconcile(){
    const rows=(await this.pool.query(`SELECT r.id FROM order_service.return_requests r
      JOIN order_service.orders o ON o.id=r.shop_order_id
      WHERE r.status='REFUND_PENDING' AND r.refund_attempts<3 AND o.payment_method<>'COD'
      ORDER BY r.updated_at LIMIT 20`)).rows;
    for(const row of rows) await this.triggerRefund(row.id).catch(error=>
      console.error('Return refund reconciliation failed:'));
    return {checked:rows.length};
  }
  async uploadEvidence(userId,id,buffer,mime){
    await this.authorized(userId,id);
    const processed=await normalizeImage(buffer,mime);
    if(!processed) throw fail(415,'INVALID_IMAGE','Ảnh JPEG, PNG hoặc WebP tối đa 2 MB.');
    if(!this.scanner) throw fail(503,'SCANNER_UNAVAILABLE','Bộ quét ảnh chưa sẵn sàng.');
    await this.scanner(buffer);
    const db=await this.pool.connect();try{await db.query('BEGIN');
      await db.query('SELECT id FROM order_service.return_requests WHERE id=$1 FOR UPDATE',[id]);
      const state=(await db.query('SELECT status FROM order_service.return_requests WHERE id=$1',[id])).rows[0];
      if(!state||['REJECTED','REFUNDED','CLOSED'].includes(state.status))
        throw fail(409,'EVIDENCE_CLOSED','Không thể thêm chứng cứ sau khi yêu cầu kết thúc.');
      const count=(await db.query('SELECT count(*)::int AS total FROM order_service.return_evidence WHERE request_id=$1',[id])).rows[0].total;
      if(count>=6) throw fail(409,'EVIDENCE_LIMIT','Tối đa 6 ảnh chứng cứ.');
      const row=(await db.query(`INSERT INTO order_service.return_evidence
        (request_id,actor_id,object_key,mime_type,data) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
        [id,userId,`return/${id}/${randomUUID()}`,'image/webp',processed])).rows[0];
      await db.query('COMMIT');return {evidence:{id:row.id,url:`/api/v2/returns/${id}/evidence/${row.id}`}};
    }catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();}
  }
  async evidence(userId,id,imageId){
    await this.authorized(userId,id);
    if(!uuid.test(String(imageId))) throw fail(404,'EVIDENCE_NOT_FOUND','Không tìm thấy ảnh.');
    const row=(await this.pool.query(`SELECT mime_type,data FROM order_service.return_evidence
      WHERE id=$1 AND request_id=$2`,[imageId,id])).rows[0];
    if(!row) throw fail(404,'EVIDENCE_NOT_FOUND','Không tìm thấy ảnh.');return row;
  }
}
export const configuredReturnScanner=env=>env.CLAMAV_HOST
  ? buffer=>scanWithClamAv(buffer,{host:env.CLAMAV_HOST,port:Number(env.CLAMAV_PORT||3310)}) : null;
