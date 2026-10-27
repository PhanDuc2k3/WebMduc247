import {requireCaseAccess, requireOrderAccess} from './admin-scope.js';
import {requireAdminPermission, adminScopeSql} from '../../../packages/contracts/admin-rbac.js';
import {createHash, randomBytes} from 'node:crypto';
import {adminId, adminPage} from '../../../packages/contracts/platform-admin.js';
import {validateReturnInput} from './return.service.js';
import {caseError, caseInput, caseText, caseVersion, caseDue, casePermission, requireCasePermission, caseAudit, requireEvidenceScope, caseFilters, casePermissionAliases} from './case-contract.js';

const hash=value=>createHash('sha256').update(value).digest('hex');
const joins=`FROM order_service.admin_cases c JOIN order_service.orders o ON o.id=c.shop_order_id
  LEFT JOIN order_service.return_requests r ON r.id=c.return_request_id
  LEFT JOIN order_service.support_tickets t ON t.id=c.id LEFT JOIN order_service.disputes d ON d.id=c.id`;
const columns=`c.*,o.user_id AS buyer_id,o.store_id,o.group_id,o.store_snapshot_json,o.payment_method,o.payment_status,
  o.status AS order_status,o.payable_total_minor,o.refunded_minor,
  coalesce(r.status,t.status,d.status) AS case_status,coalesce(r.reason,t.subject,d.subject) AS subject,
  coalesce(r.reason,t.description,d.description) AS description,coalesce(r.reason_code,t.reason_code,d.reason_code,'OTHER') AS reason_code,
  row_to_json(r) AS return_record`;
