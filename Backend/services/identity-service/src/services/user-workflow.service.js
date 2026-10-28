import {randomBytes} from 'node:crypto';
import {adminId,adminQuery,adminPage,PlatformAdminError} from '../../../../packages/contracts/platform-admin.js';
import {requireAdminScope,permissionGrants} from '../../../../packages/contracts/admin-rbac.js';
import {adminCommand} from '../../../../packages/contracts/admin-command.js';
import {maskEmail,maskName} from '../../../../packages/contracts/admin-privacy.js';
import {userCommand,userText,userFullName,userEvent,invalidUser} from './user-admin-contract.js';
import {sealUserData,openUserData} from './user-admin-crypto.js';
import {UserSupportService} from './user-support.service.js';
import {USER_ADMIN_POLICY} from './user-admin-policy.js';
const modules=['identity','catalog','order','payment','engagement','chat'];
const permission=(kind,write=false)=>kind==='APPEAL'?(write?'users.appeals.review':'users.appeals.read'):(write?'privacy.review':'privacy.read');
const conflict=()=>new PlatformAdminError(409,'WORKFLOW_CHANGED','Hồ sơ đã thay đổi hoặc không còn phù hợp cho thao tác.');
const dto=row=>({id:row.id,userId:row.user_id,kind:row.kind,originalDecisionId:row.original_decision_id,summary:row.summary,payload:row.payload,status:row.status,assigneeId:row.assignee_id,
  identityVerifiedAt:row.identity_verified_at,proofMethod:row.proof_method,reviewedBy:row.reviewed_by,reviewReason:row.review_reason,version:row.version,createdAt:row.created_at,resolvedAt:row.resolved_at});
