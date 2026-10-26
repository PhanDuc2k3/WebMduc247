import test from 'node:test';
import assert from 'node:assert/strict';
import {PaymentService} from '../src/service.js';

test('CORE-015 a provider error containing credentials never reaches the API error details',async()=>{
  const buyerId='11111111-1111-4111-8111-111111111111',groupId='22222222-2222-4222-8222-222222222222';
  const service=new PaymentService({query:async()=>({rows:[]})},{momo:{},vietqr:{}});
  service.momo={configured:()=>true,create:async()=>{throw Error('secret=PRIVATE_PROVIDER_MARKER token=PRIVATE_TOKEN_MARKER');}};
  service.group=async()=>({id:groupId,buyerId,paymentMethod:'MOMO',status:'PENDING_PAYMENT',paymentStatus:'UNPAID',currency:'VND',amountMinor:100000});
  service.transaction=async()=>({id:groupId,status:'INITIATED',checkout_url:null});
  await assert.rejects(service.createIntent(buyerId,{orderGroupId:groupId,method:'MOMO',idempotencyKey:'core-safe-provider-error'}),error=>{
    assert.equal(error.code,'PROVIDER_UNAVAILABLE');assert.equal(error.details,undefined);
    assert.doesNotMatch(error.message+JSON.stringify(error),/PRIVATE_/);return true;
  });
});