export class CaseService {
  constructor(returns){this.returns=returns;this.pool=returns.pool;this.order=returns.order;}
  async transaction(fn){
    const db=await this.pool.connect();try{await db.query('BEGIN');const result=await fn(db);await db.query('COMMIT');return result;}
    catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();}
  }
  map(row){
    return {...(row.return_record?this.returns.dto(row.return_record):{}),id:row.id,kind:row.kind,shopOrderId:row.shop_order_id,
      buyerId:row.buyer_id,storeId:row.store_id,groupId:row.group_id,storeName:row.store_snapshot_json?.name||'Chưa có tên cửa hàng',
      status:row.case_status,subject:row.subject,description:row.description,reasonCode:row.reason_code,
      assigneeId:row.assignee_id,caseVersion:row.version,dueAt:row.due_at,createdAt:row.created_at,
      workflowStatus:row.workflow_status,escalationLevel:row.escalation_level,resolvedAt:row.resolved_at,
      requestedAt:row.return_record?.requested_at||row.created_at,paymentMethod:row.payment_method,paymentStatus:row.payment_status,
      orderTotalMinor:Number(row.payable_total_minor),refundedMinor:Number(row.refunded_minor||0),orderStatus:row.order_status,
      refundReference:row.return_record?.refund_reference||null,refundNeedsAttention:Boolean(row.return_record?.last_refund_error)};
  }
  async list(user,query,{permission='cases.read'}={}){
    requireAdminPermission(user,permission);const f=caseFilters(query,user);
    const args=[f.kind,f.pattern,f.status,f.from,f.to,f.storeId,f.paymentMethod,f.reasonCode,
      f.assigneeId==='unassigned'?null:f.assigneeId||null,f.assigneeId==='unassigned',f.due];
    const scope=adminScopeSql(user,permission,{storeIds:'o.store_id::text',caseKinds:'c.kind',assigneeIds:'c.assignee_id::text'},args);
    const where=`${joins} WHERE ${scope} AND c.kind=$1 AND (c.id::text ILIKE $2 OR o.id::text ILIKE $2 OR o.group_id::text ILIKE $2
      OR coalesce(o.store_snapshot_json->>'name','') ILIKE $2 OR coalesce(t.subject,d.subject,'') ILIKE $2)
      AND ($3='' OR coalesce(r.status,t.status,d.status)=$3)
      AND ($4::timestamptz IS NULL OR coalesce(r.requested_at,c.created_at)>=$4)
      AND ($5::timestamptz IS NULL OR coalesce(r.requested_at,c.created_at)<$5)
      AND ($6::uuid IS NULL OR o.store_id=$6) AND ($7='' OR o.payment_method=$7)
      AND ($8='' OR coalesce(r.reason_code,t.reason_code,d.reason_code,'OTHER')=$8)
      AND ($9::uuid IS NULL OR c.assignee_id=$9) AND (NOT $10::boolean OR c.assignee_id IS NULL)
      AND ($11='' OR ($11='overdue' AND c.due_at<now()) OR ($11='upcoming' AND c.due_at>=now()))`;
    const [count,list]=await Promise.all([this.pool.query(`SELECT count(*)::int AS total ${where}`,args),
      this.pool.query(`SELECT ${columns} ${where} ORDER BY c.created_at DESC,c.id DESC LIMIT $${args.length+1} OFFSET $${args.length+2}`,[...args,f.limit,f.offset])]);
    return adminPage(list.rows.map(row=>this.map(row)),count.rows[0].total,f);
  }
  async capabilities(user){
    requireAdminPermission(user,'cases.read');
    const permissions=(await this.pool.query(`SELECT permission FROM order_service.case_permissions WHERE user_id=$1
      AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at>now())`,[user.id])).rows.map(row=>row.permission);
    return {userId:user.id,permissions:[...new Set([...permissions.filter(p=>p==='evidence.supervise'),...Object.entries(casePermissionAliases).filter(([,p])=>user.adminAccess.permissions.includes(p)).map(([alias])=>alias)])]};
  }
  async information(db,id,party=null){
    const rows=(await db.query(`SELECT * FROM order_service.case_information_requests WHERE case_id=$1
      AND ($2::text IS NULL OR recipient_kind=$2) ORDER BY created_at,id`,[id,party])).rows;
    const replies=rows.length?(await db.query(`SELECT * FROM order_service.case_information_replies
      WHERE request_id=ANY($1::uuid[]) ORDER BY created_at,id`,[rows.map(row=>row.id)])).rows:[];
    return rows.map(row=>({id:row.id,recipientKind:row.recipient_kind,prompt:row.prompt,dueAt:row.due_at,
      status:row.status,version:row.version,createdAt:row.created_at,
      replies:replies.filter(reply=>reply.request_id===row.id).map(reply=>({id:reply.id,actorType:reply.actor_type,message:reply.message,createdAt:reply.created_at}))}));
  }
  async detail(user,id){
    requireAdminPermission(user,'cases.read');adminId(id);
    const args=[id],scope=adminScopeSql(user,'cases.read',{storeIds:'o.store_id::text',caseKinds:'c.kind',assigneeIds:'c.assignee_id::text'},args);
    const row=(await this.pool.query(`SELECT ${columns} ${joins} WHERE c.id=$1 AND ${scope}`,args)).rows[0];
    if(!row)throw caseError(404,'CASE_NOT_FOUND','Không tìm thấy hồ sơ.');
    const [links,events,information]=await Promise.all([
      this.pool.query(`SELECT c.id,c.kind,c.shop_order_id FROM order_service.case_links l
        JOIN order_service.admin_cases c ON c.id=CASE WHEN l.source_id=$1 THEN l.target_id ELSE l.source_id END
        WHERE l.source_id=$1 OR l.target_id=$1 ORDER BY c.created_at`,[id]),
      this.pool.query('SELECT id,actor_id,action,reason,metadata,created_at FROM order_service.case_events WHERE case_id=$1 ORDER BY id DESC LIMIT 100',[id]),
      this.information(this.pool,id),
    ]);
    return {record:this.map(row),links:links.rows.map(link=>({id:link.id,kind:link.kind})),
      events:events.rows.map(event=>({id:String(event.id),actorId:event.actor_id,action:event.action,reason:event.reason,metadata:event.metadata,createdAt:event.created_at})),
      informationRequests:information,canViewEvidence:row.assignee_id===user.id||await casePermission(this.pool,user.id,'evidence.supervise')};
  }
  async staff(user,bearer,q=''){
    requireAdminPermission(user,'cases.read');caseText(q||'all',1,100);
    return this.order.identity('/admin/staff?'+new URLSearchParams({q}),bearer);
  }
  async assign(user,id,input,bearer){
    requireAdminPermission(user,'cases.update');adminId(id);caseInput(input,['assigneeId','dueAt','version','reason']);caseVersion(input.version);
    await requireCaseAccess(this.pool,user,'cases.update',id);
    const reason=caseText(input.reason,10,500),dueAt=caseDue(input.dueAt);
    if(input.assigneeId!==null){
      adminId(input.assigneeId);
      if(input.assigneeId!==user.id){
        const {items}=await this.order.identity('/admin/staff?'+new URLSearchParams({id:input.assigneeId}),bearer);
        if(!items.some(person=>person.id===input.assigneeId))throw caseError(400,'INVALID_ASSIGNEE','Người được giao phải có quyền xử lý hồ sơ và đang hoạt động.');
      }
    }
    return this.transaction(async db=>{
      const current=(await db.query('SELECT * FROM order_service.admin_cases WHERE id=$1 FOR UPDATE',[id])).rows[0];
      await requireCaseAccess(db,user,'cases.update',id);
      if(!current)throw caseError(404,'CASE_NOT_FOUND','Không tìm thấy hồ sơ.');
      if(current.version!==input.version)throw caseError(409,'CASE_STATE_CHANGED','Hồ sơ đã thay đổi. Hãy tải lại.');
      await db.query('UPDATE order_service.admin_cases SET assignee_id=$2,due_at=$3,version=version+1,updated_at=now() WHERE id=$1',[id,input.assigneeId,dueAt]);
      await db.query('DELETE FROM order_service.case_evidence_grants WHERE case_id=$1',[id]);
      await db.query('DELETE FROM order_service.case_resolution_grants WHERE case_id=$1',[id]);
      await caseAudit(db,id,user,'assignment_changed',reason,{readVersion:input.version,resultVersion:input.version+1,beforeAssignee:current.assignee_id,assigneeId:input.assigneeId,dueAt});
      return {id,version:current.version+1};
    });
  }
  async create(user,input){
    requireAdminPermission(user,'cases.create');caseInput(input,['kind','shopOrderId','subject','description','reasonCode','relatedCaseId','clientRequestId']);
    await requireOrderAccess(this.pool,user,'cases.create',input.shopOrderId,{caseKind:input.kind,assigneeId:user.id});
    if(!['TICKET','DISPUTE'].includes(input.kind))throw caseError(400,'INVALID_CASE_KIND','Chỉ tạo ticket hoặc khiếu nại/tranh chấp tại đây.');
    adminId(input.shopOrderId);adminId(input.clientRequestId);if(input.relatedCaseId)adminId(input.relatedCaseId);
    const subject=caseText(input.subject,5,200),description=caseText(input.description),reasonCode=input.reasonCode||'OTHER';
    if(!['DAMAGED','WRONG_ITEM','NOT_AS_DESCRIBED','PAYMENT','SERVICE','OTHER'].includes(reasonCode))throw caseError(400,'INVALID_CASE_REASON','Lý do không hợp lệ.');
    const fingerprint=hash(JSON.stringify([input.kind,input.shopOrderId,subject,description,reasonCode,input.relatedCaseId||null]));
    return this.transaction(async db=>{
      await db.query('SELECT pg_advisory_xact_lock(hashtext($1))',[user.id+input.clientRequestId]);
      const existing=(await db.query('SELECT id,creation_hash FROM order_service.admin_cases WHERE created_by=$1 AND creation_key=$2',[user.id,input.clientRequestId])).rows[0];
      if(existing){if(existing.creation_hash!==fingerprint)throw caseError(409,'CASE_KEY_REUSED','Mã tạo hồ sơ đã dùng cho nội dung khác.');return {id:existing.id};}
      const order=(await db.query('SELECT id FROM order_service.orders WHERE id=$1',[input.shopOrderId])).rows[0];
      if(!order)throw caseError(404,'ORDER_NOT_FOUND','Không tìm thấy đơn.');
      if(input.relatedCaseId){const related=(await db.query('SELECT shop_order_id FROM order_service.admin_cases WHERE id=$1',[input.relatedCaseId])).rows[0];
        if(!related||related.shop_order_id!==input.shopOrderId)throw caseError(400,'INVALID_CASE_LINK','Chỉ liên kết hồ sơ của cùng đơn hàng.');}
      const row=(await db.query(`INSERT INTO order_service.admin_cases(kind,shop_order_id,assignee_id,created_by,creation_key,creation_hash)
        VALUES($1,$2,$3,$3,$4,$5) RETURNING id`,[input.kind,input.shopOrderId,user.id,input.clientRequestId,fingerprint])).rows[0];
      if(input.kind==='TICKET')await db.query('INSERT INTO order_service.support_tickets(id,subject,description,reason_code) VALUES($1,$2,$3,$4)',[row.id,subject,description,reasonCode]);
      else await db.query('INSERT INTO order_service.disputes(id,subject,description,reason_code) VALUES($1,$2,$3,$4)',[row.id,subject,description,reasonCode]);
      if(input.relatedCaseId)await db.query('INSERT INTO order_service.case_links(source_id,target_id,created_by) VALUES($1,$2,$3)',[row.id,input.relatedCaseId,user.id]);
      await caseAudit(db,row.id,user,'case_created',description,{readVersion:0,resultVersion:1,kind:input.kind,relatedCaseId:input.relatedCaseId||null});
      return {id:row.id};
    });
  }
  async status(user,id,input){
    requireAdminPermission(user,'cases.update');adminId(id);caseInput(input,['status','version','reason']);caseVersion(input.version);const reason=caseText(input.reason,10,500);
    await requireCaseAccess(this.pool,user,'cases.update',id);
    const transitions={TICKET:{NEW:['IN_PROGRESS'],IN_PROGRESS:['WAITING_CUSTOMER','RESOLVED'],WAITING_CUSTOMER:['IN_PROGRESS','RESOLVED'],RESOLVED:['CLOSED','IN_PROGRESS']},
      DISPUTE:{OPEN:['INVESTIGATING'],INVESTIGATING:['AWAITING_DECISION'],AWAITING_DECISION:['DECIDED','INVESTIGATING'],DECIDED:['CLOSED']}};
    return this.transaction(async db=>{
      const row=(await db.query('SELECT * FROM order_service.admin_cases WHERE id=$1 FOR UPDATE',[id])).rows[0];
      await requireCaseAccess(db,user,'cases.update',id);
      if(!row)throw caseError(404,'CASE_NOT_FOUND','Không tìm thấy hồ sơ.');
      if(row.kind==='RETURN')throw caseError(400,'WRONG_CASE_COMMAND','Trả hàng sử dụng luồng quyết định riêng.');
      if(row.kind==='DISPUTE'&&['DECIDED','CLOSED'].includes(input.status))throw caseError(400,'STRUCTURED_DECISION_REQUIRED','Dùng phiếu quyết định và đóng hồ sơ có kiểm tra nghĩa vụ/kháng nghị.');
      if(row.version!==input.version)throw caseError(409,'CASE_STATE_CHANGED','Hồ sơ đã thay đổi.');
      const table=row.kind==='TICKET'?'support_tickets':'disputes';
      const current=(await db.query(`SELECT status FROM order_service.${table} WHERE id=$1`,[id])).rows[0];
      if(!transitions[row.kind][current.status]?.includes(input.status))throw caseError(409,'INVALID_CASE_TRANSITION','Không được chuyển sang trạng thái này.');
      await db.query(`UPDATE order_service.${table} SET status=$2 WHERE id=$1`,[id,input.status]);
      await db.query('UPDATE order_service.admin_cases SET version=version+1,updated_at=now() WHERE id=$1',[id]);
      await caseAudit(db,id,user,'status_changed',reason,{readVersion:input.version,resultVersion:input.version+1,from:current.status,to:input.status,kind:row.kind});
      return {id,status:input.status};
    });
  }
  async requestInformation(user,id,input){
    requireAdminPermission(user,'cases.update');adminId(id);caseInput(input,['recipientKind','prompt','dueAt','version']);caseVersion(input.version);
    await requireCaseAccess(this.pool,user,'cases.update',id);
    if(!['BUYER','SELLER'].includes(input.recipientKind))throw caseError(400,'INVALID_CASE_RECIPIENT','Bên nhận không hợp lệ.');
    const prompt=caseText(input.prompt),dueAt=caseDue(input.dueAt);
    return this.transaction(async db=>{
      const row=(await db.query('SELECT * FROM order_service.admin_cases WHERE id=$1 FOR UPDATE',[id])).rows[0];
      await requireCaseAccess(db,user,'cases.update',id);
      if(!row)throw caseError(404,'CASE_NOT_FOUND','Không tìm thấy hồ sơ.');
      if(row.version!==input.version)throw caseError(409,'CASE_STATE_CHANGED','Hồ sơ đã thay đổi.');
      const state=(await db.query(`SELECT coalesce(r.status,t.status,d.status) AS status ${joins} WHERE c.id=$1`,[id])).rows[0].status;
      if(['CLOSED','REJECTED','REFUNDED','RESOLVED','DECIDED'].includes(state))throw caseError(409,'CASE_CLOSED','Hồ sơ đã kết thúc.');
      const request=(await db.query(`INSERT INTO order_service.case_information_requests(case_id,recipient_kind,prompt,due_at,created_by)
        VALUES($1,$2,$3,$4,$5) RETURNING id`,[id,input.recipientKind,prompt,dueAt,user.id])).rows[0];
      await db.query("UPDATE order_service.admin_cases SET workflow_status='WAITING_INFORMATION',version=version+1,updated_at=now() WHERE id=$1",[id]);
      await caseAudit(db,id,user,'information_requested',prompt,{readVersion:input.version,resultVersion:input.version+1,requestId:request.id,recipientKind:input.recipientKind,dueAt});
      await db.query(`INSERT INTO order_service.order_outbox(event_type,aggregate_id,payload) VALUES('CaseInformationRequested.v1',$1,$2)`,
        [row.shop_order_id,{caseId:id,requestId:request.id,shopOrderId:row.shop_order_id,recipientKind:input.recipientKind}]);
      return {id:request.id};
    });
  }
  async participant(userId,orderId){
    adminId(orderId);const row=(await this.pool.query('SELECT user_id,store_id FROM order_service.orders WHERE id=$1',[orderId])).rows[0];
    if(!row)throw caseError(404,'ORDER_NOT_FOUND','Không tìm thấy đơn.');
    if(row.user_id===userId)return 'BUYER';
    await this.order.inventory('/stores/'+row.store_id+'/membership?userId='+encodeURIComponent(userId));
    return 'SELLER';
  }
  async participantCases(userId,orderId){
    const party=await this.participant(userId,orderId);
    const rows=(await this.pool.query(`SELECT ${columns} ${joins} WHERE c.shop_order_id=$1 ORDER BY c.created_at DESC LIMIT 100`,[orderId])).rows;
    const items=[];
    for(const row of rows)items.push({id:row.id,kind:row.kind,subject:row.subject,status:row.case_status,workflowStatus:row.workflow_status,informationRequests:await this.information(this.pool,row.id,party)});
    return {items};
  }
  async reply(userId,caseId,requestId,input){
    adminId(caseId);adminId(requestId);caseInput(input,['message','version']);caseVersion(input.version);const message=caseText(input.message);
    const c=(await this.pool.query('SELECT shop_order_id FROM order_service.admin_cases WHERE id=$1',[caseId])).rows[0];
    if(!c)throw caseError(404,'CASE_NOT_FOUND','Không tìm thấy hồ sơ.');
    const party=await this.participant(userId,c.shop_order_id);
    return this.transaction(async db=>{
      await db.query('SELECT id FROM order_service.admin_cases WHERE id=$1 FOR UPDATE',[caseId]);
      const state=(await db.query(`SELECT coalesce(r.status,t.status,d.status) AS status ${joins} WHERE c.id=$1`,[caseId])).rows[0]?.status;
      if(['CLOSED','REJECTED','REFUNDED','RESOLVED','DECIDED'].includes(state))throw caseError(409,'CASE_CLOSED','Hồ sơ đã kết thúc.');
      const row=(await db.query('SELECT * FROM order_service.case_information_requests WHERE id=$1 AND case_id=$2 FOR UPDATE',[requestId,caseId])).rows[0];
      if(!row||row.recipient_kind!==party)throw caseError(403,'INFORMATION_RECIPIENT_ONLY','Chỉ bên được yêu cầu mới được phản hồi.');
      if(row.status==='CANCELLED'||row.version!==input.version)throw caseError(409,'INFORMATION_STATE_CHANGED','Yêu cầu bổ sung đã thay đổi.');
      await db.query('INSERT INTO order_service.case_information_replies(request_id,actor_id,actor_type,message) VALUES($1,$2,$3,$4)',[requestId,userId,party,message]);
      await db.query("UPDATE order_service.case_information_requests SET status='RESPONDED',version=version+1 WHERE id=$1",[requestId]);
      await db.query(`UPDATE order_service.admin_cases SET version=version+1,workflow_status=CASE WHEN workflow_status='WAITING_INFORMATION'
        AND NOT EXISTS(SELECT 1 FROM order_service.case_information_requests WHERE case_id=$1 AND status='OPEN') THEN
          CASE WHEN EXISTS(SELECT 1 FROM order_service.case_obligations WHERE case_id=$1 AND status='PENDING') THEN 'WAITING_FULFILLMENT'
            WHEN EXISTS(SELECT 1 FROM order_service.case_decisions WHERE case_id=$1 AND status='PROPOSED') THEN 'AWAITING_APPROVAL'
            WHEN EXISTS(SELECT 1 FROM order_service.case_decisions WHERE case_id=$1 AND status='PUBLISHED') THEN 'DECIDED'
            ELSE 'IN_REVIEW' END ELSE workflow_status END WHERE id=$1`,[caseId]);
      await caseAudit(db,caseId,{id:userId},'information_replied',message,{requestId,party});
      return {id:requestId,version:row.version+1};
    });
  }
  async orderContext(user,id){
    requireAdminPermission(user,'cases.read');adminId(id);
    await requireOrderAccess(this.pool,user,'cases.read',id,{caseKind:'RETURN',assigneeId:user.id});
    const row=(await this.pool.query(`SELECT id,user_id,status,payable_total_minor,refunded_minor FROM order_service.orders WHERE id=$1`,[id])).rows[0];
    if(!row)throw caseError(404,'ORDER_NOT_FOUND','Không tìm thấy đơn.');
    const delivered=(await this.pool.query(`SELECT min(occurred_at) AS time FROM order_service.order_status_history WHERE shop_order_id=$1 AND to_status='DELIVERED'`,[id])).rows[0].time;
    const policy=delivered?(await this.pool.query('SELECT * FROM order_service.return_policies WHERE effective_at<=$1 ORDER BY effective_at DESC LIMIT 1',[delivered])).rows[0]:null;
    const items=(await this.pool.query('SELECT id,product_name,quantity FROM order_service.order_items WHERE order_id=$1 ORDER BY id',[id])).rows;
    return {orderId:id,buyerId:row.user_id,status:row.status,deliveredAt:delivered,policyVersion:policy?.id,windowDays:policy?.window_days,
      items:items.map(item=>({id:item.id,name:item.product_name,quantity:item.quantity}))};
  }
  async requestException(user,input){
    requireAdminPermission(user,'refunds.create');await requireCasePermission(this.pool,user,'exception.request');
    await requireOrderAccess(this.pool,user,'refunds.create',input.shopOrderId,{caseKind:'RETURN',assigneeId:user.id});
    caseInput(input,['shopOrderId','payload','reason','clientRequestId']);adminId(input.shopOrderId);adminId(input.clientRequestId);
    const reason=caseText(input.reason,10,500),payload=validateReturnInput(input.payload),context=await this.orderContext(user,input.shopOrderId);
    if(context.buyerId===user.id||!['DELIVERED','COMPLETED'].includes(context.status)||!context.deliveredAt||
      Date.now()-new Date(context.deliveredAt).getTime()<=context.windowDays*86400000)
      throw caseError(409,'EXCEPTION_NOT_REQUIRED','Chỉ tiếp nhận ngoại lệ cho đơn đã giao quá hạn; không tự đề nghị cho đơn của mình.');
    if(payload.items.some(item=>!context.items.some(ordered=>ordered.id===item.orderItemId&&ordered.quantity>=item.quantity)))
      throw caseError(400,'INVALID_RETURN_ITEMS','Sản phẩm hoặc số lượng không thuộc đơn.');
    return this.transaction(async db=>{
      await db.query('SELECT pg_advisory_xact_lock(hashtext($1))',[input.clientRequestId]);
      await requireCasePermission(db,user,'exception.request');
      const existing=(await db.query('SELECT * FROM order_service.return_exceptions WHERE client_request_id=$1',[input.clientRequestId])).rows[0];
      if(existing){
        if(existing.requested_by!==user.id||existing.reason!==reason||existing.shop_order_id!==input.shopOrderId||
          JSON.stringify(validateReturnInput(existing.request_payload))!==JSON.stringify(payload))throw caseError(409,'CASE_KEY_REUSED','Mã yêu cầu đã dùng cho nội dung khác.');
        return {id:existing.id};
      }
      const source=(await db.query('SELECT * FROM order_service.orders WHERE id=$1 FOR UPDATE',[input.shopOrderId])).rows[0];
      const snapshot=await this.returns.approvalSnapshot(db,source,payload);
      const row=(await db.query(`INSERT INTO order_service.return_exceptions(shop_order_id,buyer_id,request_payload,requested_by,reason,client_request_id,policy_version,delivered_at_snapshot,approval_snapshot)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,[input.shopOrderId,context.buyerId,payload,user.id,reason,input.clientRequestId,context.policyVersion,context.deliveredAt,snapshot])).rows[0];
      await db.query(`INSERT INTO order_service.return_exception_actions(exception_id,actor_id,action,reason,read_version,result_version,next_status)
        VALUES($1,$2,'requested',$3,0,1,'REQUESTED')`,[row.id,user.id,reason]);
      return {id:row.id};
    });
  }
  async exceptions(user){
    requireAdminPermission(user,'refunds.read');
    const allowed=await casePermission(this.pool,user,'exception.approve');
    const args=[user.id,allowed],scope=adminScopeSql(user,'refunds.read',{storeIds:'o.store_id::text',caseKinds:"'RETURN'",assigneeIds:'e.requested_by::text'},args);
    const rows=(await this.pool.query(`SELECT e.* FROM order_service.return_exceptions e JOIN order_service.orders o ON o.id=e.shop_order_id WHERE (e.requested_by=$1 OR $2::boolean) AND ${scope} ORDER BY e.created_at DESC LIMIT 100`,args)).rows;
    return {items:rows.map(row=>({id:row.id,shopOrderId:row.shop_order_id,requestedBy:row.requested_by,reason:row.reason,status:row.status,
      payload:row.request_payload,approvalSnapshot:row.approval_snapshot,deliveredAt:row.delivered_at_snapshot,version:row.version,approvedBy:row.approved_by,decisionReason:row.decision_reason,resultReturnId:row.result_return_id,policyVersion:row.policy_version,createdAt:row.created_at}))};
  }
  async decideException(user,id,input){
    requireAdminPermission(user,'refunds.approve');adminId(id);await requireCasePermission(this.pool,user,'exception.approve');
    const target=(await this.pool.query('SELECT shop_order_id FROM order_service.return_exceptions WHERE id=$1',[id])).rows[0];
    if(!target)throw caseError(404,'EXCEPTION_NOT_FOUND','Không tìm thấy ngoại lệ.');
    await requireOrderAccess(this.pool,user,'refunds.approve',target.shop_order_id,{caseKind:'RETURN',assigneeId:user.id});
    caseInput(input,['action','version','reason']);caseVersion(input.version);const reason=caseText(input.reason,10,500);
    if(!['approve','reject'].includes(input.action))throw caseError(400,'INVALID_EXCEPTION_ACTION','Quyết định không hợp lệ.');
    const row=(await this.pool.query('SELECT * FROM order_service.return_exceptions WHERE id=$1',[id])).rows[0];
    if(!row)throw caseError(404,'EXCEPTION_NOT_FOUND','Không tìm thấy ngoại lệ.');
    if(row.requested_by===user.id||row.buyer_id===user.id)throw caseError(403,'EXCEPTION_SELF_APPROVAL','Người duyệt phải khác người đề nghị và người mua.');
    if(row.status!=='REQUESTED'||row.version!==input.version)throw caseError(409,'EXCEPTION_CHANGED','Ngoại lệ đã được xử lý hoặc thay đổi.');
    if(input.action==='approve')return this.returns.create(row.buyer_id,row.shop_order_id,row.request_payload,{id,actorId:user.id,version:input.version,reason});
    return this.transaction(async db=>{
      await requireCasePermission(db,user,'exception.approve');
      const result=await db.query(`UPDATE order_service.return_exceptions SET status='REJECTED',approved_by=$2,decision_reason=$3,decided_at=now(),version=version+1
        WHERE id=$1 AND status='REQUESTED' AND version=$4 RETURNING id`,[id,user.id,reason,input.version]);
      if(!result.rowCount)throw caseError(409,'EXCEPTION_CHANGED','Ngoại lệ đã được xử lý.');
      await db.query(`INSERT INTO order_service.return_exception_actions(exception_id,actor_id,action,reason,read_version,result_version,next_status)
        VALUES($1,$2,'rejected',$3,$4,$5,'REJECTED')`,[id,user.id,reason,input.version,input.version+1]);
      return {id,status:'REJECTED'};
    });
  }
  async issueEvidence(user,id,evidenceId,reason){
    requireAdminPermission(user,'cases.view_sensitive');adminId(id);adminId(evidenceId);reason=caseText(reason,10,500);
    await requireCaseAccess(this.pool,user,'cases.view_sensitive',id);
    return this.transaction(async db=>{
      await db.query('SELECT id FROM order_service.admin_cases WHERE id=$1 FOR UPDATE',[id]);
      await requireCaseAccess(db,user,'cases.view_sensitive',id);
      await requireEvidenceScope(db,user,id);
      if(!(await db.query('SELECT 1 FROM order_service.return_evidence WHERE id=$1 AND request_id=$2',[evidenceId,id])).rowCount)
        throw caseError(404,'EVIDENCE_NOT_FOUND','Không tìm thấy chứng cứ của hồ sơ.');
      const token=randomBytes(32).toString('base64url'),expiresAt=new Date(Date.now()+60000).toISOString();
      await db.query(`INSERT INTO order_service.case_evidence_grants(token_hash,case_id,evidence_id,actor_id,reason,expires_at)
        VALUES($1,$2,$3,$4,$5,$6)`,[hash(token),id,evidenceId,user.id,reason,expiresAt]);
      await caseAudit(db,id,user,'evidence_access_issued',reason,{evidenceId,expiresAt});
      return {url:`/api/v2/admin/returns/${id}/evidence/${evidenceId}?grant=${token}`,expiresAt};
    });
  }
  async evidence(user,id,evidenceId,token){
    requireAdminPermission(user,'cases.view_sensitive');adminId(id);adminId(evidenceId);
    await requireCaseAccess(this.pool,user,'cases.view_sensitive',id);
    if(typeof token!=='string'||!/^[\w-]{43}$/.test(token))throw caseError(403,'EVIDENCE_GRANT_REQUIRED','Cần liên kết xem chứng cứ còn hiệu lực.');
    return this.transaction(async db=>{
      await db.query('SELECT id FROM order_service.admin_cases WHERE id=$1 FOR UPDATE',[id]);
      await requireCaseAccess(db,user,'cases.view_sensitive',id);
      await requireEvidenceScope(db,user,id);
      const grant=(await db.query(`UPDATE order_service.case_evidence_grants SET used_at=now() WHERE token_hash=$1 AND case_id=$2
        AND evidence_id=$3 AND actor_id=$4 AND expires_at>now() AND used_at IS NULL RETURNING reason`,[hash(token),id,evidenceId,user.id])).rows[0];
      if(!grant)throw caseError(403,'EVIDENCE_GRANT_EXPIRED','Liên kết hết hạn, đã dùng hoặc không đúng người xem.');
      const image=(await db.query('SELECT mime_type,data FROM order_service.return_evidence WHERE id=$1 AND request_id=$2',[evidenceId,id])).rows[0];
      if(!image)throw caseError(404,'EVIDENCE_NOT_FOUND','Không tìm thấy chứng cứ.');
      await caseAudit(db,id,user,'evidence_viewed',grant.reason,{evidenceId});
      await db.query(`INSERT INTO order_service.admin_return_actions(request_id,actor_id,action,previous_status,next_status,reason,evidence_id)
        SELECT id,$2,'view_evidence',status,status,$3,$4 FROM order_service.return_requests WHERE id=$1`,[id,user.id,grant.reason,evidenceId]);
      return {mimeType:image.mime_type,data:image.data};
    });
  }
}
