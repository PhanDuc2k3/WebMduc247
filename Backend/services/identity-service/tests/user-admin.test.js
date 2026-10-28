import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createDecipheriv} from 'node:crypto';
import http from 'node:http';
import argon2 from 'argon2';
import {createMailQueue} from '../src/services/mail-queue.service.js';
import {IdentityRepository} from '../src/models/identity.model.js';
import {IdentityService} from '../src/services/identity.service.js';
import {ProfileRepository} from '../src/models/profile.model.js';
import {ProfileService} from '../src/services/profile.service.js';
import {IdentityAdminService} from '../src/services/platform-admin.service.js';
import {CatalogAdminService} from '../../catalog-service/src/platform-admin.service.js';
import {OrderAdminService} from '../../order-service/src/platform-admin.service.js';
import {userOrderImpact} from '../../order-service/src/user-impact.service.js';
import {createRequestHandler} from '../src/routes/index.js';
import {moderationInput} from '../src/services/user-admin-contract.js';
import {UserAdminService} from '../src/services/user-admin.service.js';
import {UserSupportService} from '../src/services/user-support.service.js';
import {UserWorkflowService} from '../src/services/user-workflow.service.js';
import {UserAdminWorker} from '../src/services/user-admin.worker.js';
import {effectiveAdminAccess} from '../../../packages/contracts/admin-rbac.js';

test('USER contracts reject unsupported restrictions, forged verification and invalid temporary dates',()=>{
  const base={requestId:randomUUID(),version:0,action:'suspend',reason:'Reason for account suspension',reasonCode:'ABUSE',restrictionScope:'ACCOUNT'};
  for(const extra of [{restrictionScope:'SELLING'},{emailVerifiedAt:new Date().toISOString()},{reasonCode:'FAKE'},{expiresAt:'bad'},{expiresAt:'2000-01-01'},{reasonCode:'APPEAL_ACCEPTED'}])assert.throws(()=>moderationInput({...base,...extra}),{status:400});
  assert.equal(moderationInput(base).reasonCode,'ABUSE');
});
test('USER endpoints deny unprivileged principals before reading private data',async()=>{
  const identity={repo:{pool:{query(){throw Error('SQL must not run');}}}},users=new UserAdminService(identity,{}),buyer={id:randomUUID()},id=randomUUID();
  for(const run of [()=>users.workspace(buyer,id),()=>users.sensitive(buyer,id,{}),()=>users.sessions(buyer,id),()=>users.revokeSessions(buyer,id,{}),()=>users.resetPassword(buyer,id,{},{}),()=>users.notes(buyer,id),()=>users.signals(buyer,id),()=>users.moderate(buyer,id,{})])await assert.rejects(run(),{status:403});
  const staffId=randomUUID(),stale={id:staffId,adminAccess:effectiveAdminAccess([{role:'system_admin',scope:{}}],staffId),adminSession:{reauthenticatedAt:'2000-01-01T00:00:00Z',reauthSeconds:300}};
  for(const run of [()=>users.sensitive(stale,id,{}),()=>users.revokeSessions(stale,id,{}),()=>users.resetPassword(stale,id,{},{}),()=>new UserWorkflowService(users).artifact(stale,id,{})])await assert.rejects(run(),{status:428});
});

test('support OTP email is encrypted, purpose-specific and never embedded in a URL',async()=>{
  let queued,message;const queue=createMailQueue({queueEmail:async row=>{queued=row;}},{sendMail:async row=>{message=row;}},{key:Buffer.alloc(32,9),from:'no-reply@example.test',frontendOrigin:'https://shop.example.test'});
  await queue.accountSupport('owner@example.test','012345');assert.equal(queued.purpose,'account_support');assert.ok(!queued.ciphertext.includes(Buffer.from('012345')));
  await queue.deliver(queued);assert.equal(message.to,'owner@example.test');assert.ok(message.text.includes('012345'));assert.ok(message.text.includes('/account-help'));assert.ok(!message.text.includes('/reset-password'));assert.ok(!message.text.includes('token='));
});

