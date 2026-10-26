import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { PaymentService } from '../src/service.js';

test('NOTI-02 Payment notification delivery uses an independent outbox cursor',async()=>{
  let received=null,updated='';
  const server=http.createServer(async(req,res)=>{
    const parts=[];for await(const part of req)parts.push(part);
    received={headers:req.headers,body:JSON.parse(Buffer.concat(parts).toString('utf8'))};
    res.writeHead(200);res.end('{}');
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const db={query:async(sql)=>{
    if(sql.includes('SELECT id,event_type,aggregate_id,payload,notification_attempts'))return {rows:[{
      id:12,event_type:'PaymentSucceeded.v1',aggregate_id:'11111111-1111-4111-8111-111111111111',
      payload:{groupId:'22222222-2222-4222-8222-222222222222'},notification_attempts:0}]};
    if(sql.includes('UPDATE payment_service.payment_outbox'))updated=sql;
    return {rows:[]};},release(){}};
  const service=new PaymentService({connect:async()=>db},{momo:{},vietqr:{}});
  try{assert.equal(await service.publishNotificationOutbox(
    'http://127.0.0.1:'+server.address().port,'source-token'),true);
    assert.equal(received.headers['x-payment-notification-token'],'source-token');
    assert.equal(received.headers['x-event-id'],'12');
    assert.equal(received.body.type,'PaymentSucceeded.v1');
    assert.match(updated,/notification_sent_at/);
    assert.doesNotMatch(updated,/SET published_at/);
  }finally{await new Promise(resolve=>server.close(resolve));}
});
