import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from 'pg';

const enabled=Boolean(process.env.REVIEW_RETURN_TEST_DATABASE_URL&&process.env.IDENTITY_TEST_API_URL&&
  process.env.CATALOG_TEST_API_URL&&process.env.ORDER_TEST_API_URL&&process.env.ENGAGEMENT_TEST_API_URL&&
  process.env.PAYMENT_TEST_API_URL&&process.env.PAYMENT_INTERNAL_TOKEN&&process.env.PAYMENT_SETTLEMENT_TOKEN);
const origin=process.env.FRONTEND_ORIGIN||'http://localhost:5173';
async function call(base,path,method='GET',data,token){
  const response=await fetch(`${base}/api/v2${path}`,{method,headers:{
    ...(method==='GET'?{}:{Origin:origin}),...(data===undefined?{}:{'Content-Type':'application/json'}),
    ...(token?{Authorization:`Bearer ${token}`}:{})},
    ...(data===undefined?{}:{body:JSON.stringify(data)})});
  return {status:response.status,data:await response.json()};
}

test('HTTP Review and Return flow across Identity, Catalog, Order and Engagement',
  {skip:!enabled},async()=>{
    const pool=new pg.Pool({connectionString:process.env.REVIEW_RETURN_TEST_DATABASE_URL});
    const identity=process.env.IDENTITY_TEST_API_URL,catalog=process.env.CATALOG_TEST_API_URL;
    const order=process.env.ORDER_TEST_API_URL,engagement=process.env.ENGAGEMENT_TEST_API_URL;
    const payment=process.env.PAYMENT_TEST_API_URL;
    const password='test-password-123';
    const users=[];let storeId,productId,groupId,quoteId,shopId,itemId;
    let onlineGroupId,onlineQuoteId,onlineShopId,onlineItemId,onlineIntentId;
    try{
      await pool.query("UPDATE auth_rate_limits SET window_start=now()-interval '1 hour'");
      async function account(label){
        const email=`review-${label}-${randomUUID()}@example.test`;
        const registered=await call(identity,'/auth/register','POST',
          {email,fullName:`Review ${label}`,password,confirmPassword:password});
        assert.equal(registered.status,201,JSON.stringify(registered.data));
        users.push(registered.data.user.id);
        const logged=await call(identity,'/auth/login','POST',{email,password});
        assert.equal(logged.status,200,JSON.stringify(logged.data));
        return {id:registered.data.user.id,email,token:logged.data.accessToken};
      }
      const buyer=await account('buyer'),seller=await account('seller'),stranger=await account('stranger');
      const store=await call(catalog,'/seller/stores','POST',{
        name:'Review Return Shop',contactEmail:seller.email,contactPhone:'+84901234567',
        pickupAddress:'123 Test Street'},seller.token);
      assert.equal(store.status,201,JSON.stringify(store.data));storeId=store.data.store.id;
      const product=await call(catalog,`/seller/stores/${storeId}/products`,'POST',
        {title:'Review Return Test Item',priceMinor:100,stock:3},seller.token);
      assert.equal(product.status,201,JSON.stringify(product.data));productId=product.data.product.id;
      quoteId=randomUUID();groupId=randomUUID();shopId=randomUUID();itemId=randomUUID();
      await pool.query(`INSERT INTO order_service.checkout_quotes(id,user_id,cart_version,quote_json)
        VALUES ($1,$2,0,'{}')`,[quoteId,buyer.id]);
      await pool.query(`INSERT INTO order_service.order_groups
        (id,buyer_id,grand_total_minor,current_total_minor,status,payment_method)
        VALUES ($1,$2,130,130,'DELIVERED','COD')`,[groupId,buyer.id]);
      await pool.query(`INSERT INTO order_service.orders(id,user_id,store_id,quote_id,group_id,status,
        payment_method,subtotal_minor,discount_minor,shipping_estimate_minor,payable_total_minor,shipping_address_json)
        VALUES ($1,$2,$3,$4,$5,'DELIVERED','COD',100,0,30,130,'{}')`,
        [shopId,buyer.id,storeId,quoteId,groupId]);
      await pool.query(`INSERT INTO order_service.order_items(id,order_id,variant_id,product_id,sku,
        product_name,quantity,unit_price_minor,line_total_minor,reservation_id)
        VALUES ($1,$2,$3,$4,'review-sku','Test item',3,34,100,$5)`,
        [itemId,shopId,product.data.product.variants[0].id,productId,randomUUID()]);
      await pool.query(`INSERT INTO order_service.order_status_history
        (shop_order_id,from_status,to_status,actor_type) VALUES ($1,'SHIPPING','DELIVERED','delivery')`,[shopId]);
      const reviewInput={orderItemId:itemId,rating:4,title:'Good product',content:'Received the product on time'};
      assert.equal((await call(engagement,'/reviews','POST',reviewInput,stranger.token)).status,404);
      const review=await call(engagement,'/reviews','POST',reviewInput,buyer.token);
      assert.equal(review.status,201,JSON.stringify(review.data));
      assert.equal((await call(engagement,'/reviews','POST',reviewInput,buyer.token)).status,409);
      const publicList=await call(engagement,`/products/${productId}/reviews?rating=4&sort=newest`);
      assert.equal(publicList.status,200,JSON.stringify(publicList.data));
      assert.equal(publicList.data.total,1);assert.equal(publicList.data.summary.averageRating,4);
      assert.equal(JSON.stringify(publicList.data).includes(buyer.email),false);
      assert.equal((await call(engagement,`/seller/reviews/${review.data.review.id}/reply`,'POST',
        {content:'Thanks for your feedback'},stranger.token)).status,403);
      assert.equal((await call(engagement,`/seller/reviews/${review.data.review.id}/reply`,'POST',
        {content:'Thanks for your feedback'},seller.token)).status,201);
      const catalogSummary=(await pool.query('SELECT * FROM catalog.product_rating_summary WHERE product_id=$1',[productId])).rows[0];
      assert.equal(Number(catalogSummary.average_rating),4);

      const returned=await call(order,`/orders/${shopId}/returns`,'POST',{
        reasonCode:'DAMAGED',reason:'The item arrived damaged',resolution:'REFUND',
        items:[{orderItemId:itemId,quantity:1}]},buyer.token);
      assert.equal(returned.status,201,JSON.stringify(returned.data));
      const returnId=returned.data.returnRequest.id;
      if(process.env.NOTIFICATION_TEST_API_URL){
        let notices=[],lastInbox;
        for(let attempt=0;attempt<65;attempt++){
          const inbox=await call(process.env.NOTIFICATION_TEST_API_URL,
            '/notifications','GET',undefined,seller.token);
          lastInbox=inbox;
          notices=inbox.data.notifications||[];
          if(notices.some(item=>item.title==='Yêu cầu trả hàng'&&
            item.deepLink===`/mystore/orders/${shopId}`))break;
          await new Promise(resolve=>setTimeout(resolve,200));
        }
        const alertFound=notices.some(item=>item.title==='Yêu cầu trả hàng'&&
          item.deepLink===`/mystore/orders/${shopId}`);
        const outbox=alertFound?[]:(await pool.query(`SELECT id,event_type,notification_sent_at,
          notification_attempts,notification_dead_at FROM order_service.order_outbox
          WHERE aggregate_id=$1 ORDER BY id`,[shopId])).rows;
        const members=alertFound?[]:(await pool.query(`SELECT user_id,role,status
          FROM catalog.store_members WHERE store_id=$1`,[storeId])).rows;
        const created=alertFound?[]:(await pool.query(`SELECT recipient_user_id,template_key,deep_link
          FROM engagement.notifications WHERE source='order'
          AND event_id=ANY($1::text[])`,[outbox.map(row=>String(row.id))])).rows;
        assert.ok(alertFound,JSON.stringify({notices,outbox,members,created,sellerId:seller.id,lastInbox}));
        const outsider=await call(process.env.NOTIFICATION_TEST_API_URL,
          '/notifications','GET',undefined,stranger.token);
        assert.equal((outsider.data.notifications||[]).length,0);
      }
      assert.equal((await call(order,`/returns/${returnId}`,'GET',undefined,stranger.token)).status,403);
      assert.equal((await call(order,`/returns/${returnId}`,'GET',undefined,seller.token)).status,200);
      await pool.query(`INSERT INTO order_service.return_evidence
        (request_id,actor_id,object_key,mime_type,data) VALUES ($1,$2,$3,'image/png',$4)`,
        [returnId,buyer.id,`test/${randomUUID()}`,Buffer.from([137,80,78,71,13,10,26,10,1])]);
      const evidenceId=(await pool.query('SELECT id FROM order_service.return_evidence WHERE request_id=$1',[returnId])).rows[0].id;
      const evidencePath=`/returns/${returnId}/evidence/${evidenceId}`;
      const getImage=token=>fetch(`${order}/api/v2${evidencePath}`,{headers:{Authorization:`Bearer ${token}`}});
      assert.equal((await getImage(stranger.token)).status,403);
      assert.equal((await getImage(buyer.token)).status,200);
      assert.equal((await getImage(seller.token)).status,200);
      const reviewState=await call(order,`/seller/returns/${returnId}/review`,'POST',{expectedVersion:1},seller.token);
      assert.equal(reviewState.status,200,JSON.stringify(reviewState.data));
      const approved=await call(order,`/seller/returns/${returnId}/approve`,'POST',
        {expectedVersion:2,response:'Please return the item to the shop'},seller.token);
      assert.equal(approved.status,200,JSON.stringify(approved.data));
      const premature=await fetch(`${payment}/api/v2/internal/refunds`,{method:'POST',headers:{
        'Content-Type':'application/json','X-Payment-Internal-Token':process.env.PAYMENT_INTERNAL_TOKEN},
        body:JSON.stringify({returnRequestId:returnId,groupId,shopOrderId:shopId,amountMinor:33,
          reason:'Return '+returnId,idempotencyKey:`return:${returnId}:0`})});
      assert.equal(premature.status,409);
      assert.equal((await premature.json()).code,'RETURN_REFUND_NOT_READY');
      const shipped=await call(order,`/returns/${returnId}/ship`,'POST',{expectedVersion:3},buyer.token);
      assert.equal(shipped.status,200,JSON.stringify(shipped.data));
      const received=await call(order,`/seller/returns/${returnId}/receive`,'POST',{expectedVersion:4},seller.token);
      assert.equal(received.status,200,JSON.stringify(received.data));
      assert.equal(received.data.returnRequest.status,'REFUND_PENDING');
      const second=await call(order,`/orders/${shopId}/returns`,'POST',{
        reasonCode:'DAMAGED',reason:'Remaining units arrived damaged',resolution:'REFUND',
        items:[{orderItemId:itemId,quantity:2}]},buyer.token);
      assert.equal(second.status,201,JSON.stringify(second.data));
      assert.equal(second.data.returnRequest.eligibleRefundMinor,67);
      assert.equal((await call(order,`/orders/${shopId}/returns`,'POST',{
        reasonCode:'OTHER',reason:'I want one more item',resolution:'REFUND',
        items:[{orderItemId:itemId,quantity:1}]},buyer.token)).status,400);

      onlineQuoteId=randomUUID();onlineGroupId=randomUUID();onlineShopId=randomUUID();onlineItemId=randomUUID();
      await pool.query(`INSERT INTO order_service.checkout_quotes(id,user_id,cart_version,quote_json)
        VALUES ($1,$2,0,'{}')`,[onlineQuoteId,buyer.id]);
      await pool.query(`INSERT INTO order_service.order_groups
        (id,buyer_id,grand_total_minor,current_total_minor,status,payment_method,payment_status)
        VALUES ($1,$2,1030,1030,'DELIVERED','VIETQR','PAID')`,[onlineGroupId,buyer.id]);
      await pool.query(`INSERT INTO order_service.orders(id,user_id,store_id,quote_id,group_id,status,
        payment_method,payment_status,subtotal_minor,discount_minor,shipping_estimate_minor,
        payable_total_minor,shipping_address_json)
        VALUES ($1,$2,$3,$4,$5,'DELIVERED','VIETQR','PAID',1000,0,30,1030,'{}')`,
        [onlineShopId,buyer.id,storeId,onlineQuoteId,onlineGroupId]);
      await pool.query(`INSERT INTO order_service.order_items(id,order_id,variant_id,product_id,sku,
        product_name,quantity,unit_price_minor,line_total_minor,reservation_id)
        VALUES ($1,$2,$3,$4,'online-sku','Online test item',1,1000,1000,$5)`,
        [onlineItemId,onlineShopId,product.data.product.variants[0].id,productId,randomUUID()]);
      await pool.query(`INSERT INTO order_service.order_status_history
        (shop_order_id,from_status,to_status,actor_type) VALUES ($1,'SHIPPING','DELIVERED','delivery')`,[onlineShopId]);
      onlineIntentId=randomUUID();
      await pool.query(`INSERT INTO payment_service.payment_intents
        (id,order_group_id,buyer_id,method,provider,amount_minor,status)
        VALUES ($1,$2,$3,'VIETQR','VIETQR',1030,'SUCCEEDED')`,[onlineIntentId,onlineGroupId,buyer.id]);
      const onlineReturn=await call(order,`/orders/${onlineShopId}/returns`,'POST',{
        reasonCode:'DAMAGED',reason:'Entire online item arrived damaged',resolution:'REFUND',
        items:[{orderItemId:onlineItemId,quantity:1}]},buyer.token);
      assert.equal(onlineReturn.status,201,JSON.stringify(onlineReturn.data));
      const onlineReturnId=onlineReturn.data.returnRequest.id;
      assert.equal(onlineReturn.data.returnRequest.eligibleRefundMinor,1030);
      assert.equal((await pool.query('SELECT count(*)::int AS total FROM payment_service.refunds WHERE shop_order_id=$1',
        [onlineShopId])).rows[0].total,0);
      await call(order,`/seller/returns/${onlineReturnId}/review`,'POST',{expectedVersion:1},seller.token);
      await call(order,`/seller/returns/${onlineReturnId}/approve`,'POST',
        {expectedVersion:2,response:'Return the online item to our shop'},seller.token);
      await call(order,`/returns/${onlineReturnId}/ship`,'POST',{expectedVersion:3},buyer.token);
      const onlineReceived=await call(order,`/seller/returns/${onlineReturnId}/receive`,'POST',
        {expectedVersion:4},seller.token);
      assert.equal(onlineReceived.status,200,JSON.stringify(onlineReceived.data));
      assert.equal(onlineReceived.data.returnRequest.status,'REFUND_PENDING');
      const refund=(await pool.query('SELECT * FROM payment_service.refunds WHERE shop_order_id=$1',[onlineShopId])).rows[0];
      assert.equal(refund.status,'PENDING');assert.equal(Number(refund.amount_minor),1030);
      const settle=await fetch(`${payment}/api/v2/internal/refunds/${refund.id}/settle`,{method:'POST',
        headers:{'Content-Type':'application/json',
          'X-Payment-Settlement-Token':process.env.PAYMENT_SETTLEMENT_TOKEN},
        body:JSON.stringify({bankReference:`BANK-${randomUUID()}`})});
      assert.equal(settle.status,200,await settle.text());
      let finalStatus='';
      for(let attempt=0;attempt<50;attempt++){
        finalStatus=(await pool.query('SELECT status FROM order_service.return_requests WHERE id=$1',
          [onlineReturnId])).rows[0].status;
        if(finalStatus==='REFUNDED')break;
        await new Promise(resolve=>setTimeout(resolve,200));
      }
      assert.equal(finalStatus,'REFUNDED');
      assert.equal(Number((await pool.query('SELECT refunded_minor FROM order_service.orders WHERE id=$1',
        [onlineShopId])).rows[0].refunded_minor),1030);
    }finally{
      if(process.env.NOTIFICATION_TEST_API_URL){
        await pool.query('DELETE FROM engagement.notifications WHERE recipient_user_id=ANY($1::uuid[])',[users]);
        const ids=[shopId,onlineShopId].filter(Boolean);
        if(ids.length)await pool.query(`DELETE FROM engagement.notification_processed_events
          WHERE source='order' AND event_id IN (SELECT id::text FROM order_service.order_outbox
            WHERE aggregate_id=ANY($1::uuid[]))`,[ids]);
        if(onlineIntentId)await pool.query(`DELETE FROM engagement.notification_processed_events
          WHERE source='payment' AND event_id IN (SELECT id::text FROM payment_service.payment_outbox
            WHERE aggregate_id=$1)`,[onlineIntentId]);
      }
      if(onlineIntentId){
        await pool.query(`DELETE FROM order_service.payment_inbox WHERE event_id IN
          (SELECT 'payment:'||id FROM payment_service.payment_outbox WHERE aggregate_id=$1)`,[onlineIntentId]);
        await pool.query('DELETE FROM payment_service.payment_outbox WHERE aggregate_id=$1',[onlineIntentId]);
        await pool.query('DELETE FROM payment_service.payment_reconciliation WHERE intent_id=$1',[onlineIntentId]);
        await pool.query('DELETE FROM payment_service.refunds WHERE payment_intent_id=$1',[onlineIntentId]);
        await pool.query('DELETE FROM payment_service.payment_intents WHERE id=$1',[onlineIntentId]);
      }
      if(onlineShopId){
        await pool.query(`DELETE FROM order_service.return_history WHERE request_id IN
          (SELECT id FROM order_service.return_requests WHERE shop_order_id=$1)`,[onlineShopId]);
        await pool.query(`DELETE FROM order_service.return_evidence WHERE request_id IN
          (SELECT id FROM order_service.return_requests WHERE shop_order_id=$1)`,[onlineShopId]);
        await pool.query(`DELETE FROM order_service.return_items WHERE request_id IN
          (SELECT id FROM order_service.return_requests WHERE shop_order_id=$1)`,[onlineShopId]);
        await pool.query('DELETE FROM order_service.return_requests WHERE shop_order_id=$1',[onlineShopId]);
        await pool.query('DELETE FROM order_service.order_outbox WHERE aggregate_id=$1',[onlineShopId]);
        await pool.query('DELETE FROM order_service.order_status_history WHERE shop_order_id=$1',[onlineShopId]);
        await pool.query('DELETE FROM order_service.order_items WHERE order_id=$1',[onlineShopId]);
        await pool.query('DELETE FROM order_service.orders WHERE id=$1',[onlineShopId]);
      }
      if(onlineGroupId) await pool.query('DELETE FROM order_service.order_groups WHERE id=$1',[onlineGroupId]);
      if(onlineQuoteId) await pool.query('DELETE FROM order_service.checkout_quotes WHERE id=$1',[onlineQuoteId]);
      if(shopId){
        await pool.query(`DELETE FROM order_service.return_history WHERE request_id IN
          (SELECT id FROM order_service.return_requests WHERE shop_order_id=$1)`,[shopId]);
        await pool.query(`DELETE FROM order_service.return_evidence WHERE request_id IN
          (SELECT id FROM order_service.return_requests WHERE shop_order_id=$1)`,[shopId]);
        await pool.query(`DELETE FROM order_service.return_items WHERE request_id IN
          (SELECT id FROM order_service.return_requests WHERE shop_order_id=$1)`,[shopId]);
        await pool.query('DELETE FROM order_service.return_requests WHERE shop_order_id=$1',[shopId]);
        await pool.query('DELETE FROM order_service.order_outbox WHERE aggregate_id=$1',[shopId]);
        await pool.query('DELETE FROM order_service.order_status_history WHERE shop_order_id=$1',[shopId]);
        await pool.query('DELETE FROM order_service.order_items WHERE order_id=$1',[shopId]);
        await pool.query('DELETE FROM order_service.orders WHERE id=$1',[shopId]);
      }
      if(groupId) await pool.query('DELETE FROM order_service.order_groups WHERE id=$1',[groupId]);
      if(quoteId) await pool.query('DELETE FROM order_service.checkout_quotes WHERE id=$1',[quoteId]);
      if(productId){
        await pool.query('DELETE FROM engagement.review_helpful_votes WHERE review_id IN (SELECT id FROM engagement.reviews WHERE product_id=$1)',[productId]);
        await pool.query('DELETE FROM engagement.review_replies WHERE review_id IN (SELECT id FROM engagement.reviews WHERE product_id=$1)',[productId]);
        await pool.query('DELETE FROM engagement.review_images WHERE review_id IN (SELECT id FROM engagement.reviews WHERE product_id=$1)',[productId]);
        await pool.query("DELETE FROM engagement.review_outbox WHERE payload->>'productId'=$1",[productId]);
        await pool.query('DELETE FROM engagement.reviews WHERE product_id=$1',[productId]);
        await pool.query('DELETE FROM engagement.product_rating_summary WHERE product_id=$1',[productId]);
        await pool.query('DELETE FROM catalog.product_rating_summary WHERE product_id=$1',[productId]);
      }
      if(storeId){
        await pool.query(`DELETE FROM catalog.inventory_movements m USING catalog.product_variants v
          WHERE m.variant_id=v.id AND v.store_id=$1`,[storeId]);
        await pool.query(`DELETE FROM catalog.inventory i USING catalog.product_variants v
          WHERE i.variant_id=v.id AND v.store_id=$1`,[storeId]);
        await pool.query("DELETE FROM catalog.store_outbox WHERE payload->>'storeId'=$1",[storeId]);
        await pool.query('DELETE FROM catalog.store_audit_logs WHERE store_id=$1',[storeId]);
        await pool.query('DELETE FROM catalog.stores WHERE id=$1',[storeId]);
      }
      for(const user of users) await pool.query('DELETE FROM users WHERE id=$1',[user]);
      await pool.end();
    }
  });
