import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import http from 'node:http';
import {AdminChatReports} from '../src/admin-reports.service.js';
import {connectMongo,objectId} from '../src/repository.js';
import {createHandler} from '../src/server.js';
import {effectiveAdminAccess} from '../../../packages/contracts/admin-rbac.js';
const actor=(role,scope={})=>{const id=randomUUID();return {id,adminAccess:effectiveAdminAccess([{role,scope}],id)};};
test('chat moderation denies unauthorized users and stale sensitive sessions before content access',async()=>{
  const admin=new AdminChatReports({abuse_reports:{findOne(){throw Error('Must not read');}}});
  await assert.rejects(admin.list(actor('customer_support')),{status:403});
  const stale={...actor('moderator'),adminSession:{reauthenticatedAt:'2000-01-01',reauthSeconds:300}};
  await assert.rejects(admin.detail(stale,'000000000000000000000001',{reason:'Investigate report'}),{status:428});
});
test('Mongo chat moderation scope, audited access, atomic decisions and queue closure',{skip:!process.env.CHAT_TEST_MONGO_URL},async t=>{
  const url=new URL(process.env.CHAT_TEST_MONGO_URL);assert.ok(url.pathname.endsWith('_test'));const {connection,repo}=await connectMongo(url.href,365);
  const store=randomUUID(),other=randomUUID(),buyer=randomUUID(),conversation=await repo.getOrCreate(buyer,store,'Basic admin fixture','basic-admin'),second=await repo.getOrCreate(buyer,other,'Other shop','other-shop');
  const messageId=objectId('00000000'+randomUUID().replaceAll('-','').slice(0,16));
  await repo.messages.insertOne({_id:messageId,conversationId:objectId(conversation.id),senderId:buyer,senderRole:'buyer',type:'text',content:'Private reported message',createdAt:new Date(),clientMessageId:randomUUID()});
  const report=await repo.report(conversation.id,buyer,'A reported conversation needs review',String(messageId)),otherReport=await repo.report(second.id,buyer,'Other store report',null);
  const admin=new AdminChatReports(repo),moderator=actor('moderator',{storeIds:[store]}),outsider=actor('moderator',{storeIds:[other]});
  try{
    await t.test('lists have no message content, scope covers list/count/detail and invalid query is rejected',async()=>{
      const page=await admin.list(moderator,{q:report.id});assert.equal(page.total,1);assert.equal(page.items[0].id,report.id);assert.ok(!JSON.stringify(page).includes('Private reported message'));
      assert.equal((await admin.list(moderator,{q:otherReport.id})).total,0);await assert.rejects(admin.detail(outsider,report.id,{reason:'Investigation of a foreign report'}),{status:403});
      await assert.rejects(admin.list(moderator,{q:'$where'}),{status:400});
    });
    await t.test('private message access needs reason and audit; audit failure returns no content',async()=>{
      await assert.rejects(admin.detail(moderator,report.id,{reason:'short'}),{status:400});
      const result=await admin.detail(moderator,report.id,{reason:'Investigate this exact report'});assert.equal(result.messages.length,1);assert.equal(result.messages[0].content,'Private reported message');assert.ok(!JSON.stringify(result).includes(buyer));
      assert.equal(await repo.db.collection('admin_report_access').countDocuments({reportId:objectId(report.id)}),1);
      const broken=new AdminChatReports({...repo,db:{collection:()=>({insertOne:async()=>{throw Error('audit unavailable');}})},get:repo.get.bind(repo)});
      await assert.rejects(broken.detail(moderator,report.id,{reason:'Audit failure must stop private access'}));
    });
    await t.test('concurrent decisions allow one winner; retry keeps one immutable event and feed closes',async()=>{
      const cmd={action:'confirm',reason:'Evidence reviewed for this report',requestId:randomUUID(),version:1};
      const results=await Promise.allSettled([admin.decide(moderator,report.id,cmd),admin.decide(moderator,report.id,{...cmd,requestId:randomUUID(),action:'dismiss'})]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
      const row=await repo.abuse_reports.findOne({_id:objectId(report.id)});const event=row.events[0];const replay={...cmd,action:event.action,requestId:event.requestId};
      await admin.decide(moderator,report.id,replay);assert.equal((await repo.abuse_reports.findOne({_id:objectId(report.id)})).events.length,1);
      await assert.rejects(admin.decide(moderator,report.id,{...replay,reason:'Changing a receipt is rejected'}),{status:409});
      assert.equal((await repo.adminQueueFeed()).items.find(r=>r.sourceId===report.id).active,false);
    });
    await t.test('HTTP enforces bearer roles and origin for private report views',async()=>{
      let user=actor('customer_support');const {handler}=createHandler({identity:async()=>user,repo},{},{});const server=http.createServer(handler);await new Promise(done=>server.listen(0,'127.0.0.1',done));
      const base=`http://127.0.0.1:${server.address().port}/api/v2/admin/chat-reports`;
      try{assert.equal((await fetch(base,{headers:{Authorization:'Bearer test'}})).status,403);user=moderator;
        assert.equal((await fetch(base+'?q='+report.id,{headers:{Authorization:'Bearer test'}})).status,200);
        assert.equal((await fetch(base+'/'+report.id+'/view',{method:'POST',headers:{Authorization:'Bearer test',Origin:'https://wrong.example','Content-Type':'application/json'},body:JSON.stringify({reason:'View a report for investigation'})})).status,403);
      }finally{await new Promise(done=>server.close(done));}
    });
  }finally{
    const ids=[objectId(conversation.id),objectId(second.id)];await repo.db.collection('admin_report_access').deleteMany({reportId:{$in:[objectId(report.id),objectId(otherReport.id)]}});
    await repo.abuse_reports.deleteMany({conversationId:{$in:ids}});await repo.messages.deleteMany({conversationId:{$in:ids}});await repo.conversations.deleteMany({_id:{$in:ids}});await connection.close();
  }
});
