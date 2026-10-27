import {testAdmin,syncTestAdmin} from './admin-fixture.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import http from 'node:http';
import pg from 'pg';
import { ReturnService } from '../src/return.service.js';
import { ReturnAdminService, returnAdminFilters, returnAdminDecision } from '../src/return-admin.service.js';

const admin = testAdmin();
const buyer = {id:randomUUID(),roles:['buyer']};
const validId = randomUUID();

const withBasis = command => ({responsibleParty:'UNDETERMINED',policyVersion:'CASE_RESOLUTION_V1',basisSummary:'Test fixture: assess the submitted facts and original return policy.',evidenceRefs:[],...command});

test('admin returns denies unauthenticated and buyer actors before touching SQL',async () => {
  const service = new ReturnAdminService({pool:{query(){throw Error('SQL must not run');},connect(){throw Error('SQL must not run');}}});
  for(const user of [null,buyer]) {
    const status = user ? 403 : 401;
    for(const action of [() => service.list(user,{}),() => service.detail(user,validId),
      () => service.decide(user,validId,{action:'review',version:1,reason:'Valid review reason'}),
      () => service.evidence(user,validId,validId,'Valid evidence reason')])
      await assert.rejects(action(),{status});
  }
});

test('admin return contracts reject forged actors, money commands and invalid filters',() => {
  for(const input of [null,{action:'receive',version:1,reason:'Invalid money action'},
    {action:'refund',version:1,reason:'Invalid money action'},{action:'review',version:0,reason:'Valid reason text'},
    {action:'review',version:1,reason:'short'},{action:'approve',version:1,reason:'Valid reason text',actorId:validId},
    withBasis({action:'approve',version:1,reason:'<script>alert(1)</script>'}),{action:'__proto__',version:1,reason:'Valid reason text'}])
    assert.throws(() => returnAdminDecision(input),{code:'INVALID_RETURN_COMMAND'});
  for(const query of [{from:'2026-02-30'},{to:'0000-01-01'},{from:'2026-11-01',to:'2026-10-01'},
    {from:'yesterday'},{paymentMethod:'CASH'},{status:'PAID'},{limit:51},{actorId:validId},{storeId:'invalid'}])
    assert.throws(() => returnAdminFilters(query));
  const filters = returnAdminFilters({q:'50%_off',from:'2026-10-26',to:'2026-10-26'});
  assert.equal(filters.pattern,'%50\\%\\_off%');
  assert.equal(filters.from,'2026-10-26T00:00:00+07:00');
  assert.equal(filters.to,'2026-10-26T17:00:00.000Z');
});

