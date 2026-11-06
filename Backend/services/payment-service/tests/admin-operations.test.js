import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import {randomUUID} from 'node:crypto';
import http from 'node:http';
import {PaymentAdminOperations} from '../src/admin-operations.service.js';
import {PaymentService} from '../src/service.js';
import {effectiveAdminAccess} from '../../../packages/contracts/admin-rbac.js';
import {operationsQuery} from '../../../packages/contracts/admin-operations.js';
const actor=role=>{const id=randomUUID();return {id,adminAccess:effectiveAdminAccess([{role,scope:{}}],id)};};
test('finance operations deny support, scoped grants, invalid filters and stale MFA before reading money',async()=>{
  const admin=new PaymentAdminOperations({pool:{query(){throw Error('SQL must not run');}}});
  await assert.rejects(admin.list(actor('customer_support'),'payments'),{status:403});
  const scoped=actor('finance');scoped.adminAccess.grants=scoped.adminAccess.grants.map(g=>({...g,scope:{storeIds:[randomUUID()]}}));
  await assert.rejects(admin.list(scoped,'payments'),{status:403});
  const stale={...actor('finance'),adminSession:{reauthenticatedAt:'2000-01-01',reauthSeconds:300}};
  await assert.rejects(admin.recheck(stale,'payments',randomUUID(),{}),{status:428});
  for(const q of [{from:'2026-02-30'},{from:'2026-99-01'},{to:'2026-01-01',from:'2026-02-01'},{page:'0'},{status:'hacked'},{actorId:randomUUID()}])assert.throws(()=>operationsQuery(q,['PENDING']),{status:400});
});
test('payment/refund console PostgreSQL, safe retries, audit rollback and HTTP guards',{skip:!process.env.ADMIN_OPERATIONS_TEST_DATABASE_URL},async t=>{
  const url=new URL(process.env.ADMIN_OPERATIONS_TEST_DATABASE_URL);assert.ok(url.pathname.endsWith('_test'));
  const client=new pg.Client({connectionString:url.href});await client.connect();await client.query('BEGIN');
  const finance=actor('finance'),intentId=randomUUID(),groupId=randomUUID(),refundId=randomUUID(),shopId=randomUUID(),secret='DO_NOT_EXPOSE_CHECKOUT_SECRET';
  const payment=new PaymentService({query:(...args)=>client.query(...args)},{});payment.transaction=async fn=>{await client.query('SAVEPOINT operation');try{const result=await fn(client);await client.query('RELEASE SAVEPOINT operation');return result;}catch(e){await client.query('ROLLBACK TO SAVEPOINT operation');throw e;}};
  payment.group=async()=>({orders:[{id:shopId,status:'CANCELLED',paymentStatus:'PAID',amountMinor:100000}]});
  const admin=new PaymentAdminOperations(payment),cmd=version=>({version,reason:'Review pending provider result safely',requestId:randomUUID()});
  try{
    await client.query(`INSERT INTO payment_service.payment_intents(id,order_group_id,buyer_id,method,provider,amount_minor,status,checkout_url,provider_order_ref) VALUES($1,$2,$3,'MOMO','MOMO',100000,'PENDING',$4,$5)`,[intentId,groupId,randomUUID(),secret,'ORDER-'+intentId]);
    await client.query(`INSERT INTO payment_service.refunds(id,shop_order_id,payment_intent_id,provider,provider_refund_ref,amount_minor,status,reason,idempotency_key,request_hash) VALUES($1,$2,$3,'MOMO',$4,10000,'PENDING','Return policy',$5,'hash')`,[refundId,shopId,intentId,'RF-'+refundId,'return:'+randomUUID()+':1']);
    await t.test('lists all statuses, searches group/provider, masks data and keeps amounts in whole VND',async()=>{
      const page=await admin.list(finance,'payments',{q:groupId,status:'PENDING'});assert.equal(page.total,1);assert.equal(page.items[0].amountMinor,100000);
      const detail=await admin.detail(finance,'refunds',refundId);assert.equal(detail.record.shopOrderId,shopId);assert.equal(detail.amounts.reserved,10000);assert.equal(detail.orderSource.orders[0].paymentStatus,'PAID');
      assert.ok(!JSON.stringify(detail).includes(secret));assert.ok(!JSON.stringify(page).includes('buyer_id'));
      assert.equal((await admin.list(finance,'refunds',{q:shopId})).total,1);
    });
    await t.test('recheck is durable/idempotent, checks version and rate limit, never creates another payment/refund',async()=>{
      const command=cmd(1);assert.equal((await admin.recheck(finance,'payments',intentId,command)).status,'QUEUED');
      await admin.recheck(finance,'payments',intentId,command);
      await assert.rejects(admin.recheck(finance,'payments',intentId,{...command,reason:'A different command must not reuse the same receipt'}),{status:409});
      await assert.rejects(admin.recheck(finance,'payments',intentId,cmd(1)),{status:409});
      await assert.rejects(admin.recheck(finance,'payments',intentId,cmd(2)),{status:429});
      const refund=await admin.detail(finance,'refunds',refundId);await admin.recheck(finance,'refunds',refundId,cmd(refund.record.version));
      assert.equal((await client.query('SELECT count(*)::int n FROM payment_service.refunds WHERE id=$1',[refundId])).rows[0].n,1);
      assert.equal((await client.query('SELECT count(*)::int n FROM payment_service.admin_operations WHERE actor_id=$1',[finance.id])).rows[0].n,2);
    });
    await t.test('verified money with unpaid Order is flagged; Order outage stays unavailable without changing payment',async()=>{
      await client.query("INSERT INTO payment_service.payment_transactions(intent_id,provider,provider_txn_id,amount_minor,status,source,payload_digest) VALUES($1,'MOMO',$2,100000,'SUCCEEDED','webhook','digest')",[intentId,'TX-'+intentId]);
      const original=payment.group;payment.group=async()=>({paymentStatus:'UNPAID',orders:[{id:shopId,status:'PENDING_PAYMENT',paymentStatus:'UNPAID',amountMinor:100000}]});
      assert.equal((await admin.detail(finance,'payments',intentId)).orderSource.needsReview,true);
      payment.group=async()=>{throw Error('Order unavailable with a secret marker');};const detail=await admin.detail(finance,'payments',intentId);
      assert.equal(detail.orderSource.available,false);assert.equal(detail.amounts.paid,100000);assert.ok(!JSON.stringify(detail).includes('secret marker'));payment.group=original;
    });
    await t.test('audit failure rolls scheduling back and completed transactions reject recheck',async()=>{
      await client.query("UPDATE payment_service.payment_intents SET admin_recheck_requested_at=NULL WHERE id=$1",[intentId]);
      const version=Number((await client.query('SELECT version FROM payment_service.payment_intents WHERE id=$1',[intentId])).rows[0].version);
      await client.query("CREATE FUNCTION payment_service.fail_ops_audit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'audit unavailable'; END $$");
      await client.query('CREATE TRIGGER fail_ops_audit BEFORE INSERT ON payment_service.admin_operations FOR EACH ROW EXECUTE FUNCTION payment_service.fail_ops_audit()');
      await assert.rejects(admin.recheck(finance,'payments',intentId,cmd(version)));
      assert.equal((await client.query('SELECT admin_recheck_requested_at FROM payment_service.payment_intents WHERE id=$1',[intentId])).rows[0].admin_recheck_requested_at,null);
      await client.query('DROP TRIGGER fail_ops_audit ON payment_service.admin_operations');
      await client.query("UPDATE payment_service.payment_intents SET status='SUCCEEDED' WHERE id=$1",[intentId]);
      await assert.rejects(admin.recheck(finance,'payments',intentId,cmd(version)),{status:409});
    });
    await t.test('HTTP requires authenticated finance and exact write origin',async()=>{
      const {createHandler}=await import('../src/server.js');let user=actor('customer_support');payment.identity=async bearer=>{if(!bearer)throw Object.assign(Error('Sign in'),{status:401,code:'UNAUTHORIZED'});return user;};
      const server=http.createServer(createHandler(payment));await new Promise(done=>server.listen(0,'127.0.0.1',done));const base=`http://127.0.0.1:${server.address().port}/api/v2/admin/transactions/payments`;
      try{assert.equal((await fetch(base,{headers:{Authorization:'Bearer test'}})).status,403);user=finance;assert.equal((await fetch(base+'?q='+groupId,{headers:{Authorization:'Bearer test'}})).status,200);
        assert.equal((await fetch(base+'/'+intentId+'/recheck',{method:'POST',headers:{Authorization:'Bearer test','Content-Type':'application/json',Origin:'https://wrong.example'},body:JSON.stringify(cmd(1))})).status,403);
      }finally{await new Promise(done=>server.close(done));}
    });
  }finally{await client.query('ROLLBACK');await client.end();}
});
