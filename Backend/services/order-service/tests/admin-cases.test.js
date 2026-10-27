import {testAdmin,syncTestAdmin} from './admin-fixture.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import http from 'node:http';
import pg from 'pg';
import sharp from 'sharp';
import {ReturnService,proratedRefund} from '../src/return.service.js';
import {ReturnAdminService} from '../src/return-admin.service.js';
import {CaseService} from '../src/case.service.js';
import {caseFilters} from '../src/case-contract.js';

const withBasis = command => ({responsibleParty:'UNDETERMINED',policyVersion:'CASE_RESOLUTION_V1',basisSummary:'Test fixture: assess the submitted facts and original return policy.',evidenceRefs:[],...command});

test('case queue validates typed status, assignee, deadline and SQL filter inputs',()=>{
  for(const query of [{kind:'UNKNOWN'},{kind:'TICKET',status:'APPROVED'},{kind:'DISPUTE',status:'IN_PROGRESS'},
    {reasonCode:'arbitrary'},{assigneeId:'invalid'},{due:'yesterday'},{actorId:randomUUID()},{from:'2026-02-30'}])
    assert.throws(()=>caseFilters(query),{status:400});
  assert.equal(caseFilters({kind:'DISPUTE',q:'50%_'},{id:randomUUID()}).pattern,'%50\\%\\_%');
  assert.equal(proratedRefund(Number.MAX_SAFE_INTEGER,3,2),Number(BigInt(Number.MAX_SAFE_INTEGER)*2n/3n));
});
test('case management and exceptional permissions deny buyers before SQL',async()=>{
  const service=new CaseService({pool:{query(){throw Error('Unexpected SQL');}}}),user={id:randomUUID(),roles:['buyer']},id=randomUUID();
  for(const run of [()=>service.list(user,{}),()=>service.detail(user,id),()=>service.create(user,{}),()=>service.assign(user,id,{}),
    ()=>service.requestInformation(user,id,{}),()=>service.requestException(user,{}),()=>service.decideException(user,id,{}),()=>service.issueEvidence(user,id,id,'Valid reason here')])
    await assert.rejects(run(),{status:403});
});

