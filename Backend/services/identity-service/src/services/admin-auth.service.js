import {randomBytes,createCipheriv} from 'node:crypto';
import {hashToken,randomToken,newId} from '../utils/crypto.js';
import {newTotpSecret,verifyTotp,mfaKey,sealSecret,openSecret,recoveryCode,recoveryHash,deviceHash} from '../utils/admin-mfa.js';
import {HttpError,unauthorized,invalid} from '../utils/errors.js';
import {loadAdminAccess} from './admin-access.service.js';
import {requireRecentAdmin} from '../../../../packages/contracts/admin-auth-policy.js';
import {requireAdminScope,permissionGrants} from '../../../../packages/contracts/admin-rbac.js';

const failure=()=>new HttpError(401,'ADMIN_MFA_INVALID','Không thể xác minh. Vui lòng thử lại hoặc đăng nhập lại.');
const text=(value,min=8,max=500)=>{if(typeof value!=='string'||value.trim().length<min||value.length>max||/[\u0000-\u001f]/.test(value))throw invalid();return value.trim();};
export class AdminAuthService {
  constructor(identity){this.identity=identity;this.repo=identity.repo;this.config=identity.config;}
  get key(){return mfaKey(this.config);}
  get policy(){return {absoluteSeconds:this.config.adminSessionSeconds||28800,idleSeconds:this.config.adminIdleSeconds||1800,reauthSeconds:this.config.adminReauthSeconds||300,challengeSeconds:300};}
  async event(db,userId,action,context={},metadata={}){
    await db.query('INSERT INTO security_events(user_id,action,ip,user_agent,metadata) VALUES($1,$2,$3,$4,$5)',[userId,action,context.ip||null,context.userAgent?.slice(0,500)||null,metadata]);
  }
  async notice(db,user,action){
    const nonce=randomBytes(12),cipher=createCipheriv('aes-256-gcm',this.config.mailKey,nonce);
    const content=`Có thay đổi bảo mật trên tài khoản quản trị MDUC247: ${action}. Nếu không phải bạn, hãy liên hệ người phụ trách bảo mật. Kiểm tra phiên tại ${this.config.frontendOrigin}/admin/security.`;
    const encrypted=Buffer.concat([cipher.update(content,'utf8'),cipher.final()]);
    await db.query(`INSERT INTO identity_email_outbox(recipient,purpose,nonce,ciphertext,tag,expires_at) VALUES($1,'security_notice',$2,$3,$4,now()+interval '1 day')`,[user.email,nonce,encrypted,cipher.getAuthTag()]);
  }
  async beginLogin(user,context){
    return this.repo.transaction(async db=>{
      const current=(await db.query('SELECT * FROM users WHERE id=$1 FOR UPDATE',[user.id])).rows[0];
      if(!current||current.password_hash!==user.password_hash||!this.identity.accountCanSignIn(current)||!(await loadAdminAccess(db,user.id)).grants.length)throw failure();
      const factor=(await db.query('SELECT disabled_at FROM admin_mfa_factors WHERE user_id=$1',[user.id])).rows[0];
      const challengeToken=randomToken(),device=this.device(context);
      await db.query(`INSERT INTO admin_auth_challenges(token_hash,user_id,purpose,security_version,access_version,payload,expires_at)
        VALUES($1,$2,'login',$3,$4,$5,now()+interval '5 minutes')`,[hashToken(challengeToken),user.id,current.security_version,current.admin_access_version,{deviceHash:device}]);
      await this.event(db,user.id,'admin_password_verified',context);
      return {challengeToken,expiresAt:new Date(Date.now()+300000).toISOString(),enrollmentRequired:!factor||Boolean(factor.disabled_at),recoveryEnrollment:Boolean(factor?.disabled_at),passkeysEnabled:Boolean(this.config.adminPasskeysEnabled)};
    });
  }
  device(context){return deviceHash(this.key,context.deviceId||context.userAgent||'unknown-browser');}
  async withChallenge(token,purpose,context,run,{consume=false}={}){
    const value=typeof token==='string'&&token.length<=128?token:'invalid';
    const hint=(await this.repo.pool.query('SELECT user_id FROM admin_auth_challenges WHERE token_hash=$1',[hashToken(value)])).rows[0];
    await this.identity.throttle('admin_mfa',hint?.user_id||hashToken(value),context,this.config.adminMfaLimit||8);
    const result=await this.repo.transaction(async db=>{
      // User before challenge/factor: same order as security and password changes.
      const user=hint?(await db.query('SELECT * FROM users WHERE id=$1 FOR UPDATE',[hint.user_id])).rows[0]:null;
      const challenge=(await db.query('SELECT * FROM admin_auth_challenges WHERE token_hash=$1 FOR UPDATE',[hashToken(value)])).rows[0];
      const valid=user&&challenge&&challenge.purpose===purpose&&!challenge.consumed_at&&new Date(challenge.expires_at)>new Date()&&challenge.attempts<5&&
        this.identity.accountCanSignIn(user)&&String(challenge.security_version)===String(user.security_version)&&String(challenge.access_version)===String(user.admin_access_version)&&
        (!challenge.payload.deviceHash||challenge.payload.deviceHash===this.device(context))&&(await loadAdminAccess(db,user.id)).grants.length;
      if(!valid){if(challenge&&!challenge.consumed_at)await db.query('UPDATE admin_auth_challenges SET attempts=attempts+1 WHERE token_hash=$1',[challenge.token_hash]);await this.event(db,user?.id||null,'admin_mfa_failed',context);return null;}
      const output=await run(db,user,challenge);
      if(!output){await db.query('UPDATE admin_auth_challenges SET attempts=attempts+1 WHERE token_hash=$1',[challenge.token_hash]);await this.event(db,user.id,'admin_mfa_failed',context);return null;}
      if(consume)await db.query('UPDATE admin_auth_challenges SET consumed_at=now() WHERE token_hash=$1',[challenge.token_hash]);
      return output;
    });
    if(!result)throw failure();return result;
  }
  async enrollmentAllowed(db,user){
    const factor=(await db.query('SELECT * FROM admin_mfa_factors WHERE user_id=$1 FOR UPDATE',[user.id])).rows[0];
    if(!factor)return {factor:null};
    if(!factor.disabled_at)return null;
    const recovery=(await db.query("SELECT * FROM admin_mfa_recovery_requests WHERE user_id=$1 AND status='APPROVED' FOR UPDATE",[user.id])).rows[0];
    if(!recovery||String(recovery.security_version)!==String(user.security_version)||String(recovery.access_version)!==String(user.admin_access_version))return null;
    const reviewer={id:recovery.reviewed_by,adminAccess:await loadAdminAccess(db,recovery.reviewed_by)};
    requireAdminScope(reviewer,'mfa_recovery.approve',{});
    return {factor,recovery};
  }
  async startEnrollment(token,context){
    return this.withChallenge(token,'login',context,async(db,user,challenge)=>{
      if(!await this.enrollmentAllowed(db,user))return null;
      const secret=challenge.payload.pendingSecret?openSecret(challenge.payload.pendingSecret,this.key,user.id):newTotpSecret();
      await db.query('UPDATE admin_auth_challenges SET payload=payload||$2::jsonb WHERE token_hash=$1',[challenge.token_hash,{pendingSecret:sealSecret(secret,this.key,user.id)}]);
      const issuer='MDUC247 Admin';
      return {secret,otpauthUri:`otpauth://totp/${encodeURIComponent(issuer+':'+user.email)}?${new URLSearchParams({secret,issuer,algorithm:'SHA1',digits:'6',period:'30'})}`,expiresAt:challenge.expires_at};
    });
  }
  async newRecoveryCodes(db,userId){
    await db.query('DELETE FROM admin_recovery_codes WHERE user_id=$1',[userId]);
    const codes=Array.from({length:10},recoveryCode);
    for(const code of codes)await db.query('INSERT INTO admin_recovery_codes(user_id,code_hash) VALUES($1,$2)',[userId,recoveryHash(this.key,userId,code)]);
    return codes;
  }
  async confirmEnrollment(token,code,context){
    return this.withChallenge(token,'login',context,async(db,user,challenge)=>{
      const allowed=await this.enrollmentAllowed(db,user);
      if(!allowed||!challenge.payload.pendingSecret)return null;
      const counter=verifyTotp(openSecret(challenge.payload.pendingSecret,this.key,user.id),code);
      if(counter===null)return null;
      const factor=(await db.query(`INSERT INTO admin_mfa_factors(user_id,secret,last_counter) VALUES($1,$2,$3)
        ON CONFLICT(user_id) DO UPDATE SET secret=$2,last_counter=$3,version=admin_mfa_factors.version+1,disabled_at=NULL,updated_at=now() RETURNING version`,[user.id,challenge.payload.pendingSecret,counter])).rows[0];
      const recoveryCodes=await this.newRecoveryCodes(db,user.id);
      await db.query('UPDATE refresh_sessions SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL',[user.id]);
      await db.query('UPDATE admin_auth_challenges SET consumed_at=now() WHERE user_id=$1 AND token_hash<>$2 AND consumed_at IS NULL',[user.id,challenge.token_hash]);
      if(allowed.recovery)await db.query("UPDATE admin_mfa_recovery_requests SET status='EXECUTED',executed_at=now(),version=version+1 WHERE id=$1",[allowed.recovery.id]);
      await this.event(db,user.id,'admin_mfa_enrolled',context,{recovered:Boolean(allowed.recovery)});await this.notice(db,user,'Đã đăng ký ứng dụng xác thực');
      return {...await this.issueSession(db,user,factor.version,'totp',context),recoveryCodes};
    },{consume:true});
  }
  async factorProof(db,user,body){
    const factor=(await db.query('SELECT * FROM admin_mfa_factors WHERE user_id=$1 FOR UPDATE',[user.id])).rows[0];
    if(!factor||factor.disabled_at)return null;
    if(typeof body.recoveryCode==='string'){
      if(!/^[0-9a-fA-F-]{20,24}$/.test(body.recoveryCode))return null;
      const result=await db.query('UPDATE admin_recovery_codes SET consumed_at=now() WHERE user_id=$1 AND code_hash=$2 AND consumed_at IS NULL RETURNING code_hash',[user.id,recoveryHash(this.key,user.id,body.recoveryCode)]);
      return result.rowCount?{version:factor.version,method:'recovery'}:null;
    }
    const counter=verifyTotp(openSecret(factor.secret,this.key,user.id),body.code,{lastCounter:factor.last_counter});
    if(counter===null)return null;
    await db.query('UPDATE admin_mfa_factors SET last_counter=$2 WHERE user_id=$1',[user.id,counter]);
    return {version:factor.version,method:'totp'};
  }
  async completeLogin(token,body,context){
    return this.withChallenge(token,'login',context,async(db,user)=>{
      const proof=await this.factorProof(db,user,body);if(!proof)return null;
      if(proof.method==='recovery'){
        await db.query('UPDATE refresh_sessions SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL',[user.id]);
        await this.event(db,user.id,'admin_recovery_code_used',context);await this.notice(db,user,'Đã dùng mã khôi phục, các phiên trước đã bị thu hồi');
      }
      return this.issueSession(db,user,proof.version,proof.method,context);
    },{consume:true});
  }
  sessionDto(row){return {familyId:row.family_id,verifiedAt:row.verified_at,reauthenticatedAt:row.reauthenticated_at,
    expiresAt:row.expires_at,idleExpiresAt:new Date(new Date(row.last_activity_at).getTime()+this.policy.idleSeconds*1000).toISOString(),reauthSeconds:this.policy.reauthSeconds};}
  async sessionFor(userId,familyId){
    const row=(await this.repo.pool.query(`SELECT a.*,f.version AS current_version,f.disabled_at FROM admin_sessions a
      LEFT JOIN admin_mfa_factors f ON f.user_id=a.user_id WHERE a.user_id=$1 AND a.family_id=$2`,[userId,familyId])).rows[0];
    if(!row?.family_id)return null;
    if(row.disabled_at||row.current_version!==row.factor_version||Date.parse(row.expires_at)<=Date.now()||Date.parse(row.last_activity_at)+this.policy.idleSeconds*1000<=Date.now())throw unauthorized();
    return this.sessionDto(row);
  }
  async issueSession(db,user,factorVersion,method,context,previousSession){
    const familyId=newId(),refreshToken=randomToken(),expiresAt=previousSession?new Date(previousSession.expiresAt):new Date(Date.now()+this.policy.absoluteSeconds*1000),device=this.device(context);
    const known=await db.query('INSERT INTO admin_known_devices(user_id,device_hash) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING device_hash',[user.id,device]);
    await db.query('UPDATE admin_known_devices SET last_seen_at=now() WHERE user_id=$1 AND device_hash=$2',[user.id,device]);
    await db.query('INSERT INTO refresh_sessions(family_id,user_id,token_hash,device,expires_at) VALUES($1,$2,$3,$4,$5)',[familyId,user.id,hashToken(refreshToken),context.userAgent?.slice(0,500)||null,expiresAt]);
    const row=(await db.query(`INSERT INTO admin_sessions(family_id,user_id,factor_version,method,expires_at,device_hash,device,ip,reauthenticated_at)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,[familyId,user.id,factorVersion,method,expiresAt,device,context.userAgent?.slice(0,500)||null,context.ip||null,previousSession?new Date(previousSession.reauthenticatedAt):new Date()])).rows[0];
    await this.event(db,user.id,'admin_login_success',context,{familyId,method});
    if(known.rowCount){await this.event(db,user.id,'admin_new_device',context,{familyId});await this.notice(db,user,'Đăng nhập quản trị từ trình duyệt mới');}
    const adminSession=this.sessionDto(row),adminAccess=await loadAdminAccess(db,user.id);
    return {user:{id:user.id,email:user.email,fullName:user.full_name,emailVerifiedAt:user.email_verified_at,roles:['platform_admin'],adminAccess,adminSession},adminSession,accessToken:this.identity.access(user.id,familyId),refreshToken};
  }
  requireAdmin(auth){if(!auth?.user?.adminSession||!auth.user.adminAccess?.grants?.length)throw unauthorized();}
  async lockedActor(db,auth,{recent=false}={}){
    const user=(await db.query('SELECT * FROM users WHERE id=$1 FOR UPDATE',[auth.user.id])).rows[0];
    const session=(await db.query(`SELECT a.* FROM admin_sessions a JOIN admin_mfa_factors f ON f.user_id=a.user_id AND f.version=a.factor_version AND f.disabled_at IS NULL
      WHERE a.user_id=$1 AND a.family_id=$2 AND a.expires_at>now() AND a.last_activity_at>now()-($3*interval '1 second')
      AND EXISTS(SELECT 1 FROM refresh_sessions r WHERE r.user_id=a.user_id AND r.family_id=a.family_id AND r.revoked_at IS NULL AND r.expires_at>now()) FOR UPDATE OF a`,[auth.user.id,auth.familyId,this.policy.idleSeconds])).rows[0];
    if(!user||!this.identity.accountCanSignIn(user)||!session||!(await loadAdminAccess(db,user.id)).grants.length)throw unauthorized();
    if(recent)requireRecentAdmin({adminSession:this.sessionDto(session)});
    return user;
  }
  async reauthenticate(auth,body,context){
    this.requireAdmin(auth);await this.identity.throttle('admin_reauth',auth.user.id,context,this.config.adminMfaLimit||8);
    const result=await this.repo.transaction(async db=>{
      const user=await this.lockedActor(db,auth);
      if(typeof body.password!=='string'||body.password.length>128||!await this.identity.password.verify(user.password_hash,body.password)){
        await this.event(db,user.id,'admin_reauth_failed',context);return null;
      }
      const proof=await this.factorProof(db,user,body);if(!proof){await this.event(db,user.id,'admin_reauth_failed',context);return null;}
      const row=(await db.query(`UPDATE admin_sessions SET reauthenticated_at=now(),last_activity_at=now() WHERE user_id=$1 AND family_id=$2
        AND expires_at>now() AND last_activity_at>now()-($3*interval '1 second') AND EXISTS(SELECT 1 FROM refresh_sessions s WHERE s.family_id=$2 AND s.user_id=$1 AND s.revoked_at IS NULL AND s.expires_at>now()) RETURNING *`,[user.id,auth.familyId,this.policy.idleSeconds])).rows[0];
      if(!row)return null;
      if(proof.method==='recovery'){
        await db.query('UPDATE refresh_sessions SET revoked_at=now() WHERE user_id=$1 AND family_id<>$2 AND revoked_at IS NULL',[user.id,auth.familyId]);await this.notice(db,user,'Đã dùng mã khôi phục để xác thực lại');
      }
      await this.event(db,user.id,'admin_reauthenticated',context,{familyId:auth.familyId,method:proof.method});return {adminSession:this.sessionDto(row)};
    });
    if(!result)throw failure();return result;
  }
  async activity(auth){
    this.requireAdmin(auth);
    const row=(await this.repo.pool.query(`UPDATE admin_sessions SET last_activity_at=now() WHERE user_id=$1 AND family_id=$2 AND expires_at>now()
      AND last_activity_at>now()-($3*interval '1 second') RETURNING *`,[auth.user.id,auth.familyId,this.policy.idleSeconds])).rows[0];
    if(!row)throw unauthorized();return {adminSession:this.sessionDto(row)};
  }
  async sessions(auth){
    this.requireAdmin(auth);
    const rows=(await this.repo.pool.query(`WITH owned AS (SELECT a.family_id,a.device,a.ip,a.created_at,a.last_activity_at,a.expires_at,a.method,
      (a.expires_at<=now() OR a.last_activity_at<=now()-($2*interval '1 second') OR
      NOT EXISTS(SELECT 1 FROM admin_mfa_factors f WHERE f.user_id=a.user_id AND f.version=a.factor_version AND f.disabled_at IS NULL) OR
      NOT EXISTS(SELECT 1 FROM refresh_sessions s WHERE s.family_id=a.family_id AND s.user_id=a.user_id AND s.revoked_at IS NULL AND s.expires_at>now())) AS revoked
      FROM admin_sessions a WHERE a.user_id=$1)
      SELECT * FROM owned WHERE NOT revoked OR family_id IN (SELECT family_id FROM owned WHERE revoked ORDER BY created_at DESC,family_id DESC LIMIT 50)
      ORDER BY revoked,created_at DESC,family_id DESC`,[auth.user.id,this.policy.idleSeconds])).rows;
    return {items:rows.map(row=>({...row,current:row.family_id===auth.familyId})),policy:this.policy};
  }
  async revokeSessions(auth,body,context){
    this.requireAdmin(auth);
    if(body.allDevices!==true&&(typeof body.familyId!=='string'||!/^[0-9a-f-]{36}$/i.test(body.familyId)))throw invalid();
    return this.repo.transaction(async db=>{
      await db.query('UPDATE refresh_sessions SET revoked_at=now() WHERE user_id=$1 AND ($2::boolean OR family_id=$3::uuid) AND revoked_at IS NULL',[auth.user.id,body.allDevices===true,body.familyId||null]);
      await this.event(db,auth.user.id,'admin_sessions_revoked',context,{familyId:body.familyId||null,allDevices:body.allDevices===true});
      return {signedOut:body.allDevices===true||body.familyId?.toLowerCase()===auth.familyId};
    });
  }
  async security(auth){
    this.requireAdmin(auth);
    const codes=(await this.repo.pool.query('SELECT count(*)::int AS remaining FROM admin_recovery_codes WHERE user_id=$1 AND consumed_at IS NULL',[auth.user.id])).rows[0].remaining;
    const events=(await this.repo.pool.query('SELECT id,action,ip,user_agent,metadata,occurred_at FROM security_events WHERE user_id=$1 ORDER BY id DESC LIMIT 50',[auth.user.id])).rows;
    const keys=(await this.repo.pool.query('SELECT id,label,created_at,last_used_at FROM admin_passkeys WHERE user_id=$1 ORDER BY created_at',[auth.user.id])).rows;
    return {recoveryCodesRemaining:codes,events,passkeys:keys,passkeysEnabled:Boolean(this.config.adminPasskeysEnabled),policy:this.policy,adminSession:auth.user.adminSession};
  }
  async startRotation(auth,context){
    this.requireAdmin(auth);requireRecentAdmin(auth.user);
    await this.identity.throttle('admin_mfa_change',auth.user.id,context,5);
    return this.repo.transaction(async db=>{
      const user=await this.lockedActor(db,auth,{recent:true});
      const secret=newTotpSecret(),challengeToken=randomToken();
      await db.query(`INSERT INTO admin_auth_challenges(token_hash,user_id,purpose,family_id,security_version,access_version,payload,expires_at)
        VALUES($1,$2,'rotate',$3,$4,$5,$6,now()+interval '5 minutes')`,[hashToken(challengeToken),user.id,auth.familyId,user.security_version,user.admin_access_version,{pendingSecret:sealSecret(secret,this.key,user.id),deviceHash:this.device(context)}]);
      return {challengeToken,secret,otpauthUri:`otpauth://totp/${encodeURIComponent('MDUC247 Admin:'+user.email)}?${new URLSearchParams({secret,issuer:'MDUC247 Admin',algorithm:'SHA1',digits:'6',period:'30'})}`};
    });
  }
  async confirmRotation(auth,token,code,context){
    this.requireAdmin(auth);requireRecentAdmin(auth.user);
    return this.withChallenge(token,'rotate',context,async(db,user,challenge)=>{
      if(user.id!==auth.user.id||challenge.family_id!==auth.familyId)return null;
      await this.lockedActor(db,auth,{recent:true});
      const counter=verifyTotp(openSecret(challenge.payload.pendingSecret,this.key,user.id),code);if(counter===null)return null;
      const factor=(await db.query('UPDATE admin_mfa_factors SET secret=$2,last_counter=$3,version=version+1,updated_at=now() WHERE user_id=$1 AND disabled_at IS NULL RETURNING version',[user.id,challenge.payload.pendingSecret,counter])).rows[0];
      if(!factor)return null;
      const codes=await this.newRecoveryCodes(db,user.id);
      await db.query('UPDATE users SET security_version=security_version+1 WHERE id=$1',[user.id]);
      await db.query('UPDATE refresh_sessions SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL',[user.id]);
      await db.query('UPDATE admin_auth_challenges SET consumed_at=now() WHERE user_id=$1 AND consumed_at IS NULL',[user.id]);
      await this.event(db,user.id,'admin_mfa_changed',context);await this.notice(db,user,'Đã thay ứng dụng xác thực và mã khôi phục');
      return {...await this.issueSession(db,user,factor.version,'totp',context),recoveryCodes:codes};
    },{consume:true});
  }
  async regenerateCodes(auth,context){
    this.requireAdmin(auth);requireRecentAdmin(auth.user);await this.identity.throttle('admin_mfa_change',auth.user.id,context,5);
    return this.repo.transaction(async db=>{
      const user=await this.lockedActor(db,auth,{recent:true});
      const factor=(await db.query('SELECT version FROM admin_mfa_factors WHERE user_id=$1 AND disabled_at IS NULL FOR UPDATE',[user.id])).rows[0];if(!factor)throw failure();
      const codes=await this.newRecoveryCodes(db,user.id);
      await db.query('UPDATE users SET security_version=security_version+1 WHERE id=$1',[user.id]);
      await db.query('UPDATE refresh_sessions SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL',[user.id]);
      await this.event(db,user.id,'admin_recovery_codes_changed',context);await this.notice(db,user,'Đã tạo bộ mã khôi phục mới');
      return {...await this.issueSession(db,user,factor.version,'security_change',context,auth.user.adminSession),recoveryCodes:codes};
    });
  }
  async requestRecovery(token,body,context){
    const evidence=text(body.evidenceReference,8,200),reason=text(body.reason,10,500);
    return this.withChallenge(token,'login',context,async(db,user)=>{
      const factor=(await db.query('SELECT user_id FROM admin_mfa_factors WHERE user_id=$1',[user.id])).rows[0];if(!factor)return null;
      const existing=(await db.query("SELECT * FROM admin_mfa_recovery_requests WHERE user_id=$1 AND status IN ('REQUESTED','APPROVED') FOR UPDATE",[user.id])).rows[0];
      if(existing){
        const reviewerStillAuthorized=existing.status!=='APPROVED'||permissionGrants({id:existing.reviewed_by,adminAccess:await loadAdminAccess(db,existing.reviewed_by)},'mfa_recovery.approve').some(grant=>!Object.keys(grant.scope||{}).length);
        if(String(existing.security_version)===String(user.security_version)&&String(existing.access_version)===String(user.admin_access_version)&&reviewerStillAuthorized)return {id:existing.id,message:'Đề nghị đã được tiếp nhận. Vui lòng liên hệ người phụ trách xác minh danh tính.'};
        await db.query("UPDATE admin_mfa_recovery_requests SET status='REJECTED',review_reason='Đề nghị mất hiệu lực sau thay đổi bảo mật hoặc quyền',reviewed_at=now(),version=version+1 WHERE id=$1",[existing.id]);
        await this.event(db,user.id,'admin_mfa_recovery_invalidated',context,{requestId:existing.id});
      }
      const row=(await db.query(`INSERT INTO admin_mfa_recovery_requests(user_id,evidence_reference,reason,security_version,access_version)
        VALUES($1,$2,$3,$4,$5) RETURNING id`,[user.id,evidence,reason,user.security_version,user.admin_access_version])).rows[0];
      await this.event(db,user.id,'admin_mfa_recovery_requested',context,{requestId:row.id});await this.notice(db,user,'Đã gửi đề nghị khôi phục MFA');
      return {id:row.id,message:'Đề nghị đã được tiếp nhận. Vui lòng liên hệ người phụ trách xác minh danh tính.'};
    },{consume:true});
  }
  async recoveries(auth){
    this.requireAdmin(auth);requireAdminScope(auth.user,'mfa_recovery.approve',{});requireRecentAdmin(auth.user);
    return {items:(await this.repo.pool.query(`SELECT r.*,u.full_name FROM admin_mfa_recovery_requests r JOIN users u ON u.id=r.user_id ORDER BY r.created_at DESC LIMIT 100`)).rows};
  }
  async reviewRecovery(auth,body,context){
    this.requireAdmin(auth);requireAdminScope(auth.user,'mfa_recovery.approve',{});requireRecentAdmin(auth.user);
    if(typeof body.id!=='string'||!/^[0-9a-f-]{36}$/i.test(body.id)||!Number.isSafeInteger(body.version)||body.version<1||!['approve','reject'].includes(body.action))throw invalid();
    const reason=text(body.reason,10,500),proof=text(body.evidenceReference,8,200);
    if(body.action==='approve'&&body.identityVerified!==true)throw invalid();
    return this.repo.transaction(async db=>{
      const pending=(await db.query('SELECT user_id FROM admin_mfa_recovery_requests WHERE id=$1',[body.id])).rows[0];if(!pending)throw failure();
      await db.query('SELECT id FROM users WHERE id=ANY($1::uuid[]) ORDER BY id FOR UPDATE',[[auth.user.id,pending.user_id]]);
      await this.lockedActor(db,auth,{recent:true});
      const user=(await db.query('SELECT * FROM users WHERE id=$1 FOR UPDATE',[pending.user_id])).rows[0];
      const request=(await db.query('SELECT * FROM admin_mfa_recovery_requests WHERE id=$1 FOR UPDATE',[body.id])).rows[0];
      if(request.user_id===auth.user.id)throw new HttpError(403,'INDEPENDENT_REVIEW_REQUIRED','Người duyệt phải khác chủ tài khoản cần khôi phục.');
      if(request.status!=='REQUESTED'||request.version!==body.version||body.action==='approve'&&
        (String(request.security_version)!==String(user.security_version)||String(request.access_version)!==String(user.admin_access_version)||!this.identity.accountCanSignIn(user)||!(await loadAdminAccess(db,user.id)).grants.length))throw new HttpError(409,'RECOVERY_REQUEST_CHANGED','Đề nghị hoặc thông tin bảo mật đã thay đổi.');
      requireAdminScope({id:auth.user.id,adminAccess:await loadAdminAccess(db,auth.user.id)},'mfa_recovery.approve',{});
      if(body.action==='approve'){
        await db.query('UPDATE admin_mfa_factors SET disabled_at=now(),version=version+1 WHERE user_id=$1',[user.id]);
        await db.query('UPDATE admin_recovery_codes SET consumed_at=now() WHERE user_id=$1 AND consumed_at IS NULL',[user.id]);
        await db.query('DELETE FROM admin_passkeys WHERE user_id=$1',[user.id]);
        await db.query('UPDATE refresh_sessions SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL',[user.id]);
        await db.query('UPDATE users SET security_version=security_version+1 WHERE id=$1',[user.id]);
        await db.query('UPDATE admin_auth_challenges SET consumed_at=now() WHERE user_id=$1 AND consumed_at IS NULL',[user.id]);
      }
      await db.query(`UPDATE admin_mfa_recovery_requests SET status=$2,reviewed_by=$3,review_reason=$4,review_evidence_reference=$5,
        reviewed_at=now(),version=version+1,security_version=security_version+$6 WHERE id=$1`,[request.id,body.action==='approve'?'APPROVED':'REJECTED',auth.user.id,reason,proof,body.action==='approve'?1:0]);
      await this.event(db,user.id,'admin_mfa_recovery_'+body.action,context,{requestId:request.id,reviewerId:auth.user.id});await this.notice(db,user,body.action==='approve'?'Đề nghị khôi phục MFA đã được duyệt; đăng nhập bằng mật khẩu để đăng ký lại':'Đề nghị khôi phục MFA đã bị từ chối');
      return {id:request.id,status:body.action==='approve'?'APPROVED':'REJECTED'};
    });
  }
}
