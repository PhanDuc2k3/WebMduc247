import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import sharp from 'sharp';
import { ReviewService } from '../../services/engagement-service/src/review.service.js';
import { ReturnService } from '../../services/order-service/src/return.service.js';

test('AC-10 verified review, uniqueness, private evidence, quantities and reconciled summary',
  {skip:!process.env.REVIEW_RETURN_TEST_DATABASE_URL},async()=>{
    const pool=new pg.Pool({connectionString:process.env.REVIEW_RETURN_TEST_DATABASE_URL});
    const buyer=randomUUID(),stranger=randomUUID(),store=randomUUID(),product=randomUUID();
    const group=randomUUID(),quote=randomUUID(),shop=randomUUID(),item=randomUUID(),reservation=randomUUID();
    const requestIds=[];
    try{
      await pool.query(`INSERT INTO order_service.checkout_quotes(id,user_id,cart_version,quote_json)
        VALUES ($1,$2,0,'{}')`,[quote,buyer]);
      await pool.query(`INSERT INTO order_service.order_groups
        (id,buyer_id,grand_total_minor,current_total_minor,status,payment_method)
        VALUES ($1,$2,130,130,'DELIVERED','COD')`,[group,buyer]);
      await pool.query(`INSERT INTO order_service.orders(id,user_id,store_id,quote_id,group_id,status,
        payment_method,subtotal_minor,discount_minor,shipping_estimate_minor,payable_total_minor,shipping_address_json)
        VALUES ($1,$2,$3,$4,$5,'DELIVERED','COD',100,0,30,130,'{}')`,[shop,buyer,store,quote,group]);
      await pool.query(`INSERT INTO order_service.order_items(id,order_id,variant_id,product_id,sku,
        product_name,quantity,unit_price_minor,line_total_minor,reservation_id)
        VALUES ($1,$2,$3,$4,'sku-test','Test item',3,34,100,$5)`,
        [item,shop,randomUUID(),product,reservation]);
      await pool.query(`INSERT INTO order_service.order_status_history
        (shop_order_id,from_status,to_status,actor_type)
        VALUES ($1,'SHIPPING','DELIVERED','delivery')`,[shop]);
      const promotion={config:{catalogUrl:'http://localhost:5102',catalogToken:'test'},
        remote:async()=>({}),member:async()=>({})};
      const reviews=new ReviewService(pool,promotion,async()=>{});
      const input={orderItemId:item,rating:5,title:'Excellent item',content:'Received exactly what I ordered'};
      await assert.rejects(reviews.create(stranger,input),error=>error.code==='ORDER_ITEM_NOT_FOUND');
      const created=await reviews.create(buyer,input);
      await assert.rejects(reviews.create(buyer,input),error=>error.code==='REVIEW_EXISTS');
      const published=await reviews.list(product,{});
      assert.equal(published.total,1);
      assert.equal(published.summary.averageRating,5);
      assert.equal('buyerId' in JSON.parse(JSON.stringify(published.reviews[0])),false);
      await reviews.edit(buyer,created.review.id,{expectedVersion:1,rating:3,
        title:'Updated item',content:'After use it is acceptable'});
      await reviews.reconcile();
      const aggregate=(await pool.query(`SELECT round(avg(rating)::numeric,2) AS average_rating,
        count(*)::int AS review_count FROM engagement.reviews
        WHERE product_id=$1 AND status='PUBLISHED'`,[product])).rows[0];
      const summary=(await pool.query('SELECT * FROM engagement.product_rating_summary WHERE product_id=$1',[product])).rows[0];
      assert.equal(Number(summary.average_rating),Number(aggregate.average_rating));
      assert.equal(summary.review_count,aggregate.review_count);

      const order={pool,inventory:async path=>{
        if(path.includes(stranger)) throw new Error('Forbidden');return {role:'owner'};
      }};
      const returns=new ReturnService(order,{scanner:async()=>{}});
      const make=(quantity)=>returns.create(buyer,shop,{reasonCode:'DAMAGED',reason:'Product arrived damaged',
        resolution:'REFUND',items:[{orderItemId:item,quantity}]});
      const first=(await make(1)).returnRequest;requestIds.push(first.id);
      assert.equal(first.eligibleRefundMinor,33);
      const second=(await make(2)).returnRequest;requestIds.push(second.id);
      assert.equal(second.eligibleRefundMinor,67);
      assert.equal(second.shippingRefundMinor,0);
      await assert.rejects(make(1),error=>error.code==='INVALID_QUANTITY');
      const png=await sharp({create:{width:4,height:4,channels:3,background:'#123456'}}).png().toBuffer();
      const evidence=await returns.uploadEvidence(buyer,first.id,png,'image/png');
      assert.ok((await returns.evidence(buyer,first.id,evidence.evidence.id)).data.length);
      await assert.rejects(returns.evidence(stranger,first.id,evidence.evidence.id),/Forbidden/);
      const detail=(await returns.detail(buyer,first.id)).returnRequest;
      assert.equal(detail.evidence.length,1);
      assert.equal(JSON.stringify(detail).includes('123456'),false);
      assert.equal(JSON.stringify(detail).includes('shipping_address'),false);
    }finally{
      await pool.query('DELETE FROM engagement.review_helpful_votes WHERE review_id IN (SELECT id FROM engagement.reviews WHERE product_id=$1)',[product]);
      await pool.query('DELETE FROM engagement.review_images WHERE review_id IN (SELECT id FROM engagement.reviews WHERE product_id=$1)',[product]);
      await pool.query('DELETE FROM engagement.review_replies WHERE review_id IN (SELECT id FROM engagement.reviews WHERE product_id=$1)',[product]);
      await pool.query('DELETE FROM engagement.review_outbox WHERE payload->>\'productId\'=$1',[product]);
      await pool.query('DELETE FROM engagement.reviews WHERE product_id=$1',[product]);
      await pool.query('DELETE FROM engagement.product_rating_summary WHERE product_id=$1',[product]);
      await pool.query('DELETE FROM order_service.return_history WHERE request_id=ANY($1::uuid[])',[requestIds]);
      await pool.query('DELETE FROM order_service.return_evidence WHERE request_id=ANY($1::uuid[])',[requestIds]);
      await pool.query('DELETE FROM order_service.return_items WHERE request_id=ANY($1::uuid[])',[requestIds]);
      await pool.query('DELETE FROM order_service.return_requests WHERE id=ANY($1::uuid[])',[requestIds]);
      await pool.query('DELETE FROM order_service.order_outbox WHERE aggregate_id=$1',[shop]);
      await pool.query('DELETE FROM order_service.order_status_history WHERE shop_order_id=$1',[shop]);
      await pool.query('DELETE FROM order_service.order_items WHERE order_id=$1',[shop]);
      await pool.query('DELETE FROM order_service.orders WHERE id=$1',[shop]);
      await pool.query('DELETE FROM order_service.order_groups WHERE id=$1',[group]);
      await pool.query('DELETE FROM order_service.checkout_quotes WHERE id=$1',[quote]);
      await pool.end();
    }
  });