export class UserWorkflowService {
  constructor(users){this.users=users;this.identity=users.identity;this.profiles=users.profiles;this.repo=users.repo;this.pool=users.pool;}
  async list(actor,query={}){
    const kind=query.kind||'APPEAL';if(!['APPEAL','ACCESS','RECTIFY','ANONYMIZE'].includes(kind)||Object.keys(query).some(key=>!['kind','status','userId','page','limit'].includes(key)))throw invalidUser();
    requireAdminScope(actor,permission(kind),{});if(query.userId)adminId(query.userId);
    const f=adminQuery({page:query.page||1,limit:query.limit||20}),status=query.status||'';
    if(status&&!['NEW','IN_REVIEW','WAITING_RETENTION','WAITING_CLEANUP','COMPLETED','REJECTED','CANCELLED','retention_due'].includes(status))throw invalidUser();
    const args=[kind,status,query.userId||null],where=`FROM user_workflow_cases c LEFT JOIN users u ON u.id=c.user_id WHERE c.kind=$1
      AND ($2='' OR c.status=$2 OR ($2='retention_due' AND EXISTS(SELECT 1 FROM user_retention_reviews r WHERE r.case_id=c.id AND r.retain_until<=now()))) AND ($3::uuid IS NULL OR c.user_id=$3)`;
    const [count,items]=await Promise.all([this.pool.query(`SELECT count(*)::int AS n ${where}`,args),this.pool.query(`SELECT c.*,u.full_name,u.email ${where} ORDER BY c.created_at DESC,c.id DESC LIMIT $4 OFFSET $5`,[...args,f.limit,f.offset])]);
    return adminPage(items.rows.map(row=>({...dto(row),userName:maskName(row.full_name),email:maskEmail(row.email)})),count.rows[0].n,f);
  }
  async readCase(actor,id,db=this.pool,{write=false,lock=false}={}){
    const allowed=['APPEAL','ACCESS'].map(kind=>permission(kind,write));if(!allowed.some(value=>permissionGrants(actor,value).length))requireAdminScope(actor,allowed[0],{});
    adminId(id);const meta=(await db.query('SELECT kind FROM user_workflow_cases WHERE id=$1',[id])).rows[0];if(!meta)throw new PlatformAdminError(404,'WORKFLOW_NOT_FOUND','Không tìm thấy hồ sơ.');
    requireAdminScope(actor,permission(meta.kind,write),{});return (await db.query(`SELECT * FROM user_workflow_cases WHERE id=$1${lock?' FOR UPDATE':''}`,[id])).rows[0];
  }
  async detail(actor,id){const row=await this.readCase(actor,id);const [retention,events,decision,artifact]=await Promise.all([
    this.pool.query('SELECT * FROM user_retention_reviews WHERE case_id=$1 ORDER BY module',[id]),
    this.pool.query("SELECT id,action,reason,actor_reference,created_at FROM user_admin_events WHERE metadata->>'caseId'=$1 ORDER BY id DESC LIMIT 100",[id]),
    this.pool.query('SELECT id,action,actor_reference,reason_code,reason,restriction_scope,expires_at,outcome,created_at FROM user_admin_decisions WHERE id=$1',[row.original_decision_id]),
    this.pool.query('SELECT id,expires_at FROM user_privacy_artifacts WHERE case_id=$1',[id])]);return {record:dto(row),retention:retention.rows,events:events.rows,originalDecision:decision.rows[0]||null,artifact:artifact.rows[0]||null,requiredModules:modules};}
  async action(actor,id,input,bearer){
    const cmd=userCommand(input,['action','assigneeId','module','disposition','basisReference','retainUntil']);
    if(!['claim','assign','start','reject','uphold','overturn','retention','execute'].includes(cmd.action))throw invalidUser();
    const meta=await this.readCase(actor,id,this.pool,{write:true});if(cmd.action==='execute'){if(meta.kind==='APPEAL')throw invalidUser();requireAdminScope(actor,'privacy.execute',{});}
    if(cmd.action==='assign'){adminId(cmd.assigneeId);const {loadAdminAccess}=await import('./admin-access.service.js');const target={id:cmd.assigneeId,adminAccess:await loadAdminAccess(this.pool,cmd.assigneeId)};requireAdminScope(target,permission(meta.kind,true),{});}
    let exportData=null,impact=null;
    if(cmd.action==='execute'){
      if(!meta.user_id||!meta.identity_verified_at)throw new PlatformAdminError(409,'IDENTITY_NOT_VERIFIED','Hồ sơ chưa có bằng chứng xác minh danh tính.');
      if(meta.kind==='ACCESS')exportData=await this.profiles.exportPersonalData(meta.user_id);
      if(meta.kind==='ANONYMIZE'){
        const base=this.users.config.userOrderUrl||process.env.IDENTITY_ORDER_URL||'http://127.0.0.1:5103';
        impact=await this.users.remote(new URL(`/api/v2/admin/user-impact/${meta.user_id}`,base),bearer);
        if(['activeOrders','openCases','pendingRefunds','totalOrders','ownedStores'].some(field=>!Number.isSafeInteger(impact?.[field])||impact[field]<0))throw new PlatformAdminError(503,'USER_SOURCE_INVALID','Chưa có đủ số liệu nghĩa vụ để thực hiện ẩn danh.');
        if(impact.activeOrders||impact.openCases||impact.pendingRefunds)throw new PlatformAdminError(409,'OPEN_OBLIGATIONS','Còn đơn, hậu mãi hoặc hoàn tiền đang mở; giữ hồ sơ chờ xử lý nghĩa vụ.');
      }
    }
    const passwordHash=cmd.action==='execute'&&meta.kind==='ANONYMIZE'?await this.identity.password.hash(randomBytes(48).toString('base64url')):null;
    return this.repo.transaction(db=>adminCommand(db,'public',actor,`user-workflow:${id}`,cmd,async()=>{
      // The user lock precedes the case lock, matching account/moderation writers.
      if(meta.user_id)await db.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[meta.user_id]);
      const row=await this.readCase(actor,id,db,{write:true,lock:true});if(row.version!==cmd.version)throw conflict();
      const terminal=['COMPLETED','REJECTED','CANCELLED'].includes(row.status);
      if(terminal&&cmd.action!=='retention')throw conflict();
      if(!['claim','assign'].includes(cmd.action)&&row.assignee_id!==actor.id)throw new PlatformAdminError(403,'WORKFLOW_ASSIGNEE_REQUIRED','Nhận hoặc được phân công hồ sơ trước khi xử lý.');
      if(row.kind==='APPEAL'&&['reject','uphold','overturn'].includes(cmd.action)){
        const original=(await db.query('SELECT actor_reference FROM user_admin_decisions WHERE id=$1',[row.original_decision_id])).rows[0];
        if(original?.actor_reference===actor.id)throw new PlatformAdminError(403,'INDEPENDENT_REVIEWER_REQUIRED','Người đánh giá kháng nghị phải khác người ra quyết định khóa.');
      }
      let status=row.status,result={id};
      if(cmd.action==='claim'){
        if(row.assignee_id&&row.assignee_id!==actor.id)throw conflict();await db.query('UPDATE user_workflow_cases SET assignee_id=$2 WHERE id=$1',[id,actor.id]);
      }else if(cmd.action==='assign')await db.query('UPDATE user_workflow_cases SET assignee_id=$2 WHERE id=$1',[id,cmd.assigneeId]);
      else if(cmd.action==='start')status='IN_REVIEW';
      else if(cmd.action==='reject'){status='REJECTED';await db.query('UPDATE user_workflow_cases SET reviewed_by=$2,review_reason=$3 WHERE id=$1',[id,actor.id,cmd.reason]);}
      else if(['uphold','overturn'].includes(cmd.action)){
        if(row.kind!=='APPEAL')throw invalidUser();const user=await this.users.target(db,row.user_id,{protect:true,lock:true});
        const original=(await db.query('SELECT * FROM user_admin_decisions WHERE id=$1 FOR UPDATE',[row.original_decision_id])).rows[0];
        if(!original||original.actor_reference===actor.id)throw new PlatformAdminError(403,'INDEPENDENT_REVIEWER_REQUIRED','Người đánh giá kháng nghị phải khác người ra quyết định khóa.');
        if(cmd.action==='overturn'){
          if(user.status!=='suspended'||user.current_suspension_id!==original.id)throw new PlatformAdminError(409,'SUSPENSION_CHANGED','Quyết định đang áp dụng đã đổi; không khôi phục theo quyết định cũ.');
          await db.query("UPDATE user_admin_decisions SET outcome='OVERTURNED' WHERE id=$1",[original.id]);
          const next=user.email_verified_at?'active':'pending_verification';
          await db.query(`INSERT INTO user_admin_decisions(user_id,actor_reference,action,reason_code,reason,original_decision_id,read_version,result_version)
            VALUES($1,$2,'appeal_restore','APPEAL_ACCEPTED',$3,$4,$5,$6)`,[user.id,actor.id,cmd.reason,original.id,Number(user.admin_version),Number(user.admin_version)+1]);
          await db.query('UPDATE users SET status=$2,current_suspension_id=NULL,admin_version=admin_version+1,updated_at=now() WHERE id=$1',[user.id,next]);
          await db.query(`INSERT INTO platform_admin_actions(actor_id,actor_reference,target_id,action,previous_status,next_status,reason,read_version,result_version,correlation_id)
            VALUES($1,$1,$2,'restore','suspended',$3,$4,$5,$6,$7)`,[actor.id,user.id,next,cmd.reason,Number(user.admin_version),Number(user.admin_version)+1,cmd.requestId]);
        }
        status='COMPLETED';await db.query('UPDATE user_workflow_cases SET reviewed_by=$2,review_reason=$3 WHERE id=$1',[id,actor.id,cmd.reason]);
      }else if(cmd.action==='retention'){
        if(row.kind==='APPEAL'||!modules.includes(cmd.module)||!['CLEAR','RETAIN'].includes(cmd.disposition))throw invalidUser();
        const reference=userText(cmd.basisReference,5,500);let retainUntil=null;
        if(cmd.disposition==='RETAIN'){retainUntil=new Date(cmd.retainUntil);if(!Number.isFinite(retainUntil.getTime())||retainUntil<=new Date())throw invalidUser();}
        await db.query(`INSERT INTO user_retention_reviews(case_id,module,disposition,basis_reference,reason,retain_until,reviewed_by)
          VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(case_id,module) DO UPDATE SET disposition=$3,basis_reference=$4,reason=$5,retain_until=$6,reviewed_by=$7,reviewed_at=now()`,[id,cmd.module,cmd.disposition,reference,cmd.reason,retainUntil,actor.id]);
        if(!terminal)status='WAITING_RETENTION';
      }else if(cmd.action==='execute'){
        const user=await this.users.target(db,row.user_id,{protect:true,lock:true});
        if(!row.identity_verified_at)throw new PlatformAdminError(409,'IDENTITY_NOT_VERIFIED','Chưa xác minh danh tính.');
        const reviews=(await db.query('SELECT * FROM user_retention_reviews WHERE case_id=$1',[id])).rows;
        if(modules.some(module=>!reviews.some(review=>review.module===module))||reviews.some(review=>review.disposition==='RETAIN'&&review.retain_until<=new Date()))throw new PlatformAdminError(409,'RETENTION_REVIEW_REQUIRED','Cần rà soát đủ sáu module và gia hạn ngoại lệ đã hết hạn trước khi thực hiện.');
        if(row.kind==='ACCESS'){
          const artifact=(await db.query(`INSERT INTO user_privacy_artifacts(case_id,encrypted_payload,expires_at) VALUES($1,$2,now()+($3::integer*interval '1 hour')) RETURNING id`,
            [id,sealUserData(this.identity.config.mailKey,{...exportData,retentionReview:reviews.map(review=>({module:review.module,disposition:review.disposition,basisReference:review.basis_reference,retainUntil:review.retain_until}))},id),USER_ADMIN_POLICY.artifactHours])).rows[0];result.artifactId=artifact.id;status='COMPLETED';
        }else if(row.kind==='RECTIFY'){
          const name=userFullName(row.payload.fullName);await db.query('UPDATE users SET full_name=$2,admin_version=admin_version+1,updated_at=now() WHERE id=$1',[user.id,name]);
          await db.query('UPDATE user_profiles SET display_name=$2,updated_at=now() WHERE user_id=$1',[user.id,name]);status='COMPLETED';
        }else if(row.kind==='ANONYMIZE'){
          const retained=module=>reviews.some(review=>review.module===module&&review.disposition==='RETAIN');
          if(!retained('identity')||impact?.totalOrders>0&&!retained('order')||impact?.ownedStores>0&&!retained('catalog'))throw new PlatformAdminError(409,'RETENTION_EXCEPTION_REQUIRED','Cần ghi ngoại lệ cho nhật ký Identity và hồ sơ đơn/cửa hàng còn tồn tại. Các module khác cần kết quả rà soát có căn cứ.');
          const profile=(await db.query('SELECT avatar_key FROM user_profiles WHERE user_id=$1',[user.id])).rows[0];
          await db.query(`UPDATE users SET email=$2,full_name='Người dùng đã ẩn danh',password_hash=$3,status='suspended',email_verified_at=NULL,current_suspension_id=NULL,anonymized_at=now(),admin_version=admin_version+1,updated_at=now() WHERE id=$1`,[user.id,`anonymized+${user.id}@deleted.invalid`,passwordHash]);
          await db.query("UPDATE user_profiles SET display_name='Người dùng đã ẩn danh',phone_e164=NULL,phone_verified_at=NULL,phone_email_confirmed_at=NULL,avatar_key=NULL,updated_at=now() WHERE user_id=$1",[user.id]);
          await db.query("UPDATE addresses SET receiver_name='Đã ẩn danh',receiver_phone='',province_code='',district_code='',ward_code='',address_line='Đã ẩn danh',note=NULL,is_default=false,deleted_at=coalesce(deleted_at,now()),updated_at=now() WHERE user_id=$1",[user.id]);
          await db.query('UPDATE user_preferences SET marketing_opt_in=false WHERE user_id=$1',[user.id]);
          await db.query('DELETE FROM phone_challenges WHERE user_id=$1',[user.id]);await db.query('DELETE FROM verification_tokens WHERE user_id=$1',[user.id]);
          await db.query('UPDATE user_support_grants SET receipt_only=true,security_version=(SELECT security_version FROM users WHERE id=$1) WHERE user_id=$1',[user.id]);await db.query('DELETE FROM user_support_challenges WHERE user_id=$1',[user.id]);
          await db.query('DELETE FROM identity_email_outbox WHERE recipient=$1',[user.email]);
          await db.query("UPDATE identity_outbox SET payload=payload-'email'-'fullName' WHERE payload->>'userId'=$1",[user.id]);
          await db.query("UPDATE user_workflow_cases SET payload='{}' WHERE user_id=$1 AND kind='RECTIFY'",[user.id]);
          await db.query('DELETE FROM user_privacy_artifacts WHERE case_id IN (SELECT id FROM user_workflow_cases WHERE user_id=$1)',[user.id]);
          if(profile?.avatar_key){await db.query('INSERT INTO user_asset_cleanup(case_id,avatar_key) VALUES($1,$2)',[id,profile.avatar_key]);status='WAITING_CLEANUP';}else status='COMPLETED';
        }
        await db.query('UPDATE user_workflow_cases SET reviewed_by=$2,review_reason=$3 WHERE id=$1',[id,actor.id,cmd.reason]);
      }
      await db.query(`UPDATE user_workflow_cases SET status=$2,version=version+1,resolved_at=CASE WHEN $2 IN ('COMPLETED','REJECTED','CANCELLED') THEN now() ELSE NULL END WHERE id=$1`,[id,status]);
      if(row.legacy_privacy_request_id&&['COMPLETED','REJECTED'].includes(status))await db.query('UPDATE privacy_requests SET status=$2,resolution_note=$3,resolved_at=now(),updated_at=now() WHERE id=$1',[row.legacy_privacy_request_id,status,cmd.reason]);
      await userEvent(db,row.user_id,actor,'workflow_'+cmd.action,cmd.reason,{caseId:id,kind:row.kind,status,module:cmd.module||null,identityVerifiedAt:row.identity_verified_at},cmd.requestId);
      return {...result,status,version:row.version+1};
    }));
  }
  async artifact(actor,id,input){
    requireAdminScope(actor,'privacy.execute',{});requireAdminScope(actor,'users.view_sensitive',{});const cmd=userCommand(input);const row=await this.readCase(actor,id);
    if(row.version!==cmd.version)throw conflict();return this.repo.transaction(async db=>{const artifact=(await db.query('SELECT encrypted_payload FROM user_privacy_artifacts WHERE case_id=$1 AND expires_at>now()',[id])).rows[0];if(!artifact)throw new PlatformAdminError(404,'ARTIFACT_EXPIRED','Bản dữ liệu không có hoặc đã hết hạn.');
      await userEvent(db,row.user_id,actor,'privacy_artifact_viewed',cmd.reason,{caseId:id},cmd.requestId);return openUserData(this.identity.config.mailKey,artifact.encrypted_payload,id);});
  }
  async ownArtifact(token,id){
    adminId(id);const user=await new UserSupportService(this.identity).principal(token);const row=(await this.pool.query(`SELECT a.encrypted_payload FROM user_privacy_artifacts a JOIN user_workflow_cases c ON c.id=a.case_id WHERE c.id=$1 AND c.user_id=$2 AND c.status='COMPLETED' AND a.expires_at>now()`,[id,user.user_id])).rows[0];
    if(!row)throw new PlatformAdminError(404,'ARTIFACT_EXPIRED','Bản dữ liệu không có hoặc đã hết hạn.');await userEvent(this.pool,user.user_id,null,'privacy_artifact_owner_downloaded','Chủ tài khoản đã xác minh tải bản dữ liệu.',{caseId:id});return openUserData(this.identity.config.mailKey,row.encrypted_payload,id);
  }
}
