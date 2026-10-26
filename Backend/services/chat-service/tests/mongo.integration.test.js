import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { connectMongo,decodeCursor } from '../src/repository.js';

test('MongoDB unique conversation, idempotent message and stable cursor',
  {skip:!process.env.CHAT_TEST_MONGO_URL},async()=>{
    const url=new URL(process.env.CHAT_TEST_MONGO_URL);
    if(!decodeURIComponent(url.pathname.slice(1)).endsWith('_test'))
      throw new Error('CHAT_TEST_MONGO_URL must target a dedicated *_test database');
    const {connection,repo}=await connectMongo(process.env.CHAT_TEST_MONGO_URL,365);
    const buyer=randomUUID(),store=randomUUID(),other=randomUUID();
    let conversation;
    try{
      const created=await Promise.all(Array.from({length:12},()=>repo.getOrCreate(buyer,store,'Test Shop','test-shop')));
      assert.equal(new Set(created.map(row=>row.id)).size,1);
      conversation=await repo.get(created[0].id);
      const actor={id:buyer};
      const first=await repo.send(conversation,actor,{clientMessageId:'test-message-1',type:'text',
        content:'First message'});
      const retry=await repo.send(conversation,actor,{clientMessageId:'test-message-1',type:'text',
        content:'First message'});
      assert.equal(first.message.id,retry.message.id);assert.equal(retry.duplicate,true);
      await assert.rejects(repo.send(conversation,actor,{clientMessageId:'test-message-1',type:'text',
        content:'Changed payload'}),error=>error.code==='IDEMPOTENCY_CONFLICT');
      const second=await repo.send(conversation,{id:other},{clientMessageId:'test-message-2',type:'text',
        content:'Second message'});
      const third=await repo.send(conversation,actor,{clientMessageId:'test-message-3',type:'text',
        content:'Third message'});
      const newest=await repo.page(created[0].id,null,2);
      const older=await repo.page(created[0].id,decodeCursor(newest.nextCursor),2);
      assert.deepEqual([...older.messages,...newest.messages].map(row=>row.id),
        [first.message.id,second.message.id,third.message.id]);
      assert.equal(await repo.unread(conversation,buyer),1);
      assert.equal((await repo.markRead(conversation,buyer,second.message.id)).unreadCount,0);
    }finally{
      if(conversation){
        await repo.read_states.deleteMany({conversationId:conversation._id});
        await repo.chat_outbox.deleteMany({conversationId:conversation._id});
        await repo.messages.deleteMany({conversationId:conversation._id});
        await repo.conversations.deleteOne({_id:conversation._id});
      }
      await connection.close();
    }
  });
