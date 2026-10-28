import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {randomUUID} from 'node:crypto';
import {connectMongo,objectId} from '../src/repository.js';
import {createHandler} from '../src/server.js';
import {effectiveAdminAccess} from '../../../packages/contracts/admin-rbac.js';
test('store report summary HTTP denies ordinary users and other store scope',async()=>{
  const id=randomUUID(),staff=randomUUID();let actor={id:staff};
  const {handler}=createHandler({identity:async()=>actor,repo:{storeReportSummary:async storeId=>({storeId,total_reports:2,open_reports:1})}},{},{});
  const server=http.createServer(handler);await new Promise(done=>server.listen(0,'127.0.0.1',done));const url=`http://127.0.0.1:${server.address().port}/api/v2/admin/stores/${id}/report-summary`;
  try{
    assert.equal((await fetch(url,{headers:{Authorization:'Bearer test'}})).status,403);
    actor.adminAccess=effectiveAdminAccess([{role:'moderator',scope:{storeIds:[randomUUID()]}}],staff);
    assert.equal((await fetch(url,{headers:{Authorization:'Bearer test'}})).status,403);
    actor.adminAccess=effectiveAdminAccess([{role:'moderator',scope:{storeIds:[id]}}],staff);
    const response=await fetch(url,{headers:{Authorization:'Bearer test'}});assert.equal(response.status,200);assert.deepEqual(await response.json(),{storeId:id,total_reports:2,open_reports:1});
  }finally{await new Promise(done=>server.close(done));}
});
test('Mongo store report counts isolate conversations, retain closed reports and exclude content',{skip:!process.env.CHAT_TEST_MONGO_URL},async()=>{
  const url=new URL(process.env.CHAT_TEST_MONGO_URL);if(!url.pathname.endsWith('_test'))throw Error('Dedicated *_test database required');
  const {connection,repo}=await connectMongo(url.href,365),buyer=randomUUID(),store=randomUUID(),other=randomUUID(),ids=[];
  try{
    const first=await repo.getOrCreate(buyer,store,'Store governance test','store-governance-test');ids.push(first.id);
    const second=await repo.getOrCreate(buyer,other,'Other store test','other-store-test');ids.push(second.id);
    const report=await repo.report(first.id,buyer,'Private report content not exposed to store overview',null);
    await repo.report(second.id,buyer,'Unrelated report for another shop',null);
    assert.equal((await repo.storeReportSummary(store)).open_reports,1);assert.equal((await repo.storeReportSummary(randomUUID())).total_reports,0);
    await repo.abuse_reports.updateOne({_id:objectId(report.id)},{$set:{status:'CLOSED'}});
    const summary=await repo.storeReportSummary(store);assert.equal(summary.total_reports,1);assert.equal(summary.open_reports,0);assert.equal(JSON.stringify(summary).includes('Private report content'),false);
  }finally{for(const id of ids){await repo.abuse_reports.deleteMany({conversationId:objectId(id)});await repo.conversations.deleteOne({_id:objectId(id)});}await connection.close();}
});
