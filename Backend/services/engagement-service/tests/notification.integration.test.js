import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { NotificationService } from '../src/notification.service.js';

test('AC-12 event dedupe, recipient isolation, cursor, read and offline persistence',
  {skip:!process.env.NOTIFICATION_TEST_DATABASE_URL},async()=>{
    const url=new URL(process.env.NOTIFICATION_TEST_DATABASE_URL);
    if(!decodeURIComponent(url.pathname.slice(1)).endsWith('_test'))
      throw new Error('NOTIFICATION_TEST_DATABASE_URL must target a dedicated *_test database');
    const pool=new pg.Pool({connectionString:process.env.NOTIFICATION_TEST_DATABASE_URL});
    const buyer=randomUUID(),seller=randomUUID(),stranger=randomUUID(),store=randomUUID();
    const group=randomUUID(),shop=randomUUID(),events=[randomUUID(),randomUUID(),randomUUID()];
    const emitted=[];
    const notifier=new NotificationService(pool,{emit:(userId,data)=>emitted.push({userId,data})});
    notifier.orderShop=async()=>({shopOrderId:shop,groupId:group,buyerId:buyer,storeId:store});
    notifier.members=async()=>[seller];
    try{
      const payload={orderId:shop,groupId:group,buyerId:buyer,storeId:store};
      assert.deepEqual(await notifier.ingest('order',events[0],{type:'OrderCreated.v1',payload}),
        {duplicate:false,created:2});
      assert.deepEqual(await notifier.ingest('order',events[0],{type:'OrderCreated.v1',payload}),
        {duplicate:true,created:0});
      assert.equal((await notifier.unreadCount(buyer)).count,1);
      assert.equal((await notifier.unreadCount(seller)).count,1);
      assert.equal((await notifier.unreadCount(stranger)).count,0);
      const sellerList=await notifier.list(seller,{});
      assert.equal(sellerList.notifications[0].deepLink,'/mystore/orders/'+shop);
      assert.equal(JSON.stringify(sellerList).includes(buyer),false);
      assert.equal(emitted.length,2);
      assert.equal(emitted.some(row=>row.userId===stranger),false);
      await notifier.ingest('order',events[1],{type:'ShopOrderConfirmed.v1',
        payload:{shopOrderId:shop,groupId:group,storeId:store}});
      await notifier.ingest('order',events[2],{type:'OrderCancelled.v1',
        payload:{shopOrderId:shop,groupId:group,storeId:store}});
      const first=await notifier.list(buyer,{limit:2}),second=await notifier.list(buyer,{limit:2,
        cursor:first.nextCursor});
      assert.equal(first.notifications.length,2);
      assert.equal(second.notifications.length,1);
      assert.equal(new Set([...first.notifications,...second.notifications].map(row=>row.id)).size,3);
      const id=first.notifications[0].id;
      await assert.rejects(notifier.readOne(stranger,id),error=>error.code==='NOTIFICATION_NOT_FOUND');
      assert.equal((await notifier.readOne(buyer,id)).notification.isRead,true);
      assert.equal((await notifier.readOne(buyer,id)).notification.isRead,true);
      assert.equal((await notifier.unreadCount(buyer)).count,2);
      await notifier.readMany(buyer,[second.notifications[0].id]);
      assert.equal((await notifier.unreadCount(buyer)).count,1);
      await notifier.readAll(buyer);
      assert.equal((await notifier.unreadCount(buyer)).count,0);
      assert.equal((await notifier.unreadCount(seller)).count,2);
      const deliveries=(await pool.query('SELECT status FROM engagement.notification_deliveries '+
        'WHERE notification_id IN (SELECT id FROM engagement.notifications '+
        "WHERE source='order' AND event_id=ANY($1::text[]))",[events])).rows;
      assert.equal(deliveries.every(row=>row.status==='DISABLED'),true);
    }finally{
      await pool.query("DELETE FROM engagement.notifications WHERE source='order' "+
        'AND event_id=ANY($1::text[])',[events]);
      await pool.query("DELETE FROM engagement.notification_processed_events WHERE source='order' "+
        'AND event_id=ANY($1::text[])',[events]);
      await pool.end();
    }
  });

test('Identity outbox events create one in-app notification without duplicate email',
  {skip:!process.env.NOTIFICATION_TEST_DATABASE_URL},async()=>{
    const url=new URL(process.env.NOTIFICATION_TEST_DATABASE_URL);
    if(!decodeURIComponent(url.pathname.slice(1)).endsWith('_test'))
      throw new Error('NOTIFICATION_TEST_DATABASE_URL must target a dedicated *_test database');
    const pool=new pg.Pool({connectionString:process.env.NOTIFICATION_TEST_DATABASE_URL});
    const userId=randomUUID(),eventId=randomUUID();
    const notifier=new NotificationService(pool,{});
    try{
      const event={type:'RefreshReuseDetected.v1',payload:{userId,familyId:randomUUID()}};
      assert.deepEqual(await notifier.ingest('identity',eventId,event),{duplicate:false,created:1});
      assert.deepEqual(await notifier.ingest('identity',eventId,event),{duplicate:true,created:0});
      const inbox=await notifier.list(userId,{});
      assert.equal(inbox.notifications.length,1);
      assert.equal(inbox.notifications[0].type,'system');
      assert.equal(inbox.notifications[0].deepLink,'/profile');
      const delivery=await pool.query(`SELECT d.status FROM engagement.notification_deliveries d
        JOIN engagement.notifications n ON n.id=d.notification_id
        WHERE n.source='identity' AND n.event_id=$1`,[eventId]);
      assert.equal(delivery.rows[0].status,'SKIPPED');
    }finally{
      await pool.query("DELETE FROM engagement.notifications WHERE source='identity' AND event_id=$1",[eventId]);
      await pool.query("DELETE FROM engagement.notification_processed_events WHERE source='identity' AND event_id=$1",[eventId]);
      await pool.end();
    }
  });
