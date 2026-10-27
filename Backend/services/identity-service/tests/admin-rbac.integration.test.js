import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import http from 'node:http';
import pg from 'pg';
import {IdentityRepository} from '../src/models/identity.model.js';
import {IdentityService} from '../src/services/identity.service.js';
import {AdminAccessService,loadAdminAccess} from '../src/services/admin-access.service.js';
import {createRequestHandler} from '../src/routes/index.js';
import {OrderService} from '../../order-service/src/service.js';
import {OrderAdminService} from '../../order-service/src/platform-admin.service.js';
import {ReturnService} from '../../order-service/src/return.service.js';
import {ReturnAdminService} from '../../order-service/src/return-admin.service.js';
import {CaseService} from '../../order-service/src/case.service.js';
import {AdminApprovalService} from '../../order-service/src/admin-approval.service.js';
import {CatalogAdminService} from '../../catalog-service/src/platform-admin.service.js';

test('RBAC PostgreSQL/HTTP: live permissions, query scopes and independent approvals',
  {skip:!process.env.ADMIN_RBAC_TEST_DATABASE_URL},async t=>{
  const url=new URL(process.env.ADMIN_RBAC_TEST_DATABASE_URL);if(!url.pathname.endsWith('_test'))throw Error('Dedicated *_test database required');
  const pool=new pg.Pool({connectionString:url.href}),repo=new IdentityRepository(url.href),access=new AdminAccessService(repo);
  const config={jwtSecret:'rbac-test-only-secret-at-least-thirty-two-characters',issuer:'identity-service',audience:'backend-v2',
    refreshDays:30,loginLimit:5,emailVerificationRequired:true,mailKey:Buffer.alloc(32),frontendOrigin:'http://localhost:5173',adminAuthorizationToken:process.env.ADMIN_AUTHORIZATION_TOKEN};
  const identity=new IdentityService({repository:repo,mailer:{},config}),server=http.createServer(createRequestHandler(identity,{},config));
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  const order=new OrderService(pool,'http://unused.invalid',base,'isolated-test-inventory-token');
  order.inventory=async()=>({platformSuspended:true,ownerId:randomUUID(),memberIds:[]});
  const returns=new ReturnService(order),returnAdmin=new ReturnAdminService(returns),approvals=new AdminApprovalService(order);
  const orders=new OrderAdminService(pool),cases=new CaseService(returns),catalog=new CatalogAdminService(pool);
  const users=[],fixtures=[],stores=[],groupIds=[],quoteIds=[];
  async function user(roles=[]){
    const id=randomUUID();users.push(id);
    await pool.query(`INSERT INTO users(id,email,full_name,password_hash,status,email_verified_at) VALUES($1,$2,'RBAC Test','unused-test-hash','active',now())`,[id,`${id}@example.test`]);
    await pool.query("INSERT INTO user_roles(user_id,role) VALUES($1,'platform_admin')",[id]);
    for(const role of roles)await pool.query('INSERT INTO admin_role_assignments(user_id,role) VALUES($1,$2)',[id,role]);
    return {id,roles:['platform_admin'],adminAccess:await loadAdminAccess(pool,id)};
  }
  async function refresh(actor){actor.adminAccess=await loadAdminAccess(pool,actor.id);return actor;}
  async function token(actor){const familyId=randomUUID();await repo.createSession({userId:actor.id,familyId,tokenHash:randomUUID(),device:'RBAC Test',expiresAt:new Date(Date.now()+3600000)});return identity.access(actor.id,familyId);}
  async function fixture(actor,{status='UNDER_REVIEW',storeId=randomUUID()}={}){
    const [id,orderId,quoteId,groupId,itemId]=Array.from({length:5},()=>randomUUID());
    const buyerId=randomUUID();fixtures.push({id,orderId,itemId});quoteIds.push(quoteId);groupIds.push(groupId);
    await pool.query("INSERT INTO order_service.checkout_quotes(id,user_id,cart_version,quote_json) VALUES($1,$2,0,'{}')",[quoteId,buyerId]);
    await pool.query('INSERT INTO order_service.order_groups(id,buyer_id,grand_total_minor,current_total_minor) VALUES($1,$2,120000,120000)',[groupId,buyerId]);
    await pool.query(`INSERT INTO order_service.orders(id,user_id,store_id,quote_id,group_id,status,payment_method,subtotal_minor,shipping_estimate_minor,payable_total_minor,shipping_address_json,store_snapshot_json)
      VALUES($1,$2,$3,$4,$5,'DELIVERED','COD',100000,20000,120000,'{}','{"name":"RBAC Test Store"}')`,[orderId,buyerId,storeId,quoteId,groupId]);
    await pool.query(`INSERT INTO order_service.order_items(id,order_id,variant_id,product_id,sku,product_name,quantity,unit_price_minor,line_total_minor,reservation_id)
      VALUES($1,$2,$3,$4,'RBAC','RBAC Test Item',2,50000,100000,$5)`,[itemId,orderId,randomUUID(),randomUUID(),randomUUID()]);
    await pool.query(`INSERT INTO order_service.return_requests(id,shop_order_id,buyer_id,store_id,reason,reason_code,resolution,status,eligible_refund_minor,shipping_refund_minor)
      VALUES($1,$2,$3,$4,'Test damaged product','DAMAGED','REFUND',$5,120000,20000)`,[id,orderId,buyerId,storeId,status]);
    await pool.query('UPDATE order_service.admin_cases SET assignee_id=$2 WHERE id=$1',[id,actor.id]);
    await pool.query('INSERT INTO order_service.return_items(request_id,order_item_id,quantity,eligible_refund_minor) VALUES($1,$2,2,100000)',[id,itemId]);
    return {id,orderId,storeId,buyerId,version:1};
  }
  const proposal=f=>({operation:'return_approve',targetId:f.id,version:f.version,reason:'Approve the validated financial return request',requestId:randomUUID()});
  const review={version:1,action:'approve',reason:'Independent review confirms the exact financial snapshot'};
  const decision=approvalId=>({action:'approve',version:1,reason:'Execute the independently approved return decision',approvalId,
    responsibleParty:'SELLER',policyVersion:'CASE_RESOLUTION_V1',basisSummary:'Submitted facts support accepting this test return.',evidenceRefs:[]});
  let sys,maker,reviewer,support,editor;
  try{
    sys=await user(['system_admin']);maker=await user(['finance']);reviewer=await user(['finance']);support=await user(['customer_support']);editor=await user(['content_editor']);
    await t.test('001 future generic platform_admin has no permissions or portal access',async()=>{
      const bare=await user();assert.deepEqual(bare.adminAccess.permissions,[]);
      const result=await fetch(base+'/api/v2/admin/identity/summary',{headers:{Authorization:'Bearer '+await token(bare)}});
      assert.equal(result.status,403);
    });
    await t.test('002 HTTP denies support financial approval and editors staff administration',async()=>{
      const {createHandler}=await import('../../order-service/src/server.js');
      const api=http.createServer(createHandler(order,undefined,returns));await new Promise(resolve=>api.listen(0,'127.0.0.1',resolve));
      try{
        const headers={Authorization:'Bearer '+await token(support),'Content-Type':'application/json',Origin:process.env.FRONTEND_ORIGIN||config.frontendOrigin};
        const result=await fetch(`http://127.0.0.1:${api.address().port}/api/v2/admin/returns/${randomUUID()}/decisions`,{method:'POST',headers,body:JSON.stringify({action:'approve',version:1,reason:'Support must not approve financial returns'})});
        assert.equal(result.status,403);assert.equal((await result.json()).code,'ADMIN_PERMISSION_REQUIRED');
        const denied=await fetch(base+`/api/v2/admin/staff/${maker.id}/access`,{headers:{Authorization:'Bearer '+await token(editor)}});assert.equal(denied.status,403);
      }finally{await new Promise(resolve=>api.close(resolve));}
    });
    await t.test('004/009 role changes revoke access and refresh sessions, preserve provenance and reject self changes',async()=>{
      const target=await user(['operations']),bearer=await token(target);
      assert.equal((await fetch(base+'/api/v2/auth/me',{headers:{Authorization:'Bearer '+bearer}})).status,200);
      const before=await access.preview(sys,target.id);assert.ok(before.access.grants.some(g=>g.permission==='orders.read'&&g.role==='operations'));
      const result=await access.replace(sys,target.id,{assignments:[{role:'content_editor',scope:{}}],version:before.version,reason:'Reassign this test employee to content editing',requestId:randomUUID()});
      assert.equal(result.version,1);
      assert.equal((await fetch(base+'/api/v2/auth/me',{headers:{Authorization:'Bearer '+bearer}})).status,401);
      assert.equal((await repo.pool.query('SELECT count(*)::int AS n FROM refresh_sessions WHERE user_id=$1 AND revoked_at IS NULL',[target.id])).rows[0].n,0);
      await assert.rejects(access.replace(sys,target.id,{assignments:[],version:0,reason:'Stale permission version should be rejected',requestId:randomUUID()}),{code:'VERSION_CONFLICT'});
      await assert.rejects(access.replace(sys,sys.id.toUpperCase(),{assignments:[],version:0,reason:'Self assignment changes are not permitted',requestId:randomUUID()}),{code:'SELF_PERMISSION_CHANGE'});
      assert.equal((await pool.query('SELECT count(*)::int AS n FROM admin_access_events WHERE target_reference=$1',[target.id])).rows[0].n,1);
    });
    await t.test('008 scope is enforced by SQL for lists, counts, details and conflicting client filters',async()=>{
      const first=await fixture(maker),second=await fixture(maker),scoped=await user(['operations']);
      await pool.query("UPDATE admin_role_assignments SET scope=$2 WHERE user_id=$1",[scoped.id,{storeIds:[first.storeId],caseKinds:['RETURN'],assigneeIds:[maker.id]}]);await refresh(scoped);
      const result=await cases.list(scoped,{kind:'RETURN'});assert.equal(result.total,1);assert.equal(result.items[0].id,first.id);
      assert.equal((await cases.list(scoped,{kind:'RETURN',storeId:second.storeId})).total,0);
      await assert.rejects(cases.detail(scoped,second.id),{status:404});
      assert.equal((await orders.list(scoped,{})).total,1);await assert.rejects(orders.detail(scoped,second.orderId),{status:404});
      // A second role contributes its own scope, without widening the first role.
      await pool.query("INSERT INTO admin_role_assignments(user_id,role,scope) VALUES($1,'moderator',$2)",[scoped.id,{storeIds:[second.storeId]}]);await refresh(scoped);
      assert.equal((await cases.list(scoped,{kind:'RETURN'})).total,2);
      assert.equal((await orders.list(scoped,{})).total,1);
      assert.equal((await returnAdmin.list(scoped,{})).total,1);
      for(const f of [first,second]){stores.push(f.storeId);await pool.query("INSERT INTO catalog.stores(id,owner_user_id,slug,name,status) VALUES($1,$2,$3,'Scoped RBAC store','active')",[f.storeId,randomUUID(),'rbac-'+f.storeId]);}
      const storeActor=await user(['operations']);await pool.query('UPDATE admin_role_assignments SET scope=$2 WHERE user_id=$1',[storeActor.id,{storeIds:[first.storeId]}]);await refresh(storeActor);
      assert.equal((await catalog.stores(storeActor,{})).total,1);await assert.rejects(catalog.detail(storeActor,'stores',second.storeId),{status:404});
      // Both dimensions must match the same case, rather than two different cases of one order.
      await pool.query('UPDATE order_service.admin_cases SET assignee_id=$2 WHERE id=$1',[first.id,reviewer.id]);
      const disputeId=randomUUID();fixtures.push({id:disputeId,orderId:first.orderId});
      await pool.query("INSERT INTO order_service.admin_cases(id,kind,shop_order_id,assignee_id,created_by) VALUES($1,'DISPUTE',$2,$3,$3)",[disputeId,first.orderId,maker.id]);
      await pool.query("INSERT INTO order_service.disputes(id,subject,description) VALUES($1,'Scoped test dispute','Another case of the same order')",[disputeId]);
      assert.equal((await orders.list(scoped,{})).total,0);
      await assert.rejects(cases.status(scoped,first.id,{status:'IN_PROGRESS',version:1,reason:'A reassigned case cannot be changed outside the granted scope'}),{status:404});
      const moderator=await user(['moderator']);
      await pool.query('UPDATE admin_role_assignments SET scope=$2 WHERE user_id=$1',[moderator.id,{storeIds:[first.storeId]}]);await refresh(moderator);
      const action={action:'suspend',version:0,reason:'Scoped moderation command for retry authorization test',requestId:randomUUID()};
      await catalog.moderate(moderator,'stores',first.storeId,action);
      await pool.query('UPDATE admin_role_assignments SET scope=$2 WHERE user_id=$1',[moderator.id,{storeIds:[second.storeId]}]);await refresh(moderator);
      await assert.rejects(catalog.moderate(moderator,'stores',first.storeId,action),{status:404});
    });
    await t.test('support order queries return only orders attached to assigned cases',async()=>{
      const assigned=await fixture(support),other=await fixture(maker),result=await orders.list(support,{});
      assert.equal(result.total,1);assert.equal(result.items[0].id,assigned.orderId);
      await assert.rejects(orders.detail(support,other.orderId),{status:404});
    });
    await t.test('005/007 independent review rejects self approval, stale amount, recipient and version',async()=>{
      const f=await fixture(maker),row=await approvals.create(maker,proposal(f));
      await assert.rejects(approvals.review(maker,row.id,review),{code:'SELF_APPROVAL_FORBIDDEN'});
      for(const [column,value,reset] of [['eligible_refund_minor',120001,120000],['buyer_id',randomUUID(),f.buyerId],['version',2,1]]){
        await pool.query(`UPDATE order_service.return_requests SET ${column}=$2 WHERE id=$1`,[f.id,value]);
        await assert.rejects(approvals.review(reviewer,row.id,review),{code:'APPROVAL_STALE'});
        await pool.query(`UPDATE order_service.return_requests SET ${column}=$2 WHERE id=$1`,[f.id,reset]);
      }
      assert.equal((await approvals.review(reviewer,row.id,review)).status,'APPROVED');
    });
    await t.test('006 revoking creator before review and approver before execution blocks the next step',async()=>{
      const f=await fixture(maker),row=await approvals.create(maker,proposal(f));
      await pool.query("DELETE FROM admin_role_assignments WHERE user_id=$1 AND role='finance'",[maker.id]);
      await assert.rejects(approvals.review(reviewer,row.id,review),{code:'ADMIN_PERMISSION_REQUIRED'});
      await pool.query("INSERT INTO admin_role_assignments(user_id,role) VALUES($1,'finance')",[maker.id]);
      await approvals.review(reviewer,row.id,review);
      await pool.query("DELETE FROM admin_role_assignments WHERE user_id=$1 AND role='finance'",[reviewer.id]);
      await assert.rejects(returnAdmin.decide(maker,f.id,decision(row.id)),{code:'ADMIN_PERMISSION_REQUIRED'});
      assert.equal((await pool.query('SELECT status FROM order_service.return_requests WHERE id=$1',[f.id])).rows[0].status,'UNDER_REVIEW');
      assert.equal((await pool.query('SELECT status FROM order_service.admin_approvals WHERE id=$1',[row.id])).rows[0].status,'APPROVED');
      await pool.query("INSERT INTO admin_role_assignments(user_id,role) VALUES($1,'finance')",[reviewer.id]);
      assert.equal((await returnAdmin.decide(maker,f.id,decision(row.id))).status,'APPROVED');
      assert.equal((await pool.query('SELECT status FROM order_service.admin_approvals WHERE id=$1',[row.id])).rows[0].status,'EXECUTED');
      await assert.rejects(returnAdmin.decide(maker,f.id,decision(row.id)),{code:'RETURN_STATE_CHANGED'});
    });
    await t.test('005 thresholds are configurable, versioned, audited and invalidate previous approvals',async()=>{
      const f=await fixture(maker),row=await approvals.create(maker,proposal(f));
      await approvals.review(reviewer,row.id,review);
      const policy=(await approvals.policies(sys)).items.find(p=>p.operation==='return_approve');
      await approvals.updatePolicy(sys,'return_approve',{version:policy.version,thresholdMinor:1,reason:'Update isolated approval threshold for policy invalidation'});
      await assert.rejects(returnAdmin.decide(maker,f.id,decision(row.id)),{code:'APPROVAL_STALE'});
      await assert.rejects(approvals.updatePolicy(sys,'return_approve',{version:policy.version,thresholdMinor:0,reason:'Stale approval policy writes must be rejected'}),{code:'VERSION_CONFLICT'});
      await approvals.updatePolicy(sys,'return_approve',{version:policy.version+1,thresholdMinor:0,reason:'Restore conservative threshold for subsequent test cases'});
      const unapproved=await fixture(maker);await assert.rejects(returnAdmin.decide(maker,unapproved.id,decision(undefined)),{code:'INDEPENDENT_APPROVAL_REQUIRED'});
    });
    await t.test('006 refund worker and Payment context recheck approval permissions before any provider request',async()=>{
      const f=await fixture(maker),approval=await approvals.create(maker,proposal(f));await approvals.review(reviewer,approval.id,review);
      await returnAdmin.decide(maker,f.id,decision(approval.id));
      await pool.query("UPDATE order_service.return_requests SET status='REFUND_PENDING',version=version+2 WHERE id=$1",[f.id]);
      await pool.query("UPDATE order_service.orders SET payment_method='MOMO',payment_status='PAID' WHERE id=$1",[f.orderId]);
      await pool.query("INSERT INTO order_service.return_inspections(request_id,actor_type,condition,note) VALUES($1,'ADMIN','ACCEPTED','Verified test receipt')",[f.id]);
      await returns.refundContext(f.id);
      await pool.query("DELETE FROM admin_role_assignments WHERE user_id=$1 AND role='finance'",[reviewer.id]);
      const worker=new ReturnService(order,{paymentToken:'test-provider-dispatch-must-not-be-called',paymentUrl:'http://unused.invalid'});
      await assert.rejects(worker.triggerRefund(f.id),{code:'ADMIN_PERMISSION_REQUIRED'});
      await assert.rejects(returns.refundContext(f.id),{code:'ADMIN_PERMISSION_REQUIRED'});
      await pool.query("INSERT INTO admin_role_assignments(user_id,role) VALUES($1,'finance')",[reviewer.id]);
      const row=(await pool.query('SELECT * FROM order_service.return_requests WHERE id=$1',[f.id])).rows[0];await returns.verifyAdminRefundAuthorization(row);
      await assert.rejects(returns.verifyAdminRefundAuthorization({...row,eligible_refund_minor:120001}),{code:'APPROVAL_STALE'});
    });
    await t.test('005/007 exceptional refunds bind calculated amount and recipient before independent approval',async()=>{
      const f=await fixture(maker);
      await pool.query("UPDATE order_service.return_requests SET status='REJECTED',reservation_released_at=now() WHERE id=$1",[f.id]);
      await pool.query("INSERT INTO order_service.order_status_history(shop_order_id,to_status,actor_type,occurred_at) VALUES($1,'DELIVERED','system',$2)",[f.orderId,new Date(Date.now()-20*86400000)]);
      const payload={reason:'Damaged goods require a documented late return',reasonCode:'DAMAGED',resolution:'REFUND',items:[{orderItemId:(await pool.query('SELECT id FROM order_service.order_items WHERE order_id=$1',[f.orderId])).rows[0].id,quantity:1}]};
      const row=await cases.requestException(maker,{shopOrderId:f.orderId,payload,reason:'Documented reason to request an exception after the return window',clientRequestId:randomUUID()});
      await assert.rejects(cases.decideException(maker,row.id,{action:'approve',version:1,reason:'A creator cannot approve their own exceptional refund'}),{code:'EXCEPTION_SELF_APPROVAL'});
      await pool.query("DELETE FROM admin_role_assignments WHERE user_id=$1 AND role='finance'",[maker.id]);
      await assert.rejects(cases.decideException(reviewer,row.id,review),{code:'ADMIN_PERMISSION_REQUIRED'});
      await pool.query("INSERT INTO admin_role_assignments(user_id,role) VALUES($1,'finance')",[maker.id]);
      await pool.query('UPDATE order_service.order_items SET line_total_minor=line_total_minor+2 WHERE order_id=$1',[f.orderId]);
      await assert.rejects(cases.decideException(reviewer,row.id,review),{code:'EXCEPTION_SNAPSHOT_STALE'});
      await pool.query('UPDATE order_service.order_items SET line_total_minor=line_total_minor-2 WHERE order_id=$1',[f.orderId]);
      const result=await cases.decideException(reviewer,row.id,review);fixtures.push({id:result.returnRequest.id,orderId:f.orderId});
      assert.equal(result.returnRequest.eligibleRefundMinor,50000);
      assert.equal(result.returnRequest.exceptionId,row.id);
    });
    await t.test('approval receipt, business mutation and audit roll back together',async()=>{
      const f=await fixture(maker),row=await approvals.create(maker,proposal(f));await approvals.review(reviewer,row.id,review);
      const brokenPool={query:(...a)=>pool.query(...a),connect:async()=>{
        const db=await pool.connect();return {release:()=>db.release(),query:(sql,args)=>{if(sql.includes('INSERT INTO order_service.admin_return_actions'))throw Error('Test audit write failure');return db.query(sql,args);}};
      }};
      const brokenReturns=new ReturnService({...order,pool:brokenPool,adminActor:id=>order.adminActor(id)});
      await assert.rejects(new ReturnAdminService(brokenReturns).decide(maker,f.id,decision(row.id)),/Test audit write failure/);
      assert.equal((await pool.query('SELECT status FROM order_service.admin_approvals WHERE id=$1',[row.id])).rows[0].status,'APPROVED');
      assert.equal((await pool.query('SELECT status FROM order_service.return_requests WHERE id=$1',[f.id])).rows[0].status,'UNDER_REVIEW');
    });
    await t.test('concurrent retries create one proposal and permit only one execution',async()=>{
      const f=await fixture(maker),input=proposal(f),created=await Promise.all([approvals.create(maker,input),approvals.create(maker,input)]);
      assert.equal(created[0].id,created[1].id);await approvals.review(reviewer,created[0].id,review);
      const results=await Promise.allSettled([returnAdmin.decide(maker,f.id,decision(created[0].id)),returnAdmin.decide(maker,f.id,decision(created[0].id))]);
      assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
      assert.equal((await pool.query("SELECT count(*)::int AS n FROM order_service.admin_approval_events WHERE approval_id=$1 AND action='executed'",[created[0].id])).rows[0].n,1);
    });
    await t.test('unknown financial operation is denied until an execution adapter exists',async()=>{
      await assert.rejects(approvals.create(maker,{operation:'payout_account_change',targetId:randomUUID(),version:0,reason:'An unsupported module must never inherit permissions',requestId:randomUUID()}),{code:'INVALID_APPROVAL_OPERATION'});
    });
  }finally{
    try{
    await pool.query('DELETE FROM order_service.admin_approval_events WHERE actor_id=ANY($1::uuid[])',[users]);
    await pool.query('DELETE FROM order_service.admin_approvals WHERE created_by=ANY($1::uuid[])',[users]);
    const ids=fixtures.map(f=>f.id),orderIds=fixtures.map(f=>f.orderId);
    await pool.query('DELETE FROM order_service.order_outbox WHERE aggregate_id=ANY($1::uuid[])',[orderIds]);
    await pool.query('DELETE FROM order_service.return_history WHERE request_id=ANY($1::uuid[])',[ids]);
    await pool.query('DELETE FROM order_service.admin_return_actions WHERE request_id=ANY($1::uuid[])',[ids]);
    await pool.query('DELETE FROM order_service.admin_cases WHERE id=ANY($1::uuid[])',[ids]);
    await pool.query('DELETE FROM order_service.return_requests WHERE id=ANY($1::uuid[])',[ids]);
    await pool.query('DELETE FROM order_service.return_exception_actions WHERE exception_id IN (SELECT id FROM order_service.return_exceptions WHERE shop_order_id=ANY($1::uuid[]))',[orderIds]);
    await pool.query('DELETE FROM order_service.return_exceptions WHERE shop_order_id=ANY($1::uuid[])',[orderIds]);
    await pool.query('DELETE FROM order_service.order_items WHERE order_id=ANY($1::uuid[])',[orderIds]);
    await pool.query('DELETE FROM order_service.order_status_history WHERE shop_order_id=ANY($1::uuid[])',[orderIds]);
    await pool.query('DELETE FROM order_service.orders WHERE id=ANY($1::uuid[])',[orderIds]);
    await pool.query('DELETE FROM order_service.order_groups WHERE id=ANY($1::uuid[])',[groupIds]);
    await pool.query('DELETE FROM order_service.checkout_quotes WHERE id=ANY($1::uuid[])',[quoteIds]);
    await pool.query('DELETE FROM catalog.stores WHERE id=ANY($1::uuid[])',[stores]);
    await pool.query('DELETE FROM catalog.admin_commands WHERE actor_id=ANY($1::uuid[])',[users]);
    await pool.query('DELETE FROM catalog.platform_admin_actions WHERE target_id=ANY($1::uuid[])',[stores]);
    await pool.query("DELETE FROM catalog.store_outbox WHERE payload->>'storeId'=ANY($1::text[])",[stores]);
    await pool.query('DELETE FROM admin_access_events WHERE target_reference=ANY($1::uuid[])',[users]);
    await pool.query('DELETE FROM users WHERE id=ANY($1::uuid[])',[users]);
    }finally{await new Promise(resolve=>server.close(resolve));await pool.end();await repo.close();}
  }
});
