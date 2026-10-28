import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import pg from 'pg';
import http from 'node:http';
import {StoreService} from '../src/store.service.js';
import {StoreGovernanceService} from '../src/store-governance.service.js';
import {CatalogAdminService} from '../src/platform-admin.service.js';
import {storeOrderImpact} from '../../order-service/src/store-admin.service.js';
import {storeRatingSummary} from '../../engagement-service/src/store-admin.service.js';
import {effectiveAdminAccess} from '../../../packages/contracts/admin-rbac.js';
const actor=(role='moderator',scope={})=>{const id=randomUUID();return {id,adminAccess:effectiveAdminAccess([{role,scope}],id)};};
const command=(version,extra={})=>({version,reason:'Căn cứ kiểm tra hồ sơ cửa hàng',requestId:randomUUID(),...extra});
test('store governance PostgreSQL acceptance',{skip:!process.env.ADMIN_STORE_TEST_DATABASE_URL},async t=>{
  const pool=new pg.Pool({connectionString:process.env.ADMIN_STORE_TEST_DATABASE_URL});
  // Roll back fixtures through one connection; committed service transactions use savepoints.
  const db=await pool.connect();await db.query('BEGIN');let savepoint=0;
  const txPool={query:(...args)=>db.query(...args),connect:async()=>{
    const name=`store_test_${++savepoint}`;return {release(){},query:(sql,args)=>db.query(sql==='BEGIN'?`SAVEPOINT ${name}`:sql==='COMMIT'?`RELEASE SAVEPOINT ${name}`:sql==='ROLLBACK'?`ROLLBACK TO SAVEPOINT ${name}`:sql,args)};
  }};
  const stores=new StoreService(txPool,{approvalRequired:false}),gov=new StoreGovernanceService(stores),admin=new CatalogAdminService(txPool);
  const owner={id:randomUUID(),emailVerifiedAt:new Date().toISOString()},moderator=actor(),reviewer=actor();
  const make=()=>stores.create(owner,{name:`Store ${randomUUID().slice(0,8)}`,contactEmail:'owner@example.test',contactPhone:'+84901234567',pickupAddress:'123 Test Street'});
  const version=async id=>Number((await db.query('SELECT admin_version FROM catalog.stores WHERE id=$1',[id])).rows[0].admin_version);
  try{
    await t.test('seller cannot clear platform block, paused intent survives restore, decisions delivered atomically',async()=>{
      const store=await make();await stores.settings(store.id,owner.id,{acceptingOrders:false});
      const cmd=command(await version(store.id),{action:'suspend'});const suspended=await admin.moderate(moderator,'stores',store.id,cmd);
      assert.deepEqual(await admin.moderate(moderator,'stores',store.id,cmd),suspended);
      await assert.rejects(stores.update(store.id,owner.id,{platformSuspended:false}),{status:400});
      await assert.rejects(stores.update(store.id,owner.id,{status:'active'}),{status:400});
      await assert.rejects(stores.settings(store.id,owner.id,{acceptingOrders:true}),{code:'PLATFORM_SUSPENDED'});
      await stores.update(store.id,owner.id,{name:'Seller edits blocked store'});
      await db.query("UPDATE catalog.stores SET status='active' WHERE id=$1",[store.id]);
      assert.equal((await stores.checkoutPolicy(store.id)).acceptingOrders,false);
      await assert.rejects(admin.moderate(moderator,'stores',store.id,command(suspended.version,{action:'restore'})),{code:'VERSION_CONFLICT'});
      await admin.moderate(moderator,'stores',store.id,command(await version(store.id),{action:'restore'}));
      const detail=await stores.manage(store.id,owner.id);assert.equal(detail.acceptingOrders,false);assert.equal(detail.status,'paused');
      const inbox=await gov.sellerRead(owner,store.id);assert.equal(inbox.decisions.length,2);assert.ok(inbox.decisions.every(d=>d.scope&&d.appeal_path==='/mystore'&&d.recipient_id===owner.id));
      await assert.rejects(gov.sellerRead({id:randomUUID()},store.id),{status:403});
      await stores.settings(store.id,owner.id,{acceptingOrders:true});assert.equal((await stores.checkoutPolicy(store.id)).acceptingOrders,true);
    });
    await t.test('approval queue, required reasons, immutable profiles and information request resubmission',async()=>{
      const gated=new StoreService(txPool,{approvalRequired:true}),workflow=new StoreGovernanceService(gated);
      const store=await gated.create(owner,{name:'Shop waiting approval',contactEmail:'verify@example.test',contactPhone:'+84901234567',pickupAddress:'123 Test Street'});
      assert.equal(store.status,'paused');assert.equal((await gated.checkoutPolicy(store.id)).acceptingOrders,false);
      assert.ok((await workflow.queue(moderator)).items.some(row=>row.id===store.id));
      const original=(await workflow.read(moderator,store.id)).profiles[0];
      await assert.rejects(workflow.command(moderator,store.id,command(0,{action:'review',decision:'APPROVED',profileVersionId:original.id,reason:''})),{status:400});
      await workflow.command(moderator,store.id,command(await version(store.id),{action:'review',decision:'NEEDS_INFORMATION',profileVersionId:original.id}));
      await gated.update(store.id,owner.id,{description:'Đã bổ sung thông tin theo yêu cầu'});
      await assert.rejects(workflow.command(moderator,store.id,command(await version(store.id),{action:'review',decision:'APPROVED',profileVersionId:original.id})),{code:'AWAITING_SELLER'});
      await workflow.sellerCommand(owner,store.id,{action:'resubmit',requestId:randomUUID()});
      const data=await workflow.read(moderator,store.id);assert.equal(data.profiles.length,2);assert.equal(data.profiles[1].profile.description,'');assert.equal(data.profiles[0].profile.description,'Đã bổ sung thông tin theo yêu cầu');
      assert.notEqual(data.profiles[0].profile.contactEmail,'verify@example.test');
      await assert.rejects(workflow.profileContact(moderator,store.id,{profileVersionId:data.profiles[0].id,reason:'Xem liên hệ để đối chiếu hồ sơ'}),{status:403});
      const contact=await workflow.profileContact(actor('system_admin'),store.id,{profileVersionId:data.profiles[0].id,reason:'Xem liên hệ để đối chiếu hồ sơ'});
      assert.equal(contact.contactEmail,'verify@example.test');assert.equal(contact.pickupAddress,'123 Test Street');
      assert.ok((await workflow.read(moderator,store.id)).events.some(event=>event.action==='profile_contact_view'));
      await assert.rejects(workflow.command(moderator,store.id,command(await version(store.id),{action:'review',decision:'APPROVED',profileVersionId:original.id})),{code:'PROFILE_VERSION_CONFLICT'});
      await workflow.command(moderator,store.id,command(await version(store.id),{action:'review',decision:'APPROVED',profileVersionId:data.profiles[0].id}));
      assert.equal((await gated.checkoutPolicy(store.id)).acceptingOrders,true);
    });
    await t.test('incident deduplication, remedy, independent appeal and idempotent seller submission',async()=>{
      const store=await make(),incidentKey=`case:${randomUUID()}`;
      await gov.command(moderator,store.id,command(await version(store.id),{action:'warning',incidentKey,remedyBy:new Date(Date.now()+86400000).toISOString()}));
      await assert.rejects(gov.command(moderator,store.id,command(await version(store.id),{action:'warning',incidentKey,remedyBy:new Date(Date.now()+86400000).toISOString()})),{code:'DUPLICATE_INCIDENT'});
      const data=await gov.read(moderator,store.id);const input={action:'appeal',decisionId:data.decisions[0].id,reason:'Đề nghị xem xét lại chứng cứ gốc',requestId:randomUUID()};
      const appeal=await gov.sellerCommand(owner,store.id,input);assert.deepEqual(await gov.sellerCommand(owner,store.id,input),appeal);
      await assert.rejects(gov.command(moderator,store.id,command(await version(store.id),{action:'appeal',appealId:appeal.id,outcome:'OVERTURNED'})),{code:'INDEPENDENT_REVIEW_REQUIRED'});
      await gov.command(reviewer,store.id,command(await version(store.id),{action:'appeal',appealId:appeal.id,outcome:'OVERTURNED'}));
      assert.equal((await gov.read(reviewer,store.id)).violations[0].status,'OVERTURNED');
    });
    await t.test('superseded appeal cannot lift a newer suspension',async()=>{
      const store=await make();
      await admin.moderate(moderator,'stores',store.id,command(await version(store.id),{action:'suspend'}));
      const decision=(await db.query('SELECT current_suspension_decision_id AS id FROM catalog.stores WHERE id=$1',[store.id])).rows[0];
      const appeal=await gov.sellerCommand(owner,store.id,{action:'appeal',decisionId:decision.id,reason:'Đề nghị xét lại quyết định đình chỉ ban đầu',requestId:randomUUID()});
      await admin.moderate(reviewer,'stores',store.id,command(await version(store.id),{action:'restore'}));
      await admin.moderate(moderator,'stores',store.id,command(await version(store.id),{action:'suspend'}));
      await assert.rejects(gov.command(reviewer,store.id,command(await version(store.id),{action:'appeal',appealId:appeal.id,outcome:'OVERTURNED'})),{code:'SUPERSEDED_DECISION'});
      assert.equal((await stores.manage(store.id,owner.id)).platformSuspended,true);
    });
    await t.test('appeal of platform suspension preserves seller pause; scope cannot escape',async()=>{
      const store=await make();await stores.settings(store.id,owner.id,{acceptingOrders:false});
      await admin.moderate(moderator,'stores',store.id,command(await version(store.id),{action:'suspend'}));
      const decision=(await gov.sellerRead(owner,store.id)).decisions[0];
      const appeal=await gov.sellerCommand(owner,store.id,{action:'appeal',decisionId:decision.id,reason:'Yêu cầu kiểm tra lại quyết định',requestId:randomUUID()});
      await gov.command(reviewer,store.id,command(await version(store.id),{action:'appeal',appealId:appeal.id,outcome:'OVERTURNED'}));
      const detail=await stores.manage(store.id,owner.id);assert.equal(detail.platformSuspended,false);assert.equal(detail.status,'paused');
      const scoped=actor('moderator',{storeIds:[randomUUID()]});await assert.rejects(gov.read(scoped,store.id),{status:403});
      await assert.rejects(storeOrderImpact(txPool,scoped,store.id),{status:403});
      await assert.rejects(storeRatingSummary(txPool,scoped,store.id),{status:403});
    });
    await t.test('empty performance is explicit and source failure prevents suspension',async()=>{
      const store=await make(),impact=await storeOrderImpact(txPool,moderator,store.id);
      assert.equal(impact.open_orders,0);assert.equal(impact.sellerCancellationRate,null);
      assert.equal((await storeRatingSummary(txPool,moderator,store.id)).average_rating,null);
      const guarded=new CatalogAdminService(txPool,null,{impactLoader:async()=>{throw Object.assign(Error('Unavailable'),{status:503});}});
      await assert.rejects(guarded.moderate(moderator,'stores',store.id,command(0,{action:'suspend'})),{status:503});
      assert.equal((await stores.manage(store.id,owner.id)).platformSuspended,false);
    });
    await t.test('real order cohorts, seller attribution, hidden reviews, badge eligibility, revocation and expiry',async()=>{
      const store=await make(),buyer=randomUUID(),quote=randomUUID(),group=randomUUID();
      await db.query("INSERT INTO order_service.checkout_quotes(id,user_id,cart_version,quote_json) VALUES($1,$2,0,'{}')",[quote,buyer]);
      await db.query('INSERT INTO order_service.order_groups(id,buyer_id,grand_total_minor,current_total_minor) VALUES($1,$2,10300,10300)',[group,buyer]);
      await db.query(`INSERT INTO order_service.orders(user_id,store_id,quote_id,group_id,status,payment_method,subtotal_minor,shipping_estimate_minor,payable_total_minor,shipping_address_json,store_snapshot_json)
        SELECT $1,$2,$3,$4,'COMPLETED','COD',100,0,100,'{}','{"name":"Original store snapshot"}' FROM generate_series(1,100)`,[buyer,store.id,quote,group]);
      const ids=[];
      for(const status of ['PLACED','CANCELLED','CANCELLED'])ids.push((await db.query(`INSERT INTO order_service.orders(user_id,store_id,quote_id,group_id,status,payment_method,subtotal_minor,shipping_estimate_minor,payable_total_minor,shipping_address_json,created_at)
        VALUES($1,$2,$3,$4,$5,'COD',100,0,100,'{}',now()-interval '3 days') RETURNING id`,[buyer,store.id,quote,group,status])).rows[0].id);
      await db.query("INSERT INTO order_service.order_status_history(shop_order_id,to_status,actor_type) VALUES($1,'CANCEL_PENDING','seller'),($2,'CANCEL_PENDING','buyer')",[ids[1],ids[2]]);
      await db.query(`INSERT INTO engagement.reviews(buyer_id,product_id,order_item_id,store_id,rating,title,content)
        SELECT $1,gen_random_uuid(),gen_random_uuid(),$2,5,'Good shop','Review with enough content' FROM generate_series(1,30)`,[buyer,store.id]);
      await db.query(`INSERT INTO engagement.reviews(buyer_id,product_id,order_item_id,store_id,rating,title,content,status)
        VALUES($1,gen_random_uuid(),gen_random_uuid(),$2,1,'Hidden review','Hidden review content','HIDDEN')`,[buyer,store.id]);
      const impact=await storeOrderImpact(txPool,moderator,store.id,{preset:'30d'}),ratings=await storeRatingSummary(txPool,moderator,store.id,{preset:'30d'});
      assert.equal(impact.open_orders,1);assert.equal(impact.overdue_orders,1);assert.equal(impact.period_orders,103);assert.equal(impact.seller_cancelled,1);assert.equal(impact.sellerCancellationRate,1/103);assert.equal(impact.completed_orders,100);
      assert.equal(ratings.review_count,30);assert.equal(ratings.average_rating,5);
      const badges=new StoreGovernanceService(stores,{reputationLoader:async()=>({impact,ratings})});
      await badges.command(moderator,store.id,command(await version(store.id),{action:'badge-award'}));
      assert.equal((await stores.publicBySlug(store.slug)).reputationBadge.label,'Shop uy tín');
      const failedRecheck=new StoreGovernanceService(stores,{reputationLoader:async()=>({impact,ratings:{review_count:30,average_rating:4}})});
      assert.equal((await failedRecheck.command(moderator,store.id,command(await version(store.id),{action:'badge-award'}))).eligible,false);
      assert.equal((await stores.publicBySlug(store.slug)).reputationBadge,null);
      await badges.command(moderator,store.id,command(await version(store.id),{action:'badge-award'}));
      await db.query("UPDATE catalog.stores SET reputation_badge_until=now()-interval '1 second' WHERE id=$1",[store.id]);
      assert.equal((await stores.publicBySlug(store.slug)).reputationBadge,null);
      await badges.command(moderator,store.id,command(await version(store.id),{action:'badge-award'}));
      await gov.command(moderator,store.id,command(await version(store.id),{action:'warning',incidentKey:`case:${randomUUID()}`,remedyBy:new Date(Date.now()+86400000).toISOString()}));
      assert.equal((await stores.publicBySlug(store.slug)).reputationBadge,null);
      await assert.rejects(badges.command(moderator,store.id,command(await version(store.id),{action:'badge-award'})),{code:'BADGE_CRITERIA_NOT_MET'});
      await assert.rejects(stores.update(store.id,owner.id,{reputationBadgeUntil:'2099-01-01'}),{status:400});
    });
    await t.test('ownership disabled by default; verified transfer requires independent reviewer and preserves orders',async()=>{
      const store=await make(),targetId=randomUUID(),approver=actor('system_admin');
      const before=(await db.query(`INSERT INTO order_service.orders(user_id,store_id,quote_id,group_id,status,payment_method,subtotal_minor,shipping_estimate_minor,payable_total_minor,shipping_address_json,store_snapshot_json)
        SELECT user_id,$1,quote_id,group_id,'COMPLETED','COD',100,0,100,'{}','{"name":"Preserved original owner snapshot"}' FROM order_service.orders LIMIT 1 RETURNING id,user_id,store_snapshot_json`,[store.id])).rows[0];
      await assert.rejects(gov.command(moderator,store.id,command(0,{action:'ownership',kind:'TRANSFER',targetUserId:targetId,verificationRef:`case:${randomUUID()}`})),{code:'POLICY_DISABLED'});
      const ownership=new StoreGovernanceService(stores,{ownershipEnabled:true,targetLoader:async()=>({id:targetId,status:'active',emailVerifiedAt:new Date().toISOString()})});
      const proposal=await ownership.command(moderator,store.id,command(await version(store.id),{action:'ownership',kind:'TRANSFER',targetUserId:targetId,verificationRef:`case:${randomUUID()}`}));
      const combined={...moderator,adminAccess:effectiveAdminAccess([{role:'moderator'},{role:'system_admin'}],moderator.id)};
      await assert.rejects(ownership.command(combined,store.id,command(await version(store.id),{action:'ownership-review',ownershipId:proposal.ownershipId,outcome:'APPROVED',verificationRef:`case:${randomUUID()}`})),{code:'INDEPENDENT_REVIEW_REQUIRED'});
      await ownership.command(approver,store.id,command(await version(store.id),{action:'ownership-review',ownershipId:proposal.ownershipId,outcome:'APPROVED',verificationRef:`case:${randomUUID()}`}));
      assert.equal((await admin.detail(approver,'stores',store.id)).record.ownerId,targetId);
      await assert.rejects(stores.update(store.id,owner.id,{description:'Former owner should not edit'}),{status:403});
      assert.equal((await stores.manage(store.id,targetId)).role,'owner');
      assert.deepEqual((await db.query('SELECT id,user_id,store_snapshot_json FROM order_service.orders WHERE id=$1',[before.id])).rows[0],before);
      const recipients=(await db.query("SELECT recipient_id FROM catalog.store_decisions WHERE store_id=$1 AND action='OWNERSHIP_APPROVED'",[store.id])).rows;
      assert.deepEqual(new Set(recipients.map(row=>row.recipient_id)),new Set([owner.id,targetId]));
      assert.equal((await db.query("SELECT count(*)::int AS n FROM catalog.store_outbox WHERE payload->>'storeId'=$1 AND event_type IN ('StoreMemberRemoved.v1','StoreMemberAdded.v1')",[store.id])).rows[0].n,2);
      await assert.rejects(ownership.command(actor('legacy_admin'),store.id,command(await version(store.id),{action:'ownership',kind:'RECOVERY',targetUserId:targetId,verificationRef:`case:${randomUUID()}`})),{status:403});
      await db.query("UPDATE catalog.store_members SET status='removed' WHERE store_id=$1 AND user_id=$2",[store.id,targetId]);
      const recovery=await ownership.command(moderator,store.id,command(await version(store.id),{action:'ownership',kind:'RECOVERY',targetUserId:targetId,verificationRef:`case:${randomUUID()}`}));
      await ownership.command(approver,store.id,command(await version(store.id),{action:'ownership-review',ownershipId:recovery.ownershipId,outcome:'APPROVED',verificationRef:`case:${randomUUID()}`}));
      assert.equal((await stores.manage(store.id,targetId)).role,'owner');
    });
    await t.test('HTTP origin, authorization, impact failure, replay and seller routes',async()=>{
      const store=await make();let currentActor=moderator,sourceFailure=true;
      const originalFetch=globalThis.fetch;
      globalThis.fetch=async(input,options)=>{
        const url=new URL(input);
        if(url.pathname==='/api/v2/auth/me')return Response.json({user:currentActor});
        if(url.port==='59993'&&url.pathname.endsWith('/impact'))return sourceFailure?Response.json({},{status:503}):Response.json(await storeOrderImpact(txPool,currentActor,store.id));
        if(url.port==='59994'&&url.pathname.endsWith('/report-summary'))return Response.json({storeId:store.id,total_reports:2,open_reports:1});
        return originalFetch(input,options);
      };
      process.env.CATALOG_ORDER_URL='http://127.0.0.1:59993';
      process.env.CATALOG_CHAT_URL='http://127.0.0.1:59994';
      const {createHandler}=await import('../src/server.js');
      const server=http.createServer(createHandler(stores));await new Promise(done=>server.listen(0,'127.0.0.1',done));
      const base=`http://127.0.0.1:${server.address().port}/api/v2`,origin=process.env.FRONTEND_ORIGIN||'http://localhost:5173';
      const request=(path,method='GET',body,auth=true,requestOrigin=origin)=>originalFetch(base+path,{method,headers:{Origin:requestOrigin,'Content-Type':'application/json',...(auth?{Authorization:'Bearer acceptance-token'}:{})},...(body?{body:JSON.stringify(body)}:{})});
      try{
        assert.equal((await request(`/admin/stores/${store.id}/governance`,'GET',null,false)).status,401);
        assert.equal((await request(`/admin/stores/${store.id}/governance`)).status,200);
        const cmd=command(await version(store.id),{action:'suspend'});
        assert.equal((await request(`/admin/stores/${store.id}/status`,'PATCH',cmd,true,'https://bad-origin.test')).status,403);
        assert.equal((await request(`/admin/stores/${store.id}/status`,'PATCH',cmd)).status,503);
        sourceFailure=false;assert.equal((await request(`/admin/stores/${store.id}/status`,'PATCH',cmd)).status,200);
        sourceFailure=true;assert.equal((await request(`/admin/stores/${store.id}/status`,'PATCH',cmd)).status,200);
        currentActor=owner;
        assert.equal((await request(`/seller/stores/${store.id}/governance`)).status,200);
        assert.equal((await request(`/seller/stores/${store.id}/settings`,'PATCH',{acceptingOrders:true})).status,409);
        assert.equal((await request(`/admin/stores/${store.id}/governance`)).status,403);
      }finally{globalThis.fetch=originalFetch;delete process.env.CATALOG_ORDER_URL;delete process.env.CATALOG_CHAT_URL;await new Promise(done=>server.close(done));}
    });
    await t.test('concurrent seller pause and platform suspension preserve both restrictions',async()=>{
      const actual=new StoreService(pool,{approvalRequired:false}),actualAdmin=new CatalogAdminService(pool);
      const store=await actual.create(owner,{name:'Concurrent pause test',contactEmail:'race@example.test',contactPhone:'+84901234567',pickupAddress:'123 Test Street'});
      const getVersion=async()=>Number((await pool.query('SELECT admin_version FROM catalog.stores WHERE id=$1',[store.id])).rows[0].admin_version);
      try{
        const results=await Promise.allSettled([actual.settings(store.id,owner.id,{acceptingOrders:false}),actualAdmin.moderate(moderator,'stores',store.id,command(0,{action:'suspend'}))]);
        assert.equal(results[0].status,'fulfilled');
        if(results[1].status==='rejected'){assert.equal(results[1].reason.code,'VERSION_CONFLICT');await actualAdmin.moderate(moderator,'stores',store.id,command(await getVersion(),{action:'suspend'}));}
        const blocked=await actual.manage(store.id,owner.id);assert.equal(blocked.platformSuspended,true);assert.equal(blocked.acceptingOrders,false);
        await actualAdmin.moderate(reviewer,'stores',store.id,command(await getVersion(),{action:'restore'}));
        assert.equal((await actual.checkoutPolicy(store.id)).acceptingOrders,false);
      }finally{
        await pool.query('UPDATE catalog.stores SET current_suspension_decision_id=NULL WHERE id=$1',[store.id]);
        await pool.query('DELETE FROM catalog.store_decisions WHERE store_id=$1',[store.id]);
        await pool.query('DELETE FROM catalog.store_profile_versions WHERE store_id=$1',[store.id]);
        await pool.query('DELETE FROM catalog.store_audit_logs WHERE store_id=$1',[store.id]);
        await pool.query('DELETE FROM catalog.platform_admin_actions WHERE target_id=$1',[store.id]);
        await pool.query("DELETE FROM catalog.admin_commands WHERE scope=$1",[`stores:${store.id}:status`]);
        await pool.query("DELETE FROM catalog.store_outbox WHERE payload->>'storeId'=$1",[store.id]);
        await pool.query('DELETE FROM catalog.stores WHERE id=$1',[store.id]);
      }
    });
  }finally{await db.query('ROLLBACK');db.release();await pool.end();}
});
