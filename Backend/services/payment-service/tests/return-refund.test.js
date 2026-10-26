import test from 'node:test';
import assert from 'node:assert/strict';
import { PaymentService } from '../src/service.js';

test('RET-04 payment refuses a return refund before Order confirms receipt',async()=>{
  const id='11111111-1111-4111-8111-111111111111';
  const shop='22222222-2222-4222-8222-222222222222';
  const group='33333333-3333-4333-8333-333333333333';
  const payment=new PaymentService({}, {orderUrl:'http://localhost:5103',orderToken:'test',
    momo:{},vietqr:{}});
  payment.remote=async()=>({id,shopOrderId:shop,groupId:group,status:'APPROVED',amountMinor:100});
  await assert.rejects(payment.refund({returnRequestId:id,shopOrderId:shop,groupId:group,
    amountMinor:100,reason:'Return '+id,idempotencyKey:'return:'+id+':0'}),
    error=>error.code==='RETURN_REFUND_NOT_READY');
});
