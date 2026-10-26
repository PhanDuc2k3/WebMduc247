import test from 'node:test';
import assert from 'node:assert/strict';
import { OrderLifecycle } from '../src/lifecycle.service.js';

test('CHAT-08 internal bot order lookup requires the exact buyer owner',async()=>{
  const groupId='11111111-1111-4111-8111-111111111111';
  const buyerId='22222222-2222-4222-8222-222222222222';
  const pool={query:async(sql,args)=>{
    assert.match(sql,/buyer_id=\$2/);
    assert.equal(args[0],groupId);
    return {rows:args[1]===buyerId?[{id:groupId,status:'DELIVERED'}]:[]};
  }};
  const lifecycle=new OrderLifecycle({pool});
  assert.deepEqual(await lifecycle.chatOrder(groupId,buyerId),{id:groupId,status:'DELIVERED'});
  await assert.rejects(lifecycle.chatOrder(groupId,'33333333-3333-4333-8333-333333333333'),
    error=>error.code==='ORDER_NOT_FOUND');
});
