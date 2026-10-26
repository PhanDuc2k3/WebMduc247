import test from 'node:test';
import assert from 'node:assert/strict';
import { allocateDiscount, PromotionService } from '../src/service.js';

test('voucher allocation uses integer largest remainders and totals exactly',()=>{
  const lines=[
    { id:'b',unitPriceMinor:100,quantity:1 },
    { id:'c',unitPriceMinor:100,quantity:1 },
    { id:'a',unitPriceMinor:100,quantity:1 },
  ];
  const result=allocateDiscount(100,lines);
  assert.deepEqual(Object.fromEntries([...result].sort()),{ a:34,b:33,c:33 });
  assert.equal([...result.values()].reduce((sum,value)=>sum+value,0),100);
  const large=allocateDiscount(1_000_000_000_001,[
    { id:'first',unitPriceMinor:4_000_000_000_000,quantity:1 },
    { id:'second',unitPriceMinor:4_000_000_000_000,quantity:1 },
  ]);
  assert.equal([...large.values()].reduce((sum,value)=>sum+value,0),1_000_000_000_001);
  assert.ok([...large.values()].every(value=>Number.isSafeInteger(value)&&value>=0));
});

test('shop voucher is applied before platform voucher on remaining item price',async()=>{
  const storeId='11111111-1111-4111-8111-111111111111';
  const userId='22222222-2222-4222-8222-222222222222';
  const itemId='33333333-3333-4333-8333-333333333333';
  const variantId='44444444-4444-4444-8444-444444444444';
  const now=Date.now();
  const rows={
    SHOP20:{id:'55555555-5555-4555-8555-555555555555',code:'SHOP20',store_id:storeId,
      campaign_id:'66666666-6666-4666-8666-666666666666',funding_source:'SELLER',
      discount_type:'FIXED',discount_value:20,max_discount_minor:null,min_spend_minor:0},
    PLATFORM50:{id:'77777777-7777-4777-8777-777777777777',code:'PLATFORM50',store_id:null,
      campaign_id:'88888888-8888-4888-8888-888888888888',funding_source:'PLATFORM',
      discount_type:'PERCENT',discount_value:5000,max_discount_minor:null,min_spend_minor:0},
  };
  const usageAmounts=[];
  const query=async(sql,args)=>{
    if(sql.includes('FROM engagement.flash_sale_items'))return {rows:[]};
    if(sql.includes('FROM engagement.vouchers v'))return {rows:[{...rows[args[0]],
      starts_at:new Date(now-60_000),ends_at:new Date(now+60_000),campaign_status:'ACTIVE',
      segment:'ALL',scope_type:args[0]==='SHOP20'?'STORE':'PLATFORM',scope_id:null,
      used_count:0,reserved_count:0,total_limit:10,per_user_limit:1}]};
    if(sql.includes('count(*)::int AS count FROM engagement.voucher_usage'))return {rows:[{count:0}]};
    if(sql.includes('FROM engagement.promotion_reserve_requests'))return {rows:[]};
    if(sql.includes('INSERT INTO engagement.voucher_usage'))usageAmounts.push(args[3]);
    return {rows:[]};
  };
  const pool={query,connect:async()=>({query,release(){}})};
  const service=new PromotionService(pool,{});
  const quote=await service.quote({userId,firstOrder:true,storeCode:'SHOP20',platformCode:'PLATFORM50',
    lines:[{id:itemId,variantId,storeId,quantity:1,priceMinor:100,priceOriginalMinor:100}]});
  assert.equal(quote.lines[0].shopVoucherDiscountMinor,20);
  assert.equal(quote.lines[0].platformVoucherDiscountMinor,40);
  assert.equal(quote.lines[0].voucherDiscountMinor,60);
  assert.deepEqual(quote.vouchers.map(item=>item.kind),['store','platform']);
  const reserved=await service.reserve({userId,firstOrder:true,storeCode:'SHOP20',
    platformCode:'PLATFORM50',orderRef:'stack-checkout-1',ttlSeconds:120,
    lines:[{id:itemId,variantId,storeId,quantity:1,priceMinor:100,priceOriginalMinor:100}]});
  assert.equal(reserved.lines[0].voucherDiscountMinor,60);
  assert.deepEqual(usageAmounts,[20,40]);
});
