import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { PaymentService } from '../../services/payment-service/src/service.js';

const enabled=Boolean(process.env.PAYMENT_TEST_DATABASE_URL && process.env.IDENTITY_TEST_API_URL &&
  process.env.CATALOG_TEST_API_URL && process.env.ORDER_TEST_API_URL && process.env.PAYMENT_TEST_API_URL &&
  process.env.PAYMENT_INTERNAL_TOKEN && process.env.ORDER_PAYMENT_TOKEN);
const origin=process.env.FRONTEND_ORIGIN||'http://localhost:5173';
const identity=process.env.IDENTITY_TEST_API_URL,catalog=process.env.CATALOG_TEST_API_URL,
  order=process.env.ORDER_TEST_API_URL,payment=process.env.PAYMENT_TEST_API_URL;
async function call(base,path,method='GET',data,headers={}) {
  const response=await fetch(base+path,{ method,headers:{
    ...(data?{ 'Content-Type':'application/json' }:{}),
    ...(method!=='GET' && !headers['X-Payment-Internal-Token'] && !headers['X-Delivery-Token']?{ Origin:origin }:{}),
    ...headers },...(data?{ body:JSON.stringify(data) }:{}) });
  return { status:response.status,body:await response.json() };
}
test('COD is unpaid until verified collection; duplicate collection records money once', { skip:!enabled },async()=>{
  const pool=new pg.Pool({ connectionString:process.env.PAYMENT_TEST_DATABASE_URL });
  const email=`payment-cod-${randomUUID()}@example.test`,password='test-password-123';
  let userId,storeId,collectionEventId;
  try {
    await pool.query(`UPDATE auth_rate_limits SET window_start=now()-interval '1 hour'
      WHERE bucket IN ('register:ip:127.0.0.1','register:ip:::ffff:127.0.0.1','register:ip:::1',
        'login:ip:127.0.0.1','login:ip:::ffff:127.0.0.1','login:ip:::1')`);
    const registration=await call(identity,'/api/v2/auth/register','POST',
      { email,fullName:'Payment COD Buyer',password,confirmPassword:password });
    assert.equal(registration.status,201,JSON.stringify(registration.body));userId=registration.body.user.id;
    const login=await call(identity,'/api/v2/auth/login','POST',{ email,password });
    assert.equal(login.status,200);const auth={ Authorization:`Bearer ${login.body.accessToken}` };
    const address=await call(identity,'/api/v2/users/me/addresses','POST',{
      receiverName:'COD Recipient',receiverPhone:'+84901234567',provinceCode:'01',districtCode:'001',
      wardCode:'00001',addressLine:'123 COD Street',isDefault:true },auth);
    assert.equal(address.status,201);
    const store=await call(catalog,'/api/v2/seller/stores','POST',{
      name:'Payment COD Shop',contactEmail:email,contactPhone:'+84901234567',
      pickupAddress:'123 COD Street' },auth);
    assert.equal(store.status,201);storeId=store.body.store.id;
    const product=await call(catalog,`/api/v2/seller/stores/${storeId}/products`,'POST',
      { title:'Payment COD Product',priceMinor:100000,stock:2 },auth);
    assert.equal(product.status,201);
    const productId=product.body.product.id,variantId=product.body.product.variants[0].id;
    assert.equal((await call(catalog,`/api/v2/seller/products/${productId}/publish`,'POST',{},auth)).status,200);
    await call(order,'/api/v2/cart/items','POST',{ variantId,quantity:1 },auth);
    const quote=await call(order,'/api/v2/checkout/preview','POST',{
      addressId:address.body.address.id,paymentMethod:'COD' },auth);
    const placed=await call(order,'/api/v2/checkout/place-order','POST',{
      quoteId:quote.body.quoteId,addressId:address.body.address.id,paymentMethod:'COD',
      idempotencyKey:'pay-'+randomUUID(),expectedTotalMinor:130000 },auth);
    assert.equal(placed.status,201,JSON.stringify(placed.body));
    const groupId=placed.body.groupId,shopId=placed.body.orders[0].id;
    const methods=await call(payment,'/api/v2/payments/methods','GET',undefined,auth);
    assert.equal(methods.status,200);
    assert.ok(methods.body.methods.some(item=>item.code==='COD'));
    const unpaid=await call(payment,`/api/v2/orders/${groupId}/payments`,'GET',undefined,auth);
    assert.equal(unpaid.status,200,JSON.stringify(unpaid.body));
    assert.equal(unpaid.body.intents[0].status,'UNPAID');
    assert.equal(unpaid.body.intents[0].amountMinor,130000);
    const intentId=unpaid.body.intents[0].id;
    assert.equal((await call(payment,`/api/v2/payments/intents/${intentId}`,'GET',undefined,auth)).body.intent.status,'UNPAID');
    const internal={ 'X-Payment-Internal-Token':process.env.PAYMENT_INTERNAL_TOKEN };
    const early=await call(payment,'/api/v2/internal/cod-collections','POST',{
      eventId:'cod-'+randomUUID(),groupId,shopOrderId:shopId,amountMinor:130000,
      providerTransactionId:'delivery-'+randomUUID() },internal);
    assert.equal(early.status,409);
    const confirm=await call(order,`/api/v2/seller/orders/${shopId}/confirm`,'POST',
      { expectedVersion:2,idempotencyKey:'confirm-'+randomUUID() },auth);
    assert.equal(confirm.status,200);
    await call(order,`/api/v2/seller/orders/${shopId}/prepare`,'POST',
      { expectedVersion:3,idempotencyKey:'prepare-'+randomUUID() },auth);
    await call(order,`/api/v2/seller/orders/${shopId}/ready-to-ship`,'POST',
      { expectedVersion:4,idempotencyKey:'ready-'+randomUUID() },auth);
    const delivery={ 'X-Delivery-Token':process.env.ORDER_DELIVERY_TOKEN };
    assert.equal((await call(order,'/api/v2/internal/delivery-events','POST',{
      eventId:'ship-'+randomUUID(),shopOrderId:shopId,type:'ShipmentAccepted.v1',shipmentRef:'COD-SHIP-1' },delivery)).status,200);
    assert.equal((await call(order,'/api/v2/internal/delivery-events','POST',{
      eventId:'delivered-'+randomUUID(),shopOrderId:shopId,type:'ShipmentDelivered.v1',
      shipmentRef:'COD-SHIP-1' },delivery)).status,200);
    const event={ eventId:'collection-'+randomUUID(),groupId,shopOrderId:shopId,amountMinor:130000,
      providerTransactionId:'cash-'+randomUUID() };
    collectionEventId=event.eventId;
    const collected=await call(payment,'/api/v2/internal/cod-collections','POST',event,internal);
    assert.equal(collected.status,200,JSON.stringify(collected.body));
    assert.equal(collected.body.intent.status,'SUCCEEDED');
    const repeats=await Promise.all(Array.from({ length:10 },()=>call(payment,
      '/api/v2/internal/cod-collections','POST',event,internal)));
    assert.ok(repeats.every(item=>item.status===200 && item.body.idempotent));
    assert.equal((await pool.query("SELECT count(*)::int AS count FROM payment_service.payment_transactions WHERE intent_id=$1",
      [intentId])).rows[0].count,1);
    const publisher=new PaymentService(pool,{ orderUrl:order,orderToken:process.env.ORDER_PAYMENT_TOKEN,
      identityUrl:identity,momo:{},vietqr:{} });
    for(let i=0;i<10;i++) await publisher.publishOutbox();
    const group=await call(order,`/api/v2/orders/${groupId}`,'GET',undefined,auth);
    assert.equal(group.body.group.paymentStatus,'PAID');
    const paymentState=await call(payment,`/api/v2/orders/${groupId}/payments`,'GET',undefined,auth);
    assert.equal(paymentState.body.intents[0].status,'SUCCEEDED');
  } finally {
    if (userId) {
      await pool.query('DELETE FROM payment_service.payment_outbox WHERE aggregate_id IN (SELECT id FROM payment_service.payment_intents WHERE buyer_id=$1)',[userId]);
      await pool.query('DELETE FROM payment_service.cod_collections WHERE intent_id IN (SELECT id FROM payment_service.payment_intents WHERE buyer_id=$1)',[userId]);
      await pool.query('DELETE FROM payment_service.payment_transactions WHERE intent_id IN (SELECT id FROM payment_service.payment_intents WHERE buyer_id=$1)',[userId]);
      if (collectionEventId) await pool.query("DELETE FROM payment_service.payment_webhook_inbox WHERE provider='DELIVERY' AND delivery_id=$1",[collectionEventId]);
      await pool.query('DELETE FROM payment_service.payment_intents WHERE buyer_id=$1',[userId]);
      await pool.query('DELETE FROM order_service.order_outbox WHERE aggregate_id IN (SELECT id FROM order_service.orders WHERE user_id=$1) OR aggregate_id IN (SELECT id FROM order_service.order_groups WHERE buyer_id=$1)',[userId]);
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
      await pool.query('DELETE FROM catalog.stores WHERE id=$1',[storeId]);
    }
    if (userId) await pool.query('DELETE FROM users WHERE id=$1',[userId]);
    await pool.end();
  }
});
