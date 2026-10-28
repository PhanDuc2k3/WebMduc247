import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import pg from 'pg';
import http from 'node:http';
import {dashboardRange,metricComparison} from '../../../packages/contracts/admin-dashboard.js';
import {effectiveAdminAccess} from '../../../packages/contracts/admin-rbac.js';
import {OrderAdminService} from '../src/platform-admin.service.js';
import {WorkQueueService,workFilters} from '../src/work-queue.service.js';
import {WorkQueueWorker} from '../src/work-queue.worker.js';
import {PaymentDashboardService} from '../../payment-service/src/admin-dashboard.service.js';
import {IdentityAdminService} from '../../identity-service/src/services/platform-admin.service.js';
import {CatalogAdminService} from '../../catalog-service/src/platform-admin.service.js';

const actor=(role,scope={})=>{const id=randomUUID();return {id,status:'active',adminAccess:effectiveAdminAccess([{role,scope}],id)};};
test('DASH-001/006 date boundaries, inclusive last day and equal previous periods',()=>{
  const now=new Date('2026-10-26T18:00:00Z');
  const today=dashboardRange({preset:'today'},now);assert.equal(today.from,'2026-10-27');assert.equal(today.start,'2026-10-26T17:00:00.000Z');
  assert.equal(dashboardRange({preset:'30d'},now).days,30);
  const range=dashboardRange({preset:'custom',from:'2026-02-27',to:'2026-03-02'},now);assert.equal(range.days,4);
  assert.equal(Date.parse(range.start)-Date.parse(range.previousStart),Date.parse(range.end)-Date.parse(range.start));
  for(const query of [{preset:'bad'},{preset:'custom',from:'2026-02-30',to:'2026-03-02'},{from:'2026-01-02',to:'2026-01-01'},
    {from:'2025-01-01',to:'2026-12-31'},{preset:'custom',from:'2026-01-01'}])assert.throws(()=>dashboardRange(query),{status:400});
  assert.deepEqual(metricComparison(12,0),{current:12,previous:0,delta:12,percent:null});
  assert.equal(metricComparison(0,0).percent,null);assert.equal(metricComparison(10,20).percent,-50);
});
test('QUEUE typed filters and permission checks reject unknown values before SQL',async()=>{
  for(const query of [{view:'other'},{kind:'other'},{team:'other'},{page:0},{limit:51},{actorId:randomUUID()}])assert.throws(()=>workFilters(query),{status:400});
  const queue=new WorkQueueService({pool:{query(){throw Error('SQL must not execute');}}}),buyer={id:randomUUID()};
  for(const run of [()=>queue.list(buyer),()=>queue.attention(buyer),()=>queue.action(buyer,randomUUID(),{}),()=>queue.settings(buyer)])await assert.rejects(run(),{status:403});
  await assert.rejects(new PaymentDashboardService({query(){throw Error('SQL must not execute');}}).summary(actor('customer_support')),{status:403});
});

