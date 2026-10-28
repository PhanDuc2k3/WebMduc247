import {adminId,adminMutation,checkAdminVersion,PlatformAdminError} from '../../../packages/contracts/platform-admin.js';
import {requireAdminScope,adminScopeSql} from '../../../packages/contracts/admin-rbac.js';
import {adminCommand} from '../../../packages/contracts/admin-command.js';
import {maskEmail} from '../../../packages/contracts/admin-privacy.js';
import {REPUTATION_POLICY,qualifiesForReputation} from './store-policy.js';

const fail=(code,message,status=409)=>{throw new PlatformAdminError(status,code,message);};
export const STORE_DECISION_SCOPE='Ngừng hiển thị và nhận đơn mới khi bị chặn hoặc chưa được duyệt. Đơn cũ, trả hàng và nghĩa vụ hỗ trợ vẫn phải xử lý; đội vận hành sàn tiếp nhận qua hồ sơ hậu mãi.';
export async function notifyStoreDecision(db,row,actor,action,reason,extra={}) {
  return (await db.query(`INSERT INTO catalog.store_decisions(store_id,recipient_id,actor_id,action,reason,scope,profile_version_id,violation_id,impact)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,[row.id,row.owner_user_id,actor.id,action,reason,
    STORE_DECISION_SCOPE,extra.profileVersionId||null,extra.violationId||null,extra.impact||null])).rows[0];
}
export class StoreGovernanceService {
  constructor(stores,{ownershipEnabled=process.env.STORE_OWNERSHIP_ENABLED==='true',targetLoader=null,reputationLoader=null}={}){
    this.stores=stores;this.pool=stores.pool;this.ownershipEnabled=ownershipEnabled;this.targetLoader=targetLoader;this.reputationLoader=reputationLoader;
  }
  async target(db,actor,id,permission='stores.read',lock=false){
    adminId(id);requireAdminScope(actor,permission,{storeId:id});
    const row=(await db.query(`SELECT * FROM catalog.stores WHERE id=$1${lock?' FOR UPDATE':''}`,[id])).rows[0];
    if(!row)fail('NOT_FOUND','Không tìm thấy cửa hàng.',404);return row;
  }
  async read(actor,id){
    await this.target(this.pool,actor,id);
    return this.data(id,false);
  }
  async profileContact(actor,id,input){
    requireAdminScope(actor,'users.view_sensitive',{});await this.target(this.pool,actor,id);
    if(!input||Object.keys(input).some(key=>!['reason','profileVersionId'].includes(key))||typeof input.reason!=='string'||input.reason.trim().length<8||input.reason.length>500||!/^\d+$/.test(String(input.profileVersionId)))fail('INVALID_COMMAND','Nhập phiên bản hồ sơ và lý do xem dữ liệu liên hệ.',400);
    return this.stores.transaction(async db=>{
      const profile=(await db.query('SELECT profile FROM catalog.store_profile_versions WHERE store_id=$1 AND id=$2',[id,input.profileVersionId])).rows[0];
      if(!profile)fail('NOT_FOUND','Không tìm thấy phiên bản hồ sơ.',404);
      await db.query("INSERT INTO catalog.store_governance_events(store_id,actor_id,action,reason,metadata) VALUES($1,$2,'profile_contact_view',$3,$4)",[id,actor.id,input.reason.trim(),{profileVersionId:input.profileVersionId}]);
      return {contactEmail:profile.profile.contactEmail,contactPhone:profile.profile.contactPhone,pickupAddress:profile.profile.pickupAddress,returnAddress:profile.profile.returnAddress};
    });
  }
  async data(id,seller){
    const queries=[
      ['decisions','SELECT * FROM catalog.store_decisions WHERE store_id=$1 ORDER BY created_at DESC,id DESC LIMIT 100'],
      ['violations','SELECT * FROM catalog.store_violations WHERE store_id=$1 ORDER BY created_at DESC,id DESC LIMIT 100'],
      ['appeals','SELECT * FROM catalog.store_appeals WHERE store_id=$1 ORDER BY created_at DESC,id DESC LIMIT 100'],
      ['profiles','SELECT * FROM catalog.store_profile_versions WHERE store_id=$1 ORDER BY id DESC LIMIT 30'],
      ['events','SELECT * FROM catalog.store_governance_events WHERE store_id=$1 ORDER BY id DESC LIMIT 100'],
    ];
    const result=Object.fromEntries(await Promise.all(queries.map(async([key,sql])=>[key,(await this.pool.query(sql,[id])).rows])));
    result.ownership=seller?[]:(await this.pool.query('SELECT * FROM catalog.store_ownership_requests WHERE store_id=$1 ORDER BY created_at DESC LIMIT 30',[id])).rows;
    if(!seller)result.profiles=result.profiles.map(row=>({...row,profile:{name:row.profile.name,description:row.profile.description,category:row.profile.category,
      contactEmail:maskEmail(row.profile.contactEmail),pickupAddress:'Đã cung cấp',returnAddress:'Đã cung cấp'}}));
    return {...result,policy:{approvalRequired:this.stores.approvalRequired,ownershipTransferEnabled:this.ownershipEnabled,documentVerificationEnabled:false,
      badgesEnabled:true,reputation:REPUTATION_POLICY,existingOrderSupport:'/admin/cases',appealPath:'/mystore'}};
  }
  async queue(actor,query={}){
    if(Object.keys(query).some(key=>!['status','page'].includes(key)))fail('INVALID_FILTER','Bộ lọc không hợp lệ.',400);
    const status=query.status||'PENDING',page=Number(query.page||1);
    if(!['PENDING','NEEDS_INFORMATION','APPROVED','REJECTED'].includes(status)||!Number.isSafeInteger(page)||page<1||page>10000)fail('INVALID_FILTER','Bộ lọc không hợp lệ.',400);
    const args=[status],scope=adminScopeSql(actor,'stores.read',{storeIds:'s.id::text'},args);
    const where=`FROM catalog.stores s WHERE s.registration_status=$1 AND ${scope}`;
    const count=await this.pool.query(`SELECT count(*)::int AS total ${where}`,args);
    const {rows}=await this.pool.query(`SELECT s.id,s.name,s.slug,s.registration_status,s.admin_version ${where}
      ORDER BY s.created_at,s.id LIMIT 20 OFFSET $${args.length+1}`,[...args,(page-1)*20]);
    return {items:rows,total:count.rows[0].total,page,totalPages:Math.ceil(count.rows[0].total/20)};
  }
  async command(actor,id,input,bearer){
    const extras={review:['decision','profileVersionId'],warning:['incidentKey','remedyBy'],remedy:['violationId'],appeal:['appealId','outcome'],
      'badge-award':[],'badge-revoke':[],ownership:['kind','targetUserId','verificationRef'],'ownership-review':['ownershipId','outcome','verificationRef']};
    const allowed=extras[input?.action];
    if(!allowed||Object.keys(input).some(key=>!['action','reason','version','requestId',...allowed].includes(key)))fail('INVALID_COMMAND','Thao tác không hợp lệ.',400);
    const cmd={...input,...adminMutation(input)};
    const permission=cmd.action==='ownership'?'stores.ownership.request':cmd.action==='ownership-review'?'stores.ownership.approve':'stores.moderate';
    await this.target(this.pool,actor,id,permission);
    let reputation=null,identity=null,expectedTarget=null;
    if(cmd.action==='badge-award'){
      if(!this.reputationLoader)fail('SOURCE_UNAVAILABLE','Chưa kết nối nguồn hiệu quả để xét badge.',503);
      reputation=await this.reputationLoader(actor,id,bearer);
    }
    if(cmd.action==='ownership'||cmd.action==='ownership-review'){
      if(!this.ownershipEnabled)fail('POLICY_DISABLED','Chính sách chuyển chủ/khôi phục quyền sở hữu chưa được bật.');
      if(!/^case:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cmd.verificationRef||''))fail('VERIFICATION_REQUIRED','Cần tham chiếu hồ sơ xác minh case:UUID.',400);
      cmd.verificationRef=cmd.verificationRef.toLowerCase();
      if(cmd.action==='ownership'){
        adminId(cmd.targetUserId);cmd.targetUserId=cmd.targetUserId.toLowerCase();expectedTarget=cmd.targetUserId;
        if(!['TRANSFER','RECOVERY'].includes(cmd.kind))fail('INVALID_COMMAND','Loại yêu cầu không hợp lệ.',400);
        if(!this.targetLoader)fail('IDENTITY_UNAVAILABLE','Chưa kết nối xác minh tài khoản đích.',503);
        identity=await this.targetLoader(actor,cmd.targetUserId,bearer,cmd.verificationRef,id);
      }else{
        adminId(cmd.ownershipId);if(!['APPROVED','REJECTED'].includes(cmd.outcome))fail('INVALID_COMMAND','Kết quả không hợp lệ.',400);
        const request=(await this.pool.query('SELECT target_user_id FROM catalog.store_ownership_requests WHERE id=$1 AND store_id=$2',[cmd.ownershipId,id])).rows[0];
        if(!request)fail('NOT_FOUND','Không tìm thấy yêu cầu chuyển chủ.',404);
        if(cmd.outcome==='APPROVED'){
          expectedTarget=request.target_user_id;
          if(!this.targetLoader)fail('IDENTITY_UNAVAILABLE','Chưa kết nối xác minh tài khoản đích.',503);
          identity=await this.targetLoader(actor,request.target_user_id,bearer,cmd.verificationRef,id);
        }
      }
      if(expectedTarget&&(!identity||identity.id!==expectedTarget||!identity.emailVerifiedAt||identity.status!=='active'))fail('TARGET_NOT_VERIFIED','Tài khoản đích cần đang hoạt động và đã xác minh email.');
    }
    return this.stores.transaction(db=>adminCommand(db,'catalog',actor,`store-governance:${id}`,cmd,async()=>{
      const row=await this.target(db,actor,id,permission,true);checkAdminVersion(row,cmd);
      let metadata={};
      if(cmd.action==='badge-award'){
        const warnings=await db.query("SELECT 1 FROM catalog.store_violations WHERE store_id=$1 AND status='WARNING' LIMIT 1",[id]);
        const eligible=qualifiesForReputation(reputation.impact,reputation.ratings)&&!row.platform_suspended&&['NOT_REQUIRED','APPROVED'].includes(row.registration_status)&&!warnings.rowCount;
        if(!eligible){
          if(!row.reputation_badge_until)fail('BADGE_CRITERIA_NOT_MET','Shop chưa đáp ứng điều kiện công khai để nhận badge.');
          await db.query('UPDATE catalog.stores SET reputation_badge_until=NULL,reputation_badge_evidence=NULL WHERE id=$1',[id]);
          await notifyStoreDecision(db,row,actor,'BADGE_REVOKED','Kiểm tra lại điều kiện badge: không còn đáp ứng điều kiện công khai.');metadata={eligible:false};
        }else{
          const expiresAt=new Date(Date.now()+REPUTATION_POLICY.validDays*86400000).toISOString();
          await db.query('UPDATE catalog.stores SET reputation_badge_until=$2,reputation_badge_evidence=$3 WHERE id=$1',[id,expiresAt,{policyId:REPUTATION_POLICY.id,...reputation}]);
          await notifyStoreDecision(db,row,actor,'BADGE_AWARDED',cmd.reason);metadata={eligible:true,expiresAt,policyId:REPUTATION_POLICY.id};
        }
      }
      if(cmd.action==='badge-revoke'){
        await db.query('UPDATE catalog.stores SET reputation_badge_until=NULL,reputation_badge_evidence=NULL WHERE id=$1',[id]);
        await notifyStoreDecision(db,row,actor,'BADGE_REVOKED',cmd.reason);
      }
      if(cmd.action==='ownership'){
        if(cmd.targetUserId===row.owner_user_id?cmd.kind!=='RECOVERY':cmd.kind!=='TRANSFER')fail('INVALID_OWNERSHIP_KIND','Khôi phục áp dụng cho chủ hiện tại; chuyển chủ áp dụng cho tài khoản khác.');
        const pending=await db.query("SELECT 1 FROM catalog.store_ownership_requests WHERE store_id=$1 AND status='PENDING'",[id]);
        if(pending.rowCount)fail('PENDING_OWNERSHIP_REQUEST','Shop đang có yêu cầu chờ duyệt.');
        const request=(await db.query(`INSERT INTO catalog.store_ownership_requests(store_id,kind,previous_owner_id,target_user_id,proposed_by,verification_ref,reason,read_version)
          VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,[id,cmd.kind,row.owner_user_id,cmd.targetUserId,actor.id,cmd.verificationRef,cmd.reason,cmd.version+1])).rows[0];
        await notifyStoreDecision(db,row,actor,'OWNERSHIP_REQUESTED',cmd.reason);metadata={ownershipId:request.id};
      }
      if(cmd.action==='ownership-review'){
        const request=(await db.query('SELECT * FROM catalog.store_ownership_requests WHERE id=$1 AND store_id=$2 FOR UPDATE',[cmd.ownershipId,id])).rows[0];
        if(request.status!=='PENDING')fail('INVALID_TRANSITION','Yêu cầu đã được xử lý.');
        if([request.proposed_by,request.previous_owner_id,request.target_user_id].includes(actor.id))fail('INDEPENDENT_REVIEW_REQUIRED','Người duyệt phải độc lập với người đề xuất và các chủ shop.',403);
        if(cmd.outcome==='APPROVED'){
          if(Number(request.read_version)!==cmd.version||request.previous_owner_id!==row.owner_user_id)fail('VERSION_CONFLICT','Shop đã thay đổi sau đề xuất. Cần từ chối và tạo lại yêu cầu.');
          if(cmd.verificationRef===request.verification_ref)fail('INDEPENDENT_VERIFICATION_REQUIRED','Cần hồ sơ xác minh độc lập của người duyệt.');
          if(request.kind==='TRANSFER'){
            await db.query("UPDATE catalog.store_members SET status='removed' WHERE store_id=$1 AND role='owner'",[id]);
            await db.query('UPDATE catalog.stores SET owner_user_id=$2 WHERE id=$1',[id,request.target_user_id]);
            await db.query("INSERT INTO catalog.store_outbox(event_type,payload) VALUES('StoreMemberRemoved.v1',$1)",[{storeId:id,userId:request.previous_owner_id}]);
          }
          await db.query("INSERT INTO catalog.store_members(store_id,user_id,role,status) VALUES($1,$2,'owner','active') ON CONFLICT(store_id,user_id) DO UPDATE SET role='owner',status='active'",[id,request.target_user_id]);
          await db.query('DELETE FROM catalog.store_invitations WHERE store_id=$1 AND accepted_at IS NULL',[id]);
          await db.query("INSERT INTO catalog.store_outbox(event_type,payload) VALUES('StoreMemberAdded.v1',$1)",[{storeId:id,userId:request.target_user_id}]);
          if(request.target_user_id!==row.owner_user_id)await notifyStoreDecision(db,{...row,owner_user_id:request.target_user_id},actor,'OWNERSHIP_APPROVED',cmd.reason);
        }
        await db.query('UPDATE catalog.store_ownership_requests SET status=$2,reviewer_id=$3,review_verification_ref=$4,review_reason=$5,reviewed_at=now() WHERE id=$1',[request.id,cmd.outcome,actor.id,cmd.verificationRef,cmd.reason]);
        await notifyStoreDecision(db,row,actor,`OWNERSHIP_${cmd.outcome}`,cmd.reason);metadata={ownershipId:request.id,outcome:cmd.outcome};
      }
      if(cmd.action==='review'){
        if(!['APPROVED','REJECTED','NEEDS_INFORMATION'].includes(cmd.decision)||!['PENDING','NEEDS_INFORMATION'].includes(row.registration_status))fail('INVALID_TRANSITION','Hồ sơ không ở trạng thái chờ xét duyệt.');
        const latest=(await db.query('SELECT id FROM catalog.store_profile_versions WHERE store_id=$1 ORDER BY id DESC LIMIT 1',[id])).rows[0];
        if(!latest||String(latest.id)!==String(cmd.profileVersionId))fail('PROFILE_VERSION_CONFLICT','Hồ sơ đã thay đổi, hãy đọc phiên bản mới nhất.');
        if(row.registration_status==='NEEDS_INFORMATION'&&cmd.decision!=='NEEDS_INFORMATION')fail('AWAITING_SELLER','Chờ người bán nộp lại hồ sơ trước khi quyết định.');
        await db.query('UPDATE catalog.stores SET registration_status=$2 WHERE id=$1',[id,cmd.decision]);
        const decision=await notifyStoreDecision(db,row,actor,cmd.decision,cmd.reason,{profileVersionId:latest.id});metadata={decisionId:decision.id,profileVersionId:latest.id};
        await db.query('UPDATE catalog.stores SET current_registration_decision_id=$2 WHERE id=$1',[id,decision.id]);
      }
      if(cmd.action==='warning'){
        if(typeof cmd.incidentKey!=='string'||cmd.incidentKey.trim().length<8||cmd.incidentKey.length>160||!Number.isFinite(Date.parse(cmd.remedyBy))||Date.parse(cmd.remedyBy)<=Date.now()||Date.parse(cmd.remedyBy)>Date.now()+365*86400000)
          fail('INVALID_WARNING','Nhập mã sự việc và hạn khắc phục trong vòng một năm.',400);
        // An incident reference is reused across reports, warnings and sanctions.
        const violation=(await db.query(`INSERT INTO catalog.store_violations(store_id,incident_key,reason,remedy_by,actor_id)
          VALUES($1,$2,$3,$4,$5) ON CONFLICT(store_id,incident_key) DO NOTHING RETURNING id`,[id,cmd.incidentKey.trim().toLowerCase(),cmd.reason,cmd.remedyBy,actor.id])).rows[0];
        if(!violation)fail('DUPLICATE_INCIDENT','Sự việc này đã được ghi nhận; dùng hồ sơ vi phạm hiện có.');
        await notifyStoreDecision(db,row,actor,'WARNING',cmd.reason,{violationId:violation.id});metadata={violationId:violation.id};
        if(row.reputation_badge_until){await db.query('UPDATE catalog.stores SET reputation_badge_until=NULL,reputation_badge_evidence=NULL WHERE id=$1',[id]);await notifyStoreDecision(db,row,actor,'BADGE_REVOKED','Thu hồi badge do phát sinh cảnh cáo chưa khắc phục.');}
      }
      if(cmd.action==='remedy'){
        adminId(cmd.violationId);
        const updated=await db.query("UPDATE catalog.store_violations SET status='REMEDIED' WHERE store_id=$1 AND id=$2 AND status='WARNING' RETURNING id",[id,cmd.violationId]);
        if(!updated.rowCount)fail('INVALID_TRANSITION','Vi phạm không còn chờ khắc phục.');
        await notifyStoreDecision(db,row,actor,'REMEDIED',cmd.reason,{violationId:cmd.violationId});metadata={violationId:cmd.violationId};
      }
      if(cmd.action==='appeal'){
        adminId(cmd.appealId);if(!['UPHELD','OVERTURNED'].includes(cmd.outcome))fail('INVALID_COMMAND','Kết quả kháng nghị không hợp lệ.',400);
        const appeal=(await db.query(`SELECT a.*,d.actor_id,d.action,d.violation_id FROM catalog.store_appeals a
          JOIN catalog.store_decisions d ON d.id=a.decision_id WHERE a.store_id=$1 AND a.id=$2 FOR UPDATE OF a`,[id,cmd.appealId])).rows[0];
        if(!appeal||appeal.status!=='PENDING')fail('INVALID_TRANSITION','Kháng nghị không còn chờ xử lý.');
        if([appeal.actor_id,appeal.submitted_by].includes(actor.id))fail('INDEPENDENT_REVIEW_REQUIRED','Người xét kháng nghị phải độc lập với người ra quyết định và người gửi.',403);
        if(cmd.outcome==='OVERTURNED'){
          if(appeal.action==='suspend'){
            if(!row.platform_suspended||row.current_suspension_decision_id!==appeal.decision_id)fail('SUPERSEDED_DECISION','Quyết định đã được thay thế; hãy xét trạng thái hiện tại.');
            await db.query('UPDATE catalog.stores SET platform_suspended=false,platform_suspension_reason=NULL,current_suspension_decision_id=NULL WHERE id=$1',[id]);
            await notifyStoreDecision(db,row,actor,'restore',cmd.reason);
            await db.query("INSERT INTO catalog.store_outbox(event_type,payload) VALUES('StoreStatusChanged.v1',$1)",[ {storeId:id,platformSuspended:false,correlationId:cmd.requestId}]);
          }else if(appeal.action==='WARNING')await db.query("UPDATE catalog.store_violations SET status='OVERTURNED' WHERE id=$1",[appeal.violation_id]);
          else if(appeal.action==='REJECTED'){
            if(row.registration_status!=='REJECTED'||row.current_registration_decision_id!==appeal.decision_id)fail('SUPERSEDED_DECISION','Hồ sơ đã được thay thế.');
            await db.query("UPDATE catalog.stores SET registration_status='NEEDS_INFORMATION' WHERE id=$1",[id]);
          }else fail('APPEAL_NOT_APPLICABLE','Quyết định này không hỗ trợ hủy qua kháng nghị.');
        }
        await db.query('UPDATE catalog.store_appeals SET status=$2,reviewer_id=$3,review_reason=$4,reviewed_at=now() WHERE id=$1',[appeal.id,cmd.outcome,actor.id,cmd.reason]);
        await notifyStoreDecision(db,row,actor,`APPEAL_${cmd.outcome}`,cmd.reason,{violationId:appeal.violation_id});metadata={appealId:appeal.id,outcome:cmd.outcome};
      }
      const current=(await db.query('UPDATE catalog.stores SET admin_version=admin_version+1,updated_at=now() WHERE id=$1 RETURNING status,platform_suspended,registration_status',[id])).rows[0];
      if(current.status!==row.status||cmd.action==='review')await db.query("INSERT INTO catalog.store_outbox(event_type,payload) VALUES('StoreStatusChanged.v1',$1)",[{storeId:id,status:current.status,platformSuspended:current.platform_suspended,registrationStatus:current.registration_status,correlationId:cmd.requestId}]);
      await db.query('INSERT INTO catalog.store_governance_events(store_id,actor_id,action,reason,metadata) VALUES($1,$2,$3,$4,$5)',[id,actor.id,cmd.action,cmd.reason,metadata]);
      return {id,version:cmd.version+1,...metadata};
    }));
  }
  async sellerRead(user,id){await this.stores.owner(this.pool,id,user.id);return this.data(id,true);}
  async sellerCommand(user,id,input){
    if(!input||!['resubmit','appeal','read'].includes(input.action))fail('INVALID_COMMAND','Thao tác không hợp lệ.',400);
    const fields=input.action==='resubmit'?[]:input.action==='appeal'?['decisionId','reason']:['decisionId'];
    if(Object.keys(input).some(key=>!['action','requestId',...fields].includes(key)))fail('INVALID_COMMAND','Dữ liệu không hợp lệ.',400);
    // Receipts share the same atomic idempotency mechanism as administrative commands.
    adminId(input.requestId);
    return this.stores.transaction(async db=>{
      await this.stores.owner(db,id,user.id);
      return adminCommand(db,'catalog',user,`store-seller:${id}`,input,async()=>{
        const row=(await db.query('SELECT * FROM catalog.stores WHERE id=$1 FOR UPDATE',[id])).rows[0];
        if(input.action==='read'){
          adminId(input.decisionId);const updated=await db.query('UPDATE catalog.store_decisions SET read_at=coalesce(read_at,now()) WHERE store_id=$1 AND id=$2 RETURNING id',[id,input.decisionId]);
          if(!updated.rowCount)fail('NOT_FOUND','Không tìm thấy thông báo.',404);return {id};
        }
        if(input.action==='appeal'){
          adminId(input.decisionId);
          if(typeof input.reason!=='string'||input.reason.trim().length<8||input.reason.length>2000)fail('INVALID_REASON','Lý do cần từ 8 đến 2000 ký tự.',400);
          const decision=(await db.query("SELECT id FROM catalog.store_decisions WHERE id=$1 AND store_id=$2 AND action IN ('suspend','WARNING','REJECTED')",[input.decisionId,id])).rows[0];
          if(!decision)fail('NOT_FOUND','Không tìm thấy quyết định có thể kháng nghị.',404);
          const appeal=(await db.query(`INSERT INTO catalog.store_appeals(store_id,decision_id,submitted_by,reason) VALUES($1,$2,$3,$4)
            ON CONFLICT(decision_id) DO NOTHING RETURNING id`,[id,decision.id,user.id,input.reason.trim()])).rows[0];
          if(!appeal)fail('DUPLICATE_APPEAL','Quyết định đã có kháng nghị.');
          await db.query('UPDATE catalog.stores SET admin_version=admin_version+1 WHERE id=$1',[id]);return {id:appeal.id};
        }
        if(!['NEEDS_INFORMATION','REJECTED'].includes(row.registration_status))fail('INVALID_TRANSITION','Hồ sơ không cần nộp lại.');
        const info=(await db.query(`SELECT s.name,s.description,s.category,t.contact_info,a.pickup_address,a.return_address
          FROM catalog.stores s JOIN catalog.store_settings t ON t.store_id=s.id JOIN catalog.store_addresses a ON a.store_id=s.id WHERE s.id=$1`,[id])).rows[0];
        await db.query('INSERT INTO catalog.store_profile_versions(store_id,submitted_by,profile) VALUES($1,$2,$3)',[id,user.id,{name:info.name,description:info.description,category:info.category,contactEmail:info.contact_info.email,contactPhone:info.contact_info.phone,pickupAddress:info.pickup_address,returnAddress:info.return_address}]);
        await db.query("UPDATE catalog.stores SET registration_status='PENDING',current_registration_decision_id=NULL,admin_version=admin_version+1,updated_at=now() WHERE id=$1",[id]);
        await db.query("INSERT INTO catalog.store_governance_events(store_id,actor_id,action,reason) VALUES($1,$2,'resubmit','Người bán nộp lại hồ sơ')",[id,user.id]);
        return {id};
      });
    });
  }
}
