import {randomInt} from 'node:crypto';
import {adminId,adminQuery,adminPage,PlatformAdminError} from '../../../../packages/contracts/platform-admin.js';
import {requireAdminScope,permissionGrants} from '../../../../packages/contracts/admin-rbac.js';
import {adminCommand} from '../../../../packages/contracts/admin-command.js';
import {maskEmail,maskName} from '../../../../packages/contracts/admin-privacy.js';
import {IdentityAdminService} from './platform-admin.service.js';
import {USER_REASON_CODES,strictInput,userText,userCommand,moderationInput,invalidUser,userEvent} from './user-admin-contract.js';
import {userMail,userHash} from './user-admin-crypto.js';
import {USER_ADMIN_POLICY} from './user-admin-policy.js';

export class UserAdminService {
  constructor(identity,profiles,config={}){this.identity=identity;this.repo=identity.repo;this.pool=this.repo?.pool;this.profiles=profiles;this.config=config;this.core=new IdentityAdminService(this.repo);}
  async target(db,id,{protect=false,lock=false}={}){
    adminId(id);const row=(await db.query(`SELECT u.*,EXISTS(SELECT 1 FROM user_roles r WHERE r.user_id=u.id AND r.role='platform_admin') AS is_admin FROM users u WHERE u.id=$1${lock?' FOR UPDATE OF u':''}`,[id])).rows[0];
    if(!row)throw new PlatformAdminError(404,'USER_NOT_FOUND','Không tìm thấy tài khoản.');
    if(protect&&(row.is_admin||row.anonymized_at))throw new PlatformAdminError(409,'ADMIN_PROTECTED','Tài khoản quản trị hoặc đã ẩn danh được bảo vệ.');
    return row;
  }
  async workspace(actor,id){
    requireAdminScope(actor,'users.read',{});const core=await this.core.detail(actor,id);
    const [decisions,assignment]=await Promise.all([this.pool.query(`SELECT id,action,reason_code,reason,restriction_scope,expires_at,counts_violation,outcome,original_decision_id,actor_reference,created_at FROM user_admin_decisions WHERE user_id=$1 ORDER BY created_at DESC,id DESC LIMIT 100`,[id]),
      this.pool.query('SELECT a.team_id,a.version,t.name FROM user_admin_assignments a JOIN user_admin_teams t ON t.id=a.team_id WHERE a.user_id=$1',[id])]);
    const row=await this.target(this.pool,id);
    return {...core,policy:USER_ADMIN_POLICY,reasonCodes:USER_REASON_CODES,decisions:decisions.rows,suspensionId:row.current_suspension_id,anonymizedAt:row.anonymized_at,
      violationCount:Number((await this.pool.query("SELECT count(*)::int AS n FROM user_admin_decisions WHERE user_id=$1 AND counts_violation AND outcome='UPHELD'",[id])).rows[0].n),assignment:assignment.rows[0]||null};
  }
  async sensitive(actor,id,input){
    requireAdminScope(actor,'users.view_sensitive',{});const cmd=userCommand(input);
    return this.repo.transaction(async db=>{const row=await this.target(db,id);if(Number(row.admin_version)!==cmd.version)throw new PlatformAdminError(409,'VERSION_CONFLICT','Hồ sơ đã thay đổi.');
      const profile=(await db.query('SELECT phone_e164,phone_verified_at FROM user_profiles WHERE user_id=$1',[id])).rows[0];
      await userEvent(db,id,actor,'contact_viewed',cmd.reason,{fields:['email','phone']},cmd.requestId);
      return {email:row.email,phone:profile?.phone_e164||null,phoneVerifiedAt:profile?.phone_verified_at||null};});
  }
  async searchContact(actor,input){
    requireAdminScope(actor,'users.read',{});requireAdminScope(actor,'users.view_sensitive',{});
    strictInput(input,['phone','reason','requestId','page']);const phone=userText(input.phone,9,16),reason=userText(input.reason,8,500);adminId(input.requestId);
    if(!/^\+[1-9]\d{7,14}$/.test(phone))throw invalidUser();const options=adminQuery({page:input.page||1,limit:12});
    return this.repo.transaction(async db=>{const {rows}=await db.query(`SELECT u.id,u.email,u.full_name,u.status,u.created_at,u.email_verified_at,u.admin_version,ARRAY(SELECT role FROM user_roles WHERE user_id=u.id) AS roles
      FROM users u JOIN user_profiles p ON p.user_id=u.id WHERE p.phone_e164=$1 ORDER BY u.created_at DESC,u.id LIMIT $2 OFFSET $3`,[phone,options.limit,options.offset]);
      const total=(await db.query('SELECT count(*)::int AS n FROM user_profiles WHERE phone_e164=$1',[phone])).rows[0].n;
      await userEvent(db,null,actor,'contact_searched',reason,{queryHash:userHash(phone),total},input.requestId);
      return adminPage(rows.map(row=>({id:row.id,email:maskEmail(row.email),fullName:maskName(row.full_name),status:row.status,createdAt:row.created_at,roles:row.roles,version:Number(row.admin_version)})),total,options);});
  }
  async remote(url,bearer){let response;try{response=await fetch(url,{headers:{Authorization:bearer},signal:AbortSignal.timeout(5000)});}catch{throw new PlatformAdminError(503,'USER_SOURCE_UNAVAILABLE','Nguồn dữ liệu tác động tạm thời không sẵn sàng.');}const data=await response.json().catch(()=>({}));if(!response.ok)throw new PlatformAdminError(response.status>=500?503:response.status,data.code||'IMPACT_UNAVAILABLE',data.message||'Chưa tải được tác động.');return data;}
  async impact(actor,id,bearer){
    requireAdminScope(actor,'users.moderate',{});await this.target(this.pool,id);
    const sessions=(await this.pool.query('SELECT count(DISTINCT family_id)::int AS n FROM refresh_sessions WHERE user_id=$1 AND revoked_at IS NULL AND rotated_at IS NULL AND expires_at>now()',[id])).rows[0].n;
    const urls={catalog:this.config.userCatalogUrl||process.env.IDENTITY_CATALOG_URL||'http://127.0.0.1:5102',order:this.config.userOrderUrl||process.env.IDENTITY_ORDER_URL||'http://127.0.0.1:5103'};
    const results=await Promise.allSettled(Object.entries(urls).map(async([module,base])=>{const data=await this.remote(new URL(`/api/v2/admin/user-impact/${id}`,base),bearer);
      const fields=module==='catalog'?['ownedStores']:['activeOrders','activeBuyerOrders','activeSellerOrders','openCases','pendingRefunds'];
      if(fields.some(field=>!Number.isSafeInteger(data?.[field])||data[field]<0))throw new PlatformAdminError(503,'USER_SOURCE_INVALID','Số liệu tác động từ nguồn chưa hợp lệ.');return {module,data};}));
    return {sessions,modules:results.map((result,index)=>result.status==='fulfilled'?{...result.value,ok:true}:{module:Object.keys(urls)[index],ok:false,error:result.reason?.message||'Nguồn không sẵn sàng.'}),updatedAt:new Date().toISOString()};
  }
  async moderate(actor,id,input){
    requireAdminScope(actor,'users.moderate',{});const cmd=moderationInput(input);adminId(id);
    if(actor.id===id)throw new PlatformAdminError(409,'ADMIN_PROTECTED','Không tự thay đổi trạng thái tài khoản quản trị.');
    return this.repo.transaction(db=>adminCommand(db,'public',actor,`users:${id}:status`,cmd,async()=>{
      const row=await this.target(db,id,{protect:true,lock:true});
      if(Number(row.admin_version)!==cmd.version)throw new PlatformAdminError(409,'VERSION_CONFLICT','Hồ sơ đã thay đổi. Hãy tải lại.');
      if(cmd.action==='suspend'?row.status==='suspended':row.status!=='suspended')throw new PlatformAdminError(409,'INVALID_TRANSITION','Thao tác không phù hợp với trạng thái hiện tại.');
      const status=cmd.action==='suspend'?'suspended':row.email_verified_at?'active':'pending_verification';
      if(cmd.action==='restore'&&cmd.reasonCode==='REVIEW_CORRECTION'&&row.current_suspension_id)await db.query("UPDATE user_admin_decisions SET outcome='OVERTURNED' WHERE id=$1",[row.current_suspension_id]);
      const decision=(await db.query(`INSERT INTO user_admin_decisions(user_id,actor_reference,action,reason_code,reason,restriction_scope,expires_at,counts_violation,original_decision_id,read_version,result_version)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,[id,actor.id,cmd.action,cmd.reasonCode,cmd.reason,cmd.restrictionScope,cmd.expiresAt,
        cmd.action==='suspend'&&['ABUSE','FRAUD','PROHIBITED_CONTENT','PAYMENT_ABUSE'].includes(cmd.reasonCode),row.current_suspension_id,cmd.version,cmd.version+1])).rows[0];
      await db.query('UPDATE users SET status=$2,current_suspension_id=$3,admin_version=admin_version+1,updated_at=now() WHERE id=$1',[id,status,cmd.action==='suspend'?decision.id:null]);
      const sessions=cmd.action==='suspend'?await db.query('UPDATE refresh_sessions SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL RETURNING family_id',[id]):{rows:[]};
      await db.query(`INSERT INTO platform_admin_actions(actor_id,actor_reference,target_id,action,previous_status,next_status,reason,read_version,result_version,correlation_id) VALUES($1,$1,$2,$3,$4,$5,$6,$7,$8,$9)`,[actor.id,id,cmd.action,row.status,status,cmd.reason,cmd.version,cmd.version+1,cmd.requestId]);
      await userEvent(db,id,actor,'moderation',cmd.reason,{decisionId:decision.id,reasonCode:cmd.reasonCode,restrictionScope:cmd.restrictionScope,expiresAt:cmd.expiresAt,revokedFamilyIds:[...new Set(sessions.rows.map(item=>item.family_id))]},cmd.requestId);
      return {id,status,version:cmd.version+1,decisionId:decision.id};
    }));
  }
  async sessions(actor,id){
    requireAdminScope(actor,'users.sessions.read',{});await this.target(this.pool,id,{protect:true});
    const {rows}=await this.pool.query(`SELECT family_id,min(created_at) AS created_at,max(created_at) AS last_activity_at,max(expires_at) AS expires_at,
      bool_or(revoked_at IS NULL AND rotated_at IS NULL AND expires_at>now()) AS active,(array_agg(device ORDER BY created_at DESC))[1] AS device
      FROM refresh_sessions WHERE user_id=$1 GROUP BY family_id ORDER BY max(created_at) DESC,family_id LIMIT 50`,[id]);
    return {items:rows.map(row=>({familyId:row.family_id,createdAt:row.created_at,lastActivityAt:row.last_activity_at,expiresAt:row.expires_at,active:row.active,device:row.device}))};
  }
  async events(actor,id){requireAdminScope(actor,'users.read',{});requireAdminScope(actor,'audit.read',{});adminId(id);
    const {rows}=await this.pool.query('SELECT id,actor_reference,action,reason,metadata,created_at FROM user_admin_events WHERE user_reference=$1 ORDER BY id DESC LIMIT 100',[id]);return {items:rows};}
  async revokeSessions(actor,id,input){
    requireAdminScope(actor,'users.sessions.revoke',{});const cmd=userCommand(input,['familyId']);if(cmd.familyId!=='all')adminId(cmd.familyId);
    return this.repo.transaction(db=>adminCommand(db,'public',actor,`users:${id}:sessions`,cmd,async()=>{
      const row=await this.target(db,id,{protect:true,lock:true});if(Number(row.admin_version)!==cmd.version)throw new PlatformAdminError(409,'VERSION_CONFLICT','Hồ sơ đã thay đổi.');
      const result=await db.query(`UPDATE refresh_sessions SET revoked_at=now() WHERE user_id=$1 AND ($2::uuid IS NULL OR family_id=$2) AND revoked_at IS NULL RETURNING family_id`,[id,cmd.familyId==='all'?null:cmd.familyId]);
      const familyIds=[...new Set(result.rows.map(row=>row.family_id))];await userEvent(db,id,actor,'sessions_revoked',cmd.reason,{familyIds},cmd.requestId);return {id,revoked:familyIds.length};
    }));
  }
  async resetPassword(actor,id,input,context){
    requireAdminScope(actor,'users.password_reset',{});const cmd=userCommand(input);
    return this.repo.transaction(db=>adminCommand(db,'public',actor,`users:${id}:password-reset`,cmd,async()=>{
      const row=await this.target(db,id,{protect:true,lock:true});if(Number(row.admin_version)!==cmd.version)throw new PlatformAdminError(409,'VERSION_CONFLICT','Hồ sơ đã thay đổi.');
      if(row.status!=='active')throw new PlatformAdminError(409,'RESET_NOT_AVAILABLE','Luồng đặt lại mật khẩu yêu cầu tài khoản đang hoạt động.');
      await this.identity.throttle('admin-user-reset',row.email,context,3);if(!await this.repo.limit(`admin-user-reset:actor:${actor.id}`,6,900))throw new PlatformAdminError(429,'RATE_LIMITED','Vượt giới hạn hỗ trợ đặt lại mật khẩu.');
      const code=String(randomInt(0,1000000)).padStart(6,'0');
      await db.query("UPDATE verification_tokens SET consumed_at=now() WHERE user_id=$1 AND purpose='reset_password' AND consumed_at IS NULL",[id]);
      await db.query("INSERT INTO verification_tokens(user_id,purpose,token_hash,expires_at) VALUES($1,'reset_password',$2,now()+interval '10 minutes')",[id,this.identity.hashResetCode(row.email,code)]);
      await userMail(db,this.identity.config.mailKey,row.email,'reset_password',code);
      await userEvent(db,id,actor,'password_reset_sent',cmd.reason,{},cmd.requestId);return {id,message:'Đã xếp email đặt lại mật khẩu vào hàng gửi.'};
    }));
  }
  async teams(actor){requireAdminScope(actor,'users.read',{});const manager=permissionGrants(actor,'users.notes.manage').length;
    const teams=(await this.pool.query('SELECT id,name,version FROM user_admin_teams ORDER BY id')).rows;
    const members=(await this.pool.query(`SELECT team_id,staff_id FROM user_admin_team_members WHERE $1::boolean OR staff_id=$2`,[Boolean(manager),actor.id])).rows;return {teams,members};}
  async updateTeam(actor,teamId,input){
    requireAdminScope(actor,'users.notes.manage',{});const cmd=userCommand(input,['staffIds']);
    if(!['support','trust','privacy'].includes(teamId)||!Array.isArray(cmd.staffIds)||cmd.staffIds.length>100)throw invalidUser();
    for(const id of cmd.staffIds){adminId(id);const {loadAdminAccess}=await import('./admin-access.service.js');const access=await loadAdminAccess(this.pool,id);
      if(!access.permissions.includes('users.notes.read'))throw new PlatformAdminError(400,'INVALID_TEAM_MEMBER','Thành viên phải là nhân sự có quyền đọc ghi chú và đang hoạt động.');}
    return this.repo.transaction(db=>adminCommand(db,'public',actor,`user-team:${teamId}`,cmd,async()=>{
      const row=await db.query('UPDATE user_admin_teams SET version=version+1 WHERE id=$1 AND version=$2 RETURNING version',[teamId,cmd.version]);if(!row.rowCount)throw new PlatformAdminError(409,'VERSION_CONFLICT','Nhóm đã thay đổi.');
      await db.query('DELETE FROM user_admin_team_members WHERE team_id=$1',[teamId]);for(const id of [...new Set(cmd.staffIds)])await db.query('INSERT INTO user_admin_team_members(team_id,staff_id) VALUES($1,$2)',[teamId,id]);
      await userEvent(db,null,actor,'team_updated',cmd.reason,{teamId,staffIds:cmd.staffIds},cmd.requestId);return {version:row.rows[0].version};
    }));
  }
  async assignTeam(actor,id,input){requireAdminScope(actor,'users.notes.manage',{});const cmd=userCommand(input,['teamId']);if(!['support','trust','privacy'].includes(cmd.teamId))throw invalidUser();
    return this.repo.transaction(db=>adminCommand(db,'public',actor,`users:${id}:team`,cmd,async()=>{const row=await this.target(db,id,{lock:true});if(Number(row.admin_version)!==cmd.version)throw new PlatformAdminError(409,'VERSION_CONFLICT','Hồ sơ đã thay đổi.');
      await db.query('INSERT INTO user_admin_assignments(user_id,team_id) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET team_id=$2,version=user_admin_assignments.version+1',[id,cmd.teamId]);
      await db.query('UPDATE users SET admin_version=admin_version+1 WHERE id=$1',[id]);await userEvent(db,id,actor,'team_assigned',cmd.reason,{teamId:cmd.teamId},cmd.requestId);return {id,version:cmd.version+1};}));}
  async noteScope(db,actor,id){const row=(await db.query(`SELECT a.team_id FROM user_admin_assignments a JOIN user_admin_team_members m ON m.team_id=a.team_id WHERE a.user_id=$1 AND m.staff_id=$2`,[id,actor.id])).rows[0];if(!row)throw new PlatformAdminError(403,'USER_TEAM_REQUIRED','Chỉ thành viên nhóm được giao hồ sơ được đọc/ghi ghi chú.');return row.team_id;}
  async notes(actor,id){requireAdminScope(actor,'users.notes.read',{});adminId(id);const team=await this.noteScope(this.pool,actor,id);
    const {rows}=await this.pool.query(`SELECT n.id,n.author_reference,coalesce(u.full_name,'Nhân sự đã rời hệ thống') AS author_name,n.body,n.created_at FROM user_internal_notes n LEFT JOIN users u ON u.id=n.author_reference WHERE n.user_id=$1 AND n.team_id=$2
      AND EXISTS(SELECT 1 FROM user_admin_assignments a JOIN user_admin_team_members m ON m.team_id=a.team_id WHERE a.user_id=n.user_id AND a.team_id=n.team_id AND m.staff_id=$3)
      ORDER BY n.created_at DESC,n.id LIMIT 100`,[id,team,actor.id]);return {items:rows,teamId:team};}
  async addNote(actor,id,input){requireAdminScope(actor,'users.notes.create',{});const cmd=userCommand(input,['body']);const body=userText(cmd.body);
    return this.repo.transaction(db=>adminCommand(db,'public',actor,`users:${id}:notes`,cmd,async()=>{const row=await this.target(db,id,{lock:true});if(Number(row.admin_version)!==cmd.version)throw new PlatformAdminError(409,'VERSION_CONFLICT','Hồ sơ đã thay đổi.');const team=await this.noteScope(db,actor,id);
      const note=(await db.query('INSERT INTO user_internal_notes(user_id,team_id,author_reference,body,request_id) VALUES($1,$2,$3,$4,$5) RETURNING id',[id,team,actor.id,body,cmd.requestId])).rows[0];await userEvent(db,id,actor,'internal_note_created',cmd.reason,{noteId:note.id,teamId:team},cmd.requestId);return {id:note.id};}));}
  async signals(actor,id){
    requireAdminScope(actor,'users.signals.read',{});requireAdminScope(actor,'users.read',{});await this.target(this.pool,id);
    const {rows}=await this.pool.query(`SELECT u.id,u.status,
      EXISTS(SELECT 1 FROM security_events a JOIN security_events b ON b.ip=a.ip WHERE a.user_id=$1 AND b.user_id=u.id AND a.ip IS NOT NULL AND a.occurred_at>now()-($2::integer*interval '1 day') AND b.occurred_at>now()-($2::integer*interval '1 day')) AS shared_ip,
      EXISTS(SELECT 1 FROM user_profiles a JOIN user_profiles b ON a.phone_e164=b.phone_e164 WHERE a.user_id=$1 AND b.user_id=u.id AND a.phone_e164 IS NOT NULL) AS shared_contact
      FROM users u WHERE u.id<>$1 AND u.anonymized_at IS NULL AND
        (EXISTS(SELECT 1 FROM security_events a JOIN security_events b ON b.ip=a.ip WHERE a.user_id=$1 AND b.user_id=u.id AND a.ip IS NOT NULL AND a.occurred_at>now()-($2::integer*interval '1 day') AND b.occurred_at>now()-($2::integer*interval '1 day'))
        OR EXISTS(SELECT 1 FROM user_profiles a JOIN user_profiles b ON a.phone_e164=b.phone_e164 WHERE a.user_id=$1 AND b.user_id=u.id AND a.phone_e164 IS NOT NULL)) ORDER BY u.id LIMIT 20`,[id,USER_ADMIN_POLICY.signalWindowDays]);
    await userEvent(this.pool,id,actor,'investigation_signals_viewed','Xem tín hiệu để điều tra; không tự hợp nhất hoặc khóa.',{count:rows.length});
    return {items:rows.map(row=>({id:row.id,status:row.status,sharedIp:row.shared_ip,sharedContact:row.shared_contact})),windowDays:USER_ADMIN_POLICY.signalWindowDays,notice:`Tín hiệu IP tham khảo trong ${USER_ADMIN_POLICY.signalWindowDays} ngày; IP hoặc dữ liệu liên hệ chung không chứng minh cùng danh tính. Không tự gộp hoặc tự khóa tài khoản.`};
  }
}
