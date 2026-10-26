import { createHash, randomUUID } from 'node:crypto';
import { MomoProvider } from './momo.js';
import { VietqrProvider } from './vietqr.js';

export class PaymentError extends Error {
  constructor(status,code,message,details) { super(message); Object.assign(this,{ status,code,details }); }
}
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const key=value=>typeof value==='string' && /^[\w:-]{8,120}$/.test(value);
const digest=value=>createHash('sha256').update(typeof value==='string'?value:JSON.stringify(value)).digest('hex');
const amount=value=>Number.isSafeInteger(value) && value>=0;
const momoFinalFailures=new Set([98,99,1001,1002,1003,1004,1005,1006,1007,
  1017,1026,1080,1081,1088,2019,4001,4002,4100]);
const momoPending=new Set([1000,7000,7002]);
const bad=(code,message)=>new PaymentError(400,code,message);
const unavailable=()=>new PaymentError(503,'DEPENDENCY_UNAVAILABLE','Dịch vụ liên quan tạm thời không khả dụng.');
const dto=row=>({ id:row.id,orderGroupId:row.order_group_id,method:row.method,provider:row.provider,
  amountMinor:Number(row.amount_minor),currency:row.currency,status:row.status,
  checkoutUrl:row.checkout_url,qrData:row.qr_data,expiresAt:row.expires_at,
  needsReview:row.review_required,createdAt:row.created_at });

