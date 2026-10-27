import {adminId,adminMoney,PlatformAdminError} from '../../../packages/contracts/platform-admin.js';
import {requireAdminPermission,requireAdminScope,adminScopeSql} from '../../../packages/contracts/admin-rbac.js';
import {approvalFingerprint,verifyApprovalBinding,requireIndependentApprover} from '../../../packages/contracts/approval-binding.js';
import {caseInput,caseText,caseVersion} from './case-contract.js';

const operations={return_approve:{resource:'refunds'},cancel_paid_order:{resource:'orders'}};
const fail=(status,code,message)=>new PlatformAdminError(status,code,message);
export class AdminApprovalService {
  constructor(order){this.order=order;this.pool=order.pool;}
  definition(operation){const d=operations[operation];if(!d)throw fail(400,'INVALID_APPROVAL_OPERATION','Thao tác chưa có luồng thực thi được hỗ trợ.');return d;}
  async policy(db,operation){
    this.definition(operation);
    const row=(await db.query('SELECT * FROM order_service.admin_approval_policies WHERE operation=$1 FOR SHARE',[operation])).rows[0];
    if(!row)throw fail(503,'APPROVAL_POLICY_MISSING','Chưa cấu hình ngưỡng phê duyệt.');
    return {version:row.version,thresholdMinor:adminMoney(row.threshold_minor)};
  }
  async snapshot(db,operation,targetId,{requireEligible=true}={}){
    this.definition(operation);adminId(targetId);
    const row=operation==='return_approve'?(await db.query(`SELECT r.id,r.version,r.status,r.eligible_refund_minor AS amount_minor,
      r.buyer_id AS recipient_id,r.store_id,c.assignee_id,r.policy_version,r.shop_order_id
      FROM order_service.return_requests r JOIN order_service.admin_cases c ON c.id=r.id WHERE r.id=$1 FOR UPDATE OF r`,[targetId])).rows[0]
      :(await db.query(`SELECT id,version,status,CASE WHEN payment_status='PAID' THEN payable_total_minor ELSE 0 END AS amount_minor,
        user_id AS recipient_id,store_id FROM order_service.orders WHERE id=$1 FOR UPDATE`,[targetId])).rows[0];
    if(!row)throw fail(404,'APPROVAL_TARGET_NOT_FOUND','Không tìm thấy đối tượng duyệt.');
    if(requireEligible&&(operation==='return_approve'&&row.status!=='UNDER_REVIEW'||operation==='cancel_paid_order'&&!['PLACED','CONFIRMED','PREPARING','READY_TO_SHIP'].includes(row.status)))
      throw fail(409,'APPROVAL_TARGET_STATE','Đối tượng không ở trạng thái cho phép lập yêu cầu.');
    return {targetId,version:Number(row.version),status:row.status,amountMinor:adminMoney(row.amount_minor),
      recipientId:row.recipient_id,storeId:row.store_id,...(operation==='return_approve'?{caseKind:'RETURN',assigneeId:row.assignee_id,returnPolicyVersion:row.policy_version,shopOrderId:row.shop_order_id}:{})};
  }
  async current(id){return this.order.adminActor(id);}
  async event(db,id,user,action,reason,metadata={}){
    await db.query('INSERT INTO order_service.admin_approval_events(approval_id,actor_id,action,reason,metadata) VALUES($1,$2,$3,$4,$5)',[id,user.id,action,reason,metadata]);
  }
  async create(user,input){
    caseInput(input,['operation','targetId','version','reason','requestId']);
    input={...input,targetId:adminId(input.targetId).toLowerCase(),requestId:adminId(input.requestId).toLowerCase()};
    const definition=this.definition(input.operation),permission=definition.resource+'.create';requireAdminPermission(user,permission);
    const reason=caseText(input.reason,10,500);if(!Number.isSafeInteger(input.version)||input.version<0)throw fail(400,'INVALID_VERSION','Phiên bản không hợp lệ.');
    return this.order.transaction(async db=>{
      await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[user.id+input.requestId]);
      const previous=(await db.query('SELECT * FROM order_service.admin_approvals WHERE created_by=$1 AND request_id=$2',[user.id,input.requestId])).rows[0];
      if(previous){
        requireAdminScope(user,permission,previous.snapshot);
        if(previous.operation!==input.operation||previous.target_id!==input.targetId||previous.reason!==reason||previous.snapshot.version!==input.version)
          throw fail(409,'IDEMPOTENCY_CONFLICT','Mã yêu cầu đã dùng cho nội dung khác.');
        return previous;
      }
      const snapshot=await this.snapshot(db,input.operation,input.targetId),policy=await this.policy(db,input.operation);
      requireAdminScope(await this.current(user.id),permission,snapshot);
      if(snapshot.version!==input.version)throw fail(409,'VERSION_CONFLICT','Đối tượng đã thay đổi.');
      if(snapshot.recipientId===user.id)throw fail(403,'PARTY_REVIEW_FORBIDDEN','Không lập yêu cầu tài chính cho chính mình.');
      const fingerprint=approvalFingerprint({operation:input.operation,targetId:input.targetId,snapshot,policyVersion:policy.version});
      const row=(await db.query(`INSERT INTO order_service.admin_approvals(operation,target_id,snapshot,fingerprint,policy_version,created_by,request_id,reason)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,[input.operation,input.targetId,snapshot,fingerprint,policy.version,user.id,input.requestId,reason])).rows[0];
      await this.event(db,row.id,user,'created',reason,{fingerprint});return row;
    });
  }
  async review(user,id,input){
    adminId(id);caseInput(input,['version','action','reason']);caseVersion(input.version);const reason=caseText(input.reason,10,500);
    if(!['approve','reject'].includes(input.action))throw fail(400,'INVALID_APPROVAL_ACTION','Quyết định không hợp lệ.');
    return this.order.transaction(async db=>{
      // Domain row before approval row: same lock order as execution.
      const pending=(await db.query('SELECT * FROM order_service.admin_approvals WHERE id=$1',[id])).rows[0];
      if(!pending)throw fail(404,'APPROVAL_NOT_FOUND','Không tìm thấy yêu cầu.');
      const definition=this.definition(pending.operation);requireAdminPermission(user,definition.resource+'.approve');
      const snapshot=await this.snapshot(db,pending.operation,pending.target_id,{requireEligible:input.action==='approve'});
      const policy=await this.policy(db,pending.operation);
      const row=(await db.query('SELECT * FROM order_service.admin_approvals WHERE id=$1 FOR UPDATE',[id])).rows[0];
      if(row.status!=='REQUESTED'||row.version!==input.version)throw fail(409,'APPROVAL_CHANGED','Yêu cầu đã thay đổi.');
      requireIndependentApprover(row.created_by,user.id);
      requireAdminScope(await this.current(user.id),definition.resource+'.approve',snapshot);
      if(input.action==='approve')requireAdminScope(await this.current(row.created_by),definition.resource+'.create',snapshot);
      if(snapshot.recipientId===user.id)throw fail(403,'PARTY_REVIEW_FORBIDDEN','Không duyệt yêu cầu tài chính của chính mình.');
      if(input.action==='approve')verifyApprovalBinding(row,{operation:row.operation,targetId:row.target_id,snapshot,policyVersion:policy.version});
      const result=(await db.query(`UPDATE order_service.admin_approvals SET status=$2,reviewed_by=$3,review_reason=$4,reviewed_at=now(),version=version+1 WHERE id=$1 RETURNING *`,[id,input.action==='approve'?'APPROVED':'REJECTED',user.id,reason])).rows[0];
      await this.event(db,id,user,input.action,reason,{fingerprint:row.fingerprint});return result;
    });
  }
  // Caller must own the domain transaction. Receipt and domain mutation commit together.
  async consume(db,user,operation,targetId,approvalId){
    targetId=adminId(targetId).toLowerCase();
    const definition=this.definition(operation),snapshot=await this.snapshot(db,operation,targetId),policy=await this.policy(db,operation);
    requireAdminScope(await this.current(user.id),definition.resource+'.execute',snapshot);
    if(snapshot.amountMinor<=policy.thresholdMinor&&!approvalId)return;
    if(!approvalId)throw fail(409,'INDEPENDENT_APPROVAL_REQUIRED','Thao tác cần yêu cầu đã được người khác duyệt.');
    adminId(approvalId);
    const row=(await db.query('SELECT * FROM order_service.admin_approvals WHERE id=$1 FOR UPDATE',[approvalId])).rows[0];
    if(!row||row.status!=='APPROVED')throw fail(409,'APPROVAL_REQUIRED','Yêu cầu chưa được duyệt hoặc đã thực thi.');
    requireIndependentApprover(row.created_by,row.reviewed_by);
    verifyApprovalBinding(row,{operation,targetId,snapshot,policyVersion:policy.version});
    requireAdminScope(await this.current(row.created_by),definition.resource+'.create',snapshot);
    requireAdminScope(await this.current(row.reviewed_by),definition.resource+'.approve',snapshot);
    await db.query("UPDATE order_service.admin_approvals SET status='EXECUTED',executed_by=$2,executed_at=now(),version=version+1 WHERE id=$1",[row.id,user.id]);
    await this.event(db,row.id,user,'executed','Thực thi trong giao dịch nghiệp vụ.',{fingerprint:row.fingerprint});
  }
  async list(user,operation){
    const definition=this.definition(operation),args=[operation];
    const scope=adminScopeSql(user,definition.resource+'.read',{storeIds:"snapshot->>'storeId'",caseKinds:"snapshot->>'caseKind'",assigneeIds:"snapshot->>'assigneeId'"},args);
    return {items:(await this.pool.query(`SELECT * FROM order_service.admin_approvals WHERE operation=$1 AND ${scope} ORDER BY created_at DESC,id DESC LIMIT 100`,args)).rows};
  }
  async policies(user){requireAdminScope(user,'approval_policy.read',{});return {items:(await this.pool.query('SELECT * FROM order_service.admin_approval_policies ORDER BY operation')).rows};}
  async updatePolicy(user,operation,input){
    requireAdminScope(user,'approval_policy.update',{});this.definition(operation);caseInput(input,['version','thresholdMinor','reason']);caseVersion(input.version);
    if(!Number.isSafeInteger(input.thresholdMinor)||input.thresholdMinor<0)throw fail(400,'INVALID_APPROVAL_THRESHOLD','Ngưỡng phải là số nguyên VND không âm trong giới hạn an toàn.');
    const threshold=input.thresholdMinor,reason=caseText(input.reason,10,500);
    return this.order.transaction(async db=>{
      requireAdminScope(await this.current(user.id),'approval_policy.update',{});
      const result=await db.query('UPDATE order_service.admin_approval_policies SET threshold_minor=$2,version=version+1,updated_at=now() WHERE operation=$1 AND version=$3 RETURNING *',[operation,threshold,input.version]);
      if(!result.rowCount)throw fail(409,'VERSION_CONFLICT','Chính sách đã thay đổi.');
      await this.event(db,null,user,'policy_updated',reason,{operation,thresholdMinor:threshold,readVersion:input.version,resultVersion:input.version+1});return result.rows[0];
    });
  }
}
