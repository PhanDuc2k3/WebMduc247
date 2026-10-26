import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { NotificationService } from '../src/notification.service.js';

test('HTTP notification inbox isolates recipients and persists duplicate deliveries once',
  {skip:!process.env.NOTIFICATION_TEST_DATABASE_URL},async()=>{
    process.env.ENGAGEMENT_DATABASE_URL=process.env.NOTIFICATION_TEST_DATABASE_URL;
    process.env.PROMOTION_INTERNAL_TOKEN='test-promotion-token';
    process.env.INVENTORY_INTERNAL_TOKEN='test-inventory-token';
    process.env.NOTIFICATION_ORDER_TOKEN='test-order-token';
    process.env.NOTIFICATION_PAYMENT_TOKEN='test-payment-token';
    process.env.NOTIFICATION_CHAT_TOKEN='test-chat-token';
    process.env.NOTIFICATION_ADMIN_TOKEN='test-admin-token';
    const {createHandler}=await import('../src/server.js');
    const pool=new pg.Pool({connectionString:process.env.NOTIFICATION_TEST_DATABASE_URL});
    const buyer=randomUUID(),seller=randomUUID(),stranger=randomUUID(),store=randomUUID();
    const group=randomUUID(),shop=randomUUID(),eventId=randomUUID();
    const paymentEventId=randomUUID(),chatEventId=randomUUID();
    const notifier=new NotificationService(pool);
    notifier.orderShop=async()=>({shopOrderId:shop,groupId:group,buyerId:buyer,storeId:store});
    notifier.orderGroup=async()=>({groupId:group,buyerId:buyer,
      orders:[{shopOrderId:shop,storeId:store}]});
    notifier.members=async()=>[seller];
    const promotion={identity:async bearer=>({id:bearer==='Bearer buyer'?buyer:
      bearer==='Bearer seller'?seller:stranger})};
    const server=http.createServer(createHandler(promotion,{},notifier));
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    const base='http://127.0.0.1:'+server.address().port+'/api/v2';
    const get=async(token,path)=>{
      const response=await fetch(base+path,{headers:{Authorization:'Bearer '+token}});
      return {status:response.status,body:await response.json()};
    };
    try{
      const input={id:1,type:'OrderCreated.v1',payload:{orderId:shop,groupId:group,buyerId:buyer,storeId:store}};
      const send=()=>fetch(base+'/internal/notifications/order-events',{method:'POST',
        headers:{'Content-Type':'application/json','X-Order-Notification-Token':'test-order-token',
          'X-Event-Id':eventId},body:JSON.stringify(input)});
      assert.equal((await send()).status,200);
      assert.equal((await send()).status,200);
      const mine=await get('buyer','/notifications');
      const foreign=await get('stranger','/notifications');
      assert.equal(mine.body.notifications.length,1);
      assert.equal(foreign.body.notifications.length,0);
      assert.equal(mine.body.notifications[0].deepLink,'/orders/'+group);
      assert.equal((await get('seller','/notifications/unread-count')).body.count,1);
      const id=mine.body.notifications[0].id;
      const denied=await fetch(base+'/notifications/'+id+'/read',{method:'PATCH',
        headers:{Authorization:'Bearer stranger',Origin:'http://localhost:5173'}});
      assert.equal(denied.status,404);
      const read=await fetch(base+'/notifications/'+id+'/read',{method:'PATCH',
        headers:{Authorization:'Bearer buyer',Origin:'http://localhost:5173'}});
      assert.equal(read.status,200);
      assert.equal((await get('buyer','/notifications/unread-count')).body.count,0);
      assert.equal((await get('seller','/notifications/unread-count')).body.count,1);
      const payment=await fetch(base+'/internal/notifications/payment-events',{method:'POST',
        headers:{'Content-Type':'application/json','X-Payment-Notification-Token':'test-payment-token',
          'X-Event-Id':paymentEventId},
        body:JSON.stringify({type:'PaymentSucceeded.v1',payload:{groupId:group}})});
      assert.equal(payment.status,200);
      const conversationId='aaaaaaaaaaaaaaaaaaaaaaaa';
      const chat=await fetch(base+'/internal/notifications/chat-events',{method:'POST',
        headers:{'Content-Type':'application/json','X-Chat-Event-Token':'test-chat-token',
          'X-Event-Id':chatEventId},
        body:JSON.stringify({type:'ChatMessageSent.v1',conversationId,buyerId:buyer,
          storeId:store,senderId:buyer})});
      assert.equal(chat.status,200);
      assert.equal((await get('seller','/notifications')).body.notifications.some(item=>
        item.deepLink==='/messages/'+conversationId),true);
      assert.equal((await get('buyer','/notifications')).body.notifications.some(item=>
        item.deepLink==='/messages/'+conversationId),false);
    }finally{
      await new Promise(resolve=>server.close(resolve));
      await pool.query('DELETE FROM engagement.notifications WHERE source=$1 AND event_id=$2',['order',eventId]);
      await pool.query('DELETE FROM engagement.notification_processed_events WHERE source=$1 AND event_id=$2',
        ['order',eventId]);
      for(const [source,id] of [['payment',paymentEventId],['chat',chatEventId]]){
        await pool.query('DELETE FROM engagement.notifications WHERE source=$1 AND event_id=$2',[source,id]);
        await pool.query('DELETE FROM engagement.notification_processed_events WHERE source=$1 AND event_id=$2',
          [source,id]);
      }
      await pool.end();
    }
  });