export class PaymentService {
  constructor(pool,config) {
    this.pool=pool; this.config=config;
    this.momo=new MomoProvider(config.momo);
    this.vietqr=new VietqrProvider(config.vietqr);
  }
  async transaction(fn) {
    const db=await this.pool.connect();
    try { await db.query('BEGIN'); const result=await fn(db); await db.query('COMMIT'); return result; }
    catch (error) { await db.query('ROLLBACK'); throw error; }
    finally { db.release(); }
  }
  async remote(url,options={}) {
    let response;
    try { response=await fetch(url,{ ...options,signal:AbortSignal.timeout(5000) }); }
    catch { throw unavailable(); }
    const data=await response.json().catch(()=>({}));
    if (!response.ok) throw new PaymentError(response.status>=500?503:response.status,
      data.code||'DEPENDENCY_ERROR',data.message||'Dịch vụ liên quan từ chối yêu cầu.');
    return data;
  }
  async identity(bearer) {
    if (!/^Bearer\s+\S+$/i.test(bearer||'')) throw new PaymentError(401,'UNAUTHORIZED','Vui lòng đăng nhập.');
    return (await this.remote(new URL('/api/v2/auth/me',this.config.identityUrl),
      { headers:{ Authorization:bearer } })).user;
  }
  async group(id) {
    if (!uuid.test(String(id))) throw new PaymentError(404,'ORDER_NOT_FOUND','Không tìm thấy nhóm đơn.');
    return this.remote(new URL('/api/v2/internal/payment/groups/'+id,this.config.orderUrl),
      { headers:{ 'X-Order-Payment-Token':this.config.orderToken } });
  }
  methods() {
    const list=[{ code:'COD',name:'Thanh toán khi nhận hàng',available:true }];
    if (this.momo.configured()) list.push({ code:'MOMO',name:'Ví MoMo',available:true });
    if (this.vietqr.configured()) list.push({ code:'VIETQR',name:'VietQR có xác nhận từ ngân hàng',available:true });
    return { methods:list };
  }
  async ensureCod(group) {
    if (group.paymentMethod!=='COD') throw new PaymentError(409,'PAYMENT_METHOD_MISMATCH','Đơn không dùng COD.');
    const { rows }=await this.pool.query(`INSERT INTO payment_service.payment_intents
      (order_group_id,buyer_id,method,provider,amount_minor,status)
      VALUES ($1,$2,'COD','DELIVERY',$3,'UNPAID')
      ON CONFLICT(order_group_id,method) DO UPDATE SET
        amount_minor=EXCLUDED.amount_minor,updated_at=now()
      RETURNING *`,[group.id,group.buyerId,group.currentAmountMinor]);
    return rows[0];
  }
  async orderPayments(groupId,userId) {
    const group=await this.group(groupId);
    if (group.buyerId!==userId) throw new PaymentError(404,'ORDER_NOT_FOUND','Không tìm thấy nhóm đơn.');
    if (group.paymentMethod==='COD') await this.ensureCod(group);
    const { rows }=await this.pool.query('SELECT * FROM payment_service.payment_intents WHERE order_group_id=$1 ORDER BY created_at DESC',[groupId]);
    const refunds=rows.length ? (await this.pool.query(`SELECT r.* FROM payment_service.refunds r
      JOIN payment_service.payment_intents i ON i.id=r.payment_intent_id
      WHERE i.order_group_id=$1 ORDER BY r.created_at DESC,r.id`,[groupId])).rows : [];
    return { orderGroupId:groupId,paymentMethod:group.paymentMethod,orderPaymentStatus:group.paymentStatus,
      intents:rows.map(dto),refunds:refunds.map(row=>this.refundDto(row)) };
  }
  async createIntent(userId,input) {
    if (!uuid.test(String(input?.orderGroupId)) || !key(input.idempotencyKey) ||
      !['MOMO','VIETQR'].includes(input.method))
      throw bad('INVALID_PAYMENT','Yêu cầu thanh toán không hợp lệ.');
    const requestHash=digest({ groupId:input.orderGroupId,method:input.method });
    const prior=(await this.pool.query('SELECT * FROM payment_service.payment_intents WHERE buyer_id=$1 AND idempotency_key=$2',
      [userId,input.idempotencyKey])).rows[0];
    if (prior) {
      if (prior.request_hash!==requestHash) throw new PaymentError(409,'IDEMPOTENCY_CONFLICT','Khóa đã dùng cho yêu cầu khác.');
      if (prior.checkout_url || prior.status!=='INITIATED') return { intent:dto(prior) };
    }
    const provider=input.method==='MOMO'?this.momo:this.vietqr;
    if (!provider.configured()) throw new PaymentError(409,'METHOD_UNAVAILABLE','Phương thức chưa được cấu hình.');
    const group=await this.group(input.orderGroupId);
    if (group.buyerId!==userId) throw new PaymentError(404,'ORDER_NOT_FOUND','Không tìm thấy nhóm đơn.');
    if (group.paymentMethod!==input.method || group.status!=='PENDING_PAYMENT' ||
      group.paymentStatus!=='UNPAID' || group.currency!=='VND' ||
      !amount(group.amountMinor) || group.amountMinor<1000)
      throw new PaymentError(409,'ORDER_NOT_PAYABLE','Nhóm đơn chưa sẵn sàng thanh toán.');
    if (input.method==='MOMO' && group.amountMinor>50_000_000)
      throw bad('AMOUNT_OUT_OF_RANGE','Số tiền vượt giới hạn MoMo.');
    let intent=await this.transaction(async db=>{
      await db.query('SELECT pg_advisory_xact_lock(hashtext($1),hashtext($2))',[userId,input.idempotencyKey]);
      const existing=(await db.query('SELECT * FROM payment_service.payment_intents WHERE buyer_id=$1 AND idempotency_key=$2',
        [userId,input.idempotencyKey])).rows[0];
      if (existing) {
        if (existing.request_hash!==requestHash) throw new PaymentError(409,'IDEMPOTENCY_CONFLICT','Khóa đã dùng cho yêu cầu khác.');
        return existing;
      }
      const previous=(await db.query('SELECT * FROM payment_service.payment_intents WHERE order_group_id=$1 AND method=$2',
        [group.id,input.method])).rows[0];
      if (previous) return previous;
      const id=randomUUID();
      const orderCode=input.method==='VIETQR'
        ? (await db.query("SELECT nextval('payment_service.vietqr_order_code') AS code")).rows[0].code:null;
      const { rows }=await db.query(`INSERT INTO payment_service.payment_intents
        (id,order_group_id,buyer_id,method,provider,provider_order_ref,provider_request_id,
         provider_order_code,amount_minor,status,expires_at,idempotency_key,request_hash)
        VALUES ($1,$2,$3,$4,$4,$5,$6,$7,$8,'INITIATED',now()+interval '15 minutes',$9,$10)
        RETURNING *`,[id,group.id,userId,input.method,id,randomUUID(),orderCode,
          group.amountMinor,input.idempotencyKey,requestHash]);
      return rows[0];
    });
    if (intent.checkout_url) return { intent:dto(intent) };
    try {
      const created=await provider.create(intent);
      const { rows }=await this.pool.query(`UPDATE payment_service.payment_intents
        SET status='PENDING',checkout_url=$2,qr_data=$3,updated_at=now()
        WHERE id=$1 AND status='INITIATED' RETURNING *`,[intent.id,created.checkoutUrl,created.qrData]);
      intent=rows[0] || (await this.pool.query('SELECT * FROM payment_service.payment_intents WHERE id=$1',[intent.id])).rows[0];
      return { intent:dto(intent) };
    } catch (error) {
      throw new PaymentError(503,'PROVIDER_UNAVAILABLE','Không thể khởi tạo thanh toán; thử lại cùng yêu cầu.');
    }
  }
  async intent(id,userId) {
    if (!uuid.test(String(id))) throw new PaymentError(404,'INTENT_NOT_FOUND','Không tìm thấy giao dịch.');
    const row=(await this.pool.query('SELECT * FROM payment_service.payment_intents WHERE id=$1 AND buyer_id=$2',[id,userId])).rows[0];
    if (!row) throw new PaymentError(404,'INTENT_NOT_FOUND','Không tìm thấy giao dịch.');
    const refunds=(await this.pool.query('SELECT * FROM payment_service.refunds WHERE payment_intent_id=$1 ORDER BY created_at DESC,id',
      [id])).rows;
    return { intent:dto(row),refunds:refunds.map(item=>this.refundDto(item)) };
  }
  async auditWebhook(provider,deliveryId,payloadDigest,signatureValid,outcome) {
    await this.pool.query(`INSERT INTO payment_service.payment_webhook_inbox
      (provider,delivery_id,payload_digest,signature_valid,outcome)
      VALUES ($1,$2,$3,$4,$5) ON CONFLICT(provider,delivery_id) DO NOTHING`,
      [provider,deliveryId,payloadDigest,signatureValid,outcome]);
  }
  async momoWebhook(payload) {
    const hash=digest(payload);
    if (!this.momo.configured() || !this.momo.verifyIpn(payload)) {
      await this.auditWebhook('MOMO','invalid:'+hash,hash,false,'REJECTED_SIGNATURE');
      throw new PaymentError(403,'INVALID_SIGNATURE','Chữ ký MoMo không hợp lệ.');
    }
    if (payload.partnerCode!==this.config.momo.partnerCode)
      { await this.auditWebhook('MOMO','rejected:'+hash,hash,true,'REJECTED_PROVIDER');
        throw new PaymentError(409,'PROVIDER_MISMATCH','Đối tác thanh toán không khớp.'); }
    const deliveryId=`${payload.orderId}:${payload.transId}:${payload.resultCode}`;
    try { return await this.recordResult('MOMO',deliveryId,hash,payload); }
    catch (error) {
      if (error.code==='PAYMENT_MISMATCH' || error.code==='TRANSACTION_CONFLICT')
        await this.auditWebhook('MOMO','rejected:'+hash,hash,true,'REJECTED_MISMATCH');
      throw error;
    }
  }
  async vietqrWebhook(payload,token) {
    if (!this.vietqr.configured() || token!==this.config.vietqr.webhookToken)
      throw new PaymentError(403,'INVALID_TOKEN','Webhook ngân hàng không hợp lệ.');
    if (payload.code!=='00' || !Array.isArray(payload.data))
      throw bad('INVALID_WEBHOOK','Dữ liệu webhook không hợp lệ.');
    const results=[];
    for (const item of payload.data) {
      if (!item || !Number.isSafeInteger(Number(item.orderCode)) || !key(String(item.reference||'')))
        throw bad('INVALID_WEBHOOK','Dữ liệu chuyển khoản không hợp lệ.');
      const row=(await this.pool.query('SELECT * FROM payment_service.payment_intents WHERE provider_order_code=$1',
        [item.orderCode])).rows[0];
      if (!row || Number(item.amount)!==Number(row.amount_minor) ||
        String(item.description||'').trim()!==`MDUC247 ${item.orderCode}`) {
        const rejected=digest(item);
        await this.auditWebhook('VIETQR','rejected:'+rejected,rejected,true,'REJECTED_MISMATCH');
        throw new PaymentError(409,'PAYMENT_MISMATCH','Khoản chuyển không khớp đơn.');
      }
      results.push(await this.recordResult('VIETQR',String(item.reference),digest(item),{
        orderId:row.provider_order_ref,amount:item.amount,requestId:row.provider_request_id,
        transId:item.reference,resultCode:item.code==='00'?0:1001 }));
    }
    return { results };
  }
  async recordResult(provider,deliveryId,payloadDigest,payload) {
    return this.transaction(async db=>{
      const row=(await db.query('SELECT * FROM payment_service.payment_intents WHERE provider=$1 AND provider_order_ref=$2 FOR UPDATE',
        [provider,payload.orderId])).rows[0];
      if (!row || row.method==='COD' || payload.requestId!==row.provider_request_id ||
        Number(payload.amount)!==Number(row.amount_minor))
        throw new PaymentError(409,'PAYMENT_MISMATCH','Giao dịch không khớp đơn, số tiền hoặc request.');
      const existing=(await db.query('SELECT * FROM payment_service.payment_webhook_inbox WHERE provider=$1 AND delivery_id=$2',
        [provider,deliveryId])).rows[0];
      if (existing) {
        if (existing.payload_digest!==payloadDigest) throw new PaymentError(409,'IDEMPOTENCY_CONFLICT','Webhook ID đã dùng cho payload khác.');
        return { intent:dto(row),idempotent:true };
      }
      const code=Number(payload.resultCode);
      if (![0,1000,7000,7002,9000].includes(code) && (!Number.isInteger(code) || code<0))
        throw bad('INVALID_RESULT_CODE','Kết quả thanh toán không hợp lệ.');
      const pending=provider==='MOMO' ? ![0,9000].includes(code) && !momoFinalFailures.has(code) : false;
      const success=code===0 || code===9000;
      const late=success && ['FAILED','EXPIRED'].includes(row.status);
      if (success) {
        if (payload.transId===undefined || payload.transId===null || !String(payload.transId).trim())
          throw bad('INVALID_TRANSACTION_ID','Thiếu mã giao dịch provider.');
        await db.query(`INSERT INTO payment_service.payment_transactions
          (intent_id,provider,provider_txn_id,amount_minor,status,source,payload_digest)
          VALUES ($1,$2,$3,$4,'SUCCEEDED',$5,$6)
          ON CONFLICT(provider,provider_txn_id) DO NOTHING`,
          [row.id,provider,String(payload.transId),row.amount_minor,'provider',payloadDigest]);
        const recorded=(await db.query('SELECT intent_id FROM payment_service.payment_transactions WHERE provider=$1 AND provider_txn_id=$2',
          [provider,String(payload.transId)])).rows[0];
        if (recorded?.intent_id!==row.id)
          throw new PaymentError(409,'TRANSACTION_CONFLICT','Mã giao dịch provider đã thuộc đơn khác.');
      }
      let next=row.status;
      if (late) {
        await db.query(`UPDATE payment_service.payment_intents SET review_required=true,
          review_reason='LATE_SUCCESS_AFTER_FINAL_STATE',updated_at=now() WHERE id=$1`,[row.id]);
        await db.query(`INSERT INTO payment_service.payment_reconciliation
          (intent_id,observed_status,local_status,outcome,details)
          VALUES ($1,'SUCCEEDED',$2,'MANUAL_REVIEW','Late provider success after final local state')`,
          [row.id,row.status]);
      } else if (!pending && ['INITIATED','PENDING'].includes(row.status)) {
        next=success?'SUCCEEDED':'FAILED';
        if (!success) await db.query(`INSERT INTO payment_service.payment_transactions
          (intent_id,provider,provider_txn_id,amount_minor,status,source,payload_digest)
          VALUES ($1,$2,NULL,$3,'FAILED','provider',$4)`,
          [row.id,provider,row.amount_minor,payloadDigest]);
        await db.query('UPDATE payment_service.payment_intents SET status=$2,version=version+1,updated_at=now() WHERE id=$1',
          [row.id,next]);
        await db.query('INSERT INTO payment_service.payment_outbox(event_type,aggregate_id,payload) VALUES ($1,$2,$3)',
          [success?'PaymentSucceeded.v1':'PaymentFailed.v1',row.id,
            { groupId:row.order_group_id,amountMinor:Number(row.amount_minor),currency:'VND',provider,
              providerTxnId:String(payload.transId||''),intentId:row.id }]);
      }
      await db.query(`INSERT INTO payment_service.payment_webhook_inbox
        (provider,delivery_id,payload_digest,signature_valid,outcome) VALUES ($1,$2,$3,true,$4)`,
        [provider,deliveryId,payloadDigest,late?'LATE_SUCCESS':pending?'PENDING':next]);
      const fresh=(await db.query('SELECT * FROM payment_service.payment_intents WHERE id=$1',[row.id])).rows[0];
      return { intent:dto(fresh),idempotent:false };
    });
  }
  async collectCod(input) {
    if (!uuid.test(String(input?.groupId)) || !uuid.test(String(input?.shopOrderId)) ||
      !key(input.eventId) || !key(String(input.providerTransactionId||'')) ||
      !amount(input.amountMinor) || input.amountMinor===0)
      throw bad('INVALID_COD_COLLECTION','Thông tin thu hộ không hợp lệ.');
    const group=await this.group(input.groupId);
    if (group.paymentMethod!=='COD' || group.currency!=='VND') throw new PaymentError(409,'PAYMENT_MISMATCH','Nhóm đơn không dùng COD.');
    const shop=group.orders.find(item=>item.id===input.shopOrderId);
    if (!shop || !['DELIVERED','COMPLETED'].includes(shop.status) ||
      shop.amountMinor!==input.amountMinor)
      throw new PaymentError(409,'PAYMENT_MISMATCH','Thu hộ không khớp đơn giao thành công.');
    await this.ensureCod(group);
    const dataDigest=digest({ groupId:group.id,shopOrderId:shop.id,amountMinor:input.amountMinor,
      providerTransactionId:input.providerTransactionId });
    return this.transaction(async db=>{
      const intent=(await db.query(`SELECT * FROM payment_service.payment_intents
        WHERE order_group_id=$1 AND method='COD' FOR UPDATE`,[group.id])).rows[0];
      const seen=(await db.query("SELECT * FROM payment_service.payment_webhook_inbox WHERE provider='DELIVERY' AND delivery_id=$1",
        [input.eventId])).rows[0];
      if (seen) {
        if (seen.payload_digest!==dataDigest) throw new PaymentError(409,'IDEMPOTENCY_CONFLICT','Event ID đã dùng cho dữ liệu khác.');
        return { intent:dto(intent),idempotent:true };
      }
      if ((await db.query('SELECT 1 FROM payment_service.cod_collections WHERE shop_order_id=$1',[shop.id])).rowCount)
        throw new PaymentError(409,'COD_ALREADY_COLLECTED','Đơn đã ghi nhận thu hộ.');
      const recorded=(await db.query(`INSERT INTO payment_service.payment_transactions
        (intent_id,provider,provider_txn_id,amount_minor,status,source,payload_digest)
        VALUES ($1,'DELIVERY',$2,$3,'SUCCEEDED','delivery',$4) RETURNING id`,
        [intent.id,input.providerTransactionId,input.amountMinor,dataDigest])).rows[0];
      await db.query(`INSERT INTO payment_service.cod_collections
        (shop_order_id,intent_id,transaction_id,amount_minor) VALUES ($1,$2,$3,$4)`,
        [shop.id,intent.id,recorded.id,input.amountMinor]);
      await db.query(`INSERT INTO payment_service.payment_webhook_inbox
        (provider,delivery_id,payload_digest,signature_valid,outcome)
        VALUES ('DELIVERY',$1,$2,true,'SUCCEEDED')`,[input.eventId,dataDigest]);
      const eligible=group.orders.filter(item=>item.status!=='CANCELLED');
      const collected=(await db.query('SELECT shop_order_id FROM payment_service.cod_collections WHERE intent_id=$1',[intent.id])).rows;
      const finished=eligible.every(item=>collected.some(entry=>entry.shop_order_id===item.id));
      await db.query('UPDATE payment_service.payment_intents SET status=$2,updated_at=now() WHERE id=$1',
        [intent.id,finished?'SUCCEEDED':'PENDING']);
      await db.query('INSERT INTO payment_service.payment_outbox(event_type,aggregate_id,payload) VALUES ($1,$2,$3)',
        ['CODCollected.v1',intent.id,{ groupId:group.id,shopOrderId:shop.id,
          amountMinor:input.amountMinor,currency:'VND',provider:'DELIVERY',
          providerTxnId:input.providerTransactionId,intentId:intent.id }]);
      return { intent:dto({ ...intent,status:finished?'SUCCEEDED':'PENDING' }),idempotent:false };
    });
  }
  async refund(input) {
    if (!uuid.test(String(input?.shopOrderId)) || !uuid.test(String(input?.groupId)) ||
      !key(input.idempotencyKey) || !amount(input.amountMinor) || input.amountMinor===0 ||
      typeof input.reason!=='string' || input.reason.trim().length<3 || input.reason.length>200)
      throw bad('INVALID_REFUND','Yêu cầu hoàn tiền không hợp lệ.');
    if(input.returnRequestId){
      if(!uuid.test(String(input.returnRequestId))) throw bad('INVALID_RETURN','Yêu cầu trả hàng không hợp lệ.');
      const context=await this.remote(new URL(`/api/v2/internal/payment/returns/${input.returnRequestId}/refund-context`,
        this.config.orderUrl),{headers:{'X-Order-Payment-Token':this.config.orderToken}});
      if(context.status!=='REFUND_PENDING'||context.groupId!==input.groupId||
        context.shopOrderId!==input.shopOrderId||context.amountMinor!==input.amountMinor)
        throw new PaymentError(409,'RETURN_REFUND_NOT_READY','Yêu cầu trả hàng chưa đủ điều kiện hoàn tiền.');
    }
    const requestHash=digest({ groupId:input.groupId,shopOrderId:input.shopOrderId,
      amountMinor:input.amountMinor,reason:input.reason,returnRequestId:input.returnRequestId||null });
    const prior=(await this.pool.query('SELECT * FROM payment_service.refunds WHERE shop_order_id=$1 AND idempotency_key=$2',
      [input.shopOrderId,input.idempotencyKey])).rows[0];
    if (prior) {
      if (prior.request_hash!==requestHash) throw new PaymentError(409,'IDEMPOTENCY_CONFLICT','Khóa hoàn tiền đã dùng cho dữ liệu khác.');
      if (prior.status!=='INITIATED') return { refund:this.refundDto(prior) };
    }
    const group=await this.group(input.groupId);
    const shop=group.orders.find(item=>item.id===input.shopOrderId);
    if (!shop || group.paymentMethod==='COD' || !['PAID','PARTIALLY_REFUNDED'].includes(group.paymentStatus) ||
      input.amountMinor>shop.amountMinor)
      throw new PaymentError(409,'REFUND_NOT_ALLOWED','Đơn hoặc số tiền không đủ điều kiện hoàn.');
    if (group.paymentMethod==='MOMO' && input.amountMinor<1000)
      throw bad('REFUND_AMOUNT_TOO_SMALL','MoMo yêu cầu hoàn tối thiểu 1.000 VND.');
    let refund=await this.transaction(async db=>{
      const intent=(await db.query(`SELECT * FROM payment_service.payment_intents
        WHERE order_group_id=$1 AND method=$2 FOR UPDATE`,[group.id,group.paymentMethod])).rows[0];
      const existing=(await db.query('SELECT * FROM payment_service.refunds WHERE shop_order_id=$1 AND idempotency_key=$2',
        [shop.id,input.idempotencyKey])).rows[0];
      if (existing) {
        if (existing.request_hash!==requestHash) throw new PaymentError(409,'IDEMPOTENCY_CONFLICT','Khóa hoàn tiền đã dùng cho dữ liệu khác.');
        return existing;
      }
      if (!intent || !['SUCCEEDED','PARTIALLY_REFUNDED'].includes(intent.status))
        throw new PaymentError(409,'REFUND_NOT_ALLOWED','Thanh toán chưa được xác nhận.');
      const used=(await db.query(`SELECT coalesce(sum(amount_minor),0)::bigint AS used
        FROM payment_service.refunds WHERE shop_order_id=$1 AND status IN ('INITIATED','PENDING','SUCCEEDED')`,[shop.id])).rows[0].used;
      if (Number(used)+input.amountMinor>shop.amountMinor)
        throw new PaymentError(409,'REFUND_LIMIT','Tổng tiền hoàn vượt số đã thu cho shop.');
      const providerRef='RF'+randomUUID().replaceAll('-','');
      const { rows }=await db.query(`INSERT INTO payment_service.refunds
        (shop_order_id,payment_intent_id,provider,provider_refund_ref,amount_minor,status,reason,idempotency_key,request_hash)
        VALUES ($1,$2,$3,$4,$5,'INITIATED',$6,$7,$8) RETURNING *`,
        [shop.id,intent.id,intent.provider,providerRef,input.amountMinor,input.reason,
          input.idempotencyKey,requestHash]);
      return rows[0];
    });
    if (refund.status!=='INITIATED') return { refund:this.refundDto(refund) };
    if (refund.provider==='VIETQR') {
      refund=(await this.pool.query(`UPDATE payment_service.refunds SET status='PENDING',updated_at=now()
        WHERE id=$1 RETURNING *`,[refund.id])).rows[0];
      await this.pool.query(`INSERT INTO payment_service.payment_reconciliation
        (intent_id,observed_status,local_status,outcome,details)
        VALUES ($1,NULL,'PENDING','MANUAL_REFUND_REQUIRED','VietQR bank refund requires verified bank settlement')`,
        [refund.payment_intent_id]);
      return { refund:this.refundDto(refund) };
    }
    const transaction=(await this.pool.query(`SELECT * FROM payment_service.payment_transactions
      WHERE intent_id=$1 AND status='SUCCEEDED' LIMIT 1`,[refund.payment_intent_id])).rows[0];
    if (!transaction) throw new PaymentError(409,'REFUND_NOT_ALLOWED','Thiếu giao dịch gốc đã xác nhận.');
    try {
      const result=await this.momo.refund(refund,transaction);
      if (Number(result.resultCode)===0 && !/^\d+$/.test(String(result.transId||'')))
        throw new Error('MOMO_REFUND_TRANS_ID_MISSING');
      await this.applyRefundResult(refund,Number(result.resultCode),String(result.transId||''));
    } catch (error) {
      throw new PaymentError(503,'REFUND_PROVIDER_UNAVAILABLE','Đã ghi nhận yêu cầu hoàn; đang đối soát với MoMo.');
    }
    refund=(await this.pool.query('SELECT * FROM payment_service.refunds WHERE id=$1',[refund.id])).rows[0];
    return { refund:this.refundDto(refund) };
  }
  refundDto(row) { return { id:row.id,shopOrderId:row.shop_order_id,amountMinor:Number(row.amount_minor),
    currency:'VND',status:row.status,reason:row.reason,createdAt:row.created_at }; }
  async applyRefundResult(refund,code,providerTxnId) {
    if ([1000,7000,7002].includes(code)) {
      await this.pool.query("UPDATE payment_service.refunds SET status='PENDING',updated_at=now() WHERE id=$1 AND status='INITIATED'",
        [refund.id]); return;
    }
    const next=code===0?'SUCCEEDED':'FAILED';
    await this.transaction(async db=>{
      const row=(await db.query('SELECT * FROM payment_service.refunds WHERE id=$1 FOR UPDATE',[refund.id])).rows[0];
      if (!row) return;
      if (row.status==='SUCCEEDED' && providerTxnId && row.provider_refund_txn_id!==providerTxnId)
        throw new PaymentError(409,'SETTLEMENT_CONFLICT','Mã đối soát không khớp hoàn tiền trước.');
      if (['SUCCEEDED','FAILED'].includes(row.status)) return;
      await db.query(`UPDATE payment_service.refunds SET status=$2,provider_refund_txn_id=$3,
        updated_at=now() WHERE id=$1`,[row.id,next,providerTxnId||null]);
      if (next==='SUCCEEDED') {
        const totals=(await db.query(`SELECT coalesce(sum(amount_minor),0)::bigint AS refunded
          FROM payment_service.refunds WHERE payment_intent_id=$1 AND status='SUCCEEDED'`,[row.payment_intent_id])).rows[0];
        const intent=(await db.query('SELECT * FROM payment_service.payment_intents WHERE id=$1 FOR UPDATE',
          [row.payment_intent_id])).rows[0];
        await db.query('UPDATE payment_service.payment_intents SET status=$2,updated_at=now() WHERE id=$1',
          [intent.id,Number(totals.refunded)>=Number(intent.amount_minor)?'REFUNDED':'PARTIALLY_REFUNDED']);
        await db.query('INSERT INTO payment_service.payment_outbox(event_type,aggregate_id,payload) VALUES ($1,$2,$3)',
          ['RefundSucceeded.v1',intent.id,{ groupId:intent.order_group_id,shopOrderId:row.shop_order_id,
            amountMinor:Number(row.amount_minor),currency:'VND',provider:intent.provider,refundId:row.id }]);
      }
    });
  }
  async settleVietqrRefund(refundId,bankReference) {
    if (!uuid.test(String(refundId)) || !key(bankReference)) throw bad('INVALID_SETTLEMENT','Đối soát hoàn tiền không hợp lệ.');
    const refund=(await this.pool.query('SELECT * FROM payment_service.refunds WHERE id=$1',[refundId])).rows[0];
    if (!refund || refund.provider!=='VIETQR') throw new PaymentError(404,'REFUND_NOT_FOUND','Không tìm thấy hoàn tiền.');
    if (refund.status==='SUCCEEDED') {
      if (refund.provider_refund_txn_id!==bankReference)
        throw new PaymentError(409,'SETTLEMENT_CONFLICT','Mã đối soát không khớp lần xác nhận trước.');
      return { refund:this.refundDto(refund),idempotent:true };
    }
    if (refund.status!=='PENDING') throw new PaymentError(409,'REFUND_NOT_PENDING','Hoàn tiền chưa chờ đối soát.');
    try { await this.applyRefundResult(refund,0,bankReference); }
    catch (error) {
      if (error.code==='23505') throw new PaymentError(409,'SETTLEMENT_CONFLICT','Mã đối soát đã dùng cho hoàn tiền khác.');
      throw error;
    }
    return { refund:this.refundDto((await this.pool.query('SELECT * FROM payment_service.refunds WHERE id=$1',[refundId])).rows[0]) };
  }
  async expireIntent(id,manualReview,reason) {
    await this.transaction(async db=>{
      const row=(await db.query('SELECT * FROM payment_service.payment_intents WHERE id=$1 FOR UPDATE',[id])).rows[0];
      if (!row || !['INITIATED','PENDING'].includes(row.status)) return;
      await db.query(`UPDATE payment_service.payment_intents SET status='EXPIRED',version=version+1,
        review_required=$2,review_reason=$3,updated_at=now() WHERE id=$1`,[id,manualReview,reason]);
      await db.query(`INSERT INTO payment_service.payment_reconciliation
        (intent_id,observed_status,local_status,outcome,details)
        VALUES ($1,NULL,$2,$3,$4)`,[id,row.status,manualReview?'MANUAL_REVIEW':'EXPIRED',reason]);
      await db.query('INSERT INTO payment_service.payment_outbox(event_type,aggregate_id,payload) VALUES ($1,$2,$3)',
        ['PaymentExpired.v1',row.id,{ groupId:row.order_group_id,amountMinor:Number(row.amount_minor),
          currency:'VND',provider:row.provider,intentId:row.id }]);
    });
  }
  async reconcileOne() {
    const { rows }=await this.pool.query(`SELECT * FROM payment_service.payment_intents
      WHERE status IN ('INITIATED','PENDING') AND method<>'COD'
        AND next_reconcile_at<=now() AND created_at<now()-interval '30 seconds'
      ORDER BY next_reconcile_at,id LIMIT 1`);
    const intent=rows[0];
    if (!intent) return false;
    await this.pool.query(`UPDATE payment_service.payment_intents SET next_reconcile_at=now()+interval '60 seconds'
      WHERE id=$1`,[intent.id]);
    const expired=new Date(intent.expires_at).getTime()<Date.now();
    if (intent.method==='VIETQR') {
      if (expired) await this.expireIntent(intent.id,true,'VietQR webhook missing; bank reconciliation required');
      else await this.pool.query(`INSERT INTO payment_service.payment_reconciliation
        (intent_id,observed_status,local_status,outcome,details)
        VALUES ($1,NULL,$2,'WAITING_WEBHOOK','VietQR has no configured transaction query API')`,
        [intent.id,intent.status]);
      return true;
    }
    try {
      const result=await this.momo.query(intent);
      const code=Number(result.resultCode);
      await this.pool.query('UPDATE payment_service.payment_intents SET last_reconciled_at=now() WHERE id=$1',[intent.id]);
      await this.pool.query(`INSERT INTO payment_service.payment_reconciliation
        (intent_id,observed_status,local_status,outcome,details)
        VALUES ($1,$2,$3,$4,$5)`,[intent.id,String(code),intent.status,
          code===0?'MATCH':'CHECKED',null]);
      if (code===0 || code===9000 || momoFinalFailures.has(code)) {
        await this.recordResult('MOMO',`query:${intent.provider_order_ref}:${result.transId}:${code}`,
          digest(result),{ ...result,requestId:intent.provider_request_id });
      } else if (expired && momoPending.has(code))
        await this.expireIntent(intent.id,false,'MoMo reported pending past expiry');
      else if (expired && new Date(intent.expires_at).getTime()+15*60_000<Date.now())
        await this.expireIntent(intent.id,true,'MoMo returned non-final status beyond grace period');
    } catch (error) {
      await this.pool.query(`INSERT INTO payment_service.payment_reconciliation
        (intent_id,observed_status,local_status,outcome,details)
        VALUES ($1,NULL,$2,'QUERY_FAILED',$3)`,[intent.id,intent.status,'DEPENDENCY_REQUEST_FAILED']);
      if (new Date(intent.expires_at).getTime()+15*60_000<Date.now())
        await this.expireIntent(intent.id,true,'MoMo query unavailable beyond grace period');
    }
    return true;
  }
  async reconcileRefundOne() {
    const { rows }=await this.pool.query(`SELECT r.* FROM payment_service.refunds r
      WHERE r.provider='MOMO' AND r.status IN ('INITIATED','PENDING')
        AND r.created_at<now()-interval '1 minute'
        AND (r.last_reconciled_at IS NULL OR r.last_reconciled_at<now()-interval '1 minute')
      ORDER BY r.created_at LIMIT 1`);
    const refund=rows[0];
    if (!refund) return false;
    await this.pool.query('UPDATE payment_service.refunds SET last_reconciled_at=now() WHERE id=$1',[refund.id]);
    try {
      const result=await this.momo.queryRefund(refund);
      if (result.orderId!==refund.provider_refund_ref) throw new Error('MOMO_REFUND_QUERY_MISMATCH');
      const item=Array.isArray(result.refundTrans) ? result.refundTrans.find(entry=>entry.orderId===refund.provider_refund_ref) : null;
      if (!item) throw new Error('MOMO_REFUND_RESULT_MISSING');
      if (item?.amount!==undefined && Number(item.amount)!==Number(refund.amount_minor))
        throw new Error('MOMO_REFUND_AMOUNT_MISMATCH');
      const code=Number(item.resultCode);
      if (code===0 && !/^\d+$/.test(String(item.transId||''))) throw new Error('MOMO_REFUND_TRANS_ID_MISSING');
      if (code===0 || momoFinalFailures.has(code))
        await this.applyRefundResult(refund,code,String(item.transId||''));
    } catch (error) {
      if (error.message==='MOMO_REFUND_RESULT_MISSING' && refund.status==='INITIATED') {
        const intent=(await this.pool.query('SELECT order_group_id FROM payment_service.payment_intents WHERE id=$1',
          [refund.payment_intent_id])).rows[0];
        if (intent) try {
          await this.refund({ groupId:intent.order_group_id,shopOrderId:refund.shop_order_id,
            amountMinor:Number(refund.amount_minor),reason:refund.reason,
            idempotencyKey:refund.idempotency_key });
          return true;
        } catch {}
      }
      await this.pool.query(`INSERT INTO payment_service.payment_reconciliation
        (intent_id,observed_status,local_status,outcome,details)
        VALUES ($1,NULL,$2,'REFUND_QUERY_FAILED',$3)`,[refund.payment_intent_id,refund.status,'DEPENDENCY_REQUEST_FAILED']);
    }
    return true;
  }
  async reconcileCancelledOrders() {
    const result=await this.remote(new URL('/api/v2/internal/payment/refund-candidates',this.config.orderUrl),
      { headers:{ 'X-Order-Payment-Token':this.config.orderToken } });
    let queued=0;
    for (const item of result.orders) {
      const intent=(await this.pool.query(`SELECT * FROM payment_service.payment_intents
        WHERE order_group_id=$1 AND method=$2`,[item.groupId,item.paymentMethod])).rows[0];
      if (!intent || !['SUCCEEDED','PARTIALLY_REFUNDED'].includes(intent.status)) continue;
      const totals=(await this.pool.query(`SELECT
        coalesce(sum(amount_minor) FILTER (WHERE status IN ('INITIATED','PENDING','SUCCEEDED')),0)::bigint AS used,
        count(*) FILTER (WHERE status='FAILED')::int AS failures
        FROM payment_service.refunds WHERE shop_order_id=$1`,[item.shopOrderId])).rows[0];
      const remaining=item.totalMinor-Number(totals.used);
      if (remaining<=0) continue;
      try {
        await this.refund({ groupId:item.groupId,shopOrderId:item.shopOrderId,
          amountMinor:remaining,reason:'Order cancelled',
          idempotencyKey:`cancel:${item.shopOrderId}:${totals.failures}` });
        queued++;
      } catch (error) {
        await this.pool.query(`INSERT INTO payment_service.payment_reconciliation
          (intent_id,observed_status,local_status,outcome,details)
          VALUES ($1,NULL,$2,'AUTO_REFUND_FAILED',$3)`,
          [intent.id,intent.status,'DEPENDENCY_REQUEST_FAILED']);
      }
    }
    return queued;
  }
  async publishOutbox() {
    const db=await this.pool.connect();
    try {
      await db.query('BEGIN');
      const { rows }=await db.query(`SELECT * FROM payment_service.payment_outbox
        WHERE published_at IS NULL AND next_attempt_at<=now()
        ORDER BY id LIMIT 1 FOR UPDATE SKIP LOCKED`);
      const event=rows[0];
      if (!event) { await db.query('COMMIT'); return false; }
      try {
        const response=await fetch(new URL('/api/v2/internal/payment/events',this.config.orderUrl),{
          method:'POST',headers:{ 'Content-Type':'application/json',
            'X-Order-Payment-Token':this.config.orderToken },
          body:JSON.stringify({ eventId:'payment:'+event.id,type:event.event_type,...event.payload }),
          signal:AbortSignal.timeout(5000) });
        if (!response.ok) throw new Error('Order returned '+response.status);
        await db.query('UPDATE payment_service.payment_outbox SET published_at=now() WHERE id=$1',[event.id]);
      } catch (error) {
        const attempts=event.attempts+1,delay=Math.min(300,2**Math.min(attempts,8));
        await db.query(`UPDATE payment_service.payment_outbox SET attempts=$2,
          next_attempt_at=now()+($3 * interval '1 second') WHERE id=$1`,[event.id,attempts,delay]);
        console.error('Payment event delivery failed:');
      }
      await db.query('COMMIT');
      return true;
    } catch (error) { await db.query('ROLLBACK'); throw error; }
    finally { db.release(); }
  }
  async publishNotificationOutbox(webhookUrl,webhookToken){
    if(!webhookUrl||!webhookToken)return false;
    const db=await this.pool.connect();
    try{await db.query('BEGIN');
      const event=(await db.query(`SELECT id,event_type,aggregate_id,payload,notification_attempts
        FROM payment_service.payment_outbox
        WHERE notification_sent_at IS NULL AND notification_dead_at IS NULL
          AND next_notification_at<=now()
          AND event_type IN ('PaymentSucceeded.v1','RefundSucceeded.v1')
        ORDER BY id LIMIT 1 FOR UPDATE SKIP LOCKED`)).rows[0];
      if(!event){await db.query('COMMIT');return false;}
      try{const response=await fetch(webhookUrl,{method:'POST',
        headers:{'Content-Type':'application/json','X-Payment-Notification-Token':webhookToken,
          'X-Event-Id':String(event.id)},
        body:JSON.stringify({id:event.id,type:event.event_type,aggregateId:event.aggregate_id,
          payload:event.payload}),signal:AbortSignal.timeout(5000)});
        if(!response.ok)throw new Error('Notification returned '+response.status);
        await db.query('UPDATE payment_service.payment_outbox SET notification_sent_at=now() WHERE id=$1',
          [event.id]);
      }catch(error){const attempts=event.notification_attempts+1,delay=Math.min(300,2**Math.min(attempts,8));
        await db.query(`UPDATE payment_service.payment_outbox SET notification_attempts=$2,
          next_notification_at=now()+($3 * interval '1 second'),
          notification_dead_at=CASE WHEN $2>=10 THEN now() ELSE notification_dead_at END
          WHERE id=$1`,[event.id,attempts,delay]);
        console.error('Payment notification delivery failed:');}
      await db.query('COMMIT');return true;
    }catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();}
  }
  async notificationMetrics(){
    const row=(await this.pool.query(`SELECT
      count(*) FILTER (WHERE notification_sent_at IS NULL AND notification_dead_at IS NULL)::int AS pending,
      count(*) FILTER (WHERE notification_dead_at IS NOT NULL)::int AS dead,
      min(created_at) FILTER (WHERE notification_sent_at IS NULL
        AND notification_dead_at IS NULL) AS oldest_pending_at
      FROM payment_service.payment_outbox
      WHERE event_type IN ('PaymentSucceeded.v1','RefundSucceeded.v1')`)).rows[0];
    return {pending:row.pending,dead:row.dead,oldestPendingAt:row.oldest_pending_at};
  }
  async report() {
    const pending=await this.pool.query(`SELECT method,status,count(*)::int AS count
      FROM payment_service.payment_intents WHERE status IN ('INITIATED','PENDING','UNPAID')
      GROUP BY method,status ORDER BY method,status`);
    const discrepancies=await this.pool.query(`SELECT i.id AS intent_id,i.order_group_id,i.method,
      i.status,i.review_reason,r.outcome,r.details,r.checked_at
      FROM payment_service.payment_intents i
      LEFT JOIN LATERAL (SELECT outcome,details,checked_at FROM payment_service.payment_reconciliation
        WHERE intent_id=i.id ORDER BY id DESC LIMIT 1) r ON true
      WHERE i.review_required=true OR (i.status IN ('INITIATED','PENDING')
        AND i.created_at<now()-interval '20 minutes')
      ORDER BY i.created_at LIMIT 100`);
    const eventBacklog=await this.pool.query(`SELECT id,event_type,aggregate_id,attempts,created_at
      FROM payment_service.payment_outbox WHERE published_at IS NULL
        AND (attempts>=3 OR created_at<now()-interval '10 minutes')
      ORDER BY created_at LIMIT 100`);
    return { pending:pending.rows,discrepancies:discrepancies.rows,
      eventBacklog:eventBacklog.rows };
  }
}
