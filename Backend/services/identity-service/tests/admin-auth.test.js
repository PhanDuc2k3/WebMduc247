import test from 'node:test';
import assert from 'node:assert/strict';
import {base32,hotp,verifyTotp,sealSecret,openSecret,mfaKey,recoveryHash} from '../src/utils/admin-mfa.js';
import {requireRecentAdmin} from '../../../packages/contracts/admin-auth-policy.js';
import {requireAdminPermission,effectiveAdminAccess} from '../../../packages/contracts/admin-rbac.js';
test('RFC 4226 and 6238 vectors match without any external OTP service',()=>{
  const secret=base32(Buffer.from('12345678901234567890'));
  for(const [counter,expected] of ['755224','287082','359152','969429','338314','254676','287922','162583','399871','520489'].entries())assert.equal(hotp(secret,counter),expected);
  for(const [seconds,expected] of [[59,'94287082'],[1111111109,'07081804'],[1111111111,'14050471'],[1234567890,'89005924'],[2000000000,'69279037'],[20000000000,'65353130']])assert.equal(hotp(secret,Math.floor(seconds/30),{digits:8}),expected);
});
test('TOTP permits a small clock window but refuses replay, malformed values and old codes',()=>{
  const secret=base32(Buffer.alloc(20,7)),counter=1000;
  assert.equal(verifyTotp(secret,hotp(secret,counter),{now:counter*30000,lastCounter:999}),counter);
  assert.equal(verifyTotp(secret,hotp(secret,counter),{now:counter*30000,lastCounter:counter}),null);
  assert.equal(verifyTotp(secret,hotp(secret,counter+1),{now:counter*30000,lastCounter:999}),counter+1);
  for(const code of ['abc','12345',{},hotp(secret,counter-2)])assert.equal(verifyTotp(secret,code,{now:counter*30000}),null);
});
test('MFA secrets are authenticated and bound to the owner, with separate recovery hashing',()=>{
  const key=mfaKey({mailKey:Buffer.alloc(32,4)}),secret='PRIVATE_TEST_SECRET',sealed=sealSecret(secret,key,'owner');
  assert.doesNotMatch(JSON.stringify(sealed),/PRIVATE_TEST_SECRET/);assert.equal(openSecret(sealed,key,'owner'),secret);
  assert.throws(()=>openSecret(sealed,key,'different-owner'));
  assert.throws(()=>openSecret({...sealed,ciphertext:Buffer.from('tampered').toString('base64url')},key,'owner'));
  assert.notEqual(recoveryHash(key,'owner','ABCDE-ABCDE-ABCDE-ABCDE'),recoveryHash(key,'other','ABCDE-ABCDE-ABCDE-ABCDE'));
});
test('sensitive permissions require a recent MFA session while ordinary reads remain available',()=>{
  const actor={id:'test-admin',adminAccess:effectiveAdminAccess([{role:'finance',scope:{}}]),adminSession:{reauthenticatedAt:new Date(Date.now()-600000).toISOString(),reauthSeconds:300}};
  requireAdminPermission(actor,'refunds.read');assert.throws(()=>requireAdminPermission(actor,'refunds.execute'),{status:428,code:'ADMIN_REAUTH_REQUIRED'});
  assert.throws(()=>requireRecentAdmin({}),{status:428});actor.adminSession.reauthenticatedAt=new Date().toISOString();requireAdminPermission(actor,'refunds.execute');
});
