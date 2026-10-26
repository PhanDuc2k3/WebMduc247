import test from 'node:test';
import assert from 'node:assert/strict';
import { NotificationService,encodeNotificationCursor,decodeNotificationCursor } from '../src/notification.service.js';

const buyer='11111111-1111-4111-8111-111111111111';
const seller='22222222-2222-4222-8222-222222222222';
const otherSeller='33333333-3333-4333-8333-333333333333';
const store='44444444-4444-4444-8444-444444444444';
const otherStore='55555555-5555-4555-8555-555555555555';
const shopOrder='66666666-6666-4666-8666-666666666666';
const group='77777777-7777-4777-8777-777777777777';

test('CASE-009/014/017 public updates target selected parties and never turn internal notes into notifications',async()=>{
  const notifier=new NotificationService({});notifier.orderShop=async()=>({shopOrderId:shopOrder,groupId:group,buyerId:buyer,storeId:store});notifier.members=async()=>[seller];
  const payload={caseId:buyer,shopOrderId:shopOrder,recipientKind:'BUYER'};
  assert.deepEqual((await notifier.resolve('order',{type:'CasePublicMessage.v1',payload})).map(item=>item.recipientId),[buyer]);
  assert.deepEqual((await notifier.resolve('order',{type:'CaseDecisionPublished.v1',payload:{...payload,recipientKind:'BOTH'}})).map(item=>item.recipientId),[buyer,seller]);
  assert.deepEqual(await notifier.resolve('order',{type:'CaseInternalNote.v1',payload}),[]);
  await assert.rejects(notifier.resolve('order',{type:'CasePublicMessage.v1',payload:{...payload,recipientKind:'INTERNAL'}}),{code:'INVALID_EVENT'});
});

test('CASE-008 information requests notify only the requested buyer or seller party',async()=>{
  const notifier=new NotificationService({});notifier.orderShop=async()=>({shopOrderId:shopOrder,groupId:group,buyerId:buyer,storeId:store});
  notifier.members=async()=>[seller];
  const payload={shopOrderId:shopOrder,caseId:buyer,requestId:seller,recipientKind:'BUYER'};
  const buyerTargets=await notifier.resolve('order',{type:'CaseInformationRequested.v1',payload});
  assert.deepEqual(buyerTargets.map(row=>row.recipientId),[buyer]);assert.equal(buyerTargets[0].key,'buyer.case_information_requested');
  const sellerTargets=await notifier.resolve('order',{type:'CaseInformationRequested.v1',payload:{...payload,recipientKind:'SELLER'}});
  assert.deepEqual(sellerTargets.map(row=>row.recipientId),[seller]);
  await assert.rejects(notifier.resolve('order',{type:'CaseInformationRequested.v1',payload:{...payload,recipientKind:'EVERYONE'}}),{code:'INVALID_EVENT'});
});

test('NOTI-03 order and chat events target only members of the correct shop',async()=>{
  const notifier=new NotificationService({});
  notifier.orderShop=async()=>({shopOrderId:shopOrder,groupId:group,buyerId:buyer,storeId:store});
  notifier.members=async id=>id===store?[seller]:[otherSeller];
  const order=await notifier.resolve('order',{type:'OrderCreated.v1',payload:{
    orderId:shopOrder,groupId:group,buyerId:buyer,storeId:store}});
  assert.deepEqual(order.map(row=>row.recipientId),[buyer,seller]);
  assert.equal(order.some(row=>row.recipientId===otherSeller),false);
  assert.equal(order[0].link,'/orders/'+group);
  assert.equal(order[1].link,'/mystore/orders/'+shopOrder);
  await assert.rejects(notifier.resolve('order',{type:'OrderCreated.v1',payload:{
    orderId:shopOrder,groupId:group,buyerId:buyer,storeId:otherStore}}),
    error=>error.code==='EVENT_CONTEXT_MISMATCH');
  const chat=await notifier.resolve('chat',{type:'ChatMessageSent.v1',
    conversationId:'aaaaaaaaaaaaaaaaaaaaaaaa',buyerId:buyer,storeId:store,senderId:buyer,
    content:'Must never appear in notification'});
  assert.deepEqual(chat.map(row=>row.recipientId),[seller]);
  assert.equal(JSON.stringify(chat).includes('Must never appear'),false);
});

test('NOTI-01 cursor validates timestamp and UUID',()=>{
  const row={created_at:new Date('2026-10-19T00:00:00.000Z'),id:buyer};
  const cursor=encodeNotificationCursor(row);
  assert.equal(decodeNotificationCursor(cursor).id,buyer);
  assert.equal(decodeNotificationCursor('invalid'),null);
});

test('NOTI-06 email failure records bounded retry and DLQ without rolling back notification',async()=>{
  for(const attempts of [0,4]){
    const updates=[];let rolledBack=false,committed=false;
    const db={query:async(sql,args)=>{
      if(sql.includes('SELECT d.*,n.recipient_user_id'))return {rows:[{
        id:shopOrder,recipient_user_id:buyer,template_key:'buyer.order_created',
        deep_link:'/orders/'+group,attempts}]};
      if(sql.startsWith('UPDATE engagement.notification_deliveries'))updates.push(args);
      if(sql==='ROLLBACK')rolledBack=true;if(sql==='COMMIT')committed=true;
      return {rows:[]};
    },release(){}};
    const notifier=new NotificationService({connect:async()=>db},{
      transport:{sendMail:async()=>{throw new Error('SMTP unavailable');}},
      frontendOrigin:'http://localhost:5173',mailFrom:'mail@example.test'});
    notifier.identityRecipient=async()=>({status:'active',email:'buyer@example.test'});
    notifier.template=async()=>({title_template:'Order',body_template:'Order #{shortId}'});
    assert.equal(await notifier.deliverEmailOne(),true);
    assert.equal(rolledBack,false);assert.equal(committed,true);
    assert.equal(updates[0][1],attempts===4?'DEAD':'PENDING');
    assert.equal(updates[0][2],attempts+1);
  }
});
test('Notification metrics expose email backlog and source availability',async()=>{
  const notifier=new NotificationService({query:async sql=>sql.includes('GROUP BY status')
    ?{rows:[{status:'PENDING',total:2},{status:'DEAD',total:1}]}:{rows:[{oldest:new Date('2026-10-19T00:00:00Z')}]}} ,{
    orderToken:'o',orderUrl:'http://order.local',paymentToken:'p',paymentUrl:'http://payment.local',
    chatToken:'c',chatUrl:'http://chat.local'});
  notifier.remote=async url=>{if(String(url).includes('chat.local'))throw new Error('Chat offline');
    return {pending:3,dead:0};};
  const metrics=await notifier.metrics();
  assert.equal(metrics.deliveries.PENDING,2);
  assert.equal(metrics.deliveries.DEAD,1);
  assert.equal(metrics.sources.order.pending,3);
  assert.equal(metrics.sources.payment.pending,3);
  assert.equal(metrics.sources.chat.status,'unavailable');
});
