import {hashToken,randomToken} from '../utils/crypto.js';
import {HttpError,invalid} from '../utils/errors.js';
import {requireRecentAdmin} from '../../../../packages/contracts/admin-auth-policy.js';

export class AdminPasskeyService {
  constructor(auth){this.auth=auth;this.repo=auth.repo;this.config=auth.config;}
  async library(){
    if(!this.config.adminPasskeysEnabled)throw new HttpError(503,'PASSKEY_NOT_CONFIGURED','Passkey chưa được bật cho môi trường này.');
    return import('@simplewebauthn/server');
  }
  get origin(){return new URL(this.config.frontendOrigin).origin;}
  get rpID(){return new URL(this.config.frontendOrigin).hostname;}
  async optionsFor(db,user){
    const lib=await this.library(),keys=(await db.query('SELECT id,transports FROM admin_passkeys WHERE user_id=$1 ORDER BY id',[user.id])).rows;
    if(!keys.length)return null;
    return lib.generateAuthenticationOptions({rpID:this.rpID,userVerification:'required',timeout:60000,allowCredentials:keys.map(k=>({id:k.id,transports:k.transports}))});
  }
  async loginOptions(token,context){
    await this.library();
    return this.auth.withChallenge(token,'login',context,async(db,user,challenge)=>{
      if(!(await db.query('SELECT 1 FROM admin_mfa_factors WHERE user_id=$1 AND disabled_at IS NULL',[user.id])).rowCount)return null;
      const options=await this.optionsFor(db,user);if(!options)return null;
      await db.query('UPDATE admin_auth_challenges SET payload=payload||$2::jsonb WHERE token_hash=$1',[challenge.token_hash,{webauthnChallenge:options.challenge}]);
      return {options};
    });
  }
  async assertion(db,user,challenge,response){
    if(!response||typeof response.id!=='string'||!challenge.payload.webauthnChallenge)return false;
    const key=(await db.query('SELECT * FROM admin_passkeys WHERE user_id=$1 AND id=$2 FOR UPDATE',[user.id,response.id])).rows[0];if(!key)return false;
    const lib=await this.library();let result;
    try{result=await lib.verifyAuthenticationResponse({response,expectedChallenge:challenge.payload.webauthnChallenge,expectedOrigin:this.origin,expectedRPID:this.rpID,
      credential:{id:key.id,publicKey:new Uint8Array(key.public_key),counter:Number(key.counter),transports:key.transports},requireUserVerification:true});}catch{return false;}
    if(!result.verified)return false;
    await db.query('UPDATE admin_passkeys SET counter=$2,last_used_at=now() WHERE id=$1',[key.id,result.authenticationInfo.newCounter]);return true;
  }
  async loginVerify(token,response,context){
    await this.library();
    return this.auth.withChallenge(token,'login',context,async(db,user,challenge)=>{
      const factor=(await db.query('SELECT version FROM admin_mfa_factors WHERE user_id=$1 AND disabled_at IS NULL',[user.id])).rows[0];
      if(!factor||!await this.assertion(db,user,challenge,response))return null;
      return this.auth.issueSession(db,user,factor.version,'passkey',context);
    },{consume:true});
  }
  async registrationOptions(auth,label,context){
    this.auth.requireAdmin(auth);requireRecentAdmin(auth.user);const lib=await this.library();
    if(typeof label!=='string'||!label.trim()||label.length>100||/[\u0000-\u001f]/.test(label))throw invalid();
    await this.auth.identity.throttle('admin_passkey_change',auth.user.id,context,5);
    return this.repo.transaction(async db=>{
      const user=await this.auth.lockedActor(db,auth,{recent:true});
      const existing=(await db.query('SELECT id FROM admin_passkeys WHERE user_id=$1',[user.id])).rows;
      if(existing.length>=10)throw new HttpError(409,'PASSKEY_LIMIT','Tối đa 10 passkey; hãy thu hồi passkey cũ trước.');
      const options=await lib.generateRegistrationOptions({rpName:'MDUC247 Admin',rpID:this.rpID,userName:user.email,userDisplayName:user.full_name,
        userID:new Uint8Array(Buffer.from(user.id)),attestationType:'none',timeout:60000,excludeCredentials:existing,
        authenticatorSelection:{residentKey:'preferred',userVerification:'required'},supportedAlgorithmIDs:[-7,-257]});
      const challengeToken=randomToken();
      await db.query(`INSERT INTO admin_auth_challenges(token_hash,user_id,purpose,family_id,security_version,access_version,payload,expires_at)
        VALUES($1,$2,'passkey_register',$3,$4,$5,$6,now()+interval '5 minutes')`,[hashToken(challengeToken),user.id,auth.familyId,user.security_version,user.admin_access_version,
        {webauthnChallenge:options.challenge,label:label.trim(),deviceHash:this.auth.device(context)}]);
      return {challengeToken,options};
    });
  }
  async registrationVerify(auth,token,response,context){
    this.auth.requireAdmin(auth);requireRecentAdmin(auth.user);const lib=await this.library();
    return this.auth.withChallenge(token,'passkey_register',context,async(db,user,challenge)=>{
      if(user.id!==auth.user.id||challenge.family_id!==auth.familyId)return null;
      await this.auth.lockedActor(db,auth,{recent:true});let result;
      try{result=await lib.verifyRegistrationResponse({response,expectedChallenge:challenge.payload.webauthnChallenge,expectedOrigin:this.origin,expectedRPID:this.rpID,requireUserVerification:true,supportedAlgorithmIDs:[-7,-257]});}catch{return null;}
      if(!result.verified||!result.registrationInfo)return null;
      const credential=result.registrationInfo.credential;
      const inserted=await db.query(`INSERT INTO admin_passkeys(id,user_id,public_key,counter,transports,label) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING RETURNING id`,[credential.id,user.id,Buffer.from(credential.publicKey),credential.counter,JSON.stringify(credential.transports||[]),challenge.payload.label]);
      if(!inserted.rowCount)return null;
      await this.changed(db,user,auth,context,'admin_passkey_registered');return {registered:true};
    },{consume:true});
  }
  async changed(db,user,auth,context,action){
    await db.query('UPDATE users SET security_version=security_version+1 WHERE id=$1',[user.id]);
    await db.query('UPDATE refresh_sessions SET revoked_at=now() WHERE user_id=$1 AND family_id<>$2 AND revoked_at IS NULL',[user.id,auth.familyId]);
    await this.auth.event(db,user.id,action,context);await this.auth.notice(db,user,action==='admin_passkey_registered'?'Đã thêm passkey':'Đã thu hồi passkey');
  }
  async remove(auth,id,context){
    this.auth.requireAdmin(auth);requireRecentAdmin(auth.user);await this.library();if(typeof id!=='string'||id.length>2048)throw invalid();
    return this.repo.transaction(async db=>{
      const user=await this.auth.lockedActor(db,auth,{recent:true});
      const result=await db.query('DELETE FROM admin_passkeys WHERE user_id=$1 AND id=$2 RETURNING id',[user.id,id]);
      if(!result.rowCount)throw new HttpError(404,'PASSKEY_NOT_FOUND','Không tìm thấy passkey.');
      await this.changed(db,user,auth,context,'admin_passkey_revoked');return {revoked:true};
    });
  }
  async reauthOptions(auth,password,context){
    this.auth.requireAdmin(auth);await this.library();await this.auth.identity.throttle('admin_reauth',auth.user.id,context,this.config.adminMfaLimit||8);
    const result=await this.repo.transaction(async db=>{
      const user=await this.auth.lockedActor(db,auth);
      if(typeof password!=='string'||password.length>128||!await this.auth.identity.password.verify(user.password_hash,password)){await this.auth.event(db,user.id,'admin_reauth_failed',context);return null;}
      const options=await this.optionsFor(db,user);if(!options)return null;
      const challengeToken=randomToken();
      await db.query(`INSERT INTO admin_auth_challenges(token_hash,user_id,purpose,family_id,security_version,access_version,payload,expires_at)
        VALUES($1,$2,'passkey_reauth',$3,$4,$5,$6,now()+interval '5 minutes')`,[hashToken(challengeToken),user.id,auth.familyId,user.security_version,user.admin_access_version,{webauthnChallenge:options.challenge,deviceHash:this.auth.device(context)}]);
      return {challengeToken,options};
    });
    if(!result)throw new HttpError(401,'ADMIN_MFA_INVALID','Không thể xác minh. Vui lòng thử lại hoặc đăng nhập lại.');return result;
  }
  async reauthVerify(auth,token,response,context){
    this.auth.requireAdmin(auth);await this.library();
    return this.auth.withChallenge(token,'passkey_reauth',context,async(db,user,challenge)=>{
      if(user.id!==auth.user.id||challenge.family_id!==auth.familyId)return null;
      await this.auth.lockedActor(db,auth);if(!await this.assertion(db,user,challenge,response))return null;
      const session=(await db.query('UPDATE admin_sessions SET reauthenticated_at=now(),last_activity_at=now() WHERE family_id=$1 RETURNING *',[auth.familyId])).rows[0];
      await this.auth.event(db,user.id,'admin_reauthenticated',context,{familyId:auth.familyId,method:'passkey'});return {adminSession:this.auth.sessionDto(session)};
    },{consume:true});
  }
}
