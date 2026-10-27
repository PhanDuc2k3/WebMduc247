import {requireCaseAccess} from './admin-scope.js';
import {requireAdminPermission, adminScopeSql} from '../../../packages/contracts/admin-rbac.js';
import {createHash, randomBytes} from 'node:crypto';
import {adminId} from '../../../packages/contracts/platform-admin.js';
import {caseInput, caseText, caseVersion, caseDue, caseError, caseAudit, requireCasePermission, requireEvidenceScope} from './case-contract.js';
import {normalizeImage} from '../../../packages/contracts/image-validation.js';

const digest=value=>createHash('sha256').update(value).digest('hex');
const parties=['BUYER','SELLER','CARRIER','PLATFORM','UNDETERMINED'];
export function decisionBasis(input){
  if(!parties.includes(input.responsibleParty)||typeof input.policyVersion!=='string'||!Array.isArray(input.evidenceRefs)||input.evidenceRefs.length>12)
    throw caseError(400,'INVALID_DECISION_BASIS','Chọn policy, bên chịu trách nhiệm và căn cứ chứng cứ.');
  const refs=input.evidenceRefs.map(ref=>{
    caseInput(ref,['kind','id']);adminId(ref.id);
    if(!['STATEMENT','CASE_EVIDENCE','RETURN_EVIDENCE'].includes(ref.kind))throw caseError(400,'INVALID_DECISION_BASIS','Loại chứng cứ không hợp lệ.');
    return {kind:ref.kind,id:ref.id};
  });
  if(new Set(refs.map(ref=>ref.kind+ref.id)).size!==refs.length)throw caseError(400,'INVALID_DECISION_BASIS','Chứng cứ bị lặp.');
  return {responsibleParty:input.responsibleParty,policyVersion:input.policyVersion,
    basisSummary:caseText(input.basisSummary,10,2000),evidenceRefs:refs};
}
export class CaseResolutionService {
  constructor(cases){this.cases=cases;this.returns=cases.returns;this.pool=cases.pool;this.order=cases.order;}
  async lock(db,id,user,permission){
    const context=(await db.query('SELECT shop_order_id,return_request_id FROM order_service.admin_cases WHERE id=$1',[id])).rows[0];
    if(!context)throw caseError(404,'CASE_NOT_FOUND','Không tìm thấy hồ sơ.');
    await db.query('SELECT id FROM order_service.orders WHERE id=$1 FOR UPDATE',[context.shop_order_id]);
    if(context.return_request_id)await db.query('SELECT id FROM order_service.return_requests WHERE id=$1 FOR UPDATE',[context.return_request_id]);
    await db.query('SELECT id FROM order_service.admin_cases WHERE id=$1 FOR UPDATE',[id]);
    if(user)await requireCaseAccess(db,user,permission,id);
    return (await db.query(`SELECT c.*,o.user_id AS buyer_id,o.store_id FROM order_service.admin_cases c
      JOIN order_service.orders o ON o.id=c.shop_order_id WHERE c.id=$1 FOR UPDATE OF c`,[id])).rows[0];
  }
  owner(row,user){if(row.buyer_id===user.id)throw caseError(403,'PARTY_REVIEW_FORBIDDEN','Không xử lý hồ sơ của chính mình bằng quyền nhân viên.');if(row.assignee_id!==user.id)throw caseError(403,'CASE_NOT_ASSIGNED','Thao tác cần người đang được phân công hồ sơ.');}
  async independent(row,user){
    if(row.buyer_id===user.id)throw caseError(403,'PARTY_REVIEW_FORBIDDEN','Bên liên quan không được xét duyệt hồ sơ của mình.');
    const store=await this.order.inventory('/stores/'+row.store_id+'/aftersales-status');
    if(store.ownerId===user.id||store.memberIds?.includes(user.id))throw caseError(403,'PARTY_REVIEW_FORBIDDEN','Nhân sự shop liên quan không được xét duyệt.');
  }
  version(row,version){caseVersion(version);if(row.version!==version)throw caseError(409,'CASE_STATE_CHANGED','Hồ sơ đã thay đổi. Hãy tải lại.');}
  async policy(db,id){
    const row=(await db.query('SELECT * FROM order_service.case_resolution_policies WHERE id=$1',[id])).rows[0];
    if(!row)throw caseError(400,'INVALID_CASE_POLICY','Policy xử lý không hợp lệ.');return row;
  }
  async evidenceIndex(db,id,user){
    const args=[id],filter=adminScopeSql(user,'cases.read',{storeIds:'o.store_id::text',caseKinds:'c.kind',assigneeIds:'c.assignee_id::text'},args);
    const scope=`WITH candidates AS (SELECT $1::uuid AS id UNION SELECT CASE WHEN source_id=$1 THEN target_id ELSE source_id END
      FROM order_service.case_links WHERE source_id=$1 OR target_id=$1), scope AS (SELECT c.id FROM candidates x JOIN order_service.admin_cases c ON c.id=x.id JOIN order_service.orders o ON o.id=c.shop_order_id WHERE ${filter})`;
    const statements=await db.query(`${scope} SELECT s.id,s.case_id,s.party,s.requested_resolution,s.content,s.created_at FROM order_service.case_statements s JOIN scope ON scope.id=s.case_id ORDER BY s.created_at`,args);
    const images=await db.query(`${scope} SELECT e.id,e.case_id,e.party,e.created_at FROM order_service.case_evidence e JOIN scope ON scope.id=e.case_id ORDER BY e.created_at`,args);
    const returns=await db.query(`${scope} SELECT e.id,c.id AS case_id,e.created_at FROM order_service.return_evidence e
        JOIN order_service.admin_cases c ON c.return_request_id=e.request_id JOIN scope ON scope.id=c.id ORDER BY e.created_at`,args);
    return [...statements.rows.map(row=>({kind:'STATEMENT',id:row.id,caseId:row.case_id,party:row.party,content:row.content,requestedResolution:row.requested_resolution,createdAt:row.created_at})),
      ...images.rows.map(row=>({kind:'CASE_EVIDENCE',id:row.id,caseId:row.case_id,party:row.party,createdAt:row.created_at})),
      ...returns.rows.map(row=>({kind:'RETURN_EVIDENCE',id:row.id,caseId:row.case_id,createdAt:row.created_at}))];
  }
  async validateBasis(db,id,basis,user){
    await this.policy(db,basis.policyVersion);const available=await this.evidenceIndex(db,id,user);
    if(basis.evidenceRefs.some(ref=>!available.some(item=>item.id===ref.id&&item.kind===ref.kind)))
      throw caseError(400,'EVIDENCE_OUTSIDE_CASE','Chứng cứ không thuộc hồ sơ hoặc hồ sơ được liên kết.');
  }
  async notify(db,row,type,extra={}){
    await db.query('INSERT INTO order_service.order_outbox(event_type,aggregate_id,payload) VALUES($1,$2,$3)',
      [type,row.shop_order_id,{caseId:row.id,shopOrderId:row.shop_order_id,...extra}]);
  }
  async recordReturnDecision(db,user,current,command){
    const basis=decisionBasis(command);await this.validateBasis(db,current.id,basis,user);
    const row=(await db.query('SELECT * FROM order_service.admin_cases WHERE id=$1 FOR UPDATE',[current.id])).rows[0];
    this.owner(row,user);
    if((await db.query("SELECT 1 FROM order_service.case_appeals WHERE case_id=$1 AND status IN ('SUBMITTED','UNDER_REVIEW')",[current.id])).rowCount)throw caseError(409,'APPEAL_PENDING','Còn kháng nghị chưa xử lý.');
    const policy=await this.policy(db,basis.policyVersion),approved=command.action==='approve';
    const snapshot={returnId:current.id,returnVersion:current.version,amountMinor:Number(current.eligible_refund_minor),shippingMinor:Number(current.shipping_refund_minor),recipientId:current.buyer_id,financialApprovalId:command.approvalId||null,
      returnPolicyVersion:current.policy_version};
    const financialApproval=command.approvalId?(await db.query('SELECT created_by,reviewed_by FROM order_service.admin_approvals WHERE id=$1',[command.approvalId])).rows[0]:null;
    const result=(await db.query(`INSERT INTO order_service.case_decisions(case_id,kind,status,proposed_by,reviewed_by,policy_version,
      responsible_party,reason,basis_summary,evidence_refs,outcome,return_id,snapshot,expected_case_version,expected_return_version,published_at,reviewed_at,appeal_until)
      VALUES($1,$2,'PUBLISHED',$3,$14,$4,$5,$6,$7,$8,$9,$1,$10,$11,$12,now(),now(),now()+($13*interval '1 day')) RETURNING id`,
      [current.id,approved?'RETURN_APPROVE':'RETURN_REJECT',financialApproval?.created_by||user.id,basis.policyVersion,basis.responsibleParty,command.reason,
        basis.basisSummary,JSON.stringify(basis.evidenceRefs),approved?'RETURN_REQUIRED':'NO_COMPENSATION',snapshot,row.version,current.version,policy.appeal_days,financialApproval?.reviewed_by||user.id])).rows[0];
    if(approved)await db.query("INSERT INTO order_service.case_obligations(case_id,decision_id,kind,return_id) VALUES($1,$2,'RETURN',$1)",[current.id,result.id]);
    await db.query('UPDATE order_service.admin_cases SET version=version+1,updated_at=now() WHERE id=$1',[current.id]);
    await caseAudit(db,current.id,user,'decision_published',command.reason,{readVersion:row.version,resultVersion:row.version+1,decisionId:result.id,...basis});
    await this.notify(db,row,'CaseDecisionPublished.v1',{decisionId:result.id});
    return result.id;
  }
  async detail(user,id){
    requireAdminPermission(user,'cases.read');adminId(id);const root=await this.cases.detail(user,id);
    const [decisions,obligations,messages,escalations,appeals,evidence,policies,inspections]=await Promise.all([
      this.pool.query('SELECT * FROM order_service.case_decisions WHERE case_id=$1 ORDER BY proposed_at DESC,id DESC',[id]),
      this.pool.query('SELECT * FROM order_service.case_obligations WHERE case_id=$1 ORDER BY id',[id]),
      this.pool.query('SELECT id,actor_id,visibility,recipient_kind,body,created_at FROM order_service.case_messages WHERE case_id=$1 ORDER BY created_at,id',[id]),
      this.pool.query('SELECT * FROM order_service.case_escalations WHERE case_id=$1 ORDER BY created_at DESC',[id]),
      this.pool.query('SELECT * FROM order_service.case_appeals WHERE case_id=$1 ORDER BY created_at DESC',[id]),
      this.evidenceIndex(this.pool,id,user),this.pool.query('SELECT * FROM order_service.case_resolution_policies ORDER BY id'),
      this.pool.query('SELECT id,actor_id,actor_type,condition,note,basis_refs,created_at FROM order_service.return_inspections WHERE request_id=$1 ORDER BY created_at,id',[id]),
    ]);
    const returning=root.record.kind==='RETURN'?(await this.pool.query(`SELECT r.status,r.version,r.ship_by,r.seller_receive_by,r.refund_confirmed_at,
      r.eligible_refund_minor,r.shipping_refund_minor,o.payable_total_minor,o.refunded_minor,
      (SELECT count(*)::int FROM order_service.return_items i JOIN order_service.order_items oi ON oi.id=i.order_item_id WHERE i.request_id=r.id AND i.quantity<oi.quantity) AS partial_lines
      FROM order_service.return_requests r JOIN order_service.orders o ON o.id=r.shop_order_id WHERE r.id=$1`,[id])).rows[0]:null;
    return {...root,decisions:decisions.rows,obligations:obligations.rows,messages:messages.rows,escalations:escalations.rows,
      appeals:appeals.rows,evidence,policies:policies.rows,inspections:inspections.rows,
      returnProgress:returning?{status:returning.status,version:returning.version,shipBy:returning.ship_by,sellerReceiveBy:returning.seller_receive_by,
        confirmedAt:returning.refund_confirmed_at,amountMinor:Number(returning.eligible_refund_minor),shippingMinor:Number(returning.shipping_refund_minor),
        itemsMinor:Number(returning.eligible_refund_minor)-Number(returning.shipping_refund_minor),orderTotalMinor:Number(returning.payable_total_minor),
        orderRefundedMinor:Number(returning.refunded_minor),mode:Number(returning.eligible_refund_minor)===Number(returning.payable_total_minor)?'FULL':'PARTIAL'}:null};
  }
  async message(user,id,input){
    requireAdminPermission(user,'cases.update');adminId(id);caseInput(input,['visibility','recipientKind','body','clientRequestId','version']);adminId(input.clientRequestId);
    await requireCaseAccess(this.pool,user,'cases.update',id);
    if(!['INTERNAL','PUBLIC'].includes(input.visibility)||input.visibility==='PUBLIC'&&!['BUYER','SELLER','BOTH'].includes(input.recipientKind)||input.visibility==='INTERNAL'&&input.recipientKind)
      throw caseError(400,'INVALID_VISIBILITY','Chọn ghi chú nội bộ hoặc thông báo công khai cùng bên nhận.');
    const body=caseText(input.body),fingerprint=digest(JSON.stringify([id,input.visibility,input.recipientKind||null,body]));
    return this.cases.transaction(async db=>{
      await db.query('SELECT pg_advisory_xact_lock(hashtext($1))',[user.id+input.clientRequestId]);
      const row=await this.lock(db,id,user,'cases.update');this.owner(row,user);
      const previous=(await db.query('SELECT id,request_hash FROM order_service.case_messages WHERE actor_id=$1 AND client_request_id=$2',[user.id,input.clientRequestId])).rows[0];
      if(previous){if(previous.request_hash!==fingerprint)throw caseError(409,'CASE_KEY_REUSED','Mã gửi đã dùng cho nội dung khác.');return {id:previous.id};}
      this.version(row,input.version);
      const result=(await db.query(`INSERT INTO order_service.case_messages(case_id,actor_id,visibility,recipient_kind,body,client_request_id,request_hash)
        VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id`,[id,user.id,input.visibility,input.recipientKind||null,body,input.clientRequestId,fingerprint])).rows[0];
      await db.query('UPDATE order_service.admin_cases SET version=version+1 WHERE id=$1',[id]);
      await caseAudit(db,id,user,input.visibility==='INTERNAL'?'internal_note':'public_message',body,{readVersion:input.version,resultVersion:input.version+1,messageId:result.id});
      if(input.visibility==='PUBLIC')await this.notify(db,row,'CasePublicMessage.v1',{messageId:result.id,recipientKind:input.recipientKind});
      return result;
    });
  }
  async escalate(user,id,input,bearer){
    requireAdminPermission(user,'cases.update');adminId(id);caseInput(input,['assigneeId','dueAt','reason','version']);adminId(input.assigneeId);
    await requireCaseAccess(this.pool,user,'cases.update',id);
    const reason=caseText(input.reason,10,500),dueAt=caseDue(input.dueAt);
    if(input.assigneeId===user.id)throw caseError(400,'ESCALATION_TARGET','Chọn người khác để chuyển cấp.');
    const {items}=await this.order.identity('/admin/staff?'+new URLSearchParams({id:input.assigneeId}),bearer);
    if(!items.some(person=>person.id===input.assigneeId))throw caseError(400,'INVALID_ASSIGNEE','Người nhận không có quyền xử lý hồ sơ.');
    return this.cases.transaction(async db=>{
      const row=await this.lock(db,id,user,'cases.update');this.owner(row,user);this.version(row,input.version);
      await db.query(`INSERT INTO order_service.case_escalations(case_id,actor_id,from_assignee,to_assignee,level,reason) VALUES($1,$2,$3,$4,$5,$6)`,
        [id,user.id,row.assignee_id,input.assigneeId,row.escalation_level+1,reason]);
      await db.query('UPDATE order_service.admin_cases SET assignee_id=$2,due_at=$3,escalation_level=escalation_level+1,version=version+1 WHERE id=$1',[id,input.assigneeId,dueAt]);
      await db.query('DELETE FROM order_service.case_evidence_grants WHERE case_id=$1',[id]);await db.query('DELETE FROM order_service.case_resolution_grants WHERE case_id=$1',[id]);
      await caseAudit(db,id,user,'case_escalated',reason,{readVersion:input.version,resultVersion:input.version+1,to:input.assigneeId,level:row.escalation_level+1});return {id};
    });
  }
  async propose(user,id,input){
    requireAdminPermission(user,'cases.create');adminId(id);caseInput(input,['version','reason','responsibleParty','policyVersion','basisSummary','evidenceRefs','outcome','returnId']);
    await requireCaseAccess(this.pool,user,'cases.create',id);
    const basis=decisionBasis(input),reason=caseText(input.reason,10,500);
    if(!['REFUND_EXISTING_RETURN','NO_COMPENSATION','OTHER_REMEDY'].includes(input.outcome))throw caseError(400,'INVALID_CASE_OUTCOME','Phương án xử lý không hợp lệ.');
    if(input.returnId)adminId(input.returnId);
    return this.cases.transaction(async db=>{
      const row=await this.lock(db,id,user,'cases.create');this.owner(row,user);this.version(row,input.version);
      if(row.kind!=='DISPUTE')throw caseError(400,'DISPUTE_REQUIRED','Đề xuất này dành cho hồ sơ tranh chấp.');
      if(!['IN_REVIEW','AWAITING_APPROVAL'].includes(row.workflow_status))throw caseError(409,'CASE_NOT_IN_REVIEW','Cần bắt đầu xác minh hoặc xử lý kháng nghị trước khi đề xuất.');
      if((await db.query("SELECT 1 FROM order_service.case_appeals WHERE case_id=$1 AND status IN ('SUBMITTED','UNDER_REVIEW')",[id])).rowCount)throw caseError(409,'APPEAL_PENDING','Còn kháng nghị chưa xử lý.');
      if((await db.query("SELECT 1 FROM order_service.case_decisions WHERE case_id=$1 AND status='PROPOSED'",[id])).rowCount)throw caseError(409,'DECISION_PENDING','Đã có đề xuất đang chờ duyệt.');
      await this.validateBasis(db,id,basis,user);
      let snapshot={},returnVersion=null;
      if(input.outcome==='REFUND_EXISTING_RETURN'){
        if(!input.returnId)throw caseError(400,'RETURN_REQUIRED','Chọn yêu cầu trả hàng đủ điều kiện.');
        const r=(await db.query(`SELECT r.* FROM order_service.return_requests r WHERE r.id=$1 AND r.shop_order_id=$2
          AND EXISTS(SELECT 1 FROM order_service.case_links l WHERE (l.source_id=$3 AND l.target_id=r.id) OR (l.target_id=$3 AND l.source_id=r.id))`,[input.returnId,row.shop_order_id,id])).rows[0];
        if(!r||!['RECEIVED','REFUND_PENDING','REFUNDED'].includes(r.status))throw caseError(409,'RETURN_NOT_READY','Yêu cầu phải được liên kết và đã nhận hàng/chờ hoàn/đã hoàn.');
        snapshot={returnId:r.id,amountMinor:Number(r.eligible_refund_minor),shippingMinor:Number(r.shipping_refund_minor),returnPolicyVersion:r.policy_version};returnVersion=r.version;
      }else if(input.returnId)throw caseError(400,'UNEXPECTED_RETURN','Phương án này không nhận mã trả hàng.');
      const result=(await db.query(`INSERT INTO order_service.case_decisions(case_id,kind,status,proposed_by,policy_version,responsible_party,reason,basis_summary,
        evidence_refs,outcome,return_id,snapshot,expected_case_version,expected_return_version)
        VALUES($1,'DISPUTE_RESOLUTION','PROPOSED',$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
        [id,user.id,basis.policyVersion,basis.responsibleParty,reason,basis.basisSummary,JSON.stringify(basis.evidenceRefs),input.outcome,input.returnId||null,snapshot,row.version+1,returnVersion])).rows[0];
      await db.query("UPDATE order_service.admin_cases SET workflow_status='AWAITING_APPROVAL',version=version+1 WHERE id=$1",[id]);
      await caseAudit(db,id,user,'decision_proposed',reason,{decisionId:result.id,...basis});return result;
    });
  }
  async review(user,id,decisionId,input){
    requireAdminPermission(user,input.action==='withdraw'?'cases.create':'cases.approve');adminId(id);adminId(decisionId);caseInput(input,['action','version','reason']);const reason=caseText(input.reason,10,500);
    await requireCaseAccess(this.pool,user,input.action==='withdraw'?'cases.create':'cases.approve',id);
    if(!['publish','reject','withdraw'].includes(input.action))throw caseError(400,'INVALID_DECISION_REVIEW','Thao tác duyệt không hợp lệ.');
    return this.cases.transaction(async db=>{
      const row=await this.lock(db,id,user,input.action==='withdraw'?'cases.create':'cases.approve');this.version(row,input.version);
      const d=(await db.query('SELECT * FROM order_service.case_decisions WHERE id=$1 AND case_id=$2 FOR UPDATE',[decisionId,id])).rows[0];
      if(!d||d.status!=='PROPOSED')throw caseError(409,'DECISION_CHANGED','Đề xuất đã được xử lý.');
      if(input.action==='withdraw'){if(d.proposed_by!==user.id)throw caseError(403,'PROPOSER_ONLY','Chỉ người đề xuất được rút đề xuất.');}
      else {await requireCasePermission(db,user,'case.decision.approve');if(d.proposed_by===user.id||row.buyer_id===user.id)throw caseError(403,'INDEPENDENT_REVIEW_REQUIRED','Người duyệt phải độc lập với người đề xuất/người mua.');await this.independent(row,user);}
      if(input.action==='publish'){
        await requireCaseAccess(db,await this.order.adminActor(d.proposed_by),'cases.create',id);
        if(d.expected_case_version!==row.version)throw caseError(409,'DECISION_SNAPSHOT_STALE','Hồ sơ có thông tin mới; cần rút/tạo lại đề xuất.');
        await this.validateBasis(db,id,{policyVersion:d.policy_version,evidenceRefs:d.evidence_refs},user);
        if(d.return_id){const r=(await db.query('SELECT status,version FROM order_service.return_requests WHERE id=$1 FOR UPDATE',[d.return_id])).rows[0];
          if(!r||r.version!==d.expected_return_version||!['RECEIVED','REFUND_PENDING','REFUNDED'].includes(r.status))throw caseError(409,'DECISION_SNAPSHOT_STALE','Yêu cầu trả hàng liên quan đã thay đổi.');}
        const policy=await this.policy(db,d.policy_version);
        await db.query(`UPDATE order_service.case_decisions SET status='PUBLISHED',reviewed_by=$2,review_reason=$3,reviewed_at=now(),
          published_at=now(),appeal_until=now()+($4*interval '1 day') WHERE id=$1`,[decisionId,user.id,reason,policy.appeal_days]);
        await db.query("UPDATE order_service.disputes SET status='DECIDED' WHERE id=$1",[id]);
        if(d.outcome!=='NO_COMPENSATION')await db.query(`INSERT INTO order_service.case_obligations(case_id,decision_id,kind,return_id,status,completed_at)
          VALUES($1,$2,$3,$4,CASE WHEN $4::uuid IS NOT NULL AND EXISTS(SELECT 1 FROM order_service.return_requests WHERE id=$4 AND status='REFUNDED')
            THEN 'FULFILLED' ELSE 'PENDING' END,CASE WHEN $4::uuid IS NOT NULL AND EXISTS(SELECT 1 FROM order_service.return_requests WHERE id=$4 AND status='REFUNDED') THEN now() ELSE NULL END)`,
          [id,decisionId,d.return_id?'REFUND':'OTHER',d.return_id]);
        await db.query("UPDATE order_service.admin_cases SET workflow_status=$2,version=version+1 WHERE id=$1",[id,d.outcome==='NO_COMPENSATION'?'DECIDED':'WAITING_FULFILLMENT']);
        await this.notify(db,row,'CaseDecisionPublished.v1',{decisionId});
      }else{
        await db.query('UPDATE order_service.case_decisions SET status=$2,reviewed_by=$3,review_reason=$4,reviewed_at=now() WHERE id=$1',
          [decisionId,input.action==='withdraw'?'WITHDRAWN':'REJECTED',user.id,reason]);
        await db.query("UPDATE order_service.admin_cases SET workflow_status='IN_REVIEW',version=version+1 WHERE id=$1",[id]);
      }
      await caseAudit(db,id,user,'decision_'+input.action,reason,{readVersion:input.version,resultVersion:input.version+1,decisionId});return {id:decisionId};
    });
  }
  async sellerUnavailable(row,bearer){
    const status=await this.order.inventory('/stores/'+row.store_id+'/aftersales-status');
    if(status.platformSuspended)return true;
    if(status.ownerId){const record=await this.order.adminActor(status.ownerId);return record.status==='suspended';}
    return false;
  }
  async intervene(user,id,input,bearer){
    requireAdminPermission(user,'returns.execute');adminId(id);caseInput(input,['action','version','returnVersion','reason','evidenceRefs','condition']);
    await requireCaseAccess(this.pool,user,'returns.execute',id);
    if(!['take_review','inspect','open_refund','reopen'].includes(input.action))throw caseError(400,'INVALID_INTERVENTION','Lệnh can thiệp không hợp lệ.');
    const reason=caseText(input.reason,10,500),refs=decisionBasis({responsibleParty:'UNDETERMINED',policyVersion:'CASE_RESOLUTION_V1',basisSummary:reason,evidenceRefs:input.evidenceRefs}).evidenceRefs;
    const context=(await this.pool.query(`SELECT c.*,o.store_id FROM order_service.admin_cases c JOIN order_service.orders o ON o.id=c.shop_order_id WHERE c.id=$1`,[id])).rows[0];
    if(!context)throw caseError(404,'CASE_NOT_FOUND','Không tìm thấy hồ sơ.');
    await requireCasePermission(this.pool,user,'aftersales.intervene');
    const blocked=['take_review','inspect'].includes(input.action)?await this.sellerUnavailable(context,bearer):false;
    const result=await this.cases.transaction(async db=>{
      await requireCasePermission(db,user,'aftersales.intervene');const row=await this.lock(db,id,user,'returns.execute');this.owner(row,user);this.version(row,input.version);
      if(row.kind!=='RETURN')throw caseError(400,'RETURN_REQUIRED','Can thiệp này dành cho yêu cầu trả hàng.');
      const current=(await db.query('SELECT * FROM order_service.return_requests WHERE id=$1',[id])).rows[0];
      if(current.version!==input.returnVersion)throw caseError(409,'RETURN_STATE_CHANGED','Yêu cầu trả hàng đã thay đổi.');
      await this.validateBasis(db,id,{policyVersion:'CASE_RESOLUTION_V1',evidenceRefs:refs},user);
      let next;
      if(input.action==='take_review'){
        if(!['REQUESTED','UNDER_REVIEW'].includes(current.status)||!blocked&&Date.parse(row.due_at)>Date.now())throw caseError(409,'SELLER_STILL_WITHIN_DEADLINE','Seller còn trong hạn xử lý hoặc trạng thái không phù hợp.');
        next='UNDER_REVIEW';
      }else if(input.action==='inspect'){
        if(!['RETURNING','RECEIVED'].includes(current.status)||!blocked&&(!current.seller_receive_by||Date.parse(current.seller_receive_by)>Date.now()))throw caseError(409,'RECEIPT_NOT_DUE','Chỉ can thiệp sau hạn nhận hàng hoặc khi seller bị khóa.');
        if(!refs.length||!['ACCEPTED','ISSUE_FOUND'].includes(input.condition))throw caseError(400,'RECEIPT_EVIDENCE_REQUIRED','Nhận hàng cần chứng cứ và kết quả kiểm tra thực tế; quá hạn không chứng minh đã nhận.');
        await db.query(`INSERT INTO order_service.return_inspections(request_id,actor_id,actor_type,condition,note,basis_refs) VALUES($1,$2,'ADMIN',$3,$4,$5)`,[id,user.id,input.condition,reason,JSON.stringify(refs)]);
        next='RECEIVED';
      }else if(input.action==='open_refund'){
        const receipt=(await db.query('SELECT condition FROM order_service.return_inspections WHERE request_id=$1 ORDER BY created_at DESC,id DESC LIMIT 1',[id])).rows[0];
        if(current.status!=='RECEIVED'||receipt?.condition!=='ACCEPTED')throw caseError(409,'REFUND_NOT_READY','Chỉ mở hoàn khi đã nhận hàng và kiểm tra chấp nhận.');
        if(!(await db.query("SELECT 1 FROM order_service.return_history WHERE request_id=$1 AND to_status='APPROVED'",[id])).rowCount)throw caseError(409,'REFUND_NOT_READY','Thiếu quyết định chấp nhận trả hàng.');
        next='REFUND_PENDING';
        await db.query(`INSERT INTO order_service.order_outbox(event_type,aggregate_id,payload) VALUES('RefundRequested.v1',$1,$2)`,[row.shop_order_id,{returnId:id,shopOrderId:row.shop_order_id,amountMinor:Number(current.eligible_refund_minor)}]);
      }else{
        if(!['REJECTED','CLOSED'].includes(current.status)||!current.reservation_released_at||current.refund_confirmed_at)
          throw caseError(409,'RETURN_CANNOT_REOPEN','Chỉ mở lại hồ sơ đã bị từ chối/giải phóng và chưa hoàn tiền.');
        if((await db.query("SELECT 1 FROM order_service.case_appeals WHERE case_id=$1 AND status IN ('SUBMITTED','UNDER_REVIEW')",[id])).rowCount)throw caseError(409,'APPEAL_PENDING','Cần xử lý hết kháng nghị đang mở.');
        const appeal=(await db.query(`SELECT 1 FROM order_service.case_appeals a WHERE a.case_id=$1 AND a.status='OVERTURNED'
          AND a.decision_id=(SELECT id FROM order_service.case_decisions WHERE case_id=$1 AND status='PUBLISHED' ORDER BY published_at DESC,id DESC LIMIT 1)`,[id])).rowCount;
        if(!appeal)throw caseError(403,'OVERTURNED_APPEAL_REQUIRED','Cần kết quả kháng nghị độc lập cho quyết định gần nhất.');
        const quantities=(await db.query(`SELECT ri.order_item_id,ri.quantity,i.quantity AS ordered,
          coalesce((SELECT sum(other.quantity) FROM order_service.return_items other JOIN order_service.return_requests r ON r.id=other.request_id
            WHERE other.order_item_id=ri.order_item_id AND r.id<>$1 AND r.reservation_released_at IS NULL AND r.status<>'REJECTED'),0) AS used
          FROM order_service.return_items ri JOIN order_service.order_items i ON i.id=ri.order_item_id WHERE ri.request_id=$1`,[id])).rows;
        if(quantities.some(item=>Number(item.quantity)+Number(item.used)>item.ordered))throw caseError(409,'RETURN_QUANTITY_RESERVED','Lượng đã được sử dụng bởi hồ sơ khác.');
        const budget=(await db.query(`SELECT o.payable_total_minor,o.refunded_minor,
          coalesce(sum(r.eligible_refund_minor) FILTER(WHERE r.refund_confirmed_at IS NULL AND r.status<>'REFUNDED'),0) AS held,
          coalesce(sum(r.eligible_refund_minor) FILTER(WHERE r.refund_confirmed_at IS NOT NULL OR r.status='REFUNDED'),0) AS confirmed
          FROM order_service.orders o LEFT JOIN order_service.return_requests r ON r.shop_order_id=o.id AND r.id<>$2
            AND r.reservation_released_at IS NULL AND r.status<>'REJECTED' WHERE o.id=$1 GROUP BY o.id`,[row.shop_order_id,id])).rows[0];
        if(Number(current.eligible_refund_minor)+Number(budget.held)+Math.max(Number(budget.confirmed),Number(budget.refunded_minor))>Number(budget.payable_total_minor))throw caseError(409,'REFUND_LIMIT','Tiền còn đủ điều kiện không đủ để mở lại.');
        await db.query('UPDATE order_service.return_requests SET reservation_released_at=NULL,ship_by=NULL,seller_receive_by=NULL WHERE id=$1',[id]);next='UNDER_REVIEW';
      }
      await db.query('UPDATE order_service.return_requests SET status=$2,version=version+1,updated_at=now() WHERE id=$1',[id,next]);
      await this.returns.history(db,id,current.status,next,user.id,'platform_admin',reason);
      await db.query(`INSERT INTO order_service.case_interventions(case_id,actor_id,action,reason,basis_refs,seller_blocked,previous_status,next_status) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,[id,user.id,input.action,reason,JSON.stringify(refs),blocked,current.status,next]);
      await db.query('UPDATE order_service.admin_cases SET version=version+1 WHERE id=$1',[id]);
      await caseAudit(db,id,user,'aftersales_'+input.action,reason,{readVersion:input.version,resultVersion:input.version+1,readReturnVersion:input.returnVersion,resultReturnVersion:input.returnVersion+1,from:current.status,to:next,blocked,evidenceRefs:refs});
      return {id,status:next};
    });
    if(result.status==='REFUND_PENDING')await this.returns.triggerRefund(id).catch(()=>{});
    return result;
  }
  async fulfill(user,id,input){
    requireAdminPermission(user,'cases.execute');adminId(id);caseInput(input,['version','obligationId','note','evidenceRefs']);const note=caseText(input.note,10,500);
    await requireCaseAccess(this.pool,user,'cases.execute',id);
    if(input.obligationId)adminId(input.obligationId);
    return this.cases.transaction(async db=>{
      const row=await this.lock(db,id,user,'cases.execute');this.owner(row,user);this.version(row,input.version);
      if(!(await db.query("SELECT 1 FROM order_service.case_decisions WHERE case_id=$1 AND status='PUBLISHED'",[id])).rowCount)throw caseError(409,'DECISION_REQUIRED','Chưa có quyết định công bố.');
      if(input.obligationId){
        const obligation=(await db.query('SELECT * FROM order_service.case_obligations WHERE id=$1 AND case_id=$2 FOR UPDATE',[input.obligationId,id])).rows[0];
        if(!obligation||obligation.status!=='PENDING')throw caseError(409,'OBLIGATION_CHANGED','Nghĩa vụ đã thay đổi.');
        if(obligation.return_id){const r=(await db.query('SELECT status,refund_confirmed_at FROM order_service.return_requests WHERE id=$1',[obligation.return_id])).rows[0];
          if(!r?.refund_confirmed_at||!['REFUNDED','CLOSED'].includes(r.status))throw caseError(409,'PAYMENT_VERIFICATION_REQUIRED','Phải chờ Payment xác nhận hoàn thực tế; quyết định không chứng minh đã chuyển tiền.');
        }else{const basis=decisionBasis({responsibleParty:'PLATFORM',policyVersion:'CASE_RESOLUTION_V1',basisSummary:note,evidenceRefs:input.evidenceRefs});
          if(!basis.evidenceRefs.length)throw caseError(400,'COMPLETION_EVIDENCE_REQUIRED','Nghĩa vụ khác cần bằng chứng hoàn thành.');await this.validateBasis(db,id,basis,user);}
        await db.query("UPDATE order_service.case_obligations SET status='FULFILLED',completion_note=$2,completed_at=now() WHERE id=$1",[obligation.id,note]);
      }
      if((await db.query("SELECT 1 FROM order_service.case_obligations WHERE case_id=$1 AND status='PENDING'",[id])).rowCount){
        await db.query('UPDATE order_service.admin_cases SET version=version+1 WHERE id=$1',[id]);
        await caseAudit(db,id,user,'obligation_fulfilled',note,{obligationId:input.obligationId||null,readVersion:input.version,resultVersion:input.version+1,status:'WAITING_FULFILLMENT'});
        return {id,status:'WAITING_FULFILLMENT'};
      }
      await db.query("UPDATE order_service.admin_cases SET workflow_status='RESOLVED',resolved_at=coalesce(resolved_at,now()),version=version+1 WHERE id=$1",[id]);
      await caseAudit(db,id,user,'obligations_fulfilled',note,{readVersion:input.version,resultVersion:input.version+1});return {id,status:'RESOLVED'};
    });
  }
  async close(user,id,input){
    requireAdminPermission(user,'cases.update');adminId(id);caseInput(input,['version','reason']);const reason=caseText(input.reason,10,500);
    await requireCaseAccess(this.pool,user,'cases.update',id);
    return this.cases.transaction(async db=>{
      const row=await this.lock(db,id,user,'cases.update');this.owner(row,user);this.version(row,input.version);
      if(row.workflow_status!=='RESOLVED'||(await db.query("SELECT 1 FROM order_service.case_obligations WHERE case_id=$1 AND status='PENDING'",[id])).rowCount||
        (await db.query("SELECT 1 FROM order_service.case_appeals WHERE case_id=$1 AND status IN ('SUBMITTED','UNDER_REVIEW')",[id])).rowCount||
        (await db.query("SELECT 1 FROM order_service.case_decisions WHERE case_id=$1 AND status='PUBLISHED' AND appeal_until>now()",[id])).rowCount)
        throw caseError(409,'CASE_CANNOT_CLOSE','Chưa hết hạn kháng nghị, còn kháng nghị hoặc nghĩa vụ chưa xong.');
      if(row.kind==='RETURN')await db.query("UPDATE order_service.return_requests SET status='CLOSED',version=version+1 WHERE id=$1",[id]);
      else await db.query(`UPDATE order_service.${row.kind==='TICKET'?'support_tickets':'disputes'} SET status='CLOSED' WHERE id=$1`,[id]);
      await db.query("UPDATE order_service.admin_cases SET workflow_status='CLOSED',closed_at=now(),version=version+1 WHERE id=$1",[id]);
      await caseAudit(db,id,user,'case_closed',reason,{readVersion:input.version,resultVersion:input.version+1});return {id};
    });
  }
  async participantRoot(userId,id){
    adminId(id);const row=(await this.pool.query('SELECT * FROM order_service.admin_cases WHERE id=$1',[id])).rows[0];
    if(!row)throw caseError(404,'CASE_NOT_FOUND','Không tìm thấy hồ sơ.');
    return {row,party:await this.cases.participant(userId,row.shop_order_id)};
  }
  async publicDetail(userId,id){
    const {row,party}=await this.participantRoot(userId,id);
    const [messages,statements,evidence,decisions,appeals,obligations]=await Promise.all([
      this.pool.query("SELECT id,body,created_at FROM order_service.case_messages WHERE case_id=$1 AND visibility='PUBLIC' AND recipient_kind IN ($2,'BOTH') ORDER BY created_at,id",[id,party]),
      this.pool.query('SELECT id,party,requested_resolution,content,created_at FROM order_service.case_statements WHERE case_id=$1 ORDER BY created_at,id',[id]),
      this.pool.query('SELECT id,party,created_at FROM order_service.case_evidence WHERE case_id=$1 ORDER BY created_at,id',[id]),
      this.pool.query("SELECT id,kind,policy_version,responsible_party,reason,basis_summary,evidence_refs,outcome,snapshot,published_at,appeal_until FROM order_service.case_decisions WHERE case_id=$1 AND status='PUBLISHED' ORDER BY published_at DESC,id DESC",[id]),
      this.pool.query('SELECT id,decision_id,party,reason,status,result_reason,created_at,decided_at FROM order_service.case_appeals WHERE case_id=$1 ORDER BY created_at',[id]),
      this.pool.query('SELECT kind,status,completed_at FROM order_service.case_obligations WHERE case_id=$1',[id]),
    ]);
    const progress=row.return_request_id?(await this.pool.query(`SELECT status,eligible_refund_minor,shipping_refund_minor,refund_confirmed_at,ship_by,seller_receive_by
      FROM order_service.return_requests WHERE id=$1`,[row.return_request_id])).rows[0]:null;
    return {id,party,workflowStatus:row.workflow_status,messages:messages.rows,statements:statements.rows,evidence:evidence.rows,
      decisions:decisions.rows,appeals:appeals.rows,obligations:obligations.rows,
      progress:progress?{status:progress.status,amountMinor:Number(progress.eligible_refund_minor),shippingMinor:Number(progress.shipping_refund_minor),confirmedAt:progress.refund_confirmed_at,shipBy:progress.ship_by,sellerReceiveBy:progress.seller_receive_by}:null};
  }
  async statement(userId,id,input){
    const {row,party}=await this.participantRoot(userId,id);caseInput(input,['requestedResolution','content','clientRequestId']);adminId(input.clientRequestId);
    if(!['REFUND','REPLACEMENT','REJECT_CLAIM','OTHER'].includes(input.requestedResolution))throw caseError(400,'INVALID_PARTY_REQUEST','Yêu cầu không hợp lệ.');
    const content=caseText(input.content),fingerprint=digest(JSON.stringify([id,input.requestedResolution,content]));
    return this.cases.transaction(async db=>{
      await db.query('SELECT pg_advisory_xact_lock(hashtext($1))',[userId+input.clientRequestId]);
      const current=await this.lock(db,id);
      const existing=(await db.query('SELECT id,request_hash FROM order_service.case_statements WHERE actor_id=$1 AND client_request_id=$2',[userId,input.clientRequestId])).rows[0];
      if(existing){if(existing.request_hash!==fingerprint)throw caseError(409,'CASE_KEY_REUSED','Mã gửi đã dùng cho nội dung khác.');return {id:existing.id};}
      if(['CLOSED','RESOLVED'].includes(current.workflow_status))throw caseError(409,'CASE_CLOSED','Hồ sơ đã kết thúc; dùng chức năng kháng nghị trong hạn.');
      const result=(await db.query('INSERT INTO order_service.case_statements(case_id,actor_id,party,requested_resolution,content,client_request_id,request_hash) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id',[id,userId,party,input.requestedResolution,content,input.clientRequestId,fingerprint])).rows[0];
      await db.query('UPDATE order_service.admin_cases SET version=version+1 WHERE id=$1',[id]);await caseAudit(db,id,{id:userId},'party_statement',content,{party,statementId:result.id});return result;
    });
  }
  async upload(userId,id,buffer,mime){
    const {party}=await this.participantRoot(userId,id);const image=await normalizeImage(buffer,mime);
    if(!image)throw caseError(415,'INVALID_IMAGE','Ảnh JPEG, PNG hoặc WebP tối đa 2 MB.');
    if(!this.returns.scanner)throw caseError(503,'SCANNER_UNAVAILABLE','Bộ quét chưa sẵn sàng.');await this.returns.scanner(buffer);
    return this.cases.transaction(async db=>{
      const row=await this.lock(db,id);if(['CLOSED','RESOLVED'].includes(row.workflow_status))throw caseError(409,'CASE_CLOSED','Hồ sơ đã kết thúc.');
      if((await db.query('SELECT count(*)::int AS n FROM order_service.case_evidence WHERE case_id=$1',[id])).rows[0].n>=12)throw caseError(409,'EVIDENCE_LIMIT','Tối đa 12 ảnh cho hồ sơ.');
      const result=(await db.query(`INSERT INTO order_service.case_evidence(case_id,actor_id,party,mime_type,data,content_hash) VALUES($1,$2,$3,'image/webp',$4,$5) RETURNING id`,[id,userId,party,image,digest(image)])).rows[0];
      await db.query('UPDATE order_service.admin_cases SET version=version+1 WHERE id=$1',[id]);await caseAudit(db,id,{id:userId},'party_evidence','Bổ sung chứng cứ đã kiểm tra và quét.',{party,evidenceId:result.id});return result;
    });
  }
  async publicEvidence(userId,id,evidenceId){
    await this.participantRoot(userId,id);adminId(evidenceId);const row=(await this.pool.query('SELECT mime_type,data FROM order_service.case_evidence WHERE id=$1 AND case_id=$2',[evidenceId,id])).rows[0];
    if(!row)throw caseError(404,'EVIDENCE_NOT_FOUND','Không tìm thấy chứng cứ.');return {mimeType:row.mime_type,data:row.data};
  }
  async imageGrant(user,id,evidenceId,reason){
    requireAdminPermission(user,'cases.view_sensitive');adminId(id);adminId(evidenceId);reason=caseText(reason,10,500);
    await requireCaseAccess(this.pool,user,'cases.view_sensitive',id);
    return this.cases.transaction(async db=>{
      await this.lock(db,id,user,'cases.view_sensitive');await requireEvidenceScope(db,user,id);
      if(!(await db.query('SELECT 1 FROM order_service.case_evidence WHERE id=$1 AND case_id=$2',[evidenceId,id])).rowCount)throw caseError(404,'EVIDENCE_NOT_FOUND','Không tìm thấy ảnh.');
      const token=randomBytes(32).toString('base64url'),expiresAt=new Date(Date.now()+60000).toISOString();
      await db.query('INSERT INTO order_service.case_resolution_grants(token_hash,case_id,evidence_id,actor_id,reason,expires_at) VALUES($1,$2,$3,$4,$5,$6)',[digest(token),id,evidenceId,user.id,reason,expiresAt]);
      await caseAudit(db,id,user,'evidence_access_issued',reason,{evidenceId,expiresAt});return {url:`/api/v2/admin/cases/${id}/evidence/${evidenceId}?grant=${token}`,expiresAt};
    });
  }
  async image(user,id,evidenceId,token){
    requireAdminPermission(user,'cases.view_sensitive');adminId(id);adminId(evidenceId);if(typeof token!=='string'||!/^[\w-]{43}$/.test(token))throw caseError(403,'EVIDENCE_GRANT_REQUIRED','Cần grant ảnh hợp lệ.');
    await requireCaseAccess(this.pool,user,'cases.view_sensitive',id);
    return this.cases.transaction(async db=>{
      await this.lock(db,id,user,'cases.view_sensitive');await requireEvidenceScope(db,user,id);
      const grant=(await db.query('UPDATE order_service.case_resolution_grants SET used_at=now() WHERE token_hash=$1 AND case_id=$2 AND evidence_id=$3 AND actor_id=$4 AND expires_at>now() AND used_at IS NULL RETURNING reason',[digest(token),id,evidenceId,user.id])).rows[0];
      if(!grant)throw caseError(403,'EVIDENCE_GRANT_EXPIRED','Grant đã hết hạn, thu hồi hoặc không đúng người.');
      const data=(await db.query('SELECT mime_type,data FROM order_service.case_evidence WHERE id=$1 AND case_id=$2',[evidenceId,id])).rows[0];
      await caseAudit(db,id,user,'evidence_viewed',grant.reason,{evidenceId});return {mimeType:data.mime_type,data:data.data};
    });
  }
  async appeal(userId,id,input){
    const {party}=await this.participantRoot(userId,id);caseInput(input,['decisionId','reason']);adminId(input.decisionId);const reason=caseText(input.reason,10,2000);
    return this.cases.transaction(async db=>{
      const row=await this.lock(db,id),decision=(await db.query("SELECT * FROM order_service.case_decisions WHERE id=$1 AND case_id=$2 AND status='PUBLISHED'",[input.decisionId,id])).rows[0];
      if(!decision||Date.parse(decision.appeal_until)<Date.now())throw caseError(409,'APPEAL_WINDOW_CLOSED','Quyết định không tồn tại hoặc đã hết hạn tiếp nhận kháng nghị.');
      const latest=(await db.query("SELECT id FROM order_service.case_decisions WHERE case_id=$1 AND status='PUBLISHED' ORDER BY published_at DESC,id DESC LIMIT 1",[id])).rows[0];
      if(latest?.id!==decision.id||(await db.query("SELECT 1 FROM order_service.case_appeals WHERE decision_id=$1 AND status='OVERTURNED'",[decision.id])).rowCount)throw caseError(409,'DECISION_SUPERSEDED','Quyết định đã được xét lại hoặc thay thế; hãy xem quyết định mới nhất.');
      if((await db.query('SELECT 1 FROM order_service.case_appeals WHERE decision_id=$1 AND party=$2',[input.decisionId,party])).rowCount)throw caseError(409,'APPEAL_EXISTS','Bên này đã gửi kháng nghị cho quyết định.');
      const result=(await db.query('INSERT INTO order_service.case_appeals(case_id,decision_id,actor_id,party,reason) VALUES($1,$2,$3,$4,$5) RETURNING id',[id,input.decisionId,userId,party,reason])).rows[0];
      await caseAudit(db,id,{id:userId},'appeal_submitted',reason,{appealId:result.id,party});await this.notify(db,row,'CaseAppealUpdated.v1',{appealId:result.id});return result;
    });
  }
  async reviewAppeal(user,id,appealId,input){
    requireAdminPermission(user,'cases.approve');adminId(id);adminId(appealId);caseInput(input,['action','version','reason','evidenceRefs']);const reason=caseText(input.reason,10,2000);
    await requireCaseAccess(this.pool,user,'cases.approve',id);
    if(!['claim','uphold','overturn'].includes(input.action))throw caseError(400,'INVALID_APPEAL_ACTION','Thao tác kháng nghị không hợp lệ.');
    return this.cases.transaction(async db=>{
      await requireCasePermission(db,user,'case.appeal.review');const row=await this.lock(db,id,user,'cases.approve');
      const appeal=(await db.query(`SELECT a.*,d.proposed_by,d.reviewed_by FROM order_service.case_appeals a
        JOIN order_service.case_decisions d ON d.id=a.decision_id WHERE a.id=$1 AND a.case_id=$2 FOR UPDATE OF a`,[appealId,id])).rows[0];
      if(!appeal||!['SUBMITTED','UNDER_REVIEW'].includes(appeal.status)||appeal.version!==input.version)throw caseError(409,'APPEAL_CHANGED','Kháng nghị đã thay đổi.');
      if([appeal.proposed_by,appeal.reviewed_by,appeal.actor_id,row.buyer_id].includes(user.id))throw caseError(403,'INDEPENDENT_APPEAL_REVIEW_REQUIRED','Người xét lại phải độc lập với người quyết định và bên kháng nghị.');
      await this.independent(row,user);
      if(input.action==='claim'){
        if(appeal.reviewer_id&&appeal.reviewer_id!==user.id)throw caseError(409,'APPEAL_ASSIGNED','Kháng nghị đã có người nhận.');
        await db.query("UPDATE order_service.case_appeals SET reviewer_id=$2,status='UNDER_REVIEW',version=version+1 WHERE id=$1",[appealId,user.id]);
      }else{
        if(appeal.status!=='UNDER_REVIEW'||appeal.reviewer_id!==user.id)throw caseError(403,'APPEAL_REVIEWER_ONLY','Cần nhận kháng nghị trước khi kết luận.');
        const basis=decisionBasis({responsibleParty:'UNDETERMINED',policyVersion:'CASE_RESOLUTION_V1',basisSummary:reason,evidenceRefs:input.evidenceRefs});await this.validateBasis(db,id,basis,user);
        await db.query('UPDATE order_service.case_appeals SET status=$2,result_reason=$3,result_basis=$4,decided_at=now(),version=version+1 WHERE id=$1',
          [appealId,input.action==='uphold'?'UPHELD':'OVERTURNED',reason,JSON.stringify(basis.evidenceRefs)]);
        if(input.action==='overturn'){
          await db.query("UPDATE order_service.case_obligations SET status='CANCELLED',completion_note=$2,completed_at=now() WHERE decision_id=$1 AND status='PENDING'",[appeal.decision_id,'Kháng nghị được chấp nhận; cần đánh giá lại, không đảo ngược giao dịch đã thực hiện.']);
          if(row.kind==='DISPUTE')await db.query("UPDATE order_service.disputes SET status='INVESTIGATING' WHERE id=$1",[id]);
          await db.query("UPDATE order_service.admin_cases SET workflow_status='IN_REVIEW',resolved_at=NULL,closed_at=NULL,version=version+1 WHERE id=$1",[id]);
        }
        await this.notify(db,row,'CaseAppealUpdated.v1',{appealId});
      }
      await caseAudit(db,id,user,'appeal_'+input.action,reason,{readAppealVersion:input.version,resultAppealVersion:input.version+1,appealId});return {id:appealId};
    });
  }
  async report(user,query){
    requireAdminPermission(user,'reports.read');caseInput(query,['from','to','storeId','categoryId','groupBy']);
    const group=query.groupBy||'reason';if(!['reason','shop','category'].includes(group))throw caseError(400,'INVALID_REPORT_GROUP','Nhóm báo cáo không hợp lệ.');
    if(query.storeId)adminId(query.storeId);if(query.categoryId&&query.categoryId!=='UNKNOWN')adminId(query.categoryId);
    for(const key of ['from','to'])if(query[key]&&(!/^\d{4}-\d{2}-\d{2}$/.test(query[key])||!Number.isFinite(Date.parse(query[key]))||new Date(query[key]).toISOString().slice(0,10)!==query[key]))throw caseError(400,'INVALID_REPORT_DATE','Ngày báo cáo không hợp lệ.');
    if(query.from&&query.to&&query.from>query.to)throw caseError(400,'INVALID_REPORT_DATE','Khoảng ngày ngược.');
    const args=[query.from?`${query.from}T00:00:00+07:00`:null,query.to?new Date(Date.parse(`${query.to}T00:00:00+07:00`)+86400000).toISOString():null,query.storeId||null,query.categoryId||null,group];
    const scope=adminScopeSql(user,'reports.read',{storeIds:'o.store_id::text',caseKinds:'c.kind',assigneeIds:'c.assignee_id::text'},args);
    const sql=`WITH base AS (SELECT c.id,c.created_at,c.resolved_at,o.store_id,o.store_snapshot_json,
        coalesce(r.reason_code,d.reason_code,'OTHER') AS reason,
        coalesce((SELECT array_agg(DISTINCT coalesce(i.product_snapshot_json->>'categoryId','UNKNOWN'))
          FROM order_service.order_items i WHERE i.order_id=c.shop_order_id AND
            (c.kind<>'RETURN' OR EXISTS(SELECT 1 FROM order_service.return_items ri WHERE ri.request_id=c.id AND ri.order_item_id=i.id))),ARRAY['UNKNOWN']) AS categories,
        (SELECT count(*)::int FROM order_service.case_appeals a WHERE a.case_id=c.id AND a.status IN ('UPHELD','OVERTURNED')) AS decided_appeals,
        (SELECT count(*)::int FROM order_service.case_appeals a WHERE a.case_id=c.id AND a.status='OVERTURNED') AS accepted_appeals
        FROM order_service.admin_cases c JOIN order_service.orders o ON o.id=c.shop_order_id
        LEFT JOIN order_service.return_requests r ON r.id=c.return_request_id LEFT JOIN order_service.disputes d ON d.id=c.id
        WHERE ${scope} AND c.kind IN ('RETURN','DISPUTE') AND ($1::timestamptz IS NULL OR c.created_at>=$1) AND ($2::timestamptz IS NULL OR c.created_at<$2)
        AND ($3::uuid IS NULL OR o.store_id=$3)),filtered AS(SELECT * FROM base WHERE $4::text IS NULL OR $4=ANY(categories)),
        grouped AS(SELECT b.*,g.label FROM filtered b CROSS JOIN LATERAL
          (SELECT unnest(CASE WHEN $5='category' THEN b.categories WHEN $5='shop' THEN ARRAY[b.store_id::text] ELSE ARRAY[b.reason] END) AS label) g)
      SELECT label,count(DISTINCT id)::int AS cases,count(*) FILTER(WHERE resolved_at IS NOT NULL)::int AS resolved,
        avg(extract(epoch FROM resolved_at-created_at)/3600) FILTER(WHERE resolved_at IS NOT NULL) AS avg_hours,
        coalesce(sum(decided_appeals),0)::int AS decided_appeals,coalesce(sum(accepted_appeals),0)::int AS accepted_appeals
        FROM grouped GROUP BY label ORDER BY cases DESC,label LIMIT 500`;
    const rows=(await this.pool.query(sql,args)).rows;
    return {groupBy:group,cohort:'case_created_at_UTC+7',asOf:new Date().toISOString(),items:rows.map(row=>({label:row.label,cases:row.cases,resolved:row.resolved,
      averageHours:row.avg_hours===null?null:Number(row.avg_hours),decidedAppeals:row.decided_appeals,acceptedAppeals:row.accepted_appeals,
      appealAcceptanceRate:row.decided_appeals?row.accepted_appeals/row.decided_appeals:null}))};
  }
}
