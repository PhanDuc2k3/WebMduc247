import test from 'node:test';
import assert from 'node:assert/strict';
import { ReviewService, cleanReviewText } from '../src/review.service.js';

const id='11111111-1111-4111-8111-111111111111';
const buyer='22222222-2222-4222-8222-222222222222';
const input={orderItemId:id,rating:5,title:'Good item',content:'Product arrived in good condition'};
function service(orderRow){
  const calls=[];
  const db={query:async(sql)=>{calls.push(sql);
    if(sql.includes('SELECT i.product_id')) return {rows:orderRow?[orderRow]:[]};
    if(sql.includes('INSERT INTO engagement.reviews')) return {rows:[]};
    return {rows:[]};},release(){}};
  return {review:new ReviewService({connect:async()=>db},{}),calls};
}
test('REV-01 rejects an order item that does not belong to the buyer',async()=>{
  const {review}=service(null);
  await assert.rejects(review.create(buyer,input),error=>error.code==='ORDER_ITEM_NOT_FOUND');
});
test('REV-01 rejects review before delivery',async()=>{
  const {review}=service({status:'PLACED',product_id:id,store_id:id});
  await assert.rejects(review.create(buyer,input),error=>error.code==='REVIEW_NOT_ELIGIBLE');
});
test('REV-02 database uniqueness rejects a second review for the same order item',async()=>{
  const {review}=service({status:'DELIVERED',product_id:id,store_id:id});
  await assert.rejects(review.create(buyer,input),error=>error.code==='REVIEW_EXISTS');
});
test('REV-02 rejects links and contact details from published content',()=>{
  assert.throws(()=>cleanReviewText('Email me at user@example.com',3,1000),error=>error.code==='UNSAFE_CONTENT');
  assert.throws(()=>cleanReviewText('<script>alert(1)</script>',3,1000),error=>error.code==='UNSAFE_CONTENT');
  assert.throws(()=>cleanReviewText('My address: 123 Main Street',3,1000),error=>error.code==='UNSAFE_CONTENT');
});
