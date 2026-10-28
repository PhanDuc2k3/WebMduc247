import {randomBytes,randomInt,createHmac,timingSafeEqual} from 'node:crypto';
import {adminId,PlatformAdminError} from '../../../../packages/contracts/platform-admin.js';
import {strictInput,userText,userFullName,invalidUser,userEvent} from './user-admin-contract.js';
import {userHash,userMail} from './user-admin-crypto.js';
const denied=()=>new PlatformAdminError(401,'SUPPORT_PROOF_REQUIRED','Thông tin xác minh không hợp lệ hoặc đã hết hạn.');
const dummy='$argon2id$v=19$m=19456,t=2,p=1$2N2oKv5QikTuvcJ21+bX6g$6Mw2Ei+O9auyJOrhufyEjrwzzwxvBbN6PXYBi22FD08';
export class UserSupportService {
  constructor(identity){this.identity=identity;this.repo=identity.repo;this.pool=this.repo?.pool;}
  codeHash(id,code){return createHmac('sha256',this.identity.config.mailKey).update('account-support-v1\0'+id+'\0'+code).digest('hex');}
  async challenge(input,context){
    strictInput(input,['email','password']);const email=this.identity.checkEmail(input.email);
    if(typeof input.password!=='string'||input.password.length>128)throw invalidUser();
    await this.identity.throttle('account-support-challenge',email,context,3);
    const row=await this.repo.userByEmail(email);const valid=await this.identity.password.verify(row?.password_hash||dummy,input.password);
    if(!row||!valid||row.anonymized_at)throw denied();
    return this.repo.transaction(async db=>{
      const fresh=(await db.query('SELECT security_version,email FROM users WHERE id=$1 FOR UPDATE',[row.id])).rows[0];
      if(!fresh||Number(fresh.security_version)!==Number(row.security_version))throw denied();
      const code=String(randomInt(0,1000000)).padStart(6,'0');
      const challenge=(await db.query("INSERT INTO user_support_challenges(user_id,code_hash,security_version,expires_at) VALUES($1,'pending',$2,now()+interval '10 minutes') RETURNING id",[row.id,fresh.security_version])).rows[0];
      await db.query('UPDATE user_support_challenges SET consumed_at=now() WHERE user_id=$1 AND id<>$2 AND consumed_at IS NULL',[row.id,challenge.id]);
      await db.query('UPDATE user_support_challenges SET code_hash=$2 WHERE id=$1',[challenge.id,this.codeHash(challenge.id,code)]);
      await userMail(db,this.identity.config.mailKey,fresh.email,'account_support',code);
      await userEvent(db,row.id,null,'support_verification_requested','Người dùng yêu cầu xác minh qua email.');
      return {challengeId:challenge.id,message:'Mã xác minh đã được xếp gửi đến email tài khoản; có hiệu lực 10 phút.'};
    });
  }
  async verify(input,context){
    strictInput(input,['challengeId','code']);adminId(input.challengeId);
    if(typeof input.code!=='string'||!/^\d{6}$/.test(input.code))throw invalidUser();
    await this.identity.throttle('account-support-verify',input.challengeId,context,10);
    const result=await this.repo.transaction(async db=>{
      const owner=(await db.query('SELECT user_id FROM user_support_challenges WHERE id=$1',[input.challengeId])).rows[0];
      if(!owner)return null;await db.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[owner.user_id]);
      const row=(await db.query('SELECT c.*,u.security_version AS current_version,u.anonymized_at FROM user_support_challenges c JOIN users u ON u.id=c.user_id WHERE c.id=$1 FOR UPDATE OF c',[input.challengeId])).rows[0];
      if(!row||row.consumed_at||row.expires_at<=new Date()||row.attempts>=5||row.anonymized_at||String(row.security_version)!==String(row.current_version))return null;
      const expected=Buffer.from(row.code_hash),actual=Buffer.from(this.codeHash(row.id,input.code));
      if(expected.length!==actual.length||!timingSafeEqual(expected,actual)){await db.query('UPDATE user_support_challenges SET attempts=attempts+1 WHERE id=$1',[row.id]);return null;}
      const token=randomBytes(32).toString('base64url');await db.query('UPDATE user_support_challenges SET consumed_at=now() WHERE id=$1',[row.id]);
      await db.query("INSERT INTO user_support_grants(token_hash,user_id,security_version,expires_at) VALUES($1,$2,$3,now()+interval '15 minutes')",[userHash(token),row.user_id,row.security_version]);
      await userEvent(db,row.user_id,null,'support_identity_verified','Đã xác minh mật khẩu và mã email một lần.');return {supportToken:token,expiresAt:new Date(Date.now()+900000).toISOString()};
    });if(!result)throw denied();return result;
  }
  async principal(token,db=this.pool,{allowReceipt=false}={}){
    if(typeof token!=='string'||!/^[\w-]{43}$/.test(token))throw denied();
    const row=(await db.query(`SELECT g.user_id,g.verified_at,g.receipt_only,u.email,u.status,u.current_suspension_id FROM user_support_grants g JOIN users u ON u.id=g.user_id
      WHERE g.token_hash=$1 AND g.expires_at>now() AND g.security_version=u.security_version AND (u.anonymized_at IS NULL OR g.receipt_only)`,[userHash(token)])).rows[0];if(!row||row.receipt_only&&!allowReceipt)throw denied();return row;
  }
  async state(token){const user=await this.principal(token,this.pool,{allowReceipt:true});const [decision,cases,retention]=await Promise.all([
    this.pool.query('SELECT id,reason_code,reason,restriction_scope,expires_at,created_at FROM user_admin_decisions WHERE id=$1 AND user_id=$2',[user.current_suspension_id,user.user_id]),
    this.pool.query('SELECT id,kind,status,summary,review_reason,created_at,resolved_at FROM user_workflow_cases WHERE user_id=$1 ORDER BY created_at DESC LIMIT 30',[user.user_id]),
    this.pool.query('SELECT r.case_id,r.module,r.disposition,r.retain_until FROM user_retention_reviews r JOIN user_workflow_cases c ON c.id=r.case_id WHERE c.user_id=$1',[user.user_id])]);
    return {suspension:decision.rows[0]||null,receiptOnly:user.receipt_only,cases:cases.rows.map(row=>({...row,retention:retention.rows.filter(item=>item.case_id===row.id).map(item=>({module:item.module,disposition:item.disposition,retainUntil:item.retain_until}))}))};}
  async create(token,input){
    strictInput(input,['kind','summary','fullName','requestId']);adminId(input.requestId);const summary=userText(input.summary);
    if(!['APPEAL','ACCESS','RECTIFY','ANONYMIZE'].includes(input.kind))throw invalidUser();
    const payload=input.kind==='RECTIFY'?{fullName:userFullName(input.fullName)}:{};
    return this.repo.transaction(async db=>{let user=await this.principal(token,db);await db.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[user.user_id]);user=await this.principal(token,db);
      const existing=(await db.query('SELECT id,kind,summary,payload FROM user_workflow_cases WHERE user_id=$1 AND request_id=$2',[user.user_id,input.requestId])).rows[0];
      if(existing){if(existing.kind!==input.kind||existing.summary!==summary||JSON.stringify(existing.payload)!==JSON.stringify(payload))throw new PlatformAdminError(409,'IDEMPOTENCY_CONFLICT','Mã yêu cầu đã dùng cho nội dung khác.');return {id:existing.id};}
      if(!await this.repo.limit(`account-support-cases:user:${user.user_id}`,6,900))throw new PlatformAdminError(429,'RATE_LIMITED','Vượt giới hạn gửi hồ sơ hỗ trợ. Hãy thử lại sau ít phút.');
      if(input.kind!=='APPEAL'&&(await db.query("SELECT 1 FROM user_workflow_cases WHERE user_id=$1 AND kind=$2 AND status IN ('NEW','IN_REVIEW','WAITING_RETENTION','WAITING_CLEANUP')",[user.user_id,input.kind])).rowCount)throw new PlatformAdminError(409,'WORKFLOW_EXISTS','Đã có hồ sơ cùng loại đang xử lý. Hãy theo dõi hồ sơ hiện có.');
      if(input.kind==='APPEAL'&&(!user.current_suspension_id||user.status!=='suspended'))throw new PlatformAdminError(409,'NO_SUSPENSION_TO_APPEAL','Không có quyết định khóa đang áp dụng để kháng nghị.');
      if(input.kind==='APPEAL'&&(await db.query("SELECT 1 FROM user_workflow_cases WHERE original_decision_id=$1 AND status IN ('NEW','IN_REVIEW')",[user.current_suspension_id])).rowCount)throw new PlatformAdminError(409,'APPEAL_EXISTS','Quyết định này đã có kháng nghị đang xử lý.');
      const legacy=input.kind==='ANONYMIZE'?(await db.query("SELECT id FROM privacy_requests WHERE user_id=$1 AND status='PENDING'",[user.user_id])).rows[0]?.id:null;
      const row=(await db.query(`INSERT INTO user_workflow_cases(user_id,kind,original_decision_id,summary,payload,identity_verified_at,proof_method,request_id,legacy_privacy_request_id)
        VALUES($1,$2,$3,$4,$5,$6,'PASSWORD_AND_EMAIL_OTP',$7,$8) RETURNING id`,[user.user_id,input.kind,input.kind==='APPEAL'?user.current_suspension_id:null,summary,payload,user.verified_at,input.requestId,legacy||null])).rows[0];
      await userEvent(db,user.user_id,null,'user_workflow_requested',summary,{caseId:row.id,kind:input.kind});return {id:row.id};
    });
  }
}
