import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { OrderService } from '../../services/order-service/src/service.js';

const enabled = Boolean(process.env.ORDER_TEST_DATABASE_URL && process.env.IDENTITY_TEST_API_URL &&
  process.env.CATALOG_TEST_API_URL && process.env.ORDER_TEST_API_URL);
const identity = process.env.IDENTITY_TEST_API_URL;
const catalog = process.env.CATALOG_TEST_API_URL;
const order = process.env.ORDER_TEST_API_URL;
const origin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
async function call(base,path,method='GET',data,headers={}) {
  const response = await fetch(base+path, { method, headers: {
    ...(data ? { 'Content-Type':'application/json' } : {}),
    ...(method !== 'GET' ? { Origin:origin } : {}), ...headers },
    ...(data ? { body:JSON.stringify(data) } : {}) });
  return { status:response.status, body:await response.json() };
}
test('Cart and checkout across two stores, validation and idempotent partial purchase', { skip:!enabled }, async () => {
  const pool = new pg.Pool({ connectionString:process.env.ORDER_TEST_DATABASE_URL });
  const email = `checkout-${randomUUID()}@example.test`;
  const password = 'test-password-123';
  let userId; const stores = [];
  try {
    await pool.query(`UPDATE auth_rate_limits SET window_start=now()-interval '1 hour'
      WHERE bucket IN ('register:ip:127.0.0.1','register:ip:::ffff:127.0.0.1','register:ip:::1',
        'login:ip:127.0.0.1','login:ip:::ffff:127.0.0.1','login:ip:::1')`);
    const registration = await call(identity,'/api/v2/auth/register','POST',
      { email,fullName:'Checkout Buyer',password,confirmPassword:password });
    assert.equal(registration.status,201,JSON.stringify(registration.body));
    userId = registration.body.user.id;
    const login = await call(identity,'/api/v2/auth/login','POST',{ email,password });
    assert.equal(login.status,200);
    const auth = { Authorization:`Bearer ${login.body.accessToken}` };
    const address = await call(identity,'/api/v2/users/me/addresses','POST', {
      receiverName:'Recipient Test',receiverPhone:'+84901234567',provinceCode:'01',
      districtCode:'001',wardCode:'00001',addressLine:'123 Test Street',isDefault:true },auth);
    assert.equal(address.status,201,JSON.stringify(address.body));
    const addressId = address.body.address.id;
    const variants = [];
    for (let index=0;index<2;index++) {
      const store = await call(catalog,'/api/v2/seller/stores','POST', {
        name:`Checkout Test Store ${index}`,contactEmail:email,contactPhone:'+84901234567',
        pickupAddress:'123 Test Street' },auth);
      assert.equal(store.status,201,JSON.stringify(store.body));
      stores.push(store.body.store.id);
      const product = await call(catalog,`/api/v2/seller/stores/${store.body.store.id}/products`,'POST',
        { title:`Checkout Test Product ${index}`,priceMinor:100000+index*50000,stock:5 },auth);
      assert.equal(product.status,201,JSON.stringify(product.body));
      variants.push(product.body.product.variants[0].id);
      assert.equal((await call(catalog,`/api/v2/seller/products/${product.body.product.id}/publish`,'POST',{},auth)).status,200);
    }
    const added1 = await call(order,'/api/v2/cart/items','POST',{ variantId:variants[0],quantity:1 },auth);
    assert.equal(added1.status,201,JSON.stringify(added1.body));
    const added2 = await call(order,'/api/v2/cart/items','POST',{ variantId:variants[1],quantity:1 },auth);
    assert.equal(added2.status,201,JSON.stringify(added2.body));
    const line1 = added2.body.items.find(item => item.variantId===variants[0]);
    const line2 = added2.body.items.find(item => item.variantId===variants[1]);
    assert.equal(added2.body.items.length,2);
    const preview = await call(order,'/api/v2/checkout/preview','POST',{ addressId,paymentMethod:'COD' },auth);
    assert.equal(preview.status,200,JSON.stringify(preview.body));
    assert.equal(preview.body.stores.length,2);
    assert.equal(preview.body.payableTotalMinor,310000);
    const missingAddress = await call(order,'/api/v2/checkout/preview','POST',{ paymentMethod:'COD' },auth);
    assert.equal(missingAddress.status,200);
    assert.ok(missingAddress.body.errors.some(error => error.code==='ADDRESS_REQUIRED'));
    assert.equal((await call(order,`/api/v2/cart/items/${line2.id}`,'PATCH',{ selected:false },auth)).status,200);
    const partial = await call(order,'/api/v2/checkout/preview','POST',{ addressId,paymentMethod:'COD' },auth);
    assert.equal(partial.body.stores.length,1);
    assert.equal(partial.body.payableTotalMinor,130000);
    const key = `checkout-${randomUUID()}`;
    const payload = { quoteId:partial.body.quoteId,addressId,paymentMethod:'COD',
      idempotencyKey:key,expectedTotalMinor:130000, payableTotalMinor:1 };
    const tampered = await call(order,'/api/v2/checkout/place-order','POST',
      { ...payload,idempotencyKey:`checkout-${randomUUID()}`,expectedTotalMinor:1 },auth);
    assert.equal(tampered.status,409);
    assert.equal(tampered.body.code,'TOTAL_MISMATCH');
    const [placed,retry] = await Promise.all([
      call(order,'/api/v2/checkout/place-order','POST',payload,auth),
      call(order,'/api/v2/checkout/place-order','POST',payload,auth),
    ]);
    assert.equal(placed.status,201,JSON.stringify(placed.body));
    assert.equal(retry.status,201,JSON.stringify(retry.body));
    assert.deepEqual(placed.body.orders.map(item=>item.id),retry.body.orders.map(item=>item.id));
    assert.equal(placed.body.orders.length,1);
    assert.equal(placed.body.orders[0].payableTotalMinor,130000);
    assert.equal((await call(order,'/api/v2/checkout/place-order','POST',
      { ...payload,addressId:randomUUID() },auth)).body.code,'IDEMPOTENCY_CONFLICT');
    const remaining = await call(order,'/api/v2/cart','GET',undefined,auth);
    assert.equal(remaining.body.items.length,1);
    assert.equal(remaining.body.items[0].id,line2.id);
    assert.equal(remaining.body.items[0].selected,false);
    assert.equal((await pool.query('SELECT count(*)::int AS count FROM order_service.orders WHERE user_id=$1',[userId])).rows[0].count,1);
    const invalid = await call(order,`/api/v2/cart/items/${line2.id}`,'PATCH',{ selected:true },auth);
    assert.equal(invalid.status,200);
    await pool.query("UPDATE catalog.product_variants SET status='inactive' WHERE id=$1",[variants[1]]);
    const unavailable = await call(order,'/api/v2/checkout/preview','POST',{ addressId,paymentMethod:'COD' },auth);
    assert.ok(unavailable.body.errors.some(error => error.itemId===line2.id && error.code==='SKU_NOT_SELLABLE'));
    await pool.query("UPDATE catalog.product_variants SET status='active' WHERE id=$1",[variants[1]]);
    assert.equal((await call(order,'/api/v2/cart/items','POST',{ variantId:variants[0],quantity:1 },auth)).status,201);
    const both = await call(order,'/api/v2/checkout/preview','POST',{ addressId,paymentMethod:'COD' },auth);
    assert.equal(both.body.stores.length,2);
    const multi = await call(order,'/api/v2/checkout/place-order','POST',{
      quoteId:both.body.quoteId,addressId,paymentMethod:'COD',idempotencyKey:`checkout-${randomUUID()}`,
      expectedTotalMinor:310000 },auth);
    assert.equal(multi.status,201,JSON.stringify(multi.body));
    assert.equal(multi.body.orders.length,2);
    assert.ok(multi.body.orders.every(item => item.status==='PLACED'));
    assert.equal((await call(order,'/api/v2/cart','GET',undefined,auth)).body.items.length,0);
    const pendingCart = await call(order,'/api/v2/cart/items','POST',{ variantId:variants[0],quantity:1 },auth);
    const pendingLine = pendingCart.body.items[0];
    const pendingQuote = await call(order,'/api/v2/checkout/preview','POST',{ addressId,paymentMethod:'COD' },auth);
    const pendingOrder = randomUUID();
    const pendingGroup = randomUUID();
    const reserve = await call(catalog,'/api/v2/inventory/reservations','POST',{
      variantId:variants[0],orderRef:pendingQuote.body.quoteId,quantity:1,
      idempotencyKey:`pending-${randomUUID()}`,ttlSeconds:30 },
      { 'X-Inventory-Token':process.env.INVENTORY_INTERNAL_TOKEN });
    assert.equal(reserve.status,201);
    const pendingResult = { groupId:pendingGroup,orders:[{ id:pendingOrder,storeId:stores[0],payableTotalMinor:130000,status:'PENDING_INVENTORY' }] };
    await pool.query("INSERT INTO order_service.order_groups(id,buyer_id,grand_total_minor,status) VALUES ($1,$2,130000,'PENDING_INVENTORY')",
      [pendingGroup,userId]);
    await pool.query(`INSERT INTO order_service.orders(id,user_id,store_id,group_id,quote_id,payment_method,
      subtotal_minor,shipping_estimate_minor,payable_total_minor,shipping_address_json)
      VALUES ($1,$2,$3,$4,$5,'COD',100000,30000,130000,$6)`,
      [pendingOrder,userId,stores[0],pendingGroup,pendingQuote.body.quoteId,address.body.address]);
    await pool.query(`INSERT INTO order_service.order_items(order_id,variant_id,product_id,sku,product_name,quantity,
      unit_price_minor,line_total_minor,reservation_id)
      SELECT $1,v.id,v.product_id,v.sku,p.name,1,100000,100000,$2
      FROM catalog.product_variants v JOIN catalog.products p ON p.id=v.product_id WHERE v.id=$3`,
      [pendingOrder,reserve.body.reservation.id,variants[0]]);
    const pendingKey = `pending-${randomUUID()}`;
    await pool.query('INSERT INTO order_service.checkout_idempotency(user_id,idempotency_key,request_hash,result_ref) VALUES ($1,$2,$3,$4)',
      [userId,pendingKey,'fixture-hash',pendingResult]);
    await pool.query('DELETE FROM order_service.cart_items WHERE id=$1',[pendingLine.id]);
    await pool.query("UPDATE catalog.inventory_reservations SET expires_at=now()-interval '1 second' WHERE id=$1",
      [reserve.body.reservation.id]);
    const reconciler = new OrderService(pool,catalog,identity,process.env.INVENTORY_INTERNAL_TOKEN);
    await reconciler.reconcilePending();
    assert.equal((await pool.query('SELECT status FROM order_service.orders WHERE id=$1',[pendingOrder])).rows[0].status,'CANCELLED');
    assert.equal((await call(order,'/api/v2/cart','GET',undefined,auth)).body.items.length,1);
  } finally {
    if (userId) {
      await pool.query('DELETE FROM order_service.order_commands WHERE shop_order_id IN (SELECT id FROM order_service.orders WHERE user_id=$1)',[userId]);
      await pool.query('DELETE FROM order_service.order_status_history WHERE shop_order_id IN (SELECT id FROM order_service.orders WHERE user_id=$1)',[userId]);
      await pool.query('DELETE FROM order_service.order_discounts WHERE shop_order_id IN (SELECT id FROM order_service.orders WHERE user_id=$1)',[userId]);
      await pool.query('DELETE FROM order_service.order_items WHERE order_id IN (SELECT id FROM order_service.orders WHERE user_id=$1)',[userId]);
      await pool.query('DELETE FROM order_service.order_outbox WHERE payload->>\'buyerId\'=$1',[userId]);
      await pool.query('DELETE FROM order_service.order_outbox WHERE aggregate_id IN (SELECT id FROM order_service.orders WHERE user_id=$1)',[userId]);
      await pool.query('DELETE FROM order_service.orders WHERE user_id=$1',[userId]);
      await pool.query('DELETE FROM order_service.order_groups WHERE buyer_id=$1',[userId]);
      await pool.query('DELETE FROM order_service.checkout_idempotency WHERE user_id=$1',[userId]);
      await pool.query('DELETE FROM order_service.checkout_quotes WHERE user_id=$1',[userId]);
      await pool.query('DELETE FROM order_service.carts WHERE user_id=$1',[userId]);
    }
    for (const storeId of stores) {
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
