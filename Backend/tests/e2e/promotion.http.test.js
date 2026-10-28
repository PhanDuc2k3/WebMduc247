import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { OrderService } from '../../services/order-service/src/service.js';

const enabled=Boolean(process.env.PROMOTION_TEST_DATABASE_URL && process.env.IDENTITY_TEST_API_URL &&
  process.env.CATALOG_TEST_API_URL && process.env.ORDER_TEST_API_URL &&
  process.env.ENGAGEMENT_TEST_API_URL && process.env.PROMOTION_INTERNAL_TOKEN);
const identity=process.env.IDENTITY_TEST_API_URL,catalog=process.env.CATALOG_TEST_API_URL,
  order=process.env.ORDER_TEST_API_URL,engagement=process.env.ENGAGEMENT_TEST_API_URL;
const origin=process.env.FRONTEND_ORIGIN||'http://localhost:5173';
async function call(base,path,method='GET',data,headers={}){
  const response=await fetch(base+path,{method,headers:{
    ...(data?{'Content-Type':'application/json'}:{}),
    ...(method!=='GET'&&!headers['X-Promotion-Token']?{Origin:origin}:{}),...headers},
    ...(data?{body:JSON.stringify(data)}:{})});
  return {status:response.status,body:await response.json()};
}
test('Voucher quota, Flash Sale server time, order allocations and cancellation release', {skip:!enabled},async()=>{
  const pool=new pg.Pool({connectionString:process.env.PROMOTION_TEST_DATABASE_URL});
  const userIds=[],storeIds=[],campaignIds=[],categoryIds=[],reserveRefs=[];
  try{
    await pool.query(`UPDATE auth_rate_limits SET window_start=now()-interval '1 hour'
      WHERE bucket IN ('register:ip:127.0.0.1','register:ip:::ffff:127.0.0.1','register:ip:::1',
        'login:ip:127.0.0.1','login:ip:::ffff:127.0.0.1','login:ip:::1')`);
    const email=`promo-${randomUUID()}@example.test`,password='test-password-123';
    const registered=await call(identity,'/api/v2/auth/register','POST',
      {email,fullName:'Promotion Buyer',password,confirmPassword:password});
    assert.equal(registered.status,201,JSON.stringify(registered.body));
    const userId=registered.body.user.id;userIds.push(userId);
    const login=await call(identity,'/api/v2/auth/login','POST',{email,password});
    assert.equal(login.status,200);const auth={Authorization:`Bearer ${login.body.accessToken}`};
    const sellerEmail=`promo-seller-${randomUUID()}@example.test`;
    const sellerRegistered=await call(identity,'/api/v2/auth/register','POST',{
      email:sellerEmail,fullName:'Other Promotion Seller',password,confirmPassword:password});
    assert.equal(sellerRegistered.status,201);userIds.push(sellerRegistered.body.user.id);
    const sellerLogin=await call(identity,'/api/v2/auth/login','POST',{email:sellerEmail,password});
    assert.equal(sellerLogin.status,200);
    const otherAuth={Authorization:`Bearer ${sellerLogin.body.accessToken}`};
    const address=await call(identity,'/api/v2/users/me/addresses','POST',{
      receiverName:'Promotion Recipient',receiverPhone:'+84901234567',provinceCode:'01',
      districtCode:'001',wardCode:'00001',addressLine:'123 Promo Street',isDefault:true},auth);
    assert.equal(address.status,201);
    const variants=[],products=[];
    for(let index=0;index<2;index++){
      const seller=index===0?{email,headers:auth}:{email:sellerEmail,headers:otherAuth};
      const store=await call(catalog,'/api/v2/seller/stores','POST',{
        name:`Promotion Shop ${index}`,contactEmail:seller.email,
        contactPhone:'+84901234567',pickupAddress:'123 Promo Street'},seller.headers);
      assert.equal(store.status,201,JSON.stringify(store.body));storeIds.push(store.body.store.id);
      const product=await call(catalog,`/api/v2/seller/stores/${storeIds[index]}/products`,'POST',
        {title:`Promotion Product ${index}`,priceMinor:120000,stock:5},seller.headers);
      assert.equal(product.status,201);products.push(product.body.product.id);
      variants.push(product.body.product.variants[0].id);
      assert.equal((await call(catalog,`/api/v2/seller/products/${products[index]}/publish`,'POST',{},seller.headers)).status,200);
    }
    const add=await call(order,'/api/v2/cart/items','POST',{variantId:variants[0],quantity:1},auth);
    assert.equal(add.status,201);
    const isolatedOrder=new OrderService(pool,catalog,identity,process.env.INVENTORY_INTERNAL_TOKEN);
    isolatedOrder.engagementUrl='http://127.0.0.1:59999';
    const fallback=await isolatedOrder.calculate(userId,{
      addressId:address.body.address.id,paymentMethod:'COD'},auth.Authorization);
    assert.equal(fallback.promotionUnavailable,true);
    assert.equal(fallback.payableTotalMinor,150000);
    const internal={'X-Promotion-Token':process.env.PROMOTION_INTERNAL_TOKEN};
    const context=await call(order,`/api/v2/internal/promotion/buyers/${userId}/context`,'GET',undefined,internal);
    assert.equal(context.status,200,JSON.stringify(context.body));
    assert.equal(context.body.firstOrder,true);
    const lines=context.body.items.map(item=>({
      id:item.id,variantId:item.variantId,storeId:item.storeId,categoryId:item.categoryId,
      productId:item.productId,quantity:item.quantity,priceMinor:item.priceMinor,
      priceOriginalMinor:item.priceOriginalMinor }));
    const code='SAVE'+randomUUID().slice(0,8).toUpperCase();
    const now=Date.now();
    async function voucher(storeId,suffix,overrides={},ownerAuth=auth){
      const response=await call(engagement,`/api/v2/seller/stores/${storeId}/vouchers`,'POST',{
        title:'Promotion E2E Voucher',code:code+suffix,discountType:'FIXED',discountValue:20000,
        minSpendMinor:50000,totalLimit:1,perUserLimit:1,scopeType:'STORE',
        segment:'ALL',startsAt:new Date(now-60_000).toISOString(),
        endsAt:new Date(now+3600_000).toISOString(),...overrides},ownerAuth);
      assert.equal(response.status,201,JSON.stringify(response.body));
      campaignIds.push(response.body.campaign.id);
      return response.body;
    }
    const active=await voucher(storeIds[0],'');
    const otherVoucher=await voucher(storeIds[1],'B',{},otherAuth);
    assert.equal((await call(engagement,`/api/v2/seller/stores/${storeIds[1]}/vouchers`,'POST',{
      title:'Forbidden Voucher',code:'NOPE'+randomUUID().slice(0,8).toUpperCase(),
      discountType:'FIXED',discountValue:1000,totalLimit:1,
      startsAt:new Date(now).toISOString(),endsAt:new Date(now+3600_000).toISOString()
    },auth)).status,403);
    assert.equal((await call(engagement,`/api/v2/seller/campaigns/${otherVoucher.campaign.id}/status`,'PATCH',
      {status:'PAUSED'},auth)).status,403);
    await voucher(storeIds[0],'MIN',{minSpendMinor:200000});
    await voucher(storeIds[0],'EXP',{startsAt:new Date(now-3600_000).toISOString(),
      endsAt:new Date(now-60_000).toISOString()});
    const capped=await voucher(storeIds[0],'CAP',{
      discountType:'PERCENT',discountValue:5000,maxDiscountMinor:10000 });
    assert.equal((await call(engagement,'/api/v2/promotions/vouchers/validate','POST',
      {code:capped.voucher.code},auth)).body.voucher.discountMinor,10000);
    assert.equal((await call(engagement,`/api/v2/seller/stores/${storeIds[0]}/vouchers`,'POST',{
      title:'No stacking Voucher',code:code+'STACK',discountType:'FIXED',discountValue:1000,
      totalLimit:1,stackable:true,startsAt:new Date(now).toISOString(),
      endsAt:new Date(now+3600_000).toISOString()
    },auth)).body.code,'INVALID_VOUCHER');
    const firstOrderVoucher=await voucher(storeIds[0],'FIRST',{segment:'FIRST_ORDER'});
    const category=await call(catalog,'/api/v2/internal/categories','POST',
      {name:'Promotion Category',slug:'promo-'+randomUUID().slice(0,8)},
      {'X-Catalog-Secret':process.env.CATALOG_SYNC_SECRET});
    assert.equal(category.status,201,JSON.stringify(category.body));
    const categoryId=category.body.category.id;categoryIds.push(categoryId);
    await pool.query('UPDATE catalog.products SET category_id=$2 WHERE id=$1',[products[0],categoryId]);
    const categoryVoucher=await voucher(storeIds[0],'CAT',{
      scopeType:'CATEGORY',scopeId:categoryId });
    assert.equal((await call(engagement,'/api/v2/promotions/vouchers/validate','POST',
      {code:categoryVoucher.voucher.code},auth)).status,200);
    assert.equal((await call(engagement,`/api/v2/seller/stores/${storeIds[0]}/vouchers`,'POST',{
      title:'Wrong SKU Voucher',code:code+'WRONG',discountType:'FIXED',discountValue:1000,
      totalLimit:1,scopeType:'SKU',scopeId:variants[1],
      startsAt:new Date(now).toISOString(),endsAt:new Date(now+3600_000).toISOString()
    },auth)).status,403);
    assert.equal((await call(engagement,'/api/v2/promotions/vouchers/validate','POST',
      {code:code+'B'},auth)).body.code,'VOUCHER_SCOPE_MISMATCH');
    assert.equal((await call(engagement,'/api/v2/promotions/vouchers/validate','POST',
      {code:code+'MIN'},auth)).body.code,'VOUCHER_MIN_SPEND');
    assert.equal((await call(engagement,'/api/v2/promotions/vouchers/validate','POST',
      {code:code+'EXP'},auth)).body.code,'VOUCHER_EXPIRED');
    const valid=await call(engagement,'/api/v2/promotions/vouchers/validate','POST',{code},auth);
    assert.equal(valid.status,200,JSON.stringify(valid.body));
    assert.equal(valid.body.voucher.discountMinor,20000);
    const reserveInput=orderRef=>({userId,firstOrder:true,code,lines,orderRef,ttlSeconds:120});
    const raceRefs=['race-'+randomUUID(),'race-'+randomUUID()];reserveRefs.push(...raceRefs);
    const racing=await Promise.all([
      call(engagement,'/api/v2/internal/promotions/reserve','POST',reserveInput(raceRefs[0]),internal),
      call(engagement,'/api/v2/internal/promotions/reserve','POST',reserveInput(raceRefs[1]),internal)
    ]);
    assert.equal(racing.filter(item=>item.status===201).length,1);
    assert.equal(racing.filter(item=>['VOUCHER_QUOTA_EXHAUSTED','VOUCHER_USER_LIMIT'].includes(item.body.code)).length,
      1,JSON.stringify(racing));
    await call(order,'/api/v2/cart/items','POST',{variantId:variants[0],quantity:1},otherAuth);
    assert.equal((await call(engagement,'/api/v2/promotions/vouchers/validate','POST',
      {code},otherAuth)).body.code,'VOUCHER_QUOTA_EXHAUSTED');
    const winner=(await pool.query(`SELECT order_ref FROM engagement.voucher_usage
      WHERE voucher_id=$1 AND status='ACTIVE'`,[active.voucher.id])).rows[0].order_ref;
    assert.equal((await call(engagement,'/api/v2/internal/promotions/release','POST',
      {orderRef:winner},internal)).status,200);
    assert.equal((await call(engagement,'/api/v2/internal/promotions/release','POST',
      {orderRef:winner},internal)).body.idempotent,true);
    const userLimit=await voucher(storeIds[0],'USER',{totalLimit:2,perUserLimit:1});
    const limitRef='limit-'+randomUUID();reserveRefs.push(limitRef);
    assert.equal((await call(engagement,'/api/v2/internal/promotions/reserve','POST',
      {userId,firstOrder:true,code:userLimit.voucher.code,lines,orderRef:limitRef,ttlSeconds:120},internal)).status,201);
    const secondLimitRef='limit-'+randomUUID();reserveRefs.push(secondLimitRef);
    assert.equal((await call(engagement,'/api/v2/internal/promotions/reserve','POST',
      {userId,firstOrder:true,code:userLimit.voucher.code,lines,orderRef:secondLimitRef,ttlSeconds:120},internal)).body.code,'VOUCHER_USER_LIMIT');
    await call(engagement,'/api/v2/internal/promotions/release','POST',{orderRef:limitRef},internal);
    const flash=await call(engagement,`/api/v2/seller/stores/${storeIds[0]}/flash-sales`,'POST',{
      title:'Flash Sale E2E',startsAt:new Date(now-60_000).toISOString(),
      endsAt:new Date(now+3600_000).toISOString(),
      items:[{variantId:variants[0],salePriceMinor:80000,quota:1}]},auth);
    assert.equal(flash.status,201,JSON.stringify(flash.body));campaignIds.push(flash.body.campaign.id);
    assert.equal((await call(engagement,`/api/v2/seller/campaigns/${flash.body.campaign.id}/status`,'PATCH',
      {status:'PAUSED'},auth)).status,200);
    const overlapping=await call(engagement,`/api/v2/seller/stores/${storeIds[0]}/flash-sales`,'POST',{
      title:'Overlapping Flash',startsAt:new Date(now-30_000).toISOString(),
      endsAt:new Date(now+1800_000).toISOString(),
      items:[{variantId:variants[0],salePriceMinor:70000,quota:1}]},auth);
    assert.equal(overlapping.status,201);campaignIds.push(overlapping.body.campaign.id);
    assert.equal((await call(engagement,`/api/v2/seller/campaigns/${flash.body.campaign.id}/status`,'PATCH',
      {status:'ACTIVE'},auth)).body.code,'FLASH_SALE_OVERLAP');
    await call(engagement,`/api/v2/seller/campaigns/${overlapping.body.campaign.id}/status`,'PATCH',
      {status:'ENDED'},auth);
    assert.equal((await call(engagement,`/api/v2/seller/campaigns/${flash.body.campaign.id}/status`,'PATCH',
      {status:'ACTIVE'},auth)).status,200);
    const list=await call(engagement,'/api/v2/flash-sales','GET',undefined,
      {'X-Client-Time':new Date(now+86400_000).toISOString()});
    assert.equal(list.status,200);assert.ok(list.body.items.some(item=>item.variantId===variants[0]));
    assert.ok(Math.abs(new Date(list.body.serverTime).getTime()-Date.now())<10000);
    const flashRefs=['flash-'+randomUUID(),'flash-'+randomUUID()];reserveRefs.push(...flashRefs);
    const flashRace=await Promise.all([
      call(engagement,'/api/v2/internal/promotions/reserve','POST',
        {userId,firstOrder:true,lines,orderRef:flashRefs[0],ttlSeconds:120},internal),
      call(engagement,'/api/v2/internal/promotions/reserve','POST',
        {userId,firstOrder:true,lines,orderRef:flashRefs[1],ttlSeconds:120},internal)
    ]);
    assert.ok(flashRace.some(item=>item.status===201));
    const flashHeld=(await pool.query(`SELECT order_ref FROM engagement.flash_sale_reservations
      WHERE campaign_id=$1 AND status='ACTIVE'`,[flash.body.campaign.id])).rows;
    assert.equal(flashHeld.length,1);
    for(const row of flashHeld) await call(engagement,'/api/v2/internal/promotions/release','POST',
      {orderRef:row.order_ref},internal);
    const pricedCart=await call(order,'/api/v2/cart','GET',undefined,auth);
    assert.equal(pricedCart.body.items[0].priceMinor,80000);
    assert.equal(pricedCart.body.items[0].flashCampaignId,flash.body.campaign.id);
    const preview=await call(order,'/api/v2/checkout/preview','POST',{
      addressId:address.body.address.id,paymentMethod:'COD',voucherCode:code},auth);
    assert.equal(preview.status,200,JSON.stringify(preview.body));
    assert.equal(preview.body.payableTotalMinor,90000);
    assert.equal(preview.body.voucher.discountMinor,20000);
    assert.equal(preview.body.stores[0].lines[0].unitPriceMinor,80000);
    assert.equal(preview.body.stores[0].lines[0].voucherDiscountMinor,20000);
    const placed=await call(order,'/api/v2/checkout/place-order','POST',{
      quoteId:preview.body.quoteId,addressId:address.body.address.id,paymentMethod:'COD',
      voucherCode:code,idempotencyKey:'promo-'+randomUUID(),expectedTotalMinor:90000,
      payableTotalMinor:1,discountMinor:999999},auth);
    assert.equal(placed.status,201,JSON.stringify(placed.body));
    const groupId=placed.body.groupId,shopId=placed.body.orders[0].id;
    const snapshot=await call(order,`/api/v2/orders/${groupId}`,'GET',undefined,auth);
    assert.equal(snapshot.body.group.orders[0].totalMinor,90000);
    assert.equal(snapshot.body.group.orders[0].items[0].discountMinor,60000);
    assert.equal(snapshot.body.group.orders[0].items[0].lineTotalMinor,60000);
    const discounts=(await pool.query(`SELECT source_type,discount_minor FROM order_service.order_discounts
      WHERE shop_order_id=$1 ORDER BY source_type`,[shopId])).rows;
    assert.deepEqual(discounts.map(item=>[item.source_type,Number(item.discount_minor)]),
      [['FLASH_SALE',40000],['VOUCHER',20000]]);
    const before=(await pool.query('SELECT used_count,reserved_count FROM engagement.vouchers WHERE id=$1',
      [active.voucher.id])).rows[0];
    assert.equal(before.used_count,1);assert.equal(before.reserved_count,0);
    const cancelled=await call(order,`/api/v2/orders/${groupId}/cancel`,'POST',{
      shopOrderId:shopId,expectedVersion:2,reason:'Changed my mind',idempotencyKey:'cancel-'+randomUUID()},auth);
    assert.equal(cancelled.status,200,JSON.stringify(cancelled.body));
    await call(engagement,'/api/v2/internal/promotions/release-shop','POST',{shopOrderId:shopId},internal);
    const after=(await pool.query('SELECT used_count,reserved_count FROM engagement.vouchers WHERE id=$1',
      [active.voucher.id])).rows[0];
    assert.equal(after.used_count,0);assert.equal(after.reserved_count,0);
    const flashAfter=(await pool.query(`SELECT sold_count,reserved_count FROM engagement.flash_sale_items
      WHERE campaign_id=$1 AND variant_id=$2`,[flash.body.campaign.id,variants[0]])).rows[0];
    assert.equal(flashAfter.sold_count,0);assert.equal(flashAfter.reserved_count,0);
    await pool.query("UPDATE engagement.voucher_usage SET status='COMMITTED' WHERE shop_order_id=$1",[shopId]);
    await pool.query('UPDATE engagement.vouchers SET used_count=used_count+1 WHERE id=$1',[active.voucher.id]);
    await pool.query("UPDATE engagement.flash_sale_reservations SET status='COMMITTED' WHERE shop_order_id=$1",[shopId]);
    await pool.query('UPDATE engagement.flash_sale_items SET sold_count=sold_count+1 WHERE campaign_id=$1 AND variant_id=$2',
      [flash.body.campaign.id,variants[0]]);
    await call(engagement,'/api/v2/internal/promotions/reconcile','POST',{},internal);
    await call(engagement,'/api/v2/internal/promotions/reconcile','POST',{},internal);
    assert.equal((await pool.query('SELECT used_count FROM engagement.vouchers WHERE id=$1',
      [active.voucher.id])).rows[0].used_count,0);
    assert.equal((await pool.query('SELECT sold_count FROM engagement.flash_sale_items WHERE campaign_id=$1 AND variant_id=$2',
      [flash.body.campaign.id,variants[0]])).rows[0].sold_count,0);
    assert.equal((await call(engagement,'/api/v2/promotions/vouchers/validate','POST',
      {code:firstOrderVoucher.voucher.code},auth)).body.code,'USER_SEGMENT_MISMATCH');
    const secondProduct=await call(catalog,`/api/v2/seller/stores/${storeIds[0]}/products`,'POST',
      {title:'Allocation Product',priceMinor:100001,stock:5},auth);
    assert.equal(secondProduct.status,201);
    assert.equal((await call(catalog,`/api/v2/seller/products/${secondProduct.body.product.id}/publish`,'POST',{},auth)).status,200);
    await call(order,'/api/v2/cart/items','POST',{variantId:variants[0],quantity:1},auth);
    await call(order,'/api/v2/cart/items','POST',
      {variantId:secondProduct.body.product.variants[0].id,quantity:1},auth);
    const percent=await voucher(storeIds[0],'PCT',{
      discountType:'PERCENT',discountValue:3333,totalLimit:10,perUserLimit:5,minSpendMinor:0 });
    const allocated=await call(order,'/api/v2/checkout/preview','POST',{
      addressId:address.body.address.id,paymentMethod:'COD',voucherCode:percent.voucher.code},auth);
    assert.equal(allocated.status,200,JSON.stringify(allocated.body));
    const allocatedLines=allocated.body.stores[0].lines;
    assert.equal(allocatedLines.length,2);
    assert.equal(allocatedLines.reduce((sum,line)=>sum+line.voucherDiscountMinor,0),
      allocated.body.voucher.discountMinor);
    assert.equal(allocatedLines.reduce((sum,line)=>sum+line.lineTotalMinor,0)+30000,
      allocated.body.payableTotalMinor);
    const placedPercent=await call(order,'/api/v2/checkout/place-order','POST',{
      quoteId:allocated.body.quoteId,addressId:address.body.address.id,paymentMethod:'COD',
      voucherCode:percent.voucher.code,idempotencyKey:'percent-'+randomUUID(),
      expectedTotalMinor:allocated.body.payableTotalMinor},auth);
    assert.equal(placedPercent.status,201,JSON.stringify(placedPercent.body));
    const percentShopId=placedPercent.body.orders[0].id;
    const voucherAllocation=(await pool.query(`SELECT sum(discount_minor)::bigint AS total
      FROM order_service.order_discounts WHERE shop_order_id=$1 AND source_type='VOUCHER'`,
      [percentShopId])).rows[0].total;
    assert.equal(Number(voucherAllocation),allocated.body.voucher.discountMinor);
    const percentCancel=await call(order,`/api/v2/orders/${placedPercent.body.groupId}/cancel`,'POST',{
      shopOrderId:percentShopId,expectedVersion:2,reason:'Changed my mind',
      idempotencyKey:'cancel-'+randomUUID()},auth);
    assert.equal(percentCancel.status,200);
    const percentUsage=(await pool.query('SELECT used_count FROM engagement.vouchers WHERE id=$1',
      [percent.voucher.id])).rows[0];
    assert.equal(percentUsage.used_count,0);
  }finally{
    if(userIds.length){
      await pool.query('DELETE FROM order_service.order_outbox WHERE aggregate_id IN (SELECT id FROM order_service.orders WHERE user_id=ANY($1::uuid[])) OR aggregate_id IN (SELECT id FROM order_service.order_groups WHERE buyer_id=ANY($1::uuid[]))',[userIds]);
      await pool.query('DELETE FROM order_service.order_commands WHERE shop_order_id IN (SELECT id FROM order_service.orders WHERE user_id=ANY($1::uuid[]))',[userIds]);
      await pool.query('DELETE FROM order_service.order_status_history WHERE shop_order_id IN (SELECT id FROM order_service.orders WHERE user_id=ANY($1::uuid[]))',[userIds]);
      await pool.query('DELETE FROM order_service.order_discounts WHERE shop_order_id IN (SELECT id FROM order_service.orders WHERE user_id=ANY($1::uuid[]))',[userIds]);
      await pool.query('DELETE FROM order_service.order_items WHERE order_id IN (SELECT id FROM order_service.orders WHERE user_id=ANY($1::uuid[]))',[userIds]);
      await pool.query('DELETE FROM order_service.orders WHERE user_id=ANY($1::uuid[])',[userIds]);
      await pool.query('DELETE FROM order_service.order_groups WHERE buyer_id=ANY($1::uuid[])',[userIds]);
      await pool.query('DELETE FROM order_service.checkout_idempotency WHERE user_id=ANY($1::uuid[])',[userIds]);
      await pool.query('DELETE FROM order_service.checkout_quotes WHERE user_id=ANY($1::uuid[])',[userIds]);
      await pool.query('DELETE FROM order_service.carts WHERE user_id=ANY($1::uuid[])',[userIds]);
    }
    if(campaignIds.length){
      await pool.query('DELETE FROM engagement.promotion_outbox WHERE aggregate_id=ANY($1::uuid[])',[campaignIds]);
      await pool.query(`DELETE FROM engagement.promotion_reserve_requests WHERE order_ref IN (
        SELECT order_ref FROM engagement.voucher_usage
          WHERE voucher_id IN (SELECT id FROM engagement.vouchers WHERE campaign_id=ANY($1::uuid[]))
        UNION SELECT order_ref FROM engagement.flash_sale_reservations WHERE campaign_id=ANY($1::uuid[])
      )`,[campaignIds]);
      await pool.query('DELETE FROM engagement.flash_sale_reservations WHERE campaign_id=ANY($1::uuid[])',[campaignIds]);
      await pool.query('DELETE FROM engagement.voucher_usage WHERE voucher_id IN (SELECT id FROM engagement.vouchers WHERE campaign_id=ANY($1::uuid[]))',[campaignIds]);
      await pool.query('DELETE FROM engagement.flash_sale_items WHERE campaign_id=ANY($1::uuid[])',[campaignIds]);
      await pool.query('DELETE FROM engagement.vouchers WHERE campaign_id=ANY($1::uuid[])',[campaignIds]);
      await pool.query('DELETE FROM engagement.promotion_audit_logs WHERE campaign_id=ANY($1::uuid[])',[campaignIds]);
      await pool.query('DELETE FROM engagement.promotion_campaigns WHERE id=ANY($1::uuid[])',[campaignIds]);
    }
    if(reserveRefs.length) await pool.query('DELETE FROM engagement.promotion_reserve_requests WHERE order_ref=ANY($1::text[])',[reserveRefs]);
    for(const storeId of storeIds){
      await pool.query('DELETE FROM catalog.inventory_reservations r USING catalog.product_variants v WHERE r.variant_id=v.id AND v.store_id=$1',[storeId]);
      await pool.query('DELETE FROM catalog.inventory_movements m USING catalog.product_variants v WHERE m.variant_id=v.id AND v.store_id=$1',[storeId]);
      await pool.query('DELETE FROM catalog.inventory i USING catalog.product_variants v WHERE i.variant_id=v.id AND v.store_id=$1',[storeId]);
      await pool.query('DELETE FROM catalog.store_audit_logs WHERE store_id=$1',[storeId]);
      await pool.query(`DELETE FROM catalog.store_outbox WHERE payload->>'storeId'=$1::text
        OR payload->>'variantId' IN (SELECT id::text FROM catalog.product_variants WHERE store_id=$1::uuid)`,[storeId]);
      await pool.query('DELETE FROM catalog.store_profile_versions WHERE store_id=$1',[storeId]);
      await pool.query('DELETE FROM catalog.stores WHERE id=$1',[storeId]);
    }
    if(categoryIds.length) await pool.query('DELETE FROM catalog.categories WHERE id=ANY($1::uuid[])',[categoryIds]);
    for(const userId of userIds) await pool.query('DELETE FROM users WHERE id=$1',[userId]);
    await pool.end();
  }
});
