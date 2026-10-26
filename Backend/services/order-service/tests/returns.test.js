import test from 'node:test';
import assert from 'node:assert/strict';
import { ReturnService, proratedRefund } from '../src/return.service.js';

test('RET-04 prorates the paid amount and allocates the remainder to the final units',()=>{
  assert.equal(proratedRefund(100,3,1),33);
  assert.equal(proratedRefund(100,3,1,1,33),33);
  assert.equal(proratedRefund(100,3,1,2,66),34);
  assert.throws(()=>proratedRefund(100,3,2,2,66),error=>error.code==='INVALID_QUANTITY');
});
test('RET-03 evidence authorization checks shop membership for a non-buyer',async()=>{
  const id='11111111-1111-4111-8111-111111111111';
  let checked=false;
  const service=new ReturnService({pool:{query:async()=>({rows:[{id,buyer_id:'buyer',store_id:id}]})},
    inventory:async()=>{checked=true;throw new Error('Denied');}});
  await assert.rejects(service.authorized('stranger',id),/Denied/);
  assert.equal(checked,true);
  await service.authorized('buyer',id);
  assert.equal(checked,true);
});
test('return lists keep shop-order filtering scoped to the buyer or seller shop',async()=>{
  const id='11111111-1111-4111-8111-111111111111';
  const calls=[];
  const service=new ReturnService({pool:{query:async(sql,args)=>{calls.push({sql,args});return {rows:[]};}},
    inventory:async()=>({role:'owner'})});
  await service.buyerList('buyer',id);
  await service.sellerList('seller',id,id);
  assert.deepEqual(calls[0].args,['buyer',id]);
  assert.deepEqual(calls[1].args,[id,id]);
  assert.match(calls[0].sql,/buyer_id=\$1/);
  assert.match(calls[1].sql,/store_id=\$1/);
});
