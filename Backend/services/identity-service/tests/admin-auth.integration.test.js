import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {randomUUID} from 'node:crypto';
import pg from 'pg';
import argon2 from 'argon2';
import {IdentityRepository} from '../src/models/identity.model.js';
import {IdentityService} from '../src/services/identity.service.js';
import {createRequestHandler} from '../src/routes/index.js';
import {hashToken} from '../src/utils/crypto.js';
import {hotp} from '../src/utils/admin-mfa.js';
import {createMailQueue} from '../src/services/mail-queue.service.js';
import {authenticator} from './webauthn-fixture.js';

test('Admin AUTH PostgreSQL/HTTP: MFA, recovery, reauthentication, sessions and real WebAuthn signatures',
 {skip:!process.env.ADMIN_AUTH_TEST_DATABASE_URL},async t=>{
  const url=new URL(process.env.ADMIN_AUTH_TEST_DATABASE_URL);if(!url.pathname.endsWith('_test'))throw Error('Dedicated *_test database required');
  const repo=new IdentityRepository(url.href),pool=new pg.Pool({connectionString:url.href}),users=[];
  const password='Admin-auth-test-password!',passwordHash=await argon2.hash(password);
  const config={frontendOrigin:'http://localhost:5173',issuer:'identity-service',audience:'backend-v2',jwtSecret:'admin-auth-isolated-test-key-at-least-32-characters',
    mailKey:Buffer.alloc(32,9),refreshDays:30,loginLimit:5,emailVerificationRequired:true,adminMfaLimit:20,adminPasskeysEnabled:true};
  const identity=new IdentityService({repository:repo,mailer:{},config}),server=http.createServer(createRequestHandler(identity,{},config));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}`;
  function browser(){
    const cookies=new Map(),client={token:null,cookies};
    client.send=async(path,body,token=client.token)=>{
      const response=await fetch(base+'/api/v2'+path,{method:body===undefined?'GET':'POST',headers:{Origin:config.frontendOrigin,'User-Agent':'MFA integration test browser',
        ...(body===undefined?{}:{'Content-Type':'application/json'}),...(cookies.size?{Cookie:[...cookies].map(([k,v])=>k+'='+v).join('; ')}:{}),...(token?{Authorization:'Bearer '+token}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
      for(const value of response.headers.getSetCookie()){const [name,...rest]=value.split(';')[0].split('=');if(rest.join('='))cookies.set(name,rest.join('='));else cookies.delete(name);}
      const data=await response.json();if(data.accessToken)client.token=data.accessToken;
      return {status:response.status,data,headers:response.headers};
    };
    return client;
  }
  async function account(roles=['legacy_admin','system_admin','finance']){
    const id=randomUUID(),email=`${id}@example.test`;users.push(id);
    await pool.query(`INSERT INTO users(id,email,full_name,password_hash,status,email_verified_at) VALUES($1,$2,'Admin MFA Test',$3,'active',now())`,[id,email,passwordHash]);
    await pool.query("INSERT INTO user_roles(user_id,role) VALUES($1,'platform_admin')",[id]);
    for(const role of roles)await pool.query('INSERT INTO admin_role_assignments(user_id,role) VALUES($1,$2)',[id,role]);
    return {id,email,browser:browser(),codes:[]};
  }
  async function challenge(owner){const result=await owner.browser.send('/auth/admin/login',{email:owner.email,password});assert.equal(result.status,200);return result.data;}
  async function enrolled(roles){
    const owner=await account(roles),step=await challenge(owner),setup=await owner.browser.send('/auth/admin/mfa/enroll/start',{challengeToken:step.challengeToken});
    assert.equal(setup.status,200);owner.secret=setup.data.secret;
    const result=await owner.browser.send('/auth/admin/mfa/enroll/confirm',{challengeToken:step.challengeToken,code:hotp(owner.secret,Math.floor(Date.now()/30000))});
    assert.equal(result.status,200);owner.codes=[...result.data.recoveryCodes];owner.session=result.data.adminSession;return owner;
  }
  async function loginWithCode(owner,code=owner.codes.shift()){const step=await challenge(owner);return owner.browser.send('/auth/admin/mfa/verify',{challengeToken:step.challengeToken,recoveryCode:code});}
  async function ageReauth(owner){await pool.query("UPDATE admin_sessions SET reauthenticated_at=now()-interval '6 minutes' WHERE family_id=$1",[owner.session.familyId]);}
  try{
    await t.test('001/002 a password challenge is purpose-limited, expires and never grants a business session',async()=>{
      const owner=await account(),step=await challenge(owner);
      assert.equal(step.enrollmentRequired,true);assert.equal(step.accessToken,undefined);assert.equal(owner.browser.cookies.has('identity_refresh'),false);
      assert.equal((await owner.browser.send('/admin/identity/summary',undefined,step.challengeToken)).status,401);
      assert.equal((await owner.browser.send('/auth/admin/reauth',{password,code:'123456'},step.challengeToken)).status,401);
      const customer=await owner.browser.send('/auth/login',{email:owner.email,password});assert.equal(customer.status,200);assert.equal(customer.data.user.adminAccess,undefined);
      assert.equal((await owner.browser.send('/admin/identity/summary')).status,403);
      await pool.query("UPDATE admin_auth_challenges SET expires_at=now()-interval '1 second' WHERE token_hash=$1",[hashToken(step.challengeToken)]);
      assert.equal((await owner.browser.send('/auth/admin/mfa/enroll/start',{challengeToken:step.challengeToken})).status,401);
    });
    await t.test('001 enrollment encrypts the secret, returns recovery codes once and gives a full MFA-bound session',async()=>{
      const owner=await enrolled();assert.equal(owner.codes.length,10);assert.equal(new Set(owner.codes).size,10);
      assert.equal((await owner.browser.send('/admin/identity/summary')).status,200);
      const state=await owner.browser.send('/auth/admin/security');assert.equal(state.data.recoveryCodesRemaining,10);
      const stored=(await pool.query('SELECT secret,last_counter FROM admin_mfa_factors WHERE user_id=$1',[owner.id])).rows[0];
      assert.ok(stored.last_counter>=0);assert.doesNotMatch(JSON.stringify(stored),new RegExp(owner.secret));
      const serialized=JSON.stringify(state.data);assert.ok(!serialized.includes(owner.secret));for(const code of owner.codes)assert.ok(!serialized.includes(code));
      const me=await owner.browser.send('/auth/me');assert.ok(me.data.user.adminSession.verifiedAt);assert.equal(me.data.user.password_hash,undefined);
      assert.ok(Date.parse(owner.session.expiresAt)-Date.now()<=28800000);
    });
    await t.test('001/004 recovery codes are single-use under concurrency and revoke older sessions',async()=>{
      const owner=await enrolled(),oldToken=owner.browser.token,first=await challenge(owner),second=await challenge(owner),code=owner.codes.shift();
      const results=await Promise.all([owner.browser.send('/auth/admin/mfa/verify',{challengeToken:first.challengeToken,recoveryCode:code}),owner.browser.send('/auth/admin/mfa/verify',{challengeToken:second.challengeToken,recoveryCode:code})]);
      assert.deepEqual(results.map(r=>r.status).sort(),[200,401]);
      assert.equal((await owner.browser.send('/auth/me',undefined,oldToken)).status,401);
      const repeat=await loginWithCode(owner,code);assert.equal(repeat.status,401);
      assert.equal((await pool.query('SELECT count(*)::int AS n FROM admin_recovery_codes WHERE user_id=$1 AND consumed_at IS NOT NULL',[owner.id])).rows[0].n,1);
    });
    await t.test('001/003 changing MFA replaces secrets/codes, revokes old sessions and invalidates pending password challenges',async()=>{
      const owner=await enrolled(),oldToken=owner.browser.token,oldCode=owner.codes[0],pending=await challenge(owner);
      const setup=await owner.browser.send('/auth/admin/mfa/rotate/start',{});assert.equal(setup.status,200);
      assert.equal((await owner.browser.send('/auth/admin/mfa/verify',{challengeToken:setup.data.challengeToken,recoveryCode:oldCode})).status,401);
      const result=await owner.browser.send('/auth/admin/mfa/rotate/confirm',{challengeToken:setup.data.challengeToken,code:hotp(setup.data.secret,Math.floor(Date.now()/30000))});assert.equal(result.status,200);assert.equal(result.data.recoveryCodes.length,10);
      assert.equal((await owner.browser.send('/auth/me',undefined,oldToken)).status,401);
      assert.equal((await owner.browser.send('/auth/admin/mfa/verify',{challengeToken:pending.challengeToken,recoveryCode:oldCode})).status,401);
      const before=result.data.adminSession,regenerated=await owner.browser.send('/auth/admin/mfa/recovery-codes',{});assert.equal(regenerated.status,200);
      assert.equal(regenerated.data.adminSession.expiresAt,before.expiresAt);assert.equal(regenerated.data.adminSession.reauthenticatedAt,before.reauthenticatedAt);
      const next=await challenge(owner);assert.equal((await owner.browser.send('/auth/admin/mfa/verify',{challengeToken:next.challengeToken,recoveryCode:result.data.recoveryCodes[0]})).status,401);
      assert.equal((await owner.browser.send('/auth/admin/mfa/verify',{challengeToken:next.challengeToken,recoveryCode:regenerated.data.recoveryCodes[0]})).status,200);
    });
    await t.test('MFA enrollment, recovery codes and session creation roll back when the security audit cannot be written',async()=>{
      const owner=await account(),step=await challenge(owner),setup=await owner.browser.send('/auth/admin/mfa/enroll/start',{challengeToken:step.challengeToken}),original=identity.adminAuth.event.bind(identity.adminAuth);
      identity.adminAuth.event=async(...args)=>{if(args[2]==='admin_mfa_enrolled')throw Error('Test security audit failure');return original(...args);};
      try{assert.equal((await owner.browser.send('/auth/admin/mfa/enroll/confirm',{challengeToken:step.challengeToken,code:hotp(setup.data.secret,Math.floor(Date.now()/30000))})).status,500);}finally{identity.adminAuth.event=original;}
      for(const table of ['admin_mfa_factors','admin_recovery_codes','refresh_sessions'])assert.equal((await pool.query(`SELECT count(*)::int AS n FROM ${table} WHERE user_id=$1`,[owner.id])).rows[0].n,0);
      assert.equal((await pool.query('SELECT consumed_at FROM admin_auth_challenges WHERE token_hash=$1',[hashToken(step.challengeToken)])).rows[0].consumed_at,null);
      assert.equal((await owner.browser.send('/auth/admin/mfa/enroll/confirm',{challengeToken:step.challengeToken,code:hotp(setup.data.secret,Math.floor(Date.now()/30000))})).status,200);
    });
    await t.test('004 MFA attempt counts survive failures and a new challenge cannot bypass the account limit',async()=>{
      const owner=await enrolled(),step=await challenge(owner);
      for(let i=0;i<5;i++)assert.equal((await owner.browser.send('/auth/admin/mfa/verify',{challengeToken:step.challengeToken,code:'invalid'})).status,401);
      assert.equal((await pool.query('SELECT attempts FROM admin_auth_challenges WHERE token_hash=$1',[hashToken(step.challengeToken)])).rows[0].attempts,5);
      assert.equal((await owner.browser.send('/auth/admin/mfa/verify',{challengeToken:step.challengeToken,recoveryCode:owner.codes[0]})).status,401);
      await pool.query("DELETE FROM auth_rate_limits WHERE bucket LIKE 'admin_mfa:%'");config.adminMfaLimit=3;
      try{for(let i=0;i<3;i++){const fresh=await challenge(owner);assert.equal((await owner.browser.send('/auth/admin/mfa/verify',{challengeToken:fresh.challengeToken,code:'invalid'})).status,401);}const fresh=await challenge(owner);assert.equal((await owner.browser.send('/auth/admin/mfa/verify',{challengeToken:fresh.challengeToken,recoveryCode:owner.codes[0]})).status,429);}finally{config.adminMfaLimit=20;await pool.query("DELETE FROM auth_rate_limits WHERE bucket LIKE 'admin_mfa:%'");}
    });
    await t.test('004 login failure messages do not expose account existence, role or MFA configuration',async()=>{
      const owner=await account([]),one=await owner.browser.send('/auth/admin/login',{email:owner.email,password}),two=await owner.browser.send('/auth/admin/login',{email:'not-an-account@example.test',password}),three=await owner.browser.send('/auth/admin/login',{email:owner.email,password:'incorrect'});
      assert.equal(one.status,401);assert.deepEqual(one.data,two.data);assert.deepEqual(two.data,three.data);
    });
    await t.test('003 stale sessions can read but cannot change permissions without password and a fresh second factor',async()=>{
      const owner=await enrolled(),target=await account(['content_editor']);await ageReauth(owner);
      assert.equal((await owner.browser.send('/admin/identity/summary')).status,200);
      const body={assignments:[{role:'auditor',scope:{}}],version:0,reason:'Reassign the isolated employee after recent authentication',requestId:randomUUID()};
      const blocked=await fetch(base+`/api/v2/admin/staff/${target.id}/access`,{method:'PUT',headers:{Origin:config.frontendOrigin,'Content-Type':'application/json',Authorization:'Bearer '+owner.browser.token},body:JSON.stringify(body)});
      assert.equal(blocked.status,428);assert.equal((await blocked.json()).code,'ADMIN_REAUTH_REQUIRED');
      const wrong=await owner.browser.send('/auth/admin/reauth',{password:'incorrect',recoveryCode:owner.codes[0]});assert.equal(wrong.status,401);
      const ok=await owner.browser.send('/auth/admin/reauth',{password,recoveryCode:owner.codes.shift()});assert.equal(ok.status,200);
      const applied=await fetch(base+`/api/v2/admin/staff/${target.id}/access`,{method:'PUT',headers:{Origin:config.frontendOrigin,'Content-Type':'application/json',Authorization:'Bearer '+owner.browser.token},body:JSON.stringify(body)});assert.equal(applied.status,200);
      assert.equal((await pool.query("SELECT count(*)::int AS n FROM security_events WHERE user_id=$1 AND action='admin_permissions_changed'",[target.id])).rows[0].n,1);
    });
    await t.test('005 background reads and refresh do not extend inactivity or the absolute session deadline',async()=>{
      const owner=await enrolled();await pool.query("UPDATE admin_sessions SET last_activity_at=now()-interval '10 minutes' WHERE family_id=$1",[owner.session.familyId]);
      const before=(await pool.query('SELECT last_activity_at,expires_at FROM admin_sessions WHERE family_id=$1',[owner.session.familyId])).rows[0];
      await owner.browser.send('/auth/me');await owner.browser.send('/auth/refresh',{});
      const after=(await pool.query('SELECT last_activity_at,expires_at FROM admin_sessions WHERE family_id=$1',[owner.session.familyId])).rows[0];assert.equal(+before.last_activity_at,+after.last_activity_at);assert.equal(+before.expires_at,+after.expires_at);
      const active=await owner.browser.send('/auth/admin/activity',{});assert.equal(active.status,200);assert.equal(Date.parse(active.data.adminSession.expiresAt),+before.expires_at);
      await pool.query("UPDATE admin_sessions SET last_activity_at=now()-interval '31 minutes' WHERE family_id=$1",[owner.session.familyId]);
      assert.equal((await owner.browser.send('/auth/admin/activity',{})).status,401);
      const expired=await owner.browser.send('/auth/refresh',{});assert.equal(expired.status,401);assert.match(expired.headers.get('set-cookie'),/Max-Age=0/);
      const other=await enrolled();await pool.query("UPDATE admin_sessions SET expires_at=now()-interval '1 second' WHERE family_id=$1",[other.session.familyId]);assert.equal((await other.browser.send('/auth/me')).status,401);
    });
    await t.test('006 session lists are owned and individual/all-device revocation invalidates the backend immediately',async()=>{
      const owner=await enrolled(),other=await enrolled();
      const list=await owner.browser.send('/auth/admin/sessions');assert.equal(list.status,200);assert.equal(list.data.items.length,1);assert.equal(list.data.items[0].current,true);
      const families=Array.from({length:51},()=>randomUUID());
      await pool.query("INSERT INTO refresh_sessions(family_id,user_id,token_hash,expires_at) SELECT f,$1,md5(f::text)||md5('fixture:'||f::text),now()+interval '1 hour' FROM unnest($2::uuid[]) f",[owner.id,families]);
      await pool.query("INSERT INTO admin_sessions(family_id,user_id,factor_version,method,expires_at,device_hash,device) SELECT f,$1,1,'totp',now()+interval '1 hour','isolated-session-fixture','Additional test browser' FROM unnest($2::uuid[]) f",[owner.id,families]);
      const allActive=await owner.browser.send('/auth/admin/sessions');assert.equal(allActive.data.items.filter(row=>!row.revoked).length,52);
      await owner.browser.send('/auth/admin/sessions/revoke',{familyId:other.session.familyId});assert.equal((await other.browser.send('/auth/me')).status,200);
      const result=await owner.browser.send('/auth/admin/sessions/revoke',{familyId:owner.session.familyId});assert.equal(result.data.signedOut,true);assert.equal((await owner.browser.send('/auth/me')).status,401);
      const fresh=await loginWithCode(owner);assert.equal(fresh.status,200);const all=await owner.browser.send('/auth/admin/sessions/revoke',{allDevices:true});assert.equal(all.data.signedOut,true);assert.equal((await owner.browser.send('/auth/me')).status,401);
    });
    await t.test('007 password changes, staff holds and role revocation invalidate sessions and password-stage challenges',async()=>{
      const owner=await enrolled(),step=await challenge(owner),newHash=await argon2.hash('Replacement-password!');
      await pool.query('UPDATE users SET password_hash=$2 WHERE id=$1',[owner.id,newHash]);assert.equal((await owner.browser.send('/auth/me')).status,401);
      assert.equal((await owner.browser.send('/auth/admin/mfa/verify',{challengeToken:step.challengeToken,recoveryCode:owner.codes[0]})).status,401);
      const held=await enrolled();await pool.query("UPDATE users SET status='suspended' WHERE id=$1",[held.id]);assert.equal((await held.browser.send('/auth/me')).status,401);
      await pool.query("UPDATE users SET status='active' WHERE id=$1",[held.id]);assert.equal((await held.browser.send('/auth/me')).status,401);
      const revoked=await enrolled();await pool.query('DELETE FROM admin_role_assignments WHERE user_id=$1',[revoked.id]);assert.equal((await revoked.browser.send('/admin/identity/summary')).status,403);
    });
    await t.test('008 logout revokes the server family and expires the cookie even with an expired bearer',async()=>{
      const owner=await enrolled(),token=owner.browser.token;
      const response=await owner.browser.send('/auth/logout',{allDevices:false},'invalid-expired-bearer');assert.equal(response.status,200);assert.match(response.headers.get('set-cookie'),/HttpOnly; Path=\/api\/v2\/auth; SameSite=Strict; Max-Age=0/);
      assert.equal((await owner.browser.send('/auth/me',undefined,token)).status,401);
    });
    await t.test('009 MFA recovery requires independent verified evidence, revokes old factors/sessions and informs the owner',async()=>{
      const owner=await enrolled(),reviewer=await enrolled(),step=await challenge(owner);
      const request=await owner.browser.send('/auth/admin/mfa/recovery/request',{challengeToken:step.challengeToken,evidenceReference:'IDENTITY-TEST-PROOF-001',reason:'The verified owner lost the authenticator and all recovery codes'});assert.equal(request.status,200);
      const requests=await reviewer.browser.send('/auth/admin/mfa/recovery/requests'),record=requests.data.items.find(r=>r.id===request.data.id);assert.ok(record);
      const review={id:record.id,version:record.version,action:'approve',reason:'Verified the staff identity independently against the recovery procedure',evidenceReference:'INDEPENDENT-REVIEW-001',identityVerified:true};
      assert.equal((await owner.browser.send('/auth/admin/mfa/recovery/review',review)).status,403);
      assert.equal((await reviewer.browser.send('/auth/admin/mfa/recovery/review',{...review,identityVerified:false})).status,400);
      assert.equal((await reviewer.browser.send('/auth/admin/mfa/recovery/review',review)).status,200);
      assert.equal((await owner.browser.send('/auth/me')).status,401);
      const next=await challenge(owner);assert.equal(next.enrollmentRequired,true);
      assert.equal((await owner.browser.send('/auth/admin/mfa/verify',{challengeToken:next.challengeToken,recoveryCode:owner.codes[0]})).status,401);
      const setup=await owner.browser.send('/auth/admin/mfa/enroll/start',{challengeToken:next.challengeToken});assert.equal(setup.status,200);assert.notEqual(setup.data.secret,owner.secret);
      const completed=await owner.browser.send('/auth/admin/mfa/enroll/confirm',{challengeToken:next.challengeToken,code:hotp(setup.data.secret,Math.floor(Date.now()/30000))});assert.equal(completed.status,200);
      const stored=(await pool.query('SELECT status FROM admin_mfa_recovery_requests WHERE id=$1',[record.id])).rows[0];assert.equal(stored.status,'EXECUTED');
      const notices=(await pool.query("SELECT purpose FROM identity_email_outbox WHERE recipient=$1 AND purpose='security_notice'",[owner.email])).rows;assert.ok(notices.length>=3);
    });
    await t.test('009 support cannot inspect MFA secrets or approve recovery and a withdrawn reviewer permission blocks re-enrollment',async()=>{
      const owner=await enrolled(),reviewer=await enrolled(),support=await enrolled(['customer_support']),step=await challenge(owner);
      assert.equal((await support.browser.send('/auth/admin/mfa/recovery/requests')).status,403);
      assert.equal((await support.browser.send('/auth/admin/security')).data.secret,undefined);
      const request=await owner.browser.send('/auth/admin/mfa/recovery/request',{challengeToken:step.challengeToken,evidenceReference:'IDENTITY-TEST-PROOF-002',reason:'Require an independently authorized MFA recovery for this test'});
      assert.equal((await reviewer.browser.send('/auth/admin/mfa/recovery/review',{id:request.data.id,version:1,action:'approve',reason:'Confirm the isolated test identity proof after review',evidenceReference:'INDEPENDENT-REVIEW-002',identityVerified:true})).status,200);
      await pool.query("DELETE FROM admin_role_assignments WHERE user_id=$1 AND role='system_admin'",[reviewer.id]);
      const next=await challenge(owner);assert.equal((await owner.browser.send('/auth/admin/mfa/enroll/start',{challengeToken:next.challengeToken})).status,403);
      const replacement=await owner.browser.send('/auth/admin/mfa/recovery/request',{challengeToken:next.challengeToken,evidenceReference:'REPLACEMENT-PROOF-001',reason:'Resubmit recovery because the original reviewer authorization was withdrawn'});assert.equal(replacement.status,200);assert.notEqual(replacement.data.id,request.data.id);
      assert.equal((await pool.query('SELECT status FROM admin_mfa_recovery_requests WHERE id=$1',[request.data.id])).rows[0].status,'REJECTED');
    });
    await t.test('010 device events and encrypted security email never include TOTP secrets or recovery codes',async()=>{
      const owner=await enrolled();await loginWithCode(owner);
      assert.equal((await pool.query("SELECT count(*)::int AS n FROM security_events WHERE user_id=$1 AND action='admin_new_device'",[owner.id])).rows[0].n,1);
      const events=(await pool.query('SELECT action,metadata FROM security_events WHERE user_id=$1',[owner.id])).rows;
      assert.ok(!JSON.stringify(events).includes(owner.secret));
      const row=(await pool.query("SELECT * FROM identity_email_outbox WHERE recipient=$1 AND purpose='security_notice' ORDER BY id DESC LIMIT 1",[owner.email])).rows[0];
      const messages=[],queue=createMailQueue(repo,{sendMail:async value=>messages.push(value)},{key:config.mailKey,from:'test@example.test',frontendOrigin:config.frontendOrigin});await queue.deliver(row);
      assert.equal(messages.length,1);assert.match(messages[0].subject,/bảo mật/);assert.ok(!messages[0].text.includes(owner.secret));for(const code of owner.codes)assert.ok(!messages[0].text.includes(code));
    });
    await t.test('011 passkey enrollment/login verify real signatures, origin, RP ID, user verification and challenge replay',async()=>{
      const owner=await enrolled(),device=authenticator();
      const register=await owner.browser.send('/auth/admin/passkey/register/options',{label:'Virtual test authenticator'});assert.equal(register.status,200);
      const wrong=device.registration(register.data.options,{origin:'https://attacker.example'});
      assert.equal((await owner.browser.send('/auth/admin/passkey/register/verify',{challengeToken:register.data.challengeToken,response:wrong})).status,401);
      const good=device.registration(register.data.options);
      assert.equal((await owner.browser.send('/auth/admin/passkey/register/verify',{challengeToken:register.data.challengeToken,response:good})).status,200);
      assert.equal((await owner.browser.send('/auth/admin/passkey/register/verify',{challengeToken:register.data.challengeToken,response:good})).status,401);
      const step=await challenge(owner),options=await owner.browser.send('/auth/admin/passkey/options',{challengeToken:step.challengeToken});assert.equal(options.status,200);
      for(const override of [{origin:'https://attacker.example'},{rpID:'attacker.example'},{verified:false}])assert.equal((await owner.browser.send('/auth/admin/passkey/verify',{challengeToken:step.challengeToken,response:device.assertion(options.data.options,override)})).status,401);
      const assertion=device.assertion(options.data.options);
      assert.equal((await owner.browser.send('/auth/admin/passkey/verify',{challengeToken:step.challengeToken,response:assertion})).status,200);
      assert.equal((await owner.browser.send('/auth/admin/passkey/verify',{challengeToken:step.challengeToken,response:assertion})).status,401);
      const session=(await owner.browser.send('/auth/me')).data.user.adminSession;owner.session=session;await ageReauth(owner);
      const proof=await owner.browser.send('/auth/admin/passkey/reauth/options',{password});assert.equal(proof.status,200);
      const reauthenticated=await owner.browser.send('/auth/admin/passkey/reauth/verify',{challengeToken:proof.data.challengeToken,response:device.assertion(proof.data.options,{counter:2})});assert.equal(reauthenticated.status,200);
      assert.equal((await owner.browser.send('/auth/admin/passkey/revoke',{id:good.id})).status,200);
      const fallback=await loginWithCode(owner);assert.equal(fallback.status,200);
    });
  }finally{
    try{
      await pool.query('DELETE FROM admin_access_events WHERE target_reference=ANY($1::uuid[])',[users]);
      await pool.query('DELETE FROM security_events WHERE user_id=ANY($1::uuid[])',[users]);
      await pool.query('DELETE FROM identity_email_outbox WHERE recipient=ANY($1::text[])',[users.map(id=>`${id}@example.test`)]);
      await pool.query('DELETE FROM users WHERE id=ANY($1::uuid[])',[users]);
    }finally{await new Promise(resolve=>server.close(resolve));await repo.close();await pool.end();}
  }
});
