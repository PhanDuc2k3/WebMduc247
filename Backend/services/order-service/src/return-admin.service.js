import {requireCaseAccess} from './admin-scope.js';
import {requireAdminPermission} from '../../../packages/contracts/admin-rbac.js';
import {adminId, PlatformAdminError} from '../../../packages/contracts/platform-admin.js';
import {CaseService} from './case.service.js';
import {caseFilters} from './case-contract.js';
import {CaseResolutionService, decisionBasis} from './case-resolution.service.js';
import {AdminApprovalService} from './admin-approval.service.js';

export const returnStatuses = ['REQUESTED','UNDER_REVIEW','APPROVED','REJECTED','RETURNING',
  'RECEIVED','REFUND_PENDING','REFUNDED','CLOSED'];
const invalid = message => new PlatformAdminError(400,'INVALID_RETURN_COMMAND',message);
const decisionRules = {
  review: {from:'REQUESTED',to:'UNDER_REVIEW'},
  approve: {from:'UNDER_REVIEW',to:'APPROVED'},
  reject: {from:'UNDER_REVIEW',to:'REJECTED'},
};
function reasonText(value) {
  if(typeof value !== 'string' || value.trim().length < 10 || value.trim().length > 500 ||
    /[\u0000-\u001f\u007f]|<[^>]*>/u.test(value))
    throw invalid('Nhập lý do từ 10 đến 500 ký tự, không chứa HTML hoặc ký tự điều khiển.');
  return value.trim();
}
export function returnAdminFilters(query = {}) {
  if(query.kind)throw new PlatformAdminError(400,'INVALID_ADMIN_FILTER','Bộ lọc loại hồ sơ không hợp lệ.');
  return caseFilters({...query,kind:'RETURN'});
}
export function returnAdminDecision(input) {
  if(!input || typeof input !== 'object' || Array.isArray(input) ||
    Object.keys(input).some(key => !['action','reason','version','responsibleParty','policyVersion','basisSummary','evidenceRefs','approvalId'].includes(key)) ||
    !Object.hasOwn(decisionRules,input.action) || !Number.isSafeInteger(input.version) || input.version < 1)
    throw invalid('Thao tác hoặc phiên bản yêu cầu không hợp lệ.');
  if(input.approvalId&&input.action!=='approve')throw invalid('Mã phê duyệt chỉ dùng cho thao tác chấp nhận.');
  return {...input,reason:reasonText(input.reason),...(input.action==='review'?{}:decisionBasis(input))};
}

