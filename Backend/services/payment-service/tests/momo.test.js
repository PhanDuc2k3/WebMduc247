import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { MomoProvider } from '../src/momo.js';

test('MoMo captureWallet IPN verifies the documented field order and rejects tampering',()=>{
  const provider=new MomoProvider({ accessKey:'AK_TEST',secretKey:'SK_TEST' });
  const ipn={ amount:130000,extraData:'',message:'Successful.',orderId:'order-123',
    orderInfo:'MDUC247 order-123',orderType:'momo_wallet',partnerCode:'MOMO_TEST',
    payType:'qr',requestId:'request-123',responseTime:1721720663942,resultCode:0,
    transId:'9007199254740993' };
  const raw='accessKey=AK_TEST&amount=130000&extraData=&message=Successful.'+
    '&orderId=order-123&orderInfo=MDUC247 order-123&orderType=momo_wallet'+
    '&partnerCode=MOMO_TEST&payType=qr&requestId=request-123'+
    '&responseTime=1721720663942&resultCode=0&transId=9007199254740993';
  const signature=createHmac('sha256','SK_TEST').update(raw).digest('hex');
  assert.equal(provider.verifyIpn({ ...ipn,signature }),true);
  assert.equal(provider.verifyIpn({ ...ipn,amount:130001,signature }),false);
  assert.equal(provider.verifyIpn({ ...ipn,transId:'9007199254740994',signature }),false);
  assert.equal(provider.verifyIpn({ ...ipn,signature:'invalid' }),false);
});
