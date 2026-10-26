import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from 'pg';

const enabled = Boolean(process.env.ORDER_TEST_DATABASE_URL && process.env.IDENTITY_TEST_API_URL &&
  process.env.CATALOG_TEST_API_URL && process.env.ORDER_TEST_API_URL && process.env.ORDER_DELIVERY_TOKEN);
const identity = process.env.IDENTITY_TEST_API_URL;
const catalog = process.env.CATALOG_TEST_API_URL;
const order = process.env.ORDER_TEST_API_URL;
const origin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
async function call(base,path,method='GET',data,headers={}) {
  const response = await fetch(base+path,{ method,headers:{
    ...(data ? { 'Content-Type':'application/json' } : {}),
    ...(method!=='GET' && !headers['X-Delivery-Token'] ? { Origin:origin } : {}),...headers },
    ...(data ? { body:JSON.stringify(data) } : {}) });
  return { status:response.status,body:await response.json() };
}
const key = () => 'order-'+randomUUID();
test('Order lifecycle: three shops, seller isolation, snapshot, cancellation and delivery inbox', { skip:!enabled }, async () => {
  const pool = new pg.Pool({ connectionString:process.env.ORDER_TEST_DATABASE_URL });
  const users = []; const stores = [];
  try {
    await pool.query(`UPDATE auth_rate_limits SET window_start=now()-interval '1 hour'
      WHERE bucket IN ('register:ip:127.0.0.1','register:ip:::ffff:127.0.0.1','register:ip:::1',
        'login:ip:127.0.0.1','login:ip:::ffff:127.0.0.1','login:ip:::1')`);
    async function account(label) {
      const email = `order-${label}-${randomUUID()}@example.test`;
      const password = 'test-password-123';
      const registered = await call(identity,'/api/v2/auth/register','POST',
        { email,fullName:'Order '+label,password,confirmPassword:password });
      assert.equal(registered.status,201,JSON.stringify(registered.body));
      users.push(registered.body.user.id);
      const login = await call(identity,'/api/v2/auth/login','POST',{ email,password });
      assert.equal(login.status,200);
      return { id:registered.body.user.id,email,headers:{ Authorization:`Bearer ${login.body.accessToken}` } };
    }
    const buyer = await account('buyer');
    const sellerB = await account('sellerb');
    const address = await call(identity,'/api/v2/users/me/addresses','POST',{
      receiverName:'Original Recipient',receiverPhone:'+84901234567',provinceCode:'01',
      districtCode:'001',wardCode:'00001',addressLine:'Original 123 Street',isDefault:true },buyer.headers);
    assert.equal(address.status,201,JSON.stringify(address.body));
    const variants = []; const products = [];
    for (let index=0;index<3;index++) {
      const owner = index===1 ? sellerB : buyer;
      const store = await call(catalog,'/api/v2/seller/stores','POST',{
        name:`Lifecycle Store ${index}`,contactEmail:owner.email,
        contactPhone:'+84901234567',pickupAddress:'123 Test Street' },owner.headers);
      assert.equal(store.status,201,JSON.stringify(store.body)); stores.push(store.body.store.id);
      const product = await call(catalog,`/api/v2/seller/stores/${stores[index]}/products`,'POST',{
        title:`Snapshot Product ${index}`,priceMinor:100000+index*50000,stock:5 },owner.headers);
      assert.equal(product.status,201,JSON.stringify(product.body));
      products.push(product.body.product.id); variants.push(product.body.product.variants[0].id);
      assert.equal((await call(catalog,`/api/v2/seller/products/${products[index]}/publish`,'POST',{},owner.headers)).status,200);
      if (index===0) await pool.query('UPDATE catalog.product_variants SET sale_price_minor=80000 WHERE id=$1',[variants[0]]);
      assert.equal((await call(order,'/api/v2/cart/items','POST',{ variantId:variants[index],quantity:1 },buyer.headers)).status,201);
    }
    const preview = await call(order,'/api/v2/checkout/preview','POST',{
      addressId:address.body.address.id,paymentMethod:'COD' },buyer.headers);
    assert.equal(preview.status,200,JSON.stringify(preview.body));
    assert.equal(preview.body.stores.length,3);
    assert.equal(preview.body.payableTotalMinor,520000);
    assert.equal(preview.body.discountMinor,20000);
    const placed = await call(order,'/api/v2/orders','POST',{
      quoteId:preview.body.quoteId,addressId:address.body.address.id,paymentMethod:'COD',
      idempotencyKey:key(),expectedTotalMinor:520000 },buyer.headers);
    assert.equal(placed.status,201,JSON.stringify(placed.body));
    assert.equal(placed.body.orders.length,3);
    assert.ok(placed.body.groupId);
    const groupId = placed.body.groupId;
    if(process.env.CHAT_ORDER_TOKEN){
      const botOrder=await fetch(`${order}/api/v2/internal/chat/orders/${groupId}?buyerId=${buyer.id}`,
        {headers:{'X-Chat-Order-Token':process.env.CHAT_ORDER_TOKEN}});
      assert.equal(botOrder.status,200);
      const scoped=await botOrder.json();
      assert.equal(scoped.id,groupId);
      assert.equal('shippingAddress' in scoped,false);
      const foreign=await fetch(`${order}/api/v2/internal/chat/orders/${groupId}?buyerId=${sellerB.id}`,
        {headers:{'X-Chat-Order-Token':process.env.CHAT_ORDER_TOKEN}});
      assert.equal(foreign.status,404);
    }
    const [a,b,c] = placed.body.orders;
    if(process.env.NOTIFICATION_TEST_API_URL){
      let buyerNotices=[],sellerNotices=[];
      for(let attempt=0;attempt<65;attempt++){
        const [buyerInbox,sellerInbox]=await Promise.all([
          call(process.env.NOTIFICATION_TEST_API_URL,'/api/v2/notifications','GET',undefined,buyer.headers),
          call(process.env.NOTIFICATION_TEST_API_URL,'/api/v2/notifications','GET',undefined,sellerB.headers)]);
        buyerNotices=buyerInbox.body.notifications||[];
        sellerNotices=sellerInbox.body.notifications||[];
        if(buyerNotices.some(item=>item.deepLink===`/orders/${groupId}`)&&
          sellerNotices.some(item=>item.deepLink===`/mystore/orders/${b.id}`))break;
        await new Promise(resolve=>setTimeout(resolve,200));
      }
      assert.ok(buyerNotices.some(item=>item.deepLink===`/orders/${groupId}`));
      assert.ok(sellerNotices.some(item=>item.deepLink===`/mystore/orders/${b.id}`));
      assert.equal(sellerNotices.some(item=>item.deepLink===`/mystore/orders/${a.id}`||
        item.deepLink===`/mystore/orders/${c.id}`),false);
      const own=buyerNotices.find(item=>item.deepLink===`/orders/${groupId}`);
      const before=(await call(process.env.NOTIFICATION_TEST_API_URL,
        '/api/v2/notifications/unread-count','GET',undefined,buyer.headers)).body.count;
      assert.equal((await call(process.env.NOTIFICATION_TEST_API_URL,
        `/api/v2/notifications/${own.id}/read`,'PATCH',{},buyer.headers)).status,200);
      assert.equal((await call(process.env.NOTIFICATION_TEST_API_URL,
        '/api/v2/notifications/unread-count','GET',undefined,buyer.headers)).body.count,before-1);
    }
    assert.equal((await pool.query('SELECT count(*)::int AS count FROM order_service.orders WHERE id=$1',[b.id])).rows[0].count,1);
    const groups = await call(order,'/api/v2/orders','GET',undefined,buyer.headers);
    assert.equal(groups.status,200);
    assert.equal(groups.body.groups[0].id,groupId);
    assert.equal(groups.body.groups[0].grandTotalMinor,520000);
    assert.equal(groups.body.groups[0].orders.length,3);
    assert.equal((await call(order,`/api/v2/orders/${groupId}`,'GET',undefined,sellerB.headers)).status,404);
    const ownSellerOrder = await call(order,`/api/v2/seller/orders/${b.id}`,'GET',undefined,sellerB.headers);
    assert.equal(ownSellerOrder.status,200,JSON.stringify({ body:ownSellerOrder.body,id:b.id }));
    const forbiddenSellerOrder = await call(order,`/api/v2/seller/orders/${b.id}`,'GET',undefined,buyer.headers);
    assert.equal(forbiddenSellerOrder.status,403,JSON.stringify(forbiddenSellerOrder.body));
    assert.equal((await call(order,`/api/v2/seller/orders/${a.id}`,'GET',undefined,sellerB.headers)).status,403);
    assert.equal((await call(order,`/api/v2/seller/orders/${b.id}/confirm`,'POST',
      { expectedVersion:2,idempotencyKey:key() },buyer.headers)).status,403);
    const sellerList = await call(order,`/api/v2/seller/stores/${stores[1]}/orders`,'GET',undefined,sellerB.headers);
    assert.equal(sellerList.status,200); assert.equal(sellerList.body.total,1);
    assert.equal(sellerList.body.orders[0].id,b.id);
    assert.equal((await call(order,`/api/v2/seller/stores/${stores[1]}/orders`,'GET',undefined,buyer.headers)).status,403);
    const commandKey = key();
    const confirmed = await call(order,`/api/v2/seller/orders/${b.id}/confirm`,'POST',
      { expectedVersion:2,idempotencyKey:commandKey },sellerB.headers);
    assert.equal(confirmed.status,200,JSON.stringify(confirmed.body));
    assert.equal(confirmed.body.order.status,'CONFIRMED');
    assert.equal((await call(order,`/api/v2/seller/orders/${b.id}/confirm`,'POST',
      { expectedVersion:2,idempotencyKey:commandKey },sellerB.headers)).body.order.version,3);
    assert.equal((await call(order,`/api/v2/seller/orders/${b.id}/confirm`,'POST',
      { expectedVersion:3,idempotencyKey:commandKey },sellerB.headers)).body.code,'IDEMPOTENCY_CONFLICT');
    assert.equal((await call(order,`/api/v2/seller/orders/${b.id}/prepare`,'POST',
      { expectedVersion:2,idempotencyKey:key() },sellerB.headers)).body.code,'VERSION_CONFLICT');
    assert.equal((await call(order,`/api/v2/seller/orders/${b.id}/ready-to-ship`,'POST',
      { expectedVersion:3,idempotencyKey:key() },sellerB.headers)).body.code,'INVALID_TRANSITION');
    const prepared = await call(order,`/api/v2/seller/orders/${b.id}/prepare`,'POST',
      { expectedVersion:3,idempotencyKey:key() },sellerB.headers);
    assert.equal(prepared.body.order.status,'PREPARING');
    const ready = await call(order,`/api/v2/seller/orders/${b.id}/ready-to-ship`,'POST',
      { expectedVersion:4,idempotencyKey:key() },sellerB.headers);
    assert.equal(ready.body.order.status,'READY_TO_SHIP');
    const delivery = { eventId:key(),shopOrderId:b.id,type:'ShipmentAccepted.v1',shipmentRef:'SHIP-TEST-123' };
    const deliveryHeaders = { 'X-Delivery-Token':process.env.ORDER_DELIVERY_TOKEN };
    assert.equal((await call(order,'/api/v2/internal/delivery-events','POST',delivery,deliveryHeaders)).body.order.status,'SHIPPING');
    assert.equal((await call(order,'/api/v2/internal/delivery-events','POST',delivery,deliveryHeaders)).body.idempotent,true);
    assert.equal((await call(order,'/api/v2/seller/orders/'+b.id+'/ready-to-ship','POST',
      { expectedVersion:6,idempotencyKey:key() },sellerB.headers)).body.code,'INVALID_TRANSITION');
    assert.equal((await call(order,'/api/v2/internal/delivery-events','POST',{
      eventId:key(),shopOrderId:b.id,type:'ShipmentDelivered.v1',shipmentRef:'SHIP-TEST-123' },deliveryHeaders)).body.order.status,'DELIVERED');
    assert.equal((await call(order,`/api/v2/orders/${groupId}/shop-orders/${b.id}/complete`,'POST',
      { expectedVersion:7,idempotencyKey:key() },buyer.headers)).body.order.status,'COMPLETED');
    const cancelKey = key();
    const cancelled = await call(order,`/api/v2/orders/${groupId}/cancel`,'POST',
      { shopOrderId:c.id,expectedVersion:2,reason:'Changed my mind',idempotencyKey:cancelKey },buyer.headers);
    assert.equal(cancelled.status,200,JSON.stringify(cancelled.body));
    assert.equal(cancelled.body.order.status,'CANCELLED');
    assert.equal((await call(order,`/api/v2/orders/${groupId}/cancel`,'POST',
      { shopOrderId:c.id,expectedVersion:2,reason:'Changed my mind',idempotencyKey:cancelKey },buyer.headers)).body.order.status,'CANCELLED');
    assert.equal((await call(order,`/api/v2/seller/orders/${c.id}/ready-to-ship`,'POST',
      { expectedVersion:4,idempotencyKey:key() },buyer.headers)).body.code,'INVALID_TRANSITION');
    const cancelledInventory = await call(catalog,`/api/v2/inventory/variants/${variants[2]}/availability`,'GET',
      undefined,{ 'X-Inventory-Token':process.env.INVENTORY_INTERNAL_TOKEN });
    assert.equal(cancelledInventory.body.onHand,5);
    const partialGroup = await call(order,`/api/v2/orders/${groupId}`,'GET',undefined,buyer.headers);
    assert.equal(partialGroup.body.group.status,'PARTIAL_CANCELLED');
    assert.equal(partialGroup.body.group.cancelledTotalMinor,230000);
    assert.equal(partialGroup.body.group.currentTotalMinor,290000);
    await pool.query('UPDATE catalog.products SET name=$2 WHERE id=$1',[products[0],'Changed Catalog Name']);
    await pool.query('UPDATE catalog.product_variants SET price_minor=999000 WHERE id=$1',[variants[0]]);
    await pool.query('UPDATE addresses SET address_line=$2 WHERE id=$1',[address.body.address.id,'Changed Profile Address']);
    const snapshot = await call(order,`/api/v2/orders/${groupId}`,'GET',undefined,buyer.headers);
    const original = snapshot.body.group.orders.find(item => item.storeId===stores[0]);
    assert.equal(original.items[0].name,'Snapshot Product 0');
    assert.equal(original.items[0].unitPriceMinor,80000);
    assert.equal(original.items[0].discountMinor,20000);
    assert.equal(original.items[0].snapshot.originalPriceMinor,100000);
    assert.equal(original.address.addressLine,'Original 123 Street');
    assert.ok(original.history.length>=2);
    const invalidReason = await call(order,`/api/v2/seller/orders/${a.id}/reject`,'POST',
      { expectedVersion:2,idempotencyKey:key(),reason:'UNKNOWN' },buyer.headers);
    assert.equal(invalidReason.body.code,'INVALID_REASON');
    const rejectKey = key();
    const rejected = await call(order,`/api/v2/seller/orders/${a.id}/reject`,'POST',
      { expectedVersion:2,idempotencyKey:rejectKey,reason:'OUT_OF_STOCK' },buyer.headers);
    assert.equal(rejected.body.order.status,'CANCELLED');
    assert.equal((await call(order,`/api/v2/seller/orders/${a.id}/reject`,'POST',
      { expectedVersion:2,idempotencyKey:rejectKey,reason:'OUT_OF_STOCK' },buyer.headers)).body.order.status,'CANCELLED');
    assert.equal((await call(catalog,`/api/v2/inventory/variants/${variants[0]}/availability`,'GET',
      undefined,{ 'X-Inventory-Token':process.env.INVENTORY_INTERNAL_TOKEN })).body.onHand,5);
    assert.equal((await pool.query(`SELECT count(*)::int AS count FROM order_service.order_outbox
      WHERE event_type='OrderReadyForShipment.v1' AND aggregate_id=$1`,[b.id])).rows[0].count,1);
  } finally {
    if (users.length) {
      if(process.env.NOTIFICATION_TEST_API_URL){
        await pool.query(`DELETE FROM engagement.notifications WHERE recipient_user_id=ANY($1::uuid[])`,[users]);
        await pool.query(`DELETE FROM engagement.notification_processed_events WHERE source='order'
          AND event_id IN (SELECT id::text FROM order_service.order_outbox
            WHERE aggregate_id IN (SELECT id FROM order_service.orders WHERE user_id=ANY($1::uuid[]))
              OR payload->>'buyerId'=ANY($2::text[]))`,[users,users]);
      }
      await pool.query('DELETE FROM order_service.order_outbox WHERE aggregate_id IN (SELECT id FROM order_service.orders WHERE user_id=ANY($1::uuid[])) OR payload->>\'buyerId\'=ANY($2::text[])',[users,users]);
      await pool.query('DELETE FROM order_service.order_commands WHERE shop_order_id IN (SELECT id FROM order_service.orders WHERE user_id=ANY($1::uuid[]))',[users]);
      await pool.query('DELETE FROM order_service.order_status_history WHERE shop_order_id IN (SELECT id FROM order_service.orders WHERE user_id=ANY($1::uuid[]))',[users]);
      await pool.query('DELETE FROM order_service.order_discounts WHERE shop_order_id IN (SELECT id FROM order_service.orders WHERE user_id=ANY($1::uuid[]))',[users]);
      await pool.query('DELETE FROM order_service.order_items WHERE order_id IN (SELECT id FROM order_service.orders WHERE user_id=ANY($1::uuid[]))',[users]);
      await pool.query('DELETE FROM order_service.orders WHERE user_id=ANY($1::uuid[])',[users]);
      await pool.query('DELETE FROM order_service.order_groups WHERE buyer_id=ANY($1::uuid[])',[users]);
      await pool.query('DELETE FROM order_service.checkout_idempotency WHERE user_id=ANY($1::uuid[])',[users]);
      await pool.query('DELETE FROM order_service.checkout_quotes WHERE user_id=ANY($1::uuid[])',[users]);
      await pool.query('DELETE FROM order_service.carts WHERE user_id=ANY($1::uuid[])',[users]);
    }
    for (const storeId of stores) {
      await pool.query(`DELETE FROM catalog.inventory_order_restocks WHERE reservation_ids &&
        ARRAY(SELECT r.id FROM catalog.inventory_reservations r JOIN catalog.product_variants v ON v.id=r.variant_id
          WHERE v.store_id=$1)::uuid[]`,[storeId]);
      await pool.query('DELETE FROM catalog.inventory_reservations r USING catalog.product_variants v WHERE r.variant_id=v.id AND v.store_id=$1',[storeId]);
      await pool.query('DELETE FROM catalog.inventory_movements m USING catalog.product_variants v WHERE m.variant_id=v.id AND v.store_id=$1',[storeId]);
      await pool.query('DELETE FROM catalog.inventory i USING catalog.product_variants v WHERE i.variant_id=v.id AND v.store_id=$1',[storeId]);
      await pool.query('DELETE FROM catalog.store_audit_logs WHERE store_id=$1',[storeId]);
      await pool.query(`DELETE FROM catalog.store_outbox WHERE payload->>'storeId'=$1::text
        OR payload->>'variantId' IN (SELECT id::text FROM catalog.product_variants WHERE store_id=$1::uuid)`,[storeId]);
      await pool.query('DELETE FROM catalog.stores WHERE id=$1',[storeId]);
    }
    for (const userId of users) await pool.query('DELETE FROM users WHERE id=$1',[userId]);
    await pool.end();
  }
});