test('ADM-USER PostgreSQL and HTTP acceptance',{skip:!process.env.ADMIN_USER_TEST_DATABASE_URL},async t=>{
  const url=new URL(process.env.ADMIN_USER_TEST_DATABASE_URL);if(!url.pathname.endsWith('_test'))throw Error('Dedicated *_test database required');
  const repo=new IdentityRepository(url.href),pool=repo.pool,context={ip:'127.0.0.1',userAgent:'User administration acceptance'};
  const config={frontendOrigin:'http://localhost:5173',issuer:'identity-test',audience:'backend-v2',jwtSecret:'isolated-user-test-key-at-least-32-chars',mailKey:Buffer.alloc(32,7),refreshDays:30,loginLimit:100,emailVerificationRequired:true};
  const identity=new IdentityService({repository:repo,mailer:{},config}),profiles=new ProfileService({repository:new ProfileRepository(repo),identityService:identity});
  const users=new UserAdminService(identity,profiles,config),workflows=new UserWorkflowService(users),support=new UserSupportService(identity),worker=new UserAdminWorker(users),core=new IdentityAdminService(repo);
  const fixtures=[],password='user-test-password!',passwordHash=await argon2.hash(password,{type:argon2.argon2id,memoryCost:19456,timeCost:2,parallelism:1});
  const create=async(roles=[],verified=true)=>{
    const id=randomUUID(),email=`user-${id}@example.test`;fixtures.push(id);
    await pool.query('INSERT INTO users(id,email,full_name,password_hash,status,email_verified_at) VALUES($1,$2,$3,$4,$5,$6)',[id,email,'Private User '+id.slice(0,8),passwordHash,verified?'active':'pending_verification',verified?new Date():null]);
    await pool.query('INSERT INTO user_profiles(user_id,display_name) VALUES($1,$2)',[id,'Private User']);await pool.query('INSERT INTO user_preferences(user_id) VALUES($1)',[id]);
    await pool.query('INSERT INTO user_roles(user_id,role) VALUES($1,$2)',[id,roles.length?'platform_admin':'buyer']);
    for(const role of roles)await pool.query('INSERT INTO admin_role_assignments(user_id,role) VALUES($1,$2)',[id,role]);
    return {id,email,adminAccess:effectiveAdminAccess(roles.map(role=>({role,scope:{}})),id)};
  };
  let admin,reviewer,member,other,target,pending,storeId,orderId,groupId,quoteId;
  const command=(version,extra={})=>({version,reason:'A specific reason for this account workflow',requestId:randomUUID(),...extra});
  const version=async id=>(await users.workspace(admin,id)).record.version;
  async function emailCode(userId,purpose){const email=(await pool.query('SELECT email FROM users WHERE id=$1',[userId])).rows[0].email;const row=(await pool.query('SELECT nonce,tag,ciphertext FROM identity_email_outbox WHERE recipient=$1 AND purpose=$2 ORDER BY id DESC LIMIT 1',[email,purpose])).rows[0];const decipher=createDecipheriv('aes-256-gcm',config.mailKey,row.nonce);decipher.setAuthTag(row.tag);return Buffer.concat([decipher.update(row.ciphertext),decipher.final()]).toString('utf8');}
  async function proof(account){const challenge=await support.challenge({email:account.email,password},context);const verified=await support.verify({challengeId:challenge.challengeId,code:await emailCode(account.id,'account_support')},context);return verified.supportToken;}
  async function claim(id,actor=reviewer){const row=(await workflows.detail(actor,id)).record;await workflows.action(actor,id,command(row.version,{action:'claim'}));}
  async function reviews(id,actor=reviewer){for(const module of ['identity','catalog','order','payment','engagement','chat']){const row=(await workflows.detail(actor,id)).record;await workflows.action(actor,id,command(row.version,{action:'retention',module,disposition:'RETAIN',basisReference:`Policy and source review for ${module}`,retainUntil:new Date(Date.now()+86400000).toISOString()}));}}
  try{
    await pool.query("DELETE FROM auth_rate_limits WHERE bucket LIKE '%:ip:127.0.0.1'");
    admin=await create(['legacy_admin','system_admin']);reviewer=await create(['system_admin']);member=await create(['customer_support']);other=await create(['customer_support']);target=await create();pending=await create([],false);
    await pool.query('UPDATE user_profiles SET phone_e164=$2,phone_verified_at=now() WHERE user_id=$1',[target.id,'+84912345678']);
    storeId=randomUUID();orderId=randomUUID();groupId=randomUUID();quoteId=randomUUID();
    await pool.query("INSERT INTO catalog.stores(id,owner_user_id,slug,name,status) VALUES($1,$2,$3,'User traceability shop','active')",[storeId,target.id,'user-'+storeId]);
    await pool.query("INSERT INTO order_service.checkout_quotes(id,user_id,cart_version,quote_json) VALUES($1,$2,0,'{}')",[quoteId,target.id]);
    await pool.query('INSERT INTO order_service.order_groups(id,buyer_id,grand_total_minor,current_total_minor) VALUES($1,$2,100000,100000)',[groupId,target.id]);
    await pool.query(`INSERT INTO order_service.orders(id,user_id,store_id,quote_id,group_id,status,payment_method,subtotal_minor,shipping_estimate_minor,payable_total_minor,shipping_address_json,store_snapshot_json)
      VALUES($1,$2,$3,$4,$5,'DELIVERED','COD',90000,10000,100000,'{"receiverName":"Traceable buyer"}','{"name":"Immutable user shop"}')`,[orderId,target.id,storeId,quoteId,groupId]);
    await t.test('001 search by ID/name/email stays masked; contact search/reveal needs permission and audit',async()=>{
      for(const q of [target.id,target.email]){const result=await core.list(admin,{q});assert.equal(result.total,1);assert.equal(result.items[0].id,target.id);assert.ok(result.items[0].email.includes('***'));assert.ok(result.items[0].fullName.includes('***'));}
      await assert.rejects(users.sensitive(member,target.id,command(0)),{status:403});
      const contact=await users.sensitive(admin,target.id,command(0));assert.equal(contact.email,target.email);assert.equal(contact.phone,'+84912345678');assert.equal(Object.hasOwn(contact,'password_hash'),false);
      const search=await users.searchContact(admin,{phone:'+84912345678',reason:'Search a permitted contact for investigation',requestId:randomUUID()});assert.equal(search.items[0].id,target.id);assert.ok(search.items[0].email.includes('***'));
      const audit=(await pool.query("SELECT metadata FROM user_admin_events WHERE user_reference=$1 AND action='contact_viewed'",[target.id])).rows;assert.equal(audit.length,1);assert.doesNotMatch(JSON.stringify(audit),/84912345678/);
    });
    await t.test('002 module links retain module scope and show aggregate lock impact',async()=>{
      assert.equal((await new CatalogAdminService(pool).stores(admin,{ownerId:target.id})).total,1);
      assert.equal((await new OrderAdminService(pool).list(admin,{buyerId:target.id})).total,1);
      await assert.rejects(new CatalogAdminService(pool).stores(member,{ownerId:target.id}),{status:403});
      const scoped={id:randomUUID(),adminAccess:effectiveAdminAccess([{role:'operations',scope:{storeIds:[randomUUID()]}}])};assert.equal((await new OrderAdminService(pool).list(scoped,{buyerId:target.id})).total,0);
      const impact=await userOrderImpact({pool,catalogUrl:'http://catalog.test',remote:async()=>({ownedStoreIds:[storeId]})},admin,target.id,'Bearer test');assert.equal(impact.totalOrders,1);assert.equal(impact.activeOrders,0);
      users.remote=async url=>String(url).includes('5102')?{ownedStores:1}:{activeOrders:2,activeBuyerOrders:1,activeSellerOrders:1,openCases:1,pendingRefunds:1};
      const preview=await users.impact(admin,target.id,'Bearer test');assert.ok(preview.modules.every(row=>row.ok));assert.equal(preview.modules[1].data.openCases,1);
    });
    await t.test('003/004/005 suspending revokes access/refresh, records code/scope and preserves verification',async()=>{
      const login=await identity.login({email:target.email,password},context);
      await users.moderate(admin,target.id,command(0,{action:'suspend',reasonCode:'ABUSE',restrictionScope:'ACCOUNT',expiresAt:new Date(Date.now()+3600000).toISOString()}));
      await assert.rejects(identity.me('Bearer '+login.accessToken),{status:401});await assert.rejects(identity.refresh(login.refreshToken,context),{status:401});
      let data=await users.workspace(admin,target.id);assert.equal(data.violationCount,1);assert.equal(data.decisions[0].restriction_scope,'ACCOUNT');
      await users.moderate(admin,target.id,command(data.record.version,{action:'restore',reasonCode:'REMEDIATED'}));assert.equal((await users.workspace(admin,target.id)).record.status,'active');
      await users.moderate(admin,pending.id,command(0,{action:'suspend',reasonCode:'SECURITY_RISK',expiresAt:new Date(Date.now()+3600000).toISOString()}));
      const suspension=(await users.workspace(admin,pending.id)).suspensionId;await pool.query("UPDATE user_admin_decisions SET expires_at=now()-interval '1 minute' WHERE id=$1",[suspension]);await worker.expire();
      assert.equal((await users.workspace(admin,pending.id)).record.status,'pending_verification');assert.equal((await pool.query('SELECT email_verified_at FROM users WHERE id=$1',[pending.id])).rows[0].email_verified_at,null);
      await assert.rejects(users.moderate(admin,reviewer.id,command(0,{action:'suspend'})),{code:'ADMIN_PROTECTED'});
      assert.equal((await new OrderAdminService(pool).detail(admin,orderId)).record.delivery.receiverName,'T***');
    });
    await t.test('009 sessions use an independent permission and revocation logs only family references',async()=>{
      const first=await identity.login({email:target.email,password},{...context,userAgent:'Device one'}),second=await identity.login({email:target.email,password},{...context,userAgent:'Device two'});
      await assert.rejects(users.sessions(member,target.id),{status:403});const sessions=await users.sessions(admin,target.id);const active=sessions.items.filter(row=>row.active);assert.equal(active.length,2);assert.doesNotMatch(JSON.stringify(sessions),/token_hash|accessToken|refreshToken/);
      await users.revokeSessions(admin,target.id,command(await version(target.id),{familyId:active.find(row=>row.device==='Device one').familyId}));
      await assert.rejects(identity.me('Bearer '+first.accessToken),{status:401});assert.equal((await identity.me('Bearer '+second.accessToken)).user.id,target.id);
      const events=(await pool.query("SELECT metadata FROM user_admin_events WHERE user_reference=$1 AND action='sessions_revoked'",[target.id])).rows;assert.doesNotMatch(JSON.stringify(events),new RegExp(second.refreshToken));assert.ok(events[0].metadata.familyIds.length);
    });
    await t.test('006 admin reset is rate limited and never returns the emailed OTP or token',async()=>{
      const body=command(await version(target.id));const response=await users.resetPassword(member,target.id,body,context);assert.equal(response.id,target.id);assert.doesNotMatch(JSON.stringify(response),/\b\d{6}\b|token|code/i);
      const before=Number((await pool.query("SELECT count(*) AS n FROM identity_email_outbox WHERE recipient=$1 AND purpose='reset_password'",[target.email])).rows[0].n);
      await users.resetPassword(member,target.id,body,context);assert.equal(Number((await pool.query("SELECT count(*) AS n FROM identity_email_outbox WHERE recipient=$1 AND purpose='reset_password'",[target.email])).rows[0].n),before);
      for(let i=0;i<2;i++)await users.resetPassword(member,target.id,command(await version(target.id)),context);
      await assert.rejects(users.resetPassword(member,target.id,command(await version(target.id)),context),{status:429});
      await assert.rejects(users.resetPassword(member,reviewer.id,command(0),context),{code:'ADMIN_PROTECTED'});
      await identity.resetPassword({email:target.email,code:await emailCode(target.id,'reset_password'),newPassword:password,confirmPassword:password},context);
    });
    await t.test('audit failure blocks sensitive reads and rolls back account/session changes',async()=>{
      const failingRepo=Object.create(repo);failingRepo.transaction=fn=>repo.transaction(db=>fn({query:(sql,args)=>{
        if(String(sql).includes('INSERT INTO user_admin_events'))throw Error('Audit deliberately unavailable');return db.query(sql,args);
      }}));
      const failingIdentity=Object.create(identity);failingIdentity.repo=failingRepo;const failing=new UserAdminService(failingIdentity,profiles,config);
      await assert.rejects(failing.sensitive(admin,target.id,command(await version(target.id))),/Audit deliberately unavailable/);
      const login=await identity.login({email:target.email,password},context),before=await version(target.id);
      await assert.rejects(failing.moderate(admin,target.id,command(before,{action:'suspend',reasonCode:'ABUSE'})),/Audit deliberately unavailable/);
      assert.equal((await users.workspace(admin,target.id)).record.version,before);assert.equal((await identity.me('Bearer '+login.accessToken)).user.id,target.id);
    });
    await t.test('007 notes are private to the assigned team, with author/time and controlled reassignment',async()=>{
      const settings=await users.teams(admin);
      await users.updateTeam(admin,'support',command(settings.teams.find(row=>row.id==='support').version,{staffIds:[member.id]}));await users.updateTeam(admin,'trust',command(settings.teams.find(row=>row.id==='trust').version,{staffIds:[other.id]}));
      await users.assignTeam(admin,target.id,command(await version(target.id),{teamId:'support'}));
      await users.addNote(member,target.id,command(await version(target.id),{body:'INTERNAL_ONLY user investigation note'}));
      const notes=await users.notes(member,target.id);assert.equal(notes.items[0].author_reference,member.id);assert.ok(notes.items[0].created_at);
      await assert.rejects(users.notes(other,target.id),{status:403});await assert.rejects(users.notes(reviewer,target.id),{status:403});
      await users.assignTeam(admin,target.id,command(await version(target.id),{teamId:'trust'}));await assert.rejects(users.notes(member,target.id),{status:403});assert.equal((await users.notes(other,target.id)).items.length,0);
    });
    await t.test('008 support proof works for suspended users and requires an independent appeal reviewer',async()=>{
      await users.moderate(admin,pending.id,command(await version(pending.id),{action:'suspend',reasonCode:'ABUSE'}));
      const token=await proof(pending),state=await support.state(token);assert.ok(state.suspension.id);
      const {id}=await support.create(token,{kind:'APPEAL',summary:'Please reconsider the original account suspension',requestId:randomUUID()});
      await claim(id,admin);let row=(await workflows.detail(admin,id)).record;
      await assert.rejects(workflows.action(admin,id,command(row.version,{action:'overturn'})),{code:'INDEPENDENT_REVIEWER_REQUIRED'});
      await assert.rejects(workflows.action(admin,id,command(row.version,{action:'reject'})),{code:'INDEPENDENT_REVIEWER_REQUIRED'});
      await workflows.action(admin,id,command(row.version,{action:'assign',assigneeId:reviewer.id}));row=(await workflows.detail(reviewer,id)).record;
      await workflows.action(reviewer,id,command(row.version,{action:'overturn'}));assert.equal((await users.workspace(admin,pending.id)).record.status,'pending_verification');
      assert.equal((await workflows.detail(reviewer,id)).originalDecision.outcome,'OVERTURNED');assert.equal((await support.state(token)).cases[0].status,'COMPLETED');
    });
    await t.test('support OTP attempts/replay are bounded; proof never changes email-verification status',async()=>{
      const account=await create([],false),first=await support.challenge({email:account.email,password},context),code=await emailCode(account.id,'account_support');
      const wrong=code==='000000'?'000001':'000000';for(let attempt=0;attempt<5;attempt++)await assert.rejects(support.verify({challengeId:first.challengeId,code:wrong},context),{status:401});
      await assert.rejects(support.verify({challengeId:first.challengeId,code},context),{status:401});
      const next=await support.challenge({email:account.email,password},context),nextCode=await emailCode(account.id,'account_support');
      const verified=await support.verify({challengeId:next.challengeId,code:nextCode},context);assert.ok(verified.supportToken);
      await assert.rejects(support.verify({challengeId:next.challengeId,code:nextCode},context),{status:401});
      assert.equal((await pool.query('SELECT email_verified_at FROM users WHERE id=$1',[account.id])).rows[0].email_verified_at,null);
    });
    await t.test('expired old decisions cannot lift a new suspension; workflow claims serialize',async()=>{
      await users.moderate(admin,pending.id,command(await version(pending.id),{action:'suspend',reasonCode:'ABUSE',expiresAt:new Date(Date.now()+3600000).toISOString()}));
      const old=(await users.workspace(admin,pending.id)).suspensionId;await users.moderate(admin,pending.id,command(await version(pending.id),{action:'restore'}));
      await users.moderate(admin,pending.id,command(await version(pending.id),{action:'suspend',reasonCode:'SECURITY_RISK'}));
      await pool.query("UPDATE user_admin_decisions SET expires_at=now()-interval '1 minute' WHERE id=$1",[old]);await worker.expire();assert.equal((await users.workspace(admin,pending.id)).record.status,'suspended');
      const token=await proof(pending),created=await support.create(token,{kind:'APPEAL',summary:'Please investigate the newer suspension independently',requestId:randomUUID()});
      const results=await Promise.allSettled([admin,reviewer].map(actor=>workflows.action(actor,created.id,command(1,{action:'claim'}))));assert.equal(results.filter(result=>result.status==='fulfilled').length,1);assert.equal(results.find(result=>result.status==='rejected').reason.status,409);
    });
    await t.test('010 data access/rectification require verified identity and all six module reviews',async()=>{
      const token=await proof(target),{id}=await support.create(token,{kind:'ACCESS',summary:'I request a copy of my personal information',requestId:randomUUID()});await claim(id);
      let row=(await workflows.detail(reviewer,id)).record;await assert.rejects(workflows.action(reviewer,id,command(row.version,{action:'execute'})),{code:'RETENTION_REVIEW_REQUIRED'});
      await reviews(id);row=(await workflows.detail(reviewer,id)).record;await workflows.action(reviewer,id,command(row.version,{action:'execute'}));
      const result=await support.state(token);assert.equal(result.cases.find(item=>item.id===id).status,'COMPLETED');
      const artifact=await workflows.ownArtifact(token,id);assert.equal(artifact.account.id,target.id);assert.doesNotMatch(JSON.stringify(artifact),/password_hash|token_hash|code_hash|reset_password/);
      await assert.rejects(workflows.artifact(member,id,command(row.version+1)),{status:403});
      const stored=(await pool.query('SELECT encrypted_payload::text AS value FROM user_privacy_artifacts WHERE case_id=$1',[id])).rows[0].value;assert.ok(!stored.includes(target.email));
      const rectified=await support.create(token,{kind:'RECTIFY',summary:'Please correct my display name according to my request',fullName:'Corrected Display Name',requestId:randomUUID()});await claim(rectified.id);await reviews(rectified.id);row=(await workflows.detail(reviewer,rectified.id)).record;await workflows.action(reviewer,rectified.id,command(row.version,{action:'execute'}));assert.equal((await pool.query('SELECT full_name FROM users WHERE id=$1',[target.id])).rows[0].full_name,'Corrected Display Name');
    });
    await t.test('011 shared IP/contact signals are investigation only and never merge or suspend',async()=>{
      await pool.query("INSERT INTO security_events(user_id,action,ip) VALUES($1,'login_success','192.0.2.12'),($2,'login_success','192.0.2.12')",[target.id,other.id]);
      const result=await users.signals(admin,target.id);assert.ok(result.items.some(row=>row.id===other.id&&row.sharedIp));assert.doesNotMatch(JSON.stringify(result),/192\.0\.2\.12/);assert.equal((await users.workspace(admin,target.id)).record.status,'active');
      await assert.rejects(users.signals(member,target.id),{status:403});
    });
    await t.test('010 anonymization checks open obligations, preserves order identity and waits for asset deletion',async()=>{
      const token=await proof(target),{id}=await support.create(token,{kind:'ANONYMIZE',summary:'Please anonymize my account after reviewing retention exceptions',requestId:randomUUID()});await claim(id);await reviews(id);let row=(await workflows.detail(reviewer,id)).record;
      users.remote=async()=>({});await assert.rejects(workflows.action(reviewer,id,command(row.version,{action:'execute'}),'Bearer test'),{code:'USER_SOURCE_INVALID'});
      users.remote=async()=>({activeOrders:1,openCases:0,pendingRefunds:0,totalOrders:1,ownedStores:1});await assert.rejects(workflows.action(reviewer,id,command(row.version,{action:'execute'}),'Bearer test'),{code:'OPEN_OBLIGATIONS'});
      users.remote=async()=>({activeOrders:0,openCases:0,pendingRefunds:0,totalOrders:1,ownedStores:1});await pool.query('UPDATE user_profiles SET avatar_key=$2 WHERE user_id=$1',[target.id,'private-test-avatar']);
      await workflows.action(reviewer,id,command(row.version,{action:'execute'}),'Bearer test');assert.equal((await workflows.detail(reviewer,id)).record.status,'WAITING_CLEANUP');
      const after=(await pool.query('SELECT email,status,anonymized_at FROM users WHERE id=$1',[target.id])).rows[0];assert.ok(after.email.endsWith('@deleted.invalid'));assert.equal(after.status,'suspended');assert.ok(after.anonymized_at);
      const order=(await pool.query('SELECT user_id,shipping_address_json FROM order_service.orders WHERE id=$1',[orderId])).rows[0];assert.equal(order.user_id,target.id);assert.equal(order.shipping_address_json.receiverName,'Traceable buyer');
      const receipt=await support.state(token);assert.equal(receipt.receiptOnly,true);assert.equal(receipt.cases.find(row=>row.id===id).retention.length,6);
      await assert.rejects(support.create(token,{kind:'ACCESS',summary:'A read-only receipt cannot submit another request',requestId:randomUUID()}),{status:401});
      await assert.rejects(workflows.ownArtifact(token,id),{status:401});
      profiles.avatarStorage={remove:async()=>{throw Error('storage down');}};await worker.cleanup();assert.equal((await workflows.detail(reviewer,id)).record.status,'WAITING_CLEANUP');
      profiles.avatarStorage={remove:async()=>{}};await worker.cleanup();assert.equal((await workflows.detail(reviewer,id)).record.status,'COMPLETED');
    });
    await t.test('HTTP user routes protect private data, support headers and exact write origin',async()=>{
      const fake=Object.create(identity);fake.authenticate=async header=>{if(!header)return identity.authenticate(header);return {user:header==='Bearer admin'?admin:member};};
      const server=http.createServer(createRequestHandler(fake,profiles,config));await new Promise(done=>server.listen(0,'127.0.0.1',done));const base=`http://127.0.0.1:${server.address().port}/api/v2`;
      try{
        assert.equal((await fetch(`${base}/admin/users/${pending.id}/workspace`)).status,401);
        const response=await fetch(`${base}/admin/users/${pending.id}/workspace`,{headers:{Authorization:'Bearer admin'}});assert.equal(response.status,200);assert.doesNotMatch(JSON.stringify(await response.json()),/password_hash|token_hash|code_hash/);
        assert.equal((await fetch(`${base}/admin/users/${pending.id}/sessions`,{headers:{Authorization:'Bearer support'}})).status,403);
        assert.equal((await fetch(`${base}/admin/users/${pending.id}/contact`,{method:'POST',headers:{Authorization:'Bearer admin',Origin:'https://foreign.example','Content-Type':'application/json'},body:JSON.stringify(command(await version(pending.id)))})).status,403);
        const preflight=await fetch(`${base}/account-support/state`,{method:'OPTIONS',headers:{Origin:config.frontendOrigin}});assert.ok(preflight.headers.get('access-control-allow-headers').includes('X-Account-Support-Token'));
        assert.equal((await fetch(`${base}/account-support/state`,{headers:{'X-Account-Support-Token':'invalid'}})).status,401);
      }finally{await new Promise(done=>server.close(done));}
    });
  }finally{
    await pool.query('DELETE FROM user_workflow_cases WHERE user_id=ANY($1::uuid[])',[fixtures]);
    await pool.query('DELETE FROM users WHERE id=ANY($1::uuid[])',[fixtures]);
    await pool.query('DELETE FROM user_admin_events WHERE user_reference=ANY($1::uuid[]) OR actor_reference=ANY($1::uuid[])',[fixtures]);
    await pool.query('DELETE FROM admin_commands WHERE actor_id=ANY($1::uuid[])',[fixtures]);
    await pool.query('DELETE FROM platform_admin_actions WHERE target_id=ANY($1::uuid[]) OR actor_reference=ANY($1::uuid[])',[fixtures]);
    await pool.query("DELETE FROM auth_rate_limits WHERE bucket LIKE '%:ip:127.0.0.1'");
    if(orderId)await pool.query('DELETE FROM order_service.orders WHERE id=$1',[orderId]);if(groupId)await pool.query('DELETE FROM order_service.order_groups WHERE id=$1',[groupId]);if(quoteId)await pool.query('DELETE FROM order_service.checkout_quotes WHERE id=$1',[quoteId]);if(storeId)await pool.query('DELETE FROM catalog.stores WHERE id=$1',[storeId]);
    await repo.close();
  }
});
