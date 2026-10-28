import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { randomUUID, createHash } from 'node:crypto';
import pg from 'pg';
import { PaymentService } from '../../services/payment-service/src/service.js';
import { createHandler } from '../../services/payment-service/src/server.js';
import { hmac, momoSignatures } from '../../services/payment-service/src/momo.js';

const enabled=Boolean(process.env.PAYMENT_TEST_DATABASE_URL && process.env.IDENTITY_TEST_API_URL &&
  process.env.CATALOG_TEST_API_URL && process.env.ORDER_PAYMENT_TOKEN && process.env.PAYMENT_INTERNAL_TOKEN);
const identity=process.env.IDENTITY_TEST_API_URL,catalog=process.env.CATALOG_TEST_API_URL;
const origin=process.env.FRONTEND_ORIGIN||'http://localhost:5173';
const sign=(secret,object,names)=>hmac(secret,names.map(name=>`${name}=${String(object[name]??'')}`).join('&'));
async function call(base,path,method='GET',data,headers={}) {
  const response=await fetch(base+path,{ method,headers:{
    ...(data?{ 'Content-Type':'application/json' }:{}),
    ...(method!=='GET' && !headers['X-Payment-Internal-Token']?{ Origin:origin }:{}),...headers },
    ...(data?{ body:JSON.stringify(data) }:{}) });
  return { status:response.status,body:await response.json() };
}
const listen=server=>new Promise(resolve=>server.listen(0,'127.0.0.1',()=>resolve(server.address().port)));
const close=server=>new Promise(resolve=>server.close(resolve));
async function ready(url) {
  for(let i=0;i<60;i++) {
    try { await fetch(url); return; } catch { await new Promise(resolve=>setTimeout(resolve,100)); }
  }
  throw new Error('Order test server did not start');
}
test('MoMo and VietQR signed or token-verified callbacks, refunds and reconciliation', { skip:!enabled },async()=>{
  const pool=new pg.Pool({ connectionString:process.env.PAYMENT_TEST_DATABASE_URL });
  const providerSecret='test-momo-secret-'+randomUUID();
  const partnerCode='MOMO_TEST',accessKey='ACCESS_TEST';
  const providerState=new Map();
  const providerServer=createServer(async(req,res)=>{
    const chunks=[];for await(const chunk of req) chunks.push(chunk);
    const raw=Buffer.concat(chunks).toString('utf8');
    const input=JSON.parse(raw.replace(/"transId"\s*:\s*(\d+)/g,'"transId":"$1"')||'{}');
    const reply=(data)=>{ res.writeHead(200,{ 'Content-Type':'application/json' });res.end(JSON.stringify(data)); };
    if(req.url==='/v2/gateway/api/create') {
      assert.equal(input.signature,sign(providerSecret,{ accessKey,...input },momoSignatures.createFields));
      providerState.set(input.orderId,{ amount:input.amount,
        transId:String(9007199254740993n+BigInt(providerState.size)) });
      const output={ partnerCode,requestId:input.requestId,orderId:input.orderId,amount:input.amount,
        responseTime:Date.now(),message:'Successful.',resultCode:0,
        payUrl:'https://test-payment.momo.vn/mock/'+input.orderId,qrCodeUrl:'MOCK_QR' };
      output.signature=sign(providerSecret,{ accessKey,...output },momoSignatures.createResponseFields);
      reply(output);
    } else if(req.url==='/v2/gateway/api/query') {
      assert.equal(input.signature,sign(providerSecret,{ accessKey,...input },momoSignatures.queryFields));
      const state=providerState.get(input.orderId);
      reply({ partnerCode,requestId:input.requestId,orderId:input.orderId,
        amount:state.amount,resultCode:state.querySuccess?0:1000,transId:state.transId });
    } else if(req.url==='/v2/paymentRequests') {
      assert.equal(req.headers['x-client-id'],'TEST_CLIENT');
      assert.equal(req.headers['x-api-key'],'TEST_KEY');
      reply({ code:'00',desc:'Success',data:{ orderCode:input.orderCode,amount:input.amount,
        status:'PENDING',checkoutUrl:'https://api.vietqr.io/web/mock-'+input.orderCode } });
    } else if(req.url==='/v2/gateway/api/refund') {
      assert.equal(input.signature,sign(providerSecret,{ accessKey,...input },momoSignatures.refundFields));
      assert.ok([...providerState.values()].some(item=>item.transId===input.transId));
      assert.ok(raw.includes('"transId":'+input.transId));
      reply({ partnerCode,requestId:input.requestId,orderId:input.orderId,amount:input.amount,
        resultCode:0,transId:String(990000+Number(input.amount)) });
    } else if(req.url==='/v2/gateway/api/refund/query') reply({
      partnerCode,requestId:input.requestId,orderId:input.orderId,resultCode:0 });
    else { res.writeHead(404);res.end(); }
  });
  let paymentServer,orderProcess,userId,storeId;
  const intentIds=[],groupIds=[],deliveryIds=[],vietqrDeliveryIds=[];
  try {
    await pool.query(`UPDATE auth_rate_limits SET window_start=now()-interval '1 hour'
      WHERE bucket IN ('register:ip:127.0.0.1','register:ip:::ffff:127.0.0.1','register:ip:::1',
        'login:ip:127.0.0.1','login:ip:::ffff:127.0.0.1','login:ip:::1')`);
    const providerPort=await listen(providerServer);
    const orderPort=5500+Math.floor(Math.random()*400);
    const onlineOrder=`http://127.0.0.1:${orderPort}`;
    const orderScript=fileURLToPath(new URL('../../services/order-service/src/server.js',import.meta.url));
    orderProcess=spawn(process.execPath,[orderScript],{ cwd:fileURLToPath(new URL('../../',import.meta.url)),
      env:{ ...process.env,ORDER_PORT:String(orderPort),ORDER_ONLINE_METHODS:'MOMO,VIETQR' },
      stdio:'ignore',windowsHide:true });
    await ready(onlineOrder+'/api/v2/cart');
    const paymentService=new PaymentService(pool,{ identityUrl:identity,orderUrl:onlineOrder,
      orderToken:process.env.ORDER_PAYMENT_TOKEN,
      momo:{ baseUrl:`http://127.0.0.1:${providerPort}`,partnerCode,accessKey,secretKey:providerSecret,
        ipnUrl:'https://merchant.example.test/api/v2/payments/webhooks/momo',
        redirectUrl:'https://merchant.example.test/payments/return' },
      vietqr:{ baseUrl:`http://127.0.0.1:${providerPort}`,clientId:'TEST_CLIENT',
        apiKey:'TEST_KEY',webhookToken:'TEST_SECURE',
        returnUrl:'https://merchant.example.test/payments/return' } });
    paymentServer=createServer(createHandler(paymentService));
    const paymentPort=await listen(paymentServer);
    const pay=`http://127.0.0.1:${paymentPort}`;
    const email=`payment-momo-${randomUUID()}@example.test`,password='test-password-123';
    const registered=await call(identity,'/api/v2/auth/register','POST',
      { email,fullName:'MoMo Buyer',password,confirmPassword:password });
    assert.equal(registered.status,201,JSON.stringify(registered.body));userId=registered.body.user.id;
    const login=await call(identity,'/api/v2/auth/login','POST',{ email,password });
    assert.equal(login.status,200);const auth={ Authorization:`Bearer ${login.body.accessToken}` };
    const address=await call(identity,'/api/v2/users/me/addresses','POST',{
      receiverName:'MoMo Recipient',receiverPhone:'+84901234567',provinceCode:'01',
      districtCode:'001',wardCode:'00001',addressLine:'123 MoMo Street',isDefault:true },auth);
    assert.equal(address.status,201);
    const store=await call(catalog,'/api/v2/seller/stores','POST',{
      name:'MoMo Payment Store',contactEmail:email,contactPhone:'+84901234567',
      pickupAddress:'123 MoMo Street' },auth);
    assert.equal(store.status,201);storeId=store.body.store.id;
    const product=await call(catalog,`/api/v2/seller/stores/${storeId}/products`,'POST',
      { title:'MoMo Payment Product',priceMinor:100000,stock:5 },auth);
    assert.equal(product.status,201);
    assert.equal((await call(catalog,`/api/v2/seller/products/${product.body.product.id}/publish`,'POST',{},auth)).status,200);
    async function createOrder(method='MOMO') {
      await call(onlineOrder,'/api/v2/cart/items','POST',
        { variantId:product.body.product.variants[0].id,quantity:1 },auth);
      const preview=await call(onlineOrder,'/api/v2/checkout/preview','POST',
        { addressId:address.body.address.id,paymentMethod:method },auth);
      assert.equal(preview.status,200,JSON.stringify(preview.body));
      const placed=await call(onlineOrder,'/api/v2/checkout/place-order','POST',{
        quoteId:preview.body.quoteId,addressId:address.body.address.id,paymentMethod:method,
        idempotencyKey:'online-'+randomUUID(),expectedTotalMinor:130000 },auth);
      assert.equal(placed.status,201,JSON.stringify(placed.body));
      groupIds.push(placed.body.groupId);
      assert.equal(placed.body.orders[0].status,'PENDING_PAYMENT');
      return { groupId:placed.body.groupId,shopId:placed.body.orders[0].id };
    }
    const first=await createOrder();
    const methods=await call(pay,'/api/v2/payments/methods','GET',undefined,auth);
    assert.ok(methods.body.methods.some(item=>item.code==='MOMO'));
    const created=await call(pay,'/api/v2/payments/intents','POST',{
      orderGroupId:first.groupId,method:'MOMO',idempotencyKey:'intent-'+first.groupId,
      amountMinor:1 },auth);
    assert.equal(created.status,201,JSON.stringify(created.body));
    assert.equal(created.body.intent.status,'PENDING');
    assert.equal(created.body.intent.amountMinor,130000);
    assert.equal(created.body.intent.qrData,'MOCK_QR');
    intentIds.push(created.body.intent.id);
    assert.equal((await call(onlineOrder,`/api/v2/orders/${first.groupId}`,'GET',undefined,auth)).body.group.paymentStatus,'UNPAID');
    const intentRow=(await pool.query('SELECT * FROM payment_service.payment_intents WHERE id=$1',[created.body.intent.id])).rows[0];
    const ipn={ orderType:'momo_wallet',amount:130000,partnerCode,
      orderId:intentRow.provider_order_ref,extraData:'',transId:'9007199254740993',responseTime:Date.now(),
      resultCode:0,message:'Successful.',payType:'qr',requestId:intentRow.provider_request_id,
      orderInfo:`MDUC247 ${first.groupId}` };
    ipn.signature=sign(providerSecret,{ accessKey,...ipn },momoSignatures.ipnFields);
    const badSignature=await call(pay,'/api/v2/payments/webhooks/momo','POST',{ ...ipn,signature:'0'.repeat(64) });
    assert.equal(badSignature.status,403);
    deliveryIds.push('invalid:'+createHash('sha256').update(JSON.stringify({ ...ipn,signature:'0'.repeat(64) })).digest('hex'));
    const wrongAmount={ ...ipn,amount:1 };
    wrongAmount.signature=sign(providerSecret,{ accessKey,...wrongAmount },momoSignatures.ipnFields);
    assert.equal((await call(pay,'/api/v2/payments/webhooks/momo','POST',wrongAmount)).body.code,'PAYMENT_MISMATCH');
    deliveryIds.push('rejected:'+createHash('sha256').update(JSON.stringify(wrongAmount)).digest('hex'));
    const wrongOrder={ ...ipn,orderId:randomUUID() };
    wrongOrder.signature=sign(providerSecret,{ accessKey,...wrongOrder },momoSignatures.ipnFields);
    assert.equal((await call(pay,'/api/v2/payments/webhooks/momo','POST',wrongOrder)).body.code,'PAYMENT_MISMATCH');
    deliveryIds.push('rejected:'+createHash('sha256').update(JSON.stringify(wrongOrder)).digest('hex'));
    assert.equal((await pool.query('SELECT count(*)::int AS count FROM payment_service.payment_transactions WHERE intent_id=$1',
      [intentRow.id])).rows[0].count,0);
    const numericIpn=JSON.stringify(ipn).replace('"transId":"9007199254740993"','"transId":9007199254740993');
    const received=await Promise.all(Array.from({ length:10 },async()=>{
      const response=await fetch(pay+'/api/v2/payments/webhooks/momo',{
        method:'POST',headers:{ 'Content-Type':'application/json',Origin:origin },body:numericIpn });
      return { status:response.status,body:await response.json() };
    }));
    assert.ok(received.every(item=>item.status===200),JSON.stringify(received));
    deliveryIds.push(`${ipn.orderId}:${ipn.transId}:0`);
    assert.equal((await pool.query('SELECT count(*)::int AS count FROM payment_service.payment_transactions WHERE intent_id=$1',
      [intentRow.id])).rows[0].count,1);
    for(let i=0;i<10;i++) await paymentService.publishOutbox();
    assert.equal((await call(onlineOrder,`/api/v2/orders/${first.groupId}`,'GET',undefined,auth)).body.group.paymentStatus,'PAID');
    const internal={ 'X-Payment-Internal-Token':process.env.PAYMENT_INTERNAL_TOKEN };
    for(const amountMinor of [50000,80000]) {
      const refundKey='refund-'+randomUUID();
      const refundPayload={
        groupId:first.groupId,shopOrderId:first.shopId,amountMinor,reason:'Customer return',
        idempotencyKey:refundKey };
      const refund=await call(pay,'/api/v2/internal/refunds','POST',refundPayload,internal);
      assert.equal(refund.status,202,JSON.stringify(refund.body));
      assert.equal(refund.body.refund.status,'SUCCEEDED');
      const duplicate=await call(pay,'/api/v2/internal/refunds','POST',refundPayload,internal);
      assert.equal(duplicate.status,202,JSON.stringify(duplicate.body));
      assert.equal(duplicate.body.refund.id,refund.body.refund.id);
      if(amountMinor===50000) assert.equal((await call(pay,'/api/v2/internal/refunds','POST',{
        groupId:first.groupId,shopOrderId:first.shopId,amountMinor:90000,
        reason:'Over refund',idempotencyKey:'refund-'+randomUUID() },internal)).body.code,'REFUND_LIMIT');
    }
    const excessive=await call(pay,'/api/v2/internal/refunds','POST',{
      groupId:first.groupId,shopOrderId:first.shopId,amountMinor:1,reason:'Extra refund',
      idempotencyKey:'refund-'+randomUUID() },internal);
    assert.ok(excessive.status>=400);
    assert.equal((await pool.query(`SELECT sum(amount_minor)::bigint AS total FROM payment_service.refunds
      WHERE shop_order_id=$1 AND status='SUCCEEDED'`,[first.shopId])).rows[0].total,'130000');
    for(let i=0;i<10;i++) await paymentService.publishOutbox();
    const refunded=await call(onlineOrder,`/api/v2/orders/${first.groupId}`,'GET',undefined,auth);
    assert.equal(refunded.body.group.paymentStatus,'REFUNDED');
    assert.equal(refunded.body.group.orders[0].refundedMinor,130000);
    const second=await createOrder();
    const pending=await call(pay,'/api/v2/payments/intents','POST',{
      orderGroupId:second.groupId,method:'MOMO',idempotencyKey:'intent-'+second.groupId },auth);
    assert.equal(pending.status,201);
    intentIds.push(pending.body.intent.id);
    providerState.get(pending.body.intent.id).querySuccess=true;
    await pool.query(`UPDATE payment_service.payment_intents
      SET created_at=now()-interval '1 minute',next_reconcile_at=now()-interval '1 second'
      WHERE id=$1`,[pending.body.intent.id]);
    assert.equal(await paymentService.reconcileOne(),true);
    for(let i=0;i<10;i++) await paymentService.publishOutbox();
    assert.equal((await call(onlineOrder,`/api/v2/orders/${second.groupId}`,'GET',undefined,auth)).body.group.paymentStatus,'PAID');
    deliveryIds.push(`query:${pending.body.intent.id}:${providerState.get(pending.body.intent.id).transId}:0`);
    const cancelledOnline=await call(onlineOrder,`/api/v2/orders/${second.groupId}/cancel`,'POST',{
      shopOrderId:second.shopId,expectedVersion:3,reason:'Changed mind',
      idempotencyKey:'cancel-'+randomUUID() },auth);
    assert.equal(cancelledOnline.status,200,JSON.stringify(cancelledOnline.body));
    assert.equal(await paymentService.reconcileCancelledOrders(),1);
    for(let i=0;i<10;i++) await paymentService.publishOutbox();
    assert.equal((await call(onlineOrder,`/api/v2/orders/${second.groupId}`,'GET',undefined,auth)).body.group.paymentStatus,'REFUNDED');
    const failedOrder=await createOrder('MOMO');
    const failedIntent=await call(pay,'/api/v2/payments/intents','POST',{
      orderGroupId:failedOrder.groupId,method:'MOMO',idempotencyKey:'intent-'+failedOrder.groupId },auth);
    assert.equal(failedIntent.status,201);intentIds.push(failedIntent.body.intent.id);
    const failedRow=(await pool.query('SELECT * FROM payment_service.payment_intents WHERE id=$1',
      [failedIntent.body.intent.id])).rows[0];
    const failedIpn={ ...ipn,orderId:failedRow.provider_order_ref,requestId:failedRow.provider_request_id,
      orderInfo:`MDUC247 ${failedOrder.groupId}`,transId:providerState.get(failedRow.id).transId,
      resultCode:1006,responseTime:Date.now(),message:'User denied.' };
    failedIpn.signature=sign(providerSecret,{ accessKey,...failedIpn },momoSignatures.ipnFields);
    assert.equal((await call(pay,'/api/v2/payments/webhooks/momo','POST',failedIpn)).status,200);
    deliveryIds.push(`${failedIpn.orderId}:${failedIpn.transId}:1006`);
    assert.equal((await pool.query('SELECT status FROM payment_service.payment_intents WHERE id=$1',
      [failedRow.id])).rows[0].status,'FAILED');
    for(let i=0;i<10;i++) await paymentService.publishOutbox();
    assert.equal((await call(onlineOrder,`/api/v2/orders/${failedOrder.groupId}`,'GET',undefined,auth)).body.group.status,'CANCELLED');
    const third=await createOrder('VIETQR');
    assert.ok(methods.body.methods.some(item=>item.code==='VIETQR'));
    const qr=await call(pay,'/api/v2/payments/intents','POST',{
      orderGroupId:third.groupId,method:'VIETQR',idempotencyKey:'intent-'+third.groupId },auth);
    assert.equal(qr.status,201,JSON.stringify(qr.body));
    assert.equal(qr.body.intent.status,'PENDING');
    assert.equal((await call(onlineOrder,`/api/v2/orders/${third.groupId}`,'GET',undefined,auth)).body.group.paymentStatus,'UNPAID');
    intentIds.push(qr.body.intent.id);
    const qrRow=(await pool.query('SELECT * FROM payment_service.payment_intents WHERE id=$1',[qr.body.intent.id])).rows[0];
    const transfer={ orderCode:Number(qrRow.provider_order_code),amount:130000,
      description:`MDUC247 ${qrRow.provider_order_code}`,reference:'BANK-'+randomUUID(),code:'00' };
    const bankPayload={ code:'00',desc:'Success',data:[transfer] };
    assert.equal((await call(pay,'/api/v2/payments/webhooks/bank','POST',bankPayload,
      { 'secure-token':'WRONG_TOKEN' })).status,403);
    assert.equal((await call(pay,'/api/v2/payments/webhooks/bank','POST',
      { ...bankPayload,data:[{ ...transfer,amount:1 }] },{ 'secure-token':'TEST_SECURE' })).body.code,'PAYMENT_MISMATCH');
    vietqrDeliveryIds.push('rejected:'+createHash('sha256').update(JSON.stringify({ ...transfer,amount:1 })).digest('hex'));
    const bankResults=await Promise.all(Array.from({ length:10 },()=>call(pay,
      '/api/v2/payments/webhooks/bank','POST',bankPayload,{ 'secure-token':'TEST_SECURE' })));
    assert.ok(bankResults.every(item=>item.status===200),JSON.stringify(bankResults));
    vietqrDeliveryIds.push(transfer.reference);
    assert.equal((await pool.query('SELECT count(*)::int AS count FROM payment_service.payment_transactions WHERE intent_id=$1',
      [qrRow.id])).rows[0].count,1);
    for(let i=0;i<10;i++) await paymentService.publishOutbox();
    assert.equal((await call(onlineOrder,`/api/v2/orders/${third.groupId}`,'GET',undefined,auth)).body.group.paymentStatus,'PAID');
    const bankRefund=await call(pay,'/api/v2/internal/refunds','POST',{
      groupId:third.groupId,shopOrderId:third.shopId,amountMinor:130000,
      reason:'Returned item',idempotencyKey:'refund-'+randomUUID() },internal);
    assert.equal(bankRefund.status,202);
    assert.equal(bankRefund.body.refund.status,'PENDING');
    assert.equal((await call(pay,`/api/v2/internal/refunds/${bankRefund.body.refund.id}/settle`,'POST',
      { bankReference:'UNVERIFIED-'+randomUUID() },internal)).status,403);
    const bankReference='SETTLE-'+randomUUID();
    const settlementHeader={ 'X-Payment-Settlement-Token':process.env.PAYMENT_SETTLEMENT_TOKEN };
    const settled=await call(pay,`/api/v2/internal/refunds/${bankRefund.body.refund.id}/settle`,'POST',
      { bankReference },settlementHeader);
    assert.equal(settled.body.refund.status,'SUCCEEDED');
    assert.equal((await call(pay,`/api/v2/internal/refunds/${bankRefund.body.refund.id}/settle`,'POST',
      { bankReference },settlementHeader)).body.idempotent,true);
    assert.equal((await call(pay,`/api/v2/internal/refunds/${bankRefund.body.refund.id}/settle`,'POST',
      { bankReference:'DIFFERENT-'+randomUUID() },settlementHeader)).body.code,'SETTLEMENT_CONFLICT');
    for(let i=0;i<10;i++) await paymentService.publishOutbox();
    assert.equal((await call(onlineOrder,`/api/v2/orders/${third.groupId}`,'GET',undefined,auth)).body.group.paymentStatus,'REFUNDED');
    const fourth=await createOrder('VIETQR');
    const lost=await call(pay,'/api/v2/payments/intents','POST',{
      orderGroupId:fourth.groupId,method:'VIETQR',idempotencyKey:'intent-'+fourth.groupId },auth);
    assert.equal(lost.status,201);intentIds.push(lost.body.intent.id);
    await pool.query(`UPDATE payment_service.payment_intents SET expires_at=now()-interval '1 minute',
      created_at=now()-interval '20 minutes',next_reconcile_at=now()-interval '1 second' WHERE id=$1`,
      [lost.body.intent.id]);
    assert.equal(await paymentService.reconcileOne(),true);
    const expired=(await pool.query('SELECT status,review_required FROM payment_service.payment_intents WHERE id=$1',
      [lost.body.intent.id])).rows[0];
    assert.equal(expired.status,'EXPIRED');
    assert.equal(expired.review_required,true);
    assert.ok((await paymentService.report()).discrepancies.some(item=>item.intent_id===lost.body.intent.id));
    for(let i=0;i<10;i++) await paymentService.publishOutbox();
    assert.equal((await call(onlineOrder,`/api/v2/orders/${fourth.groupId}`,'GET',undefined,auth)).body.group.status,'CANCELLED');
    const lostRow=(await pool.query('SELECT * FROM payment_service.payment_intents WHERE id=$1',[lost.body.intent.id])).rows[0];
    const late={ orderCode:Number(lostRow.provider_order_code),amount:130000,
      description:`MDUC247 ${lostRow.provider_order_code}`,reference:'LATE-'+randomUUID(),code:'00' };
    assert.equal((await call(pay,'/api/v2/payments/webhooks/bank','POST',
      { code:'00',desc:'Success',data:[late] },{ 'secure-token':'TEST_SECURE' })).status,200);
    vietqrDeliveryIds.push(late.reference);
    assert.equal((await pool.query('SELECT review_required FROM payment_service.payment_intents WHERE id=$1',
      [lostRow.id])).rows[0].review_required,true);
  } finally {
    if (userId) {
      const outboxIds=(await pool.query('SELECT id FROM payment_service.payment_outbox WHERE aggregate_id=ANY($1::uuid[])',[intentIds]))
        .rows.map(row=>'payment:'+row.id);
      if(outboxIds.length) await pool.query('DELETE FROM order_service.payment_inbox WHERE event_id=ANY($1::text[])',[outboxIds]);
      await pool.query('DELETE FROM payment_service.payment_outbox WHERE aggregate_id=ANY($1::uuid[])',[intentIds]);
      await pool.query('DELETE FROM payment_service.payment_reconciliation WHERE intent_id=ANY($1::uuid[])',[intentIds]);
      await pool.query('DELETE FROM payment_service.refunds WHERE payment_intent_id=ANY($1::uuid[])',[intentIds]);
      await pool.query('DELETE FROM payment_service.payment_transactions WHERE intent_id=ANY($1::uuid[])',[intentIds]);
      if(deliveryIds.length) await pool.query("DELETE FROM payment_service.payment_webhook_inbox WHERE provider='MOMO' AND delivery_id=ANY($1::text[])",[deliveryIds]);
      if(vietqrDeliveryIds.length) await pool.query("DELETE FROM payment_service.payment_webhook_inbox WHERE provider='VIETQR' AND delivery_id=ANY($1::text[])",[vietqrDeliveryIds]);
      await pool.query('DELETE FROM payment_service.payment_intents WHERE id=ANY($1::uuid[])',[intentIds]);
      await pool.query('DELETE FROM order_service.order_outbox WHERE aggregate_id IN (SELECT id FROM order_service.orders WHERE user_id=$1) OR aggregate_id=ANY($2::uuid[])',[userId,groupIds]);
      await pool.query('DELETE FROM order_service.order_commands WHERE shop_order_id IN (SELECT id FROM order_service.orders WHERE user_id=$1)',[userId]);
      await pool.query('DELETE FROM order_service.order_status_history WHERE shop_order_id IN (SELECT id FROM order_service.orders WHERE user_id=$1)',[userId]);
      await pool.query('DELETE FROM order_service.order_discounts WHERE shop_order_id IN (SELECT id FROM order_service.orders WHERE user_id=$1)',[userId]);
      await pool.query('DELETE FROM order_service.order_items WHERE order_id IN (SELECT id FROM order_service.orders WHERE user_id=$1)',[userId]);
      await pool.query('DELETE FROM order_service.orders WHERE user_id=$1',[userId]);
      await pool.query('DELETE FROM order_service.order_groups WHERE buyer_id=$1',[userId]);
      await pool.query('DELETE FROM order_service.checkout_idempotency WHERE user_id=$1',[userId]);
      await pool.query('DELETE FROM order_service.checkout_quotes WHERE user_id=$1',[userId]);
      await pool.query('DELETE FROM order_service.carts WHERE user_id=$1',[userId]);
    }
    if (storeId) {
      await pool.query('DELETE FROM catalog.inventory_reservations r USING catalog.product_variants v WHERE r.variant_id=v.id AND v.store_id=$1',[storeId]);
      await pool.query('DELETE FROM catalog.inventory_movements m USING catalog.product_variants v WHERE m.variant_id=v.id AND v.store_id=$1',[storeId]);
      await pool.query('DELETE FROM catalog.inventory i USING catalog.product_variants v WHERE i.variant_id=v.id AND v.store_id=$1',[storeId]);
      await pool.query('DELETE FROM catalog.store_audit_logs WHERE store_id=$1',[storeId]);
      await pool.query(`DELETE FROM catalog.store_outbox WHERE payload->>'storeId'=$1::text
        OR payload->>'variantId' IN (SELECT id::text FROM catalog.product_variants WHERE store_id=$1::uuid)`,[storeId]);
      await pool.query('DELETE FROM catalog.store_profile_versions WHERE store_id=$1',[storeId]);
      await pool.query('DELETE FROM catalog.stores WHERE id=$1',[storeId]);
    }
    if (userId) await pool.query('DELETE FROM users WHERE id=$1',[userId]);
    if(paymentServer) await close(paymentServer);
    if(providerServer.listening) await close(providerServer);
    if(orderProcess) orderProcess.kill();
    await pool.end();
  }
});
