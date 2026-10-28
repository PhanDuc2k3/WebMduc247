import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import http from 'node:http';
import {connectMongo,objectId} from '../src/repository.js';
import {createHandler} from '../src/server.js';

test('chat queue feed requires the independent internal token',async()=>{
  const previous=process.env.ADMIN_AUTHORIZATION_TOKEN;process.env.ADMIN_AUTHORIZATION_TOKEN='isolated-admin-queue-token';
  const {handler}=createHandler({repo:{adminQueueFeed:async()=>({items:[],next:null})}},{},{});
  const server=http.createServer(handler);await new Promise(done=>server.listen(0,'127.0.0.1',done));const url=`http://127.0.0.1:${server.address().port}/api/v2/internal/admin-queue`;
  try{
    assert.equal((await fetch(url)).status,403);assert.equal((await fetch(url,{headers:{'X-Admin-Authorization-Token':'wrong'}})).status,403);
    const response=await fetch(url,{headers:{'X-Admin-Authorization-Token':process.env.ADMIN_AUTHORIZATION_TOKEN}});assert.equal(response.status,200);assert.deepEqual(await response.json(),{items:[],next:null});
  }finally{await new Promise(done=>server.close(done));if(previous===undefined)delete process.env.ADMIN_AUTHORIZATION_TOKEN;else process.env.ADMIN_AUTHORIZATION_TOKEN=previous;}
});
test('MongoDB admin report feed retains store scope, reason, stable cursor and closed reports', {skip:!process.env.CHAT_TEST_MONGO_URL},async()=>{
  const url=new URL(process.env.CHAT_TEST_MONGO_URL);if(!url.pathname.endsWith('_test'))throw Error('Dedicated *_test Mongo database required');
  const {connection,repo}=await connectMongo(url.href,365),buyer=randomUUID(),store=randomUUID();let conversation;
  try{
    const created=await repo.getOrCreate(buyer,store,'Queue test shop','queue-test-shop');conversation=created.id;
    const report=await repo.report(conversation,buyer,'A report that requires admin investigation',null);
    const feed=await repo.adminQueueFeed();const row=feed.items.find(item=>item.sourceId===report.id);assert.equal(row.storeId,store);assert.equal(row.active,true);assert.equal(row.reason,'A report that requires admin investigation');
    assert.ok((await repo.adminQueueFeed(report.id)).items.every(item=>item.sourceId>report.id));
    await repo.abuse_reports.updateOne({_id:objectId(report.id)},{$set:{status:'CLOSED'}});
    assert.equal((await repo.adminQueueFeed()).items.find(item=>item.sourceId===report.id).active,false);
    await assert.rejects(repo.adminQueueFeed('bad cursor'),{status:400});
  }finally{if(conversation){await repo.abuse_reports.deleteMany({conversationId:objectId(conversation)});await repo.conversations.deleteOne({_id:objectId(conversation)});}await connection.close();}
});