export class ReturnAdminService {
  constructor(returns) { this.returns = returns; this.pool = returns.pool; this.cases=new CaseService(returns); }
  dto(row) {
    return {...this.returns.dto(row),adminResponse:row.admin_response || null,
      storeName:row.store_snapshot_json?.name || 'Chưa có tên cửa hàng',groupId:row.group_id,
      orderStatus:row.order_status,paymentMethod:row.payment_method,paymentStatus:row.payment_status,
      orderTotalMinor:Number(row.payable_total_minor),refundedMinor:Number(row.refunded_minor || 0),
      refundReference:row.refund_reference || null,refundNeedsAttention:Boolean(row.last_refund_error)};
  }
  async list(user,query) {
    requireAdminPermission(user,'returns.read');
    if(Object.hasOwn(query,'kind'))throw new PlatformAdminError(400,'INVALID_ADMIN_FILTER','Bộ lọc loại hồ sơ không hợp lệ.');
    return this.cases.list(user,{...query,kind:'RETURN'},{permission:'returns.read'});
  }
  async detail(user,id) {
    requireAdminPermission(user,'returns.read'); adminId(id);
    await requireCaseAccess(this.pool,user,'returns.read',id);
    const row = (await this.pool.query(`SELECT r.*,o.group_id,o.status AS order_status,o.payment_method,
      o.payment_status,o.payable_total_minor,o.refunded_minor,o.store_snapshot_json
      FROM order_service.return_requests r JOIN order_service.orders o ON o.id=r.shop_order_id WHERE r.id=$1`,[id])).rows[0];
    if(!row) throw new PlatformAdminError(404,'RETURN_NOT_FOUND','Không tìm thấy yêu cầu trả hàng.');
    const [items,evidence,history,audit,caseDetail] = await Promise.all([
      this.pool.query(`SELECT ri.order_item_id,ri.quantity,ri.eligible_refund_minor,i.product_name,i.sku
        FROM order_service.return_items ri JOIN order_service.order_items i ON i.id=ri.order_item_id
        WHERE ri.request_id=$1 ORDER BY ri.order_item_id`,[id]),
      this.pool.query(`SELECT id,mime_type,created_at FROM order_service.return_evidence
        WHERE request_id=$1 ORDER BY created_at,id`,[id]),
      this.pool.query(`SELECT from_status,to_status,actor_type,note,created_at
        FROM order_service.return_history WHERE request_id=$1 ORDER BY id DESC`,[id]),
      this.pool.query(`SELECT id,actor_id,action,previous_status,next_status,reason,evidence_id,created_at,read_version,result_version
        FROM order_service.admin_return_actions WHERE request_id=$1 ORDER BY id DESC LIMIT 100`,[id]),
      this.cases.detail(user,id),
    ]);
    return {record:{...this.dto(row),items:items.rows.map(item => ({orderItemId:item.order_item_id,
      name:item.product_name,sku:item.sku,quantity:item.quantity,eligibleRefundMinor:Number(item.eligible_refund_minor)})),
      evidence:evidence.rows.map(image => ({id:image.id,mimeType:image.mime_type,createdAt:image.created_at}))},
      case:caseDetail,history:history.rows.map(event => ({fromStatus:event.from_status,toStatus:event.to_status,
        actorType:event.actor_type,note:event.note,createdAt:event.created_at})),
      audit:audit.rows.map(event => ({id:String(event.id),actorId:event.actor_id,action:event.action,
        fromStatus:event.previous_status,toStatus:event.next_status,reason:event.reason,
        evidenceId:event.evidence_id,createdAt:event.created_at,readVersion:event.read_version,resultVersion:event.result_version}))};
  }
  async decide(user,id,input) {
    requireAdminPermission(user,'returns.moderate'); adminId(id);
    await requireCaseAccess(this.pool,user,'returns.moderate',id);
    const command = returnAdminDecision(input), rule = decisionRules[command.action];
    const db = await this.pool.connect();
    try {
      await db.query('BEGIN');
      const current = (await db.query('SELECT * FROM order_service.return_requests WHERE id=$1 FOR UPDATE',[id])).rows[0];
      if(!current) throw new PlatformAdminError(404,'RETURN_NOT_FOUND','Không tìm thấy yêu cầu trả hàng.');
      await db.query('SELECT id FROM order_service.admin_cases WHERE id=$1 FOR UPDATE',[id]);
      await requireCaseAccess(db,user,'returns.moderate',id);
      if(current.buyer_id === user.id)
        throw new PlatformAdminError(403,'RETURN_ACTOR_CONFLICT','Không thể xử lý yêu cầu trả hàng của chính mình.');
      if(current.resolution !== 'REFUND')
        throw new PlatformAdminError(409,'RETURN_RESOLUTION_UNSUPPORTED','Yêu cầu đổi hàng cần được xử lý theo quy trình riêng.');
      if(current.status !== rule.from || current.version !== command.version)
        throw new PlatformAdminError(409,'RETURN_STATE_CHANGED','Yêu cầu đã thay đổi. Hãy tải lại chi tiết trước khi xử lý.');
      if(command.action==='review'){
        const owner=(await db.query('UPDATE order_service.admin_cases SET assignee_id=coalesce(assignee_id,$2) WHERE id=$1 RETURNING assignee_id',[id,user.id])).rows[0];
        if(owner.assignee_id!==user.id)throw new PlatformAdminError(403,'CASE_NOT_ASSIGNED','Hồ sơ đang được phân công cho người khác.');
      }
      else {
        if(command.action==='approve')await new AdminApprovalService(this.returns.order).consume(db,user,'return_approve',id,command.approvalId);
        await new CaseResolutionService(this.cases).recordReturnDecision(db,user,current,command);
      }
      const approvalPolicy=command.action==='approve'?await new AdminApprovalService(this.returns.order).policy(db,'return_approve'):null;
      const authorization=command.action==='approve'?{actorId:user.id,approvalId:command.approvalId||null,
        approvalPolicyVersion:approvalPolicy.version,approvalThresholdMinor:approvalPolicy.thresholdMinor,
        amountMinor:Number(current.eligible_refund_minor),recipientId:current.buyer_id,storeId:current.store_id,policyVersion:current.policy_version}:null;
      await db.query(`UPDATE order_service.return_requests SET status=$2,admin_response=$3,
        admin_authorization=CASE WHEN $2='APPROVED' THEN $4 ELSE admin_authorization END,
        ship_by=CASE WHEN $2='APPROVED' THEN now()+interval '7 days' ELSE ship_by END,
        reservation_released_at=CASE WHEN $2='REJECTED' THEN now() ELSE reservation_released_at END,
        version=version+1,updated_at=now() WHERE id=$1`,[id,rule.to,command.reason,authorization]);
      await this.returns.history(db,id,current.status,rule.to,user.id,'platform_admin',command.reason);
      await db.query(`INSERT INTO order_service.admin_return_actions
        (request_id,actor_id,action,previous_status,next_status,reason,read_version,result_version) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [id,user.id,command.action,current.status,rule.to,command.reason,current.version,current.version+1]);
      if(command.action === 'approve') await db.query(`INSERT INTO order_service.order_outbox(event_type,aggregate_id,payload)
        VALUES ('ReturnApproved.v1',$1,$2)`,[current.shop_order_id,{returnId:id,shopOrderId:current.shop_order_id}]);
      await db.query('COMMIT');
      return {id,status:rule.to,version:current.version+1};
    } catch(error) { await db.query('ROLLBACK'); throw error; }
    finally { db.release(); }
  }
  async evidence(user,id,evidenceId,grant) {return this.cases.evidence(user,id,evidenceId,grant);}
}