test('PostgreSQL admin returns: state, evidence, audit atomicity, concurrency and HTTP',
  {skip:!process.env.ADMIN_RETURNS_TEST_DATABASE_URL},async t => {
    const url = new URL(process.env.ADMIN_RETURNS_TEST_DATABASE_URL);
    if(!url.pathname.endsWith('_test')) throw new Error('Tests require a dedicated *_test database.');
    const pool = new pg.Pool({connectionString:url.href});
    const order = {pool,adminActor:async()=>admin,inventory:async () => {throw Error('No seller membership in this fixture');}};
    const returns = new ReturnService(order);
    const service = new ReturnAdminService(returns);
    const fixtures = [];
    async function fixture() {
      const [id,orderId,quoteId,groupId,storeId,itemId,variantId] = Array.from({length:7},() => randomUUID());
      const data = {id,orderId,quoteId,groupId,storeId,itemId}; fixtures.push(data);
      await pool.query(`INSERT INTO order_service.checkout_quotes(id,user_id,cart_version,quote_json) VALUES($1,$2,0,'{}')`,[quoteId,buyer.id]);
      await pool.query(`INSERT INTO order_service.order_groups(id,buyer_id,grand_total_minor,current_total_minor) VALUES($1,$2,120000,120000)`,[groupId,buyer.id]);
      await pool.query(`INSERT INTO order_service.orders(id,user_id,store_id,quote_id,group_id,status,payment_method,
        subtotal_minor,shipping_estimate_minor,payable_total_minor,shipping_address_json,store_snapshot_json)
        VALUES($1,$2,$3,$4,$5,'DELIVERED','COD',100000,20000,120000,$6,$7)`,
        [orderId,buyer.id,storeId,quoteId,groupId,{phone:'PRIVATE_PHONE_MARKER',address:'PRIVATE_ADDRESS_MARKER'},{name:`Admin return QA ${id}`}]);
      await pool.query(`INSERT INTO order_service.order_items(id,order_id,variant_id,product_id,sku,product_name,quantity,
        unit_price_minor,line_total_minor,reservation_id) VALUES($1,$2,$3,$4,'RETURN-QA','Return QA product',2,50000,100000,$5)`,
        [itemId,orderId,variantId,randomUUID(),randomUUID()]);
      await pool.query(`INSERT INTO order_service.return_requests(id,shop_order_id,buyer_id,store_id,reason,reason_code,
        resolution,eligible_refund_minor,shipping_refund_minor,seller_response,requested_at)
        VALUES($1,$2,$3,$4,'Product damaged in delivery','DAMAGED','REFUND',120000,20000,'Original seller response','2026-10-25T18:00:00Z')`,
        [id,orderId,buyer.id,storeId]);
      await pool.query(`INSERT INTO order_service.return_items(request_id,order_item_id,quantity,eligible_refund_minor) VALUES($1,$2,2,100000)`,[id,itemId]);
      return data;
    }
    try {
      await t.test('list filters, stable pagination, dates in UTC+7 and literal search',async () => {
        const data = await fixture();
        const result = await service.list(admin,{storeId:data.storeId,from:'2026-10-26',to:'2026-10-26',paymentMethod:'COD',limit:1});
        assert.equal(result.total,1); assert.equal(result.items[0].id,data.id); assert.equal(result.totalPages,1);
        assert.equal((await service.list(admin,{storeId:data.storeId,page:2,limit:1})).items.length,0);
        assert.equal((await service.list(admin,{storeId:data.storeId,to:'2026-10-25'})).total,0);
        assert.equal((await service.list(admin,{storeId:data.storeId,q:"%' OR 1=1 --"})).total,0);
        assert.equal((await service.list(admin,{q:data.id})).items[0].shopOrderId,data.orderId);
      });
      await t.test('details omit private delivery data and preserve money/item snapshots',async () => {
        const data = await fixture(), detail = await service.detail(admin,data.id);
        assert.equal(detail.record.orderTotalMinor,120000); assert.equal(detail.record.shippingRefundMinor,20000);
        assert.equal(detail.record.items[0].eligibleRefundMinor,100000);
        assert.doesNotMatch(JSON.stringify(detail),/PRIVATE_PHONE_MARKER|PRIVATE_ADDRESS_MARKER/);
        await assert.rejects(service.detail(admin,randomUUID()),{status:404});
      });
      await t.test('review/approve writes audit and history and lets the buyer continue shipping',async () => {
        const data = await fixture();
        await service.decide(admin,data.id,{action:'review',version:1,reason:'Reviewing the submitted evidence'});
        await service.decide(admin,data.id,withBasis({action:'approve',version:2,reason:'Evidence confirms the return is eligible'}));
        const detail = await service.detail(admin,data.id);
        assert.equal(detail.record.status,'APPROVED'); assert.equal(detail.record.version,3);
        assert.equal(detail.record.sellerResponse,'Original seller response');
        assert.equal(detail.record.adminResponse,'Evidence confirms the return is eligible');
        assert.equal(detail.record.refundReference,null); assert.equal(detail.record.refundedMinor,0);
        assert.equal(detail.audit.length,2); assert.equal(detail.audit[0].actorId,admin.id);
        assert.equal(detail.history[0].actorType,'platform_admin');
        const events = await pool.query(`SELECT event_type FROM order_service.order_outbox WHERE aggregate_id=$1`,[data.orderId]);
        assert.deepEqual(events.rows.map(row => row.event_type).sort(),['CaseDecisionPublished.v1','ReturnApproved.v1']);
        const buyerDetail = await returns.detail(buyer.id,data.id);
        assert.equal(buyerDetail.returnRequest.adminResponse,detail.record.adminResponse);
        await returns.transition(buyer.id,data.id,'ship',{expectedVersion:3});
        assert.equal((await service.detail(admin,data.id)).record.status,'RETURNING');
      });
      await t.test('reject does not send refund or approval commands',async () => {
        const data = await fixture();
        await service.decide(admin,data.id,{action:'review',version:1,reason:'Checking this return request'});
        await service.decide(admin,data.id,withBasis({action:'reject',version:2,reason:'Evidence does not meet the return conditions'}));
        assert.equal((await service.detail(admin,data.id)).record.status,'REJECTED');
        assert.equal((await pool.query("SELECT count(*)::int AS total FROM order_service.order_outbox WHERE aggregate_id=$1 AND event_type='RefundRequested.v1'",[data.orderId])).rows[0].total,0);
        await assert.rejects(service.decide(admin,data.id,withBasis({action:'approve',version:3,reason:'Cannot approve a rejected request'})),{status:409});
      });
      await t.test('two concurrent administrators only apply one transition',async () => {
        const data = await fixture();
        const results = await Promise.allSettled([1,2].map(() => service.decide(admin,data.id,
          {action:'review',version:1,reason:'Concurrent review of return evidence'})));
        assert.equal(results.filter(result => result.status === 'fulfilled').length,1);
        assert.equal(results.find(result => result.status === 'rejected').reason.status,409);
        const detail = await service.detail(admin,data.id);
        assert.equal(detail.record.version,2); assert.equal(detail.audit.length,1); assert.equal(detail.history.length,1);
      });
      await t.test('audit failure rolls back return status, public history and outbox',async () => {
        const data = await fixture();
        await service.decide(admin,data.id,{action:'review',version:1,reason:'Prepare for audit atomicity check'});
        const wrapped = {order,pool:{query:(...args)=>pool.query(...args),connect:async () => {
          const db = await pool.connect();
          return {release:() => db.release(),query:(sql,args) => {
            if(sql.includes('INSERT INTO order_service.admin_return_actions')) throw Error('Simulated audit failure');
            return db.query(sql,args);
          }};
        }},history:returns.history.bind(returns)};
        await assert.rejects(new ReturnAdminService(wrapped).decide(admin,data.id,
          withBasis({action:'approve',version:2,reason:'This approval must be rolled back'})),/Simulated audit failure/);
        const detail = await service.detail(admin,data.id);
        assert.equal(detail.record.status,'UNDER_REVIEW'); assert.equal(detail.record.version,2);
        assert.equal(detail.audit.length,1); assert.equal(detail.history.length,1);
        assert.equal((await pool.query('SELECT count(*)::int AS total FROM order_service.order_outbox WHERE aggregate_id=$1',[data.orderId])).rows[0].total,0);
      });
      await t.test('administrator cannot review their own buyer return',async () => {
        const data = await fixture();
        await assert.rejects(service.decide({...admin,id:buyer.id},data.id,
          {action:'review',version:1,reason:'Self review must not be permitted'}),{code:'RETURN_ACTOR_CONFLICT'});
      });
      await t.test('replacement requests stay read-only until a replacement workflow exists',async () => {
        const data = await fixture();
        await pool.query("UPDATE order_service.return_requests SET resolution='REPLACEMENT' WHERE id=$1",[data.id]);
        await assert.rejects(service.decide(admin,data.id,{action:'review',version:1,reason:'Do not imply a replacement is supported'}),
          {code:'RETURN_RESOLUTION_UNSUPPORTED'});
        assert.equal((await service.detail(admin,data.id)).record.status,'REQUESTED');
      });
      await t.test('evidence requires an authorized case and logs access before returning bytes',async () => {
        const data = await fixture(), other = await fixture(), imageId = randomUUID();
        const image = Buffer.from('private evidence bytes');
        await pool.query(`INSERT INTO order_service.return_evidence(id,request_id,actor_id,object_key,mime_type,data)
          VALUES($1,$2,$3,$4,'image/png',$5)`,[imageId,data.id,buyer.id,`admin-return-test/${imageId}`,image]);
        await assert.rejects(service.evidence(buyer,data.id,imageId,'Trying unauthorized evidence access'),{status:403});
        await pool.query('UPDATE order_service.admin_cases SET assignee_id=$1 WHERE id=ANY($2::uuid[])',[admin.id,[data.id,other.id]]);
        await assert.rejects(service.cases.issueEvidence(admin,other.id,imageId,'Trying another request evidence'),{status:404});
        const access=await service.cases.issueEvidence(admin,data.id,imageId,'Review evidence for this return case');
        const result = await service.evidence(admin,data.id,imageId,new URL(access.url,'http://test').searchParams.get('grant'));
        assert.deepEqual(result.data,image); assert.equal(result.mimeType,'image/png');
        assert.equal((await service.detail(admin,data.id)).audit[0].action,'view_evidence');
      });
      await t.test('a private evidence image is not returned if access auditing fails',async () => {
        const data = await fixture(), imageId = randomUUID();
        await pool.query(`INSERT INTO order_service.return_evidence(id,request_id,actor_id,object_key,mime_type,data)
          VALUES($1,$2,$3,$4,'image/png',$5)`,[imageId,data.id,buyer.id,`admin-return-test/${imageId}`,Buffer.from('private')]);
        await pool.query('UPDATE order_service.admin_cases SET assignee_id=$1 WHERE id=$2',[admin.id,data.id]);
        const access=await service.cases.issueEvidence(admin,data.id,imageId,'Review this private return evidence');
        const wrapped = new ReturnAdminService({pool:{query:(...args)=>pool.query(...args),connect:async()=>{
          const db=await pool.connect();return {release:()=>db.release(),query:(sql,args)=>{
            if(sql.includes('INSERT INTO order_service.admin_return_actions'))throw Error('Evidence audit failed');
            return db.query(sql,args);
          }};
        }}});
        await assert.rejects(wrapped.evidence(admin,data.id,imageId,new URL(access.url,'http://test').searchParams.get('grant')),/Evidence audit failed/);
      });
      await t.test('HTTP routes enforce bearer/admin/origin, version and private evidence headers',async () => {
        const data = await fixture();
        const {createHandler} = await import('../src/server.js');
        const fakeOrder = {...order,identity:async (_path,bearer) => ({user:bearer === 'Bearer test-admin' ? admin : buyer})};
        const server = http.createServer(createHandler(fakeOrder,{},returns));
        await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
        const base = `http://127.0.0.1:${server.address().port}/api/v2/admin/returns`;
        const headers = {Authorization:'Bearer test-admin','Content-Type':'application/json',Origin:process.env.FRONTEND_ORIGIN || 'http://localhost:5173'};
        try {
          assert.equal((await fetch(base)).status,401);
          assert.equal((await fetch(base,{headers:{Authorization:'Bearer test-buyer'}})).status,403);
          assert.equal((await fetch(`${base}?q=${data.id}`,{headers})).status,200);
          assert.equal((await fetch(`${base}/${data.id}/decisions`,{method:'POST',headers:{...headers,Origin:'https://wrong.example'},
            body:JSON.stringify({action:'review',version:1,reason:'An invalid origin must fail'})})).status,403);
          const command = {action:'review',version:1,reason:'Review the return through admin HTTP'};
          assert.equal((await fetch(`${base}/${data.id}/decisions`,{method:'POST',headers,body:JSON.stringify(command)})).status,200);
          assert.equal((await fetch(`${base}/${data.id}/decisions`,{method:'POST',headers,body:JSON.stringify(command)})).status,409);
          assert.equal((await fetch(`${base}/${data.id}/decisions`,{method:'POST',headers,body:JSON.stringify({action:'receive',version:2,reason:'No money command from admin'})})).status,400);
          const imageId = randomUUID();
          await pool.query(`INSERT INTO order_service.return_evidence(id,request_id,actor_id,object_key,mime_type,data)
            VALUES($1,$2,$3,$4,'image/png',$5)`,[imageId,data.id,buyer.id,`admin-return-test/${imageId}`,Buffer.from('test')]);
          await pool.query('UPDATE order_service.admin_cases SET assignee_id=$1 WHERE id=$2',[admin.id,data.id]);
          const access=await (await fetch(`${base}/${data.id}/evidence/${imageId}/access`,{method:'POST',headers,body:JSON.stringify({reason:'Review return evidence in this case'})})).json();
          const evidence = await fetch(new URL(access.url,base),{headers});
          assert.equal(evidence.status,200); assert.equal(evidence.headers.get('cache-control'),'private, no-store');
          assert.equal(evidence.headers.get('content-type'),'image/png');
          assert.equal((await fetch(`${base}/${data.id}/evidence/${imageId}?reason=Review%20return%20evidence`)).status,401);
        } finally { await new Promise(resolve => server.close(resolve)); }
      });
    } finally {
      const ids = fixtures.map(row => row.id), orderIds = fixtures.map(row => row.orderId);
      try {
        await pool.query('DELETE FROM order_service.admin_cases WHERE return_request_id=ANY($1::uuid[])',[ids]);
        for(const table of ['admin_return_actions','return_history','return_evidence','return_items'])
          await pool.query(`DELETE FROM order_service.${table} WHERE request_id=ANY($1::uuid[])`,[ids]);
        await pool.query('DELETE FROM order_service.return_requests WHERE id=ANY($1::uuid[])',[ids]);
        await pool.query('DELETE FROM order_service.order_outbox WHERE aggregate_id=ANY($1::uuid[])',[orderIds]);
        await pool.query('DELETE FROM order_service.order_items WHERE order_id=ANY($1::uuid[])',[orderIds]);
        await pool.query('DELETE FROM order_service.orders WHERE id=ANY($1::uuid[])',[orderIds]);
        await pool.query('DELETE FROM order_service.order_groups WHERE id=ANY($1::uuid[])',[fixtures.map(row => row.groupId)]);
        await pool.query('DELETE FROM order_service.checkout_quotes WHERE id=ANY($1::uuid[])',[fixtures.map(row => row.quoteId)]);
      } finally { await pool.end(); }
    }
  });