test('DASH/QUEUE PostgreSQL acceptance', {skip:!process.env.ADMIN_DASHBOARD_TEST_DATABASE_URL},async t=>{
  const url=new URL(process.env.ADMIN_DASHBOARD_TEST_DATABASE_URL);if(!url.pathname.endsWith('_test'))throw Error('Dedicated *_test database required');
  const pool=new pg.Pool({connectionString:url.href}),admin=actor('operations'),finance=actor('finance'),moderator=actor('moderator'),support=actor('customer_support');
  const order={pool,transaction:async fn=>{const db=await pool.connect();try{await db.query('BEGIN');const result=await fn(db);await db.query('COMMIT');return result;}catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();}},
    adminActor:async id=>id===finance.id?finance:id===moderator.id?moderator:admin,
    remote:async()=>({items:[],next:null})};
  const queue=new WorkQueueService(order),worker=new WorkQueueWorker(order),orders=new OrderAdminService(pool),payments=new PaymentDashboardService(pool);
  const ids={order:randomUUID(),group:randomUUID(),quote:randomUUID(),buyer:randomUUID(),store:randomUUID(),case:randomUUID(),intent:randomUUID(),refund:randomUUID(),transaction:randomUUID()};
  const range={preset:'custom',from:'2026-10-27',to:'2026-10-27'};
  try {
    await pool.query(`INSERT INTO order_service.checkout_quotes(id,user_id,cart_version,quote_json) VALUES($1,$2,0,'{}')`,[ids.quote,ids.buyer]);
    await pool.query(`INSERT INTO order_service.order_groups(id,buyer_id,grand_total_minor,current_total_minor) VALUES($1,$2,100000,100000)`,[ids.group,ids.buyer]);
    await pool.query(`INSERT INTO order_service.orders(id,user_id,store_id,quote_id,group_id,status,payment_method,subtotal_minor,shipping_estimate_minor,payable_total_minor,shipping_address_json,store_snapshot_json,created_at)
      VALUES($1,$2,$3,$4,$5,'PLACED','COD',90000,10000,100000,'{}','{"name":"Dashboard QA"}','2026-10-27T01:00:00Z')`,[ids.order,ids.buyer,ids.store,ids.quote,ids.group]);
    await pool.query(`INSERT INTO order_service.admin_cases(id,kind,shop_order_id,created_at,due_at) VALUES($1,'TICKET',$2,now()-interval '3 days',now()-interval '1 hour')`,[ids.case,ids.order]);
    await pool.query(`INSERT INTO order_service.support_tickets(id,subject,description) VALUES($1,'Dashboard QA ticket','A ticket for queue acceptance')`,[ids.case]);
    await t.test('DASH-001/002/004/007 summaries and drilldowns agree and enforce scope',async()=>{
      const summary=await orders.summary(admin,range);assert.ok(summary.orders.total>=1);assert.equal(summary.orders.orderValueMinor,undefined);
      assert.equal((await orders.list(admin,{from:range.from,to:range.to,q:ids.order})).total,1);
      assert.equal((await orders.list(admin,{from:'2026-10-26',to:'2026-10-26',q:ids.order})).total,0);
      assert.equal((await orders.list(admin,{from:range.from,to:range.to,statusGroup:'delivered',q:ids.order})).total,0);
      assert.equal((await orders.recent(admin,range)).range.from,range.from);
      assert.equal((await orders.summary(actor('operations',{storeIds:[randomUUID()]}),range)).orders.total,0);
      assert.equal((await orders.summary(support,range)).orders.total,0);
      const financial=await orders.summary(finance,range);assert.ok(financial.orders.orderValueMinor>=100000);
      const catalog=await new CatalogAdminService(pool).summary(actor('moderator',{storeIds:[ids.store]}),range);
      assert.equal(catalog.stores.inPeriod,0);assert.equal(catalog.products.inPeriod,0);
      const identity=await new IdentityAdminService({pool}).summary(actor('legacy_admin'),range);assert.equal(identity.users.inPeriod,0);
      await assert.rejects(orders.summary(admin,{preset:'custom',from:'bad',to:'bad'}),{status:400});
    });
    await t.test('QUEUE-001/002 only one concurrent claimant succeeds and case assignment stays synchronized',async()=>{
      const task=(await queue.list(admin,{kind:'TICKET',view:'unassigned'})).items.find(item=>item.sourceId===ids.case);assert.ok(task);
      const other=actor('operations');
      const results=await Promise.allSettled([admin,other].map(user=>queue.action(user,task.id,{action:'claim',version:task.version,reason:'Nhận xử lý hồ sơ kiểm thử'})));
      assert.equal(results.filter(result=>result.status==='fulfilled').length,1);assert.equal(results.find(result=>result.status==='rejected').reason.status,409);
      const detail=await queue.detail(admin,task.id);const row=(await pool.query('SELECT assignee_id FROM order_service.admin_cases WHERE id=$1',[ids.case])).rows[0];assert.equal(detail.record.assigneeId,row.assignee_id);
      assert.ok((await queue.list(admin,{view:'unassigned',kind:'TICKET'})).items.every(item=>item.id!==task.id));
      const mine=await queue.list({id:row.assignee_id,adminAccess:admin.adminAccess},{view:'mine'});assert.ok(mine.items.some(item=>item.id===task.id));
      await assert.rejects(queue.action(admin,task.id,{action:'claim',version:task.version,reason:'Dùng lại phiên bản cũ kiểm thử'}),{status:409});
      await assert.rejects(queue.action(support,task.id,{action:'transfer',version:detail.record.version,teamId:'finance',reason:'Không có quyền chuyển nhóm'}),{status:403});
      await queue.action(admin,task.id,{action:'transfer',version:detail.record.version,teamId:'finance',reason:'Chuyển nhóm để kiểm tra nghiệp vụ'});
      assert.equal((await queue.detail(admin,task.id)).record.teamId,'finance');
    });
    await t.test('QUEUE-003/004 response and resolution clocks differ and only resolution pauses',async()=>{
      const task=(await queue.list(admin,{kind:'TICKET'})).items.find(item=>item.sourceId===ids.case);const original=Date.parse(task.resolutionDueAt),response=Date.parse(task.responseDueAt);
      await queue.action(admin,task.id,{action:'status',version:task.version,status:'WAITING_RESPONSE',reason:'Chờ khách cung cấp phản hồi'});
      let current=(await queue.detail(admin,task.id)).record;assert.ok(current.pausedAt);
      await pool.query("UPDATE order_service.work_items SET paused_at=now()-interval '2 hours' WHERE id=$1",[task.id]);
      current=(await queue.detail(admin,task.id)).record;
      await queue.action(admin,task.id,{action:'respond',version:current.version,reason:'Đã phản hồi yêu cầu của khách'});
      current=(await queue.detail(admin,task.id)).record;assert.equal(current.pausedAt,null);assert.ok(current.firstResponseAt);assert.ok(Date.parse(current.resolutionDueAt)>=original+7199000);assert.equal(Date.parse(current.responseDueAt),response);
      await queue.action(admin,task.id,{action:'status',version:current.version,status:'AWAITING_APPROVAL',reason:'Chuyển hồ sơ chờ phê duyệt'});
      assert.ok((await queue.list(admin,{view:'awaiting_approval'})).items.some(item=>item.id===task.id));
    });
    await t.test('QUEUE-005 reminders/escalations are deduplicated across repeated workers',async()=>{
      const task=(await queue.list(admin,{kind:'TICKET'})).items.find(item=>item.sourceId===ids.case);
      await pool.query('UPDATE order_service.work_teams SET leader_id=$2 WHERE id=$1',['finance',finance.id]);
      await pool.query("UPDATE order_service.work_items SET resolution_due_at=now()-interval '1 hour',assignee_id=$2 WHERE id=$1",[task.id,admin.id]);
      await worker.reminders();const before=await pool.query('SELECT count(*)::int AS n FROM order_service.work_notifications WHERE work_id=$1',[task.id]);assert.equal(before.rows[0].n,2);
      await Promise.all([worker.reminders(),new WorkQueueWorker(order).reminders()]);const after=await pool.query('SELECT count(*)::int AS n FROM order_service.work_notifications WHERE work_id=$1',[task.id]);assert.equal(after.rows[0].n,before.rows[0].n);
      assert.equal((await queue.detail(admin,task.id)).record.escalationLevel,1);assert.ok((await queue.notifications(finance)).items.length);
    });
    await t.test('QUEUE-002/004 assignment targets and versioned SLA configuration are checked',async()=>{
      const task=(await queue.list(admin,{kind:'TICKET'})).items.find(item=>item.sourceId===ids.case);
      await queue.action(admin,task.id,{action:'assign',version:task.version,assigneeId:finance.id,reason:'Phân công chuyên viên tài chính'});
      assert.equal((await queue.detail(admin,task.id)).record.assigneeId,finance.id);
      const settings=await queue.settings(admin),policy=settings.policies.find(row=>row.kind==='TICKET');
      const body={version:policy.version,responseMinutes:60,resolutionMinutes:120,reminderMinutes:30,leaderId:admin.id,reason:'Cấu hình SLA cho kiểm thử local'};
      await queue.updateSettings(admin,'TICKET',body);
      const freshId=randomUUID();
      try{
        await pool.query(`INSERT INTO order_service.admin_cases(id,kind,shop_order_id) VALUES($1,'TICKET',$2)`,[freshId,ids.order]);
        const fresh=(await pool.query('SELECT extract(epoch FROM due_at-created_at)::int AS seconds FROM order_service.admin_cases WHERE id=$1',[freshId])).rows[0];
        assert.equal(fresh.seconds,120*60);
      }finally{await pool.query('DELETE FROM order_service.work_items WHERE source_id=$1',[freshId]);await pool.query('DELETE FROM order_service.admin_cases WHERE id=$1',[freshId]);}
      await assert.rejects(queue.updateSettings(admin,'TICKET',body),{status:409});
      assert.equal((await queue.detail(admin,task.id)).record.responseMinutes,task.responseMinutes);
      await assert.rejects(queue.updateSettings(finance,'ABUSE_REPORT',body),{status:403});
      await queue.updateSettings(admin,'TICKET',{...body,version:policy.version+1,responseMinutes:policy.response_minutes,resolutionMinutes:policy.resolution_minutes,reminderMinutes:policy.reminder_minutes,leaderId:null});
    });
    await t.test('DASH-005 finance uses successful transaction/refund event times',async()=>{
      await pool.query(`INSERT INTO payment_service.payment_intents(id,order_group_id,buyer_id,method,provider,amount_minor,status) VALUES($1,$2,$3,'COD','DELIVERY',100000,'SUCCEEDED')`,[ids.intent,ids.group,ids.buyer]);
      await pool.query(`INSERT INTO payment_service.payment_transactions(id,intent_id,provider,provider_txn_id,amount_minor,status,verified_at,source,payload_digest)
        VALUES($1::uuid,$2,'DELIVERY',$1::text,100000,'SUCCEEDED','2026-10-27T01:00:00Z','TEST','test')`,[ids.transaction,ids.intent]);
      await pool.query(`INSERT INTO payment_service.refunds(id,shop_order_id,payment_intent_id,provider,provider_refund_ref,amount_minor,status,reason,idempotency_key,request_hash,succeeded_at)
        VALUES($1::uuid,$2,$3,'DELIVERY',$1::text,10000,'SUCCEEDED','QA refund',$1::text,'test','2026-10-27T02:00:00Z')`,[ids.refund,ids.order,ids.intent]);
      const summary=await payments.summary(finance,range);assert.equal(summary.paid.current,100000);assert.equal(summary.refunded.current,10000);assert.equal(summary.feeRevenue,null);
      assert.equal((await payments.entries(finance,{...range,kind:'payments'})).total,1);assert.equal((await payments.entries(finance,{...range,kind:'refunds'})).total,1);
      assert.equal((await payments.summary(finance,{preset:'custom',from:'2026-10-26',to:'2026-10-26'})).paid.current,0);
      const retryReturn=randomUUID(),failed=randomUUID(),succeeded=randomUUID();
      for(const [id,status,attempt] of [[failed,'FAILED',0],[succeeded,'SUCCEEDED',1]])await pool.query(`INSERT INTO payment_service.refunds(id,shop_order_id,payment_intent_id,provider,provider_refund_ref,amount_minor,status,reason,idempotency_key,request_hash)
        VALUES($1::uuid,$2,$3,'DELIVERY',$1::text,1000,$4,'Retry feed QA',$5,'test')`,[id,ids.order,ids.intent,status,`return:${retryReturn}:${attempt}`]);
      const feed=await payments.queueFeed();assert.equal(feed.items.find(item=>item.sourceId===failed).active,false);assert.equal(feed.items.find(item=>item.sourceId===failed).returnId,retryReturn);
    });
    await t.test('DASH-003 overdue orders and refunds without a Payment row appear and close from source',async()=>{
      await pool.query("UPDATE order_service.orders SET created_at=now()-interval '3 days' WHERE id=$1",[ids.order]);
      const returnId=randomUUID();
      try{
        await pool.query(`INSERT INTO order_service.return_requests(id,shop_order_id,buyer_id,store_id,reason,reason_code,resolution,status,eligible_refund_minor)
          VALUES($1,$2,$3,$4,'A pending refund requires verification','OTHER','REFUND','REFUND_PENDING',1000)`,[returnId,ids.order,ids.buyer,ids.store]);
        await worker.local();
        assert.ok((await queue.list(admin,{kind:'ORDER',view:'overdue'})).items.some(item=>item.shopOrderId===ids.order));
        assert.ok((await queue.list(finance,{kind:'REFUND'})).items.some(item=>item.sourceId==='return:'+returnId));
        await pool.query("UPDATE order_service.return_requests SET status='REFUNDED' WHERE id=$1",[returnId]);
        await pool.query("UPDATE order_service.orders SET status='DELIVERED' WHERE id=$1",[ids.order]);await worker.local();
        assert.ok(!(await queue.list(admin,{kind:'ORDER'})).items.some(item=>item.shopOrderId===ids.order));
        assert.ok(!(await queue.list(finance,{kind:'REFUND'})).items.some(item=>item.sourceId==='return:'+returnId));
      }finally{await pool.query('DELETE FROM order_service.admin_cases WHERE id=$1',[returnId]);await pool.query('DELETE FROM order_service.return_requests WHERE id=$1',[returnId]);}
    });
    await t.test('DASH-003/008 queue source feeds, partial failure, and report scope',async()=>{
      process.env.ADMIN_AUTHORIZATION_TOKEN='isolated-queue-token';
      const reportId='aaaaaaaaaaaaaaaaaaaaaaaa';
      order.remote=async url=>String(url).includes('5104')?{items:[{sourceId:ids.refund,shopOrderId:ids.order,status:'FAILED',active:true,createdAt:'2026-10-27T01:00:00Z'}],next:null}:
        {items:[{sourceId:reportId,storeId:ids.store,conversationId:'bbbbbbbbbbbbbbbbbbbbbbbb',reason:'Kiểm thử báo cáo vi phạm',status:'OPEN',active:true,createdAt:'2026-10-27T01:00:00Z'}],next:null};
      await worker.run();assert.ok((await queue.attention(finance)).items.some(item=>item.kind==='REFUND'));
      assert.ok((await queue.list(moderator,{kind:'ABUSE_REPORT',view:'unassigned'})).items.length);
      assert.equal((await queue.list(admin,{kind:'REFUND'})).total,0);
      assert.equal((await queue.list(actor('moderator',{storeIds:[randomUUID()]}),{kind:'ABUSE_REPORT'})).total,0);
      order.remote=async url=>{if(String(url).includes('5104'))throw Error('Payment down');return {items:[],next:null};};
      await worker.run();const attention=await queue.attention(finance);assert.equal(attention.health.find(item=>item.source==='payment').errorCode,'SOURCE_UNAVAILABLE');
      assert.ok(attention.items.some(item=>item.kind==='REFUND'));assert.ok(attention.health.find(item=>item.source==='orders').updatedAt);
    });
    await t.test('HTTP dashboard/queue/finance routes enforce authentication, date filters and origin',async()=>{
      const servers=[];
      const listen=async handler=>{const server=http.createServer(handler);await new Promise(done=>server.listen(0,'127.0.0.1',done));servers.push(server);return `http://127.0.0.1:${server.address().port}`;};
      try {
        const identityUrl=await listen((req,res)=>{res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({user:req.headers.authorization==='Bearer qa-admin'?admin:{id:ids.buyer}}));});
        process.env.CATALOG_IDENTITY_URL=identityUrl;
        const {createHandler:catalogHandler}=await import('../../catalog-service/src/server.js');
        const {createHandler:orderHandler}=await import('../src/server.js');
        const {createHandler:paymentHandler}=await import('../../payment-service/src/server.js');
        const catalogUrl=await listen(catalogHandler({pool},{}));
        const orderUrl=await listen(orderHandler({...order,identity:async(_path,bearer)=>({user:bearer==='Bearer qa-admin'?admin:{id:ids.buyer}})}, {},{}));
        const paymentUrl=await listen(paymentHandler({pool,identity:async bearer=>bearer==='Bearer qa-finance'?finance:support}));
        const headers={Authorization:'Bearer qa-admin',Origin:process.env.FRONTEND_ORIGIN||'http://localhost:5173','Content-Type':'application/json'};
        const catalog=await fetch(`${catalogUrl}/api/v2/admin/catalog/summary?from=2026-10-27&to=2026-10-27`,{headers});assert.equal(catalog.status,200);assert.equal((await catalog.json()).range.days,1);
        assert.equal((await fetch(`${catalogUrl}/api/v2/admin/catalog/summary`)).status,401);
        assert.equal((await fetch(`${orderUrl}/api/v2/admin/orders/summary?preset=today`,{headers})).status,200);
        assert.equal((await fetch(`${orderUrl}/api/v2/admin/orders/summary?preset=custom&from=bad&to=bad`,{headers})).status,400);
        assert.equal((await fetch(`${orderUrl}/api/v2/admin/work-queue?view=unassigned`,{headers})).status,200);
        assert.equal((await fetch(`${orderUrl}/api/v2/admin/work-queue`,{headers:{Authorization:'Bearer buyer'}})).status,403);
        assert.equal((await fetch(`${orderUrl}/api/v2/admin/work-queue/settings/TICKET`,{method:'PUT',headers:{...headers,Origin:'https://foreign.example'},body:'{}'})).status,403);
        assert.equal((await fetch(`${paymentUrl}/api/v2/admin/finance/summary?preset=today`,{headers:{Authorization:'Bearer qa-finance'}})).status,200);
        assert.equal((await fetch(`${paymentUrl}/api/v2/admin/finance/summary`,{headers:{Authorization:'Bearer support'}})).status,403);
        assert.equal((await fetch(`${paymentUrl}/api/v2/internal/admin-queue`)).status,403);
      } finally {await Promise.all(servers.map(server=>new Promise(done=>server.close(done))));}
    });
  } finally {
    await pool.query('DELETE FROM payment_service.refunds WHERE shop_order_id=$1',[ids.order]);
    await pool.query('DELETE FROM payment_service.payment_transactions WHERE id=$1',[ids.transaction]);
    await pool.query('DELETE FROM payment_service.payment_intents WHERE id=$1',[ids.intent]);
    await pool.query('DELETE FROM order_service.work_items WHERE shop_order_id=$1 OR source_id=$2',[ids.order,'aaaaaaaaaaaaaaaaaaaaaaaa']);
    await pool.query('DELETE FROM order_service.admin_cases WHERE id=$1',[ids.case]);
    await pool.query('DELETE FROM order_service.orders WHERE id=$1',[ids.order]);
    await pool.query('DELETE FROM order_service.order_groups WHERE id=$1',[ids.group]);
    await pool.query('DELETE FROM order_service.checkout_quotes WHERE id=$1',[ids.quote]);
    await pool.query('DELETE FROM order_service.work_config_events WHERE actor_id=$1',[admin.id]);
    await pool.query('UPDATE order_service.work_teams SET leader_id=NULL WHERE leader_id=ANY($1::uuid[])',[[admin.id,finance.id]]);
    await pool.end();
  }
});
