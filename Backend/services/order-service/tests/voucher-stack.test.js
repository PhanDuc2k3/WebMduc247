import test from 'node:test';
import assert from 'node:assert/strict';
import { OrderService } from '../src/service.js';
import { OrderLifecycle } from '../src/lifecycle.service.js';

test('checkout quote includes seller and platform voucher allocations without double counting',async()=>{
  const userId='11111111-1111-4111-8111-111111111111';
  const storeId='22222222-2222-4222-8222-222222222222';
  const itemId='33333333-3333-4333-8333-333333333333';
  const variantId='44444444-4444-4444-8444-444444444444';
  const addressId='55555555-5555-4555-8555-555555555555';
  const service=new OrderService({query:async()=>({rows:[{count:0}]})},'http://catalog','http://identity','token');
  service.address=async()=>({id:addressId,receiverName:'Buyer',receiverPhone:'0900000000',
    provinceCode:'01',districtCode:'001',wardCode:'00001',addressLine:'Test address'});
  service.cart=async()=>({version:1,items:[{id:itemId,variantId,storeId,storeName:'Test shop',
    productId:'66666666-6666-4666-8666-666666666666',categoryId:null,quantity:1,
    selected:true,error:null,priceMinor:100,priceOriginalMinor:100}]});
  service.promotion=async(path,_method,input)=>{
    assert.equal(path,'/quote');
    assert.equal(input.storeCode,'SHOP20');
    assert.equal(input.platformCode,'PLATFORM50');
    return {serverTime:new Date().toISOString(),vouchers:[
      {id:'77777777-7777-4777-8777-777777777777',code:'SHOP20',discountMinor:20,kind:'store',fundingSource:'SELLER'},
      {id:'88888888-8888-4888-8888-888888888888',code:'PLATFORM50',discountMinor:40,kind:'platform',fundingSource:'PLATFORM'}],
      lines:[{id:itemId,unitPriceMinor:100,flashDiscountMinor:0,flashCampaignId:null,
        voucherDiscountMinor:60,shopVoucherDiscountMinor:20,platformVoucherDiscountMinor:40}]};
  };
  const quote=await service.calculate(userId,{addressId,paymentMethod:'COD',
    storeVoucherCode:'SHOP20',platformVoucherCode:'PLATFORM50'},'Bearer test');
  assert.equal(quote.stores[0].lines[0].lineTotalMinor,40);
  assert.equal(quote.stores[0].discountMinor,60);
  assert.equal(quote.payableTotalMinor,30040);
  assert.equal(quote.vouchers.length,2);
});

test('platform voucher quota is released only after all shop orders are cancelled',async()=>{
  const calls=[];
  let groupStatus='PARTIAL_CANCELLED';
  const lifecycle=new OrderLifecycle({
    pool:{query:async()=>({rows:[{status:groupStatus}]})},
    promotion:async(path,_method,body)=>{calls.push([path,body]);return {released:1};},
  });
  const row={id:'11111111-1111-4111-8111-111111111111',
    group_id:'22222222-2222-4222-8222-222222222222',
    quote_id:'33333333-3333-4333-8333-333333333333'};
  await lifecycle.releaseCancelledPromotions(row);
  assert.deepEqual(calls.map(item=>item[0]),['/release-shop']);
  groupStatus='CANCELLED';calls.length=0;
  await lifecycle.releaseCancelledPromotions(row);
  assert.deepEqual(calls.map(item=>item[0]),['/release-shop','/release-platform']);
  assert.equal(calls[1][1].orderRef,row.quote_id);
});