test('ADM-CASE-001..008 PostgreSQL workflows', {skip:!process.env.ADMIN_RETURNS_TEST_DATABASE_URL},async t=>{
  const url=new URL(process.env.ADMIN_RETURNS_TEST_DATABASE_URL);if(!url.pathname.endsWith('_test'))throw Error('Dedicated *_test database required');
  const pool=new pg.Pool({connectionString:url.href});const fixtureIds=[];
  const admin=testAdmin(),approver=testAdmin(),seller=randomUUID(),stranger=randomUUID();
  const order={pool,adminActor:id=>syncTestAdmin(pool,id===admin.id?admin:id===approver.id?approver:testAdmin(id)),inventory:async path=>{if(!path.endsWith(seller))throw Object.assign(Error('No membership'),{status:403});return {role:'owner'};},
    identity:async()=>({record:{id:approver.id,status:'active',roles:['platform_admin']},items:[{id:admin.id,name:'Test admin'},{id:approver.id,name:'Test approver'}]})};
  const returns=new ReturnService(order),cases=new CaseService(returns),returnAdmin=new ReturnAdminService(returns);
  const future=()=>new Date(Date.now()+3600000).toISOString();
  const payload=f=>({reason:'The delivered product was damaged',reasonCode:'DAMAGED',resolution:'REFUND',items:[{orderItemId:f.itemId,quantity:1}]});
  async function fixture(days=1,quantity=2){
    const [orderId,buyerId,storeId,groupId,quoteId,itemId]=Array.from({length:6},()=>randomUUID());
    const f={orderId,buyerId,storeId,groupId,quoteId,itemId,delivered:new Date(Date.now()-days*86400000)};fixtureIds.push(f);
    await pool.query(`INSERT INTO order_service.checkout_quotes(id,user_id,cart_version,quote_json) VALUES($1,$2,0,'{}')`,[quoteId,buyerId]);
    await pool.query(`INSERT INTO order_service.order_groups(id,buyer_id,grand_total_minor,current_total_minor) VALUES($1,$2,121,121)`,[groupId,buyerId]);
    await pool.query(`INSERT INTO order_service.orders(id,user_id,store_id,quote_id,group_id,status,payment_method,subtotal_minor,
      shipping_estimate_minor,payable_total_minor,shipping_address_json,store_snapshot_json)
      VALUES($1,$2,$3,$4,$5,'DELIVERED','COD',101,20,121,'{}',$6)`,[orderId,buyerId,storeId,quoteId,groupId,{name:`CASE-008 QA ${storeId}`}]);
    await pool.query(`INSERT INTO order_service.order_items(id,order_id,variant_id,product_id,sku,product_name,quantity,unit_price_minor,line_total_minor,reservation_id)
      VALUES($1,$2,$3,$4,'CASE-QA','Case QA item',$5,50,101,$6)`,[itemId,orderId,randomUUID(),randomUUID(),quantity,randomUUID()]);
    await pool.query(`INSERT INTO order_service.order_status_history(shop_order_id,to_status,actor_type,occurred_at) VALUES($1,'DELIVERED','system',$2)`,[orderId,f.delivered]);
    return f;
  }
  async function newReturn(f,quantity=1){return (await returns.create(f.buyerId,f.orderId,{...payload(f),items:[{orderItemId:f.itemId,quantity}]})).returnRequest.id;}
  async function grant(user,permission){await pool.query(`INSERT INTO order_service.case_permissions(user_id,permission,granted_by,reason)
    VALUES($1,$2,'test','Dedicated integration test permission') ON CONFLICT(user_id,permission) DO UPDATE SET revoked_at=NULL`,[user.id,permission]);await syncTestAdmin(pool,user);}
  async function take(id,user=admin){const detail=await cases.detail(user,id);return cases.assign(user,id,{assigneeId:user.id,dueAt:future(),version:detail.record.caseVersion,reason:'Assign case for scoped investigation'});}
  try{
    await t.test('005 CLI grants/revokes scoped permissions with an immutable operation history',async()=>{
      const userId=randomUUID(),script=fileURLToPath(new URL('../scripts/case-permission.mjs',import.meta.url));
      const input={userId,permission:'evidence.supervise',operator:'Case QA operator',reason:'Authorize the isolated evidence supervision test'};
      try{
        for(const action of ['grant','revoke']){
          const result=spawnSync(process.execPath,[script],{env:{...process.env,ORDER_DATABASE_URL:url.href},input:JSON.stringify({...input,action}),encoding:'utf8'});
          assert.equal(result.status,0,`Case permission ${action} CLI failed`);
        }
        assert.ok((await pool.query('SELECT revoked_at FROM order_service.case_permissions WHERE user_id=$1',[userId])).rows[0].revoked_at);
        assert.equal((await pool.query('SELECT count(*)::int AS n FROM order_service.case_permission_history WHERE user_id=$1',[userId])).rows[0].n,2);
        const moved=spawnSync(process.execPath,[script],{env:{...process.env,ORDER_DATABASE_URL:url.href},input:JSON.stringify({...input,permission:'exception.request',action:'grant'}),encoding:'utf8'});
        assert.notEqual(moved.status,0);assert.match(moved.stderr,/owned by Identity RBAC/);
        assert.equal((await pool.query("SELECT 1 FROM order_service.case_permissions WHERE user_id=$1 AND permission='exception.request'",[userId])).rowCount,0);
      }finally{await pool.query('DELETE FROM order_service.case_permission_history WHERE user_id=$1',[userId]);await pool.query('DELETE FROM order_service.case_permissions WHERE user_id=$1',[userId]);}
    });
    await t.test('001 list/filter returns and disputes by reason, shop, assignee, deadline and payment',async()=>{
      const f=await fixture(),id=await newReturn(f);await take(id);
      const filters={storeId:f.storeId,assigneeId:'me',reasonCode:'DAMAGED',due:'upcoming',paymentMethod:'COD'};
      assert.equal((await cases.list(admin,{...filters,kind:'RETURN'})).items[0].id,id);
      assert.equal((await returnAdmin.list(admin,{...filters})).total,1);
      assert.equal((await cases.list(admin,{...filters,assigneeId:'unassigned'})).total,0);
      await pool.query("UPDATE order_service.admin_cases SET due_at=now()-interval '1 hour' WHERE id=$1",[id]);
      assert.equal((await cases.list(admin,{...filters,due:'overdue'})).total,1);
      const dispute=await cases.create(admin,{kind:'DISPUTE',shopOrderId:f.orderId,subject:'Product delivery dispute',description:'Need to investigate damage in delivery',reasonCode:'DAMAGED',relatedCaseId:id,clientRequestId:randomUUID()});
      assert.equal((await cases.list(admin,{kind:'DISPUTE',storeId:f.storeId,reasonCode:'DAMAGED',assigneeId:'me'})).items[0].id,dispute.id);
    });
    await t.test('002 order item/money/context preserved, 003 separate ticket/dispute states and links',async()=>{
      const f=await fixture(),id=await newReturn(f),key=randomUUID();
      const input={kind:'TICKET',shopOrderId:f.orderId,subject:'Delivery support ticket',description:'Need more information about delivery',reasonCode:'SERVICE',relatedCaseId:id,clientRequestId:key};
      const [one,two]=await Promise.all([cases.create(admin,input),cases.create(admin,input)]);assert.equal(one.id,two.id);
      const ticket=await cases.detail(admin,one.id);assert.equal(ticket.record.status,'NEW');assert.equal(ticket.links[0].id,id);
      assert.equal(ticket.record.reasonCode,'SERVICE');assert.equal((await cases.list(admin,{kind:'TICKET',storeId:f.storeId,reasonCode:'SERVICE'})).items[0].id,one.id);
      await assert.rejects(cases.status(admin,one.id,{status:'INVESTIGATING',version:1,reason:'Wrong domain state must be rejected'}),{code:'INVALID_CASE_TRANSITION'});
      await cases.status(admin,one.id,{status:'IN_PROGRESS',version:1,reason:'Begin answering the support request'});
      assert.equal((await cases.detail(admin,one.id)).record.status,'IN_PROGRESS');
      await assert.rejects(cases.status(admin,id,{status:'CLOSED',version:1,reason:'Must not bypass return transitions'}),{code:'WRONG_CASE_COMMAND'});
      await assert.rejects(cases.create(admin,{...input,description:'Changed input with an already used key'}),{code:'CASE_KEY_REUSED'});
      const other=await fixture();await assert.rejects(cases.create(admin,{...input,clientRequestId:randomUUID(),shopOrderId:other.orderId}),{code:'INVALID_CASE_LINK'});
      const detail=await returnAdmin.detail(admin,id);assert.equal(detail.record.items[0].quantity,1);assert.equal(detail.record.eligibleRefundMinor,50);
    });
    await t.test('004 seven-day policy snapshots use first delivery and reject public bypass fields',async()=>{
      const f=await fixture(8);
      await pool.query(`INSERT INTO order_service.order_status_history(shop_order_id,to_status,actor_type,occurred_at) VALUES($1,'DELIVERED','system',now())`,[f.orderId]);
      await assert.rejects(returns.create(f.buyerId,f.orderId,{...payload(f),windowDays:365,exceptionId:randomUUID()}),{code:'RETURN_WINDOW_CLOSED'});
      const current=await fixture(6);const id=await newReturn(current);const result=await returnAdmin.detail(admin,id);
      assert.equal(result.record.windowDays,7);assert.equal(result.record.policyVersion,'RETURN_7D_V1');
      assert.equal(new Date(result.record.deliveredAt).getTime(),current.delivered.getTime());
      const futurePolicy='TEST_POLICY_'+randomUUID();
      await pool.query(`INSERT INTO order_service.return_policies(id,window_days,effective_at,description) VALUES($1,14,now()+interval '1 day','Future policy test')`,[futurePolicy]);
      try{assert.equal((await returnAdmin.detail(admin,id)).record.policyVersion,'RETURN_7D_V1');
        await assert.rejects(returns.create(f.buyerId,f.orderId,payload(f)),{code:'RETURN_WINDOW_CLOSED'});
      }finally{await pool.query('DELETE FROM order_service.return_policies WHERE id=$1',[futurePolicy]);}
    });
    await t.test('005 explicit permissions, independent approval, original delivery intact and no duplicate consumption',async()=>{
      const f=await fixture(10),input={shopOrderId:f.orderId,payload:payload(f),reason:'Approve consideration because seller supplied delayed evidence',clientRequestId:randomUUID()};
      await assert.rejects(cases.requestException(admin,input),{code:'ADMIN_PERMISSION_REQUIRED'});
      await grant(admin,'exception.request');await grant(admin,'exception.approve');await grant(approver,'exception.approve');
      const [one,two]=await Promise.all([cases.requestException(admin,input),cases.requestException(admin,input)]);assert.equal(one.id,two.id);
      await assert.rejects(cases.decideException(admin,one.id,{action:'approve',version:1,reason:'A requester cannot approve own exception'}),{code:'EXCEPTION_SELF_APPROVAL'});
      const result=await cases.decideException(approver,one.id,{action:'approve',version:1,reason:'Independent evidence confirms eligibility for exception'});
      assert.equal(result.returnRequest.exceptionId,one.id);assert.equal(result.returnRequest.policyVersion,'RETURN_7D_V1');
      assert.equal(new Date(result.returnRequest.deliveredAt).getTime(),f.delivered.getTime());
      await assert.rejects(cases.decideException(approver,one.id,{action:'approve',version:1,reason:'Duplicate approval must not create a second return'}),{code:'EXCEPTION_CHANGED'});
      assert.equal((await pool.query('SELECT count(*)::int AS n FROM order_service.return_requests WHERE exception_id=$1',[one.id])).rows[0].n,1);
      const audit=(await pool.query('SELECT * FROM order_service.return_exception_actions WHERE exception_id=$1 ORDER BY id',[one.id])).rows;
      assert.deepEqual(audit.map(row=>row.action),['requested','approved']);
      assert.equal(audit[1].read_version,1);assert.equal(audit[1].result_version,2);assert.equal(audit[1].next_status,'CONSUMED');
      assert.equal((await pool.query("SELECT min(occurred_at) AS time FROM order_service.order_status_history WHERE shop_order_id=$1 AND to_status='DELIVERED'",[f.orderId])).rows[0].time.getTime(),f.delivered.getTime());
    });
    await t.test('005 revoking requester or approver permission blocks pending approval',async()=>{
      const f=await fixture(9),input={shopOrderId:f.orderId,payload:payload(f),reason:'Exception permission will be rechecked before execution',clientRequestId:randomUUID()};
      const proposal=await cases.requestException(admin,input);
      await pool.query("UPDATE order_service.case_permissions SET revoked_at=now() WHERE user_id=$1 AND permission='exception.request'",[admin.id]);await syncTestAdmin(pool,admin);
      await assert.rejects(cases.decideException(approver,proposal.id,{action:'approve',version:1,reason:'Permission revocation must block this execution'}),{code:'ADMIN_PERMISSION_REQUIRED'});
      await grant(admin,'exception.request');
      await pool.query("UPDATE order_service.case_permissions SET revoked_at=now() WHERE user_id=$1 AND permission='exception.approve'",[approver.id]);await syncTestAdmin(pool,approver);
      await assert.rejects(cases.decideException(approver,proposal.id,{action:'approve',version:1,reason:'Revoked approver permission must block execution'}),{code:'ADMIN_PERMISSION_REQUIRED'});
      await grant(approver,'exception.approve');
      await cases.decideException(approver,proposal.id,{action:'reject',version:1,reason:'The exception cannot be justified from supplied evidence'});
      assert.equal((await pool.query('SELECT status FROM order_service.return_exceptions WHERE id=$1',[proposal.id])).rows[0].status,'REJECTED');
      assert.equal((await pool.query('SELECT count(*)::int AS n FROM order_service.return_requests WHERE shop_order_id=$1',[f.orderId])).rows[0].n,0);
    });
    await t.test('006 quantity/money bounds serialize concurrent requests and preserve rounding',async()=>{
      const f=await fixture();
      const results=await Promise.allSettled([newReturn(f,2),newReturn(f,2)]);assert.equal(results.filter(result=>result.status==='fulfilled').length,1);
      assert.equal((await returnAdmin.detail(admin,results.find(result=>result.status==='fulfilled').value)).record.eligibleRefundMinor,121);
      const partial=await fixture();const a=await newReturn(partial),b=await newReturn(partial);
      assert.equal((await returnAdmin.detail(admin,a)).record.eligibleRefundMinor+(await returnAdmin.detail(admin,b)).record.eligibleRefundMinor,101);
      await assert.rejects(newReturn(partial),{code:'INVALID_QUANTITY'});
      const paid=await fixture();await pool.query('UPDATE order_service.orders SET refunded_minor=100 WHERE id=$1',[paid.orderId]);
      await assert.rejects(newReturn(paid),{code:'REFUND_LIMIT'});
      const mixed=await fixture(1,3),first=await newReturn(mixed);
      await pool.query("UPDATE order_service.return_requests SET status='REFUND_PENDING' WHERE id=$1",[first]);await returns.markRefunded(first);
      await pool.query('UPDATE order_service.orders SET refunded_minor=33 WHERE id=$1',[mixed.orderId]);
      await returns.transition(mixed.buyerId,first,'close',{expectedVersion:2});
      const second=await newReturn(mixed),last=await newReturn(mixed);
      assert.equal((await returnAdmin.detail(admin,second)).record.eligibleRefundMinor,33);
      assert.equal((await returnAdmin.detail(admin,last)).record.eligibleRefundMinor,35);
    });
    await t.test('006 rejected then closed requests release quantities; confirmed refunds do not',async()=>{
      const f=await fixture(),id=await newReturn(f,2);
      await returnAdmin.decide(admin,id,{action:'review',version:1,reason:'Begin checking the return eligibility'});
      await returnAdmin.decide(admin,id,withBasis({action:'reject',version:2,reason:'This return request is rejected after checking'}));
      await pool.query("UPDATE order_service.case_decisions SET appeal_until=now()-interval '1 second' WHERE case_id=$1",[id]);
      await returns.transition(f.buyerId,id,'close',{expectedVersion:3});
      const replacement=await newReturn(f,2);assert.notEqual(replacement,id);
      await pool.query("UPDATE order_service.return_requests SET status='REFUNDED',refund_confirmed_at=now() WHERE id=$1",[replacement]);
      await assert.rejects(newReturn(f),{code:'INVALID_QUANTITY'});
    });
    await t.test('007 evidence scope, single-use TTL, wrong actor, expiry and reassignment revocation',async()=>{
      const f=await fixture(),id=await newReturn(f),imageId=randomUUID();
      await pool.query(`INSERT INTO order_service.return_evidence(id,request_id,actor_id,object_key,mime_type,data) VALUES($1,$2,$3,$4,'image/png',$5)`,[imageId,id,f.buyerId,`case-test/${imageId}`,Buffer.from('private bytes')]);
      await assert.rejects(cases.issueEvidence(admin,id,imageId,'Evidence access requires assignment'),{code:'CASE_NOT_ASSIGNED'});
      await take(id);const access=await cases.issueEvidence(admin,id,imageId,'Inspect evidence of this return case');const token=new URL(access.url,'http://test').searchParams.get('grant');
      assert.ok(Date.parse(access.expiresAt)-Date.now()<=60000);
      await assert.rejects(cases.evidence(approver,id,imageId,token),{status:403});
      await grant(approver,'evidence.supervise');
      await assert.rejects(cases.evidence(approver,id,imageId,token),{code:'EVIDENCE_GRANT_EXPIRED'});
      const bytes=await cases.evidence(admin,id,imageId,token);assert.equal(bytes.data.toString(),'private bytes');
      await assert.rejects(cases.evidence(admin,id,imageId,token),{code:'EVIDENCE_GRANT_EXPIRED'});
      const expiry=await cases.issueEvidence(admin,id,imageId,'Expired link must not return any bytes');const expiredToken=new URL(expiry.url,'http://test').searchParams.get('grant');
      await pool.query("UPDATE order_service.case_evidence_grants SET expires_at=now()-interval '1 second' WHERE token_hash=$1",[createHash('sha256').update(expiredToken).digest('hex')]);
      await assert.rejects(cases.evidence(admin,id,imageId,expiredToken),{code:'EVIDENCE_GRANT_EXPIRED'});
      const old=await cases.issueEvidence(admin,id,imageId,'Access is revoked when case changes owner');const oldToken=new URL(old.url,'http://test').searchParams.get('grant');
      const detail=await cases.detail(admin,id);await cases.assign(admin,id,{assigneeId:approver.id,dueAt:future(),reason:'Transfer the investigation to another administrator',version:detail.record.caseVersion},'test');
      await assert.rejects(cases.evidence(admin,id,imageId,oldToken),{code:'CASE_NOT_ASSIGNED'});
    });
    await t.test('007 evidence upload validates type/size and scans before storing',async()=>{
      const f=await fixture(),id=await newReturn(f);let scans=0;
      const upload=new ReturnService(order,{scanner:async()=>{scans++;}});
      await assert.rejects(upload.uploadEvidence(f.buyerId,id,Buffer.from('not an image'),'image/png'),{status:415});assert.equal(scans,0);
      const image=await sharp({create:{width:2,height:2,channels:3,background:'#4488ff'}}).png().toBuffer();
      await upload.uploadEvidence(f.buyerId,id,image,'image/png');assert.equal(scans,1);
      const infected=new ReturnService(order,{scanner:async()=>{throw Object.assign(Error('Infected'),{status:422});}});
      await assert.rejects(infected.uploadEvidence(f.buyerId,id,image,'image/png'),/Infected/);
      assert.equal((await pool.query('SELECT count(*)::int AS n FROM order_service.return_evidence WHERE request_id=$1',[id])).rows[0].n,1);
    });
    await t.test('008 immutable prompts/replies, recipient isolation, deadlines and notification outbox',async()=>{
      const f=await fixture(),id=await newReturn(f);
      await cases.requestInformation(admin,id,{recipientKind:'BUYER',prompt:'Please provide details about the damaged product',dueAt:future(),version:1});
      const detail=await cases.detail(admin,id),request=detail.informationRequests[0];assert.equal(detail.record.caseVersion,2);
      await assert.rejects(cases.reply(seller,id,request.id,{message:'A seller cannot reply to a buyer-only question',version:1}),{code:'INFORMATION_RECIPIENT_ONLY'});
      await assert.rejects(cases.participantCases(stranger,f.orderId),{status:403});
      await cases.reply(f.buyerId,id,request.id,{message:'The product had broken packaging when it arrived',version:1});
      await assert.rejects(cases.reply(f.buyerId,id,request.id,{message:'A duplicate reply with stale version must fail',version:1}),{code:'INFORMATION_STATE_CHANGED'});
      await cases.reply(f.buyerId,id,request.id,{message:'Here is additional information to complete the record',version:2});
      const result=await cases.detail(admin,id);assert.equal(result.informationRequests[0].prompt,request.prompt);assert.equal(result.informationRequests[0].replies.length,2);
      await cases.requestInformation(admin,id,{recipientKind:'SELLER',prompt:'Please confirm the package condition before delivery',dueAt:future(),version:(await cases.detail(admin,id)).record.caseVersion});
      const sellerView=await cases.participantCases(seller,f.orderId);assert.equal(sellerView.items[0].informationRequests.length,1);assert.equal(sellerView.items[0].informationRequests[0].recipientKind,'SELLER');
      assert.equal((await pool.query("SELECT count(*)::int AS n FROM order_service.order_outbox WHERE aggregate_id=$1 AND event_type='CaseInformationRequested.v1'",[f.orderId])).rows[0].n,2);
      await cases.reply(seller,id,sellerView.items[0].informationRequests[0].id,{message:'The package was intact when handed over to the courier',version:1});
      await pool.query("UPDATE order_service.case_information_requests SET due_at=now()-interval '1 hour' WHERE id=$1",[request.id]);
      await cases.reply(f.buyerId,id,request.id,{message:'A late supplementary response remains in the record',version:3});
      assert.equal((await cases.detail(admin,id)).informationRequests[0].replies.length,3);
      await returnAdmin.decide(admin,id,{action:'review',version:1,reason:'Review the full request after collecting information'});
      await returnAdmin.decide(admin,id,withBasis({action:'reject',version:2,reason:'The submitted evidence does not meet return conditions'}));
      await assert.rejects(cases.reply(f.buyerId,id,request.id,{message:'Closed cases must preserve history without new replies',version:4}),{code:'CASE_CLOSED'});
    });
    await t.test('assignment and information request audits are atomic under database failure',async()=>{
      const f=await fixture(),id=await newReturn(f);
      const broken=new CaseService({pool:{query:(...args)=>pool.query(...args),connect:async()=>{const db=await pool.connect();return {release:()=>db.release(),query:(sql,args)=>{
        if(sql.includes('INSERT INTO order_service.case_events'))throw Error('Audit failure');return db.query(sql,args);
      }};}}});
      await assert.rejects(broken.assign(admin,id,{assigneeId:admin.id,dueAt:future(),reason:'This assignment must roll back on audit failure',version:1}),/Audit failure/);
      const detail=await cases.detail(admin,id);assert.equal(detail.record.assigneeId,null);assert.equal(detail.record.caseVersion,1);
      await assert.rejects(broken.requestInformation(admin,id,{recipientKind:'BUYER',prompt:'This information request must also roll back',dueAt:future(),version:1}),/Audit failure/);
      assert.equal((await cases.detail(admin,id)).informationRequests.length,0);
    });
    await t.test('CORE exception rejection rolls back when the required audit is unavailable',async()=>{
      const f=await fixture(10),proposal=await cases.requestException(admin,{shopOrderId:f.orderId,payload:payload(f),reason:'Core exception audit rollback fixture',clientRequestId:randomUUID()});
      const broken=new CaseService({pool,order:returns.order});
      broken.transaction=fn=>cases.transaction(db=>fn({query:(sql,args)=>{
        if(sql.includes('INSERT INTO order_service.return_exception_actions'))throw Error('Exception audit failure');return db.query(sql,args);
      }}));
      await assert.rejects(broken.decideException(approver,proposal.id,{action:'reject',version:1,reason:'A rejection must be recorded atomically'}),/Exception audit failure/);
      const row=(await pool.query('SELECT status,version FROM order_service.return_exceptions WHERE id=$1',[proposal.id])).rows[0];
      assert.equal(row.status,'REQUESTED');assert.equal(row.version,1);
      await cases.decideException(approver,proposal.id,{action:'reject',version:1,reason:'A rejection now has an available audit'});
      assert.equal((await pool.query("SELECT 1 FROM order_service.return_exception_actions WHERE exception_id=$1 AND action='rejected'",[proposal.id])).rowCount,1);
    });
    await t.test('HTTP case APIs protect admin actions and participant replies',async()=>{
      const f=await fixture(),id=await newReturn(f);const {createHandler}=await import('../src/server.js');
      const fake={...order,identity:async(path,bearer)=>path==='/auth/me'?{user:bearer==='Bearer case-admin'?admin:{id:f.buyerId,roles:['buyer']}}:order.identity(path,bearer)};
      const server=http.createServer(createHandler(fake,{},returns));await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
      const base=`http://127.0.0.1:${server.address().port}/api/v2`,headers={Authorization:'Bearer case-admin','Content-Type':'application/json',Origin:process.env.FRONTEND_ORIGIN||'http://localhost:5173'};
      try{
        assert.equal((await fetch(base+'/admin/cases')).status,401);
        assert.equal((await fetch(base+'/admin/cases',{headers:{Authorization:'Bearer buyer'}})).status,403);
        const response=await fetch(`${base}/admin/cases/${id}/information-requests`,{method:'POST',headers,body:JSON.stringify({recipientKind:'BUYER',prompt:'Supply more information through the order page',dueAt:future(),version:1})});assert.equal(response.status,201);
        const requestId=(await response.json()).id;
        assert.equal((await fetch(`${base}/orders/${f.orderId}/cases`,{headers:{Authorization:'Bearer buyer'}})).status,200);
        assert.equal((await fetch(`${base}/cases/${id}/information-requests/${requestId}/replies`,{method:'POST',headers:{...headers,Authorization:'Bearer buyer'},body:JSON.stringify({message:'Response submitted from the buyer order page',version:1})})).status,201);
        assert.equal((await fetch(base+'/admin/return-exceptions',{method:'POST',headers,body:JSON.stringify({})})).status,400);
      }finally{await new Promise(resolve=>server.close(resolve));}
    });
  }finally{
    const orderIds=fixtureIds.map(f=>f.orderId);
    try{
      const returnIds=(await pool.query('SELECT id FROM order_service.return_requests WHERE shop_order_id=ANY($1::uuid[])',[orderIds])).rows.map(row=>row.id);
      await pool.query('DELETE FROM order_service.admin_return_actions WHERE request_id=ANY($1::uuid[])',[returnIds]);
      await pool.query('DELETE FROM order_service.admin_cases WHERE shop_order_id=ANY($1::uuid[])',[orderIds]);
      for(const table of ['return_history','return_evidence','return_items'])await pool.query(`DELETE FROM order_service.${table} WHERE request_id=ANY($1::uuid[])`,[returnIds]);
      await pool.query('DELETE FROM order_service.return_requests WHERE id=ANY($1::uuid[])',[returnIds]);
      await pool.query('DELETE FROM order_service.return_exception_actions WHERE exception_id IN (SELECT id FROM order_service.return_exceptions WHERE shop_order_id=ANY($1::uuid[]))',[orderIds]);
      await pool.query('DELETE FROM order_service.return_exceptions WHERE shop_order_id=ANY($1::uuid[])',[orderIds]);
      await pool.query('DELETE FROM order_service.order_outbox WHERE aggregate_id=ANY($1::uuid[])',[orderIds]);
      await pool.query('DELETE FROM order_service.order_status_history WHERE shop_order_id=ANY($1::uuid[])',[orderIds]);
      await pool.query('DELETE FROM order_service.order_items WHERE order_id=ANY($1::uuid[])',[orderIds]);
      await pool.query('DELETE FROM order_service.orders WHERE id=ANY($1::uuid[])',[orderIds]);
      await pool.query('DELETE FROM order_service.order_groups WHERE id=ANY($1::uuid[])',[fixtureIds.map(f=>f.groupId)]);
      await pool.query('DELETE FROM order_service.checkout_quotes WHERE id=ANY($1::uuid[])',[fixtureIds.map(f=>f.quoteId)]);
      await pool.query('DELETE FROM order_service.case_permissions WHERE user_id=ANY($1::uuid[])',[[admin.id,approver.id]]);
    }finally{await pool.end();}
  }
});
