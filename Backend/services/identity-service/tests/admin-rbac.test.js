import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {effectiveAdminAccess,ADMIN_ROLES,requireAdminPermission,requireAdminScope,adminScopeSql,normalizeScope} from '../../../packages/contracts/admin-rbac.js';
import {approvalFingerprint,verifyApprovalBinding,requireIndependentApprover} from '../../../packages/contracts/approval-binding.js';
import {requirePlatformAdmin} from '../../../packages/contracts/platform-admin.js';
import {ReturnAdminService} from '../../order-service/src/return-admin.service.js';
const actor=(...roles)=>{const id=randomUUID();return {id,roles:['platform_admin'],adminAccess:effectiveAdminAccess(roles.map(role=>({role,scope:{}})),id)};};
test('RBAC-001..003 explicit role mapping denies generic role, unknown permissions and exports by default',()=>{
  assert.equal(Object.keys(ADMIN_ROLES).length,9);
  assert.throws(()=>requirePlatformAdmin({id:randomUUID(),roles:['platform_admin']}),{status:403});
  for(const role of Object.keys(ADMIN_ROLES)){
    const user=actor(role);
    assert.throws(()=>requireAdminPermission(user,'new_module.read'),{status:403});
    assert.throws(()=>requireAdminPermission(user,'users.export'),{status:403});
    assert.throws(()=>requireAdminPermission(user,'finance.export'),{status:403});
    assert.throws(()=>requireAdminPermission(user,'payout_accounts.execute'),{status:403});
  }
  assert.throws(()=>requireAdminPermission(actor('content_editor'),'users.read'),{status:403});
  assert.throws(()=>requireAdminPermission(actor('system_admin'),'refunds.approve'),{status:403});
});
test('acceptance: customer support cannot invoke refund or return approval APIs before any SQL',async()=>{
  const service=new ReturnAdminService({pool:{query(){throw Error('SQL must not run');},connect(){throw Error('SQL must not run');}}});
  await assert.rejects(service.decide(actor('customer_support'),randomUUID(),{action:'approve'}),{status:403,code:'ADMIN_PERMISSION_REQUIRED'});
  for(const permission of ['refunds.create','refunds.approve','refunds.execute','returns.moderate','finance.view_sensitive'])
    assert.throws(()=>requireAdminPermission(actor('customer_support'),permission),{status:403});
});
test('RBAC-004 multiple roles never allow an account to approve itself',()=>{
  const user=actor('finance','system_admin','moderator');
  requireAdminPermission(user,'refunds.create');requireAdminPermission(user,'refunds.approve');
  assert.throws(()=>requireIndependentApprover(user.id,user.id),{status:403,code:'SELF_APPROVAL_FORBIDDEN'});
});
test('RBAC-007 binds object, amount, recipient, target version, payload and policy version',()=>{
  const value={operation:'return_approve',targetId:randomUUID(),snapshot:{version:2,amountMinor:100000,recipientId:randomUUID()},policyVersion:1};
  const row={operation:value.operation,target_id:value.targetId,snapshot:value.snapshot,policy_version:1,fingerprint:approvalFingerprint(value)};
  verifyApprovalBinding(row,value);
  const variants=[{...value,targetId:randomUUID()},{...value,operation:'cancel_paid_order'},{...value,policyVersion:2},
    ...[{version:3},{amountMinor:100001},{recipientId:randomUUID()}].map(change=>({...value,snapshot:{...value.snapshot,...change}}))];
  for(const changed of variants)assert.throws(()=>verifyApprovalBinding(row,changed),{code:'APPROVAL_STALE'});
  assert.throws(()=>verifyApprovalBinding({...row,snapshot:{...row.snapshot,amountMinor:1}},value),{code:'APPROVAL_STALE'});
  assert.equal(approvalFingerprint({a:1,b:2}),approvalFingerprint({b:2,a:1}));
});
test('RBAC-008 binds scope parameters and keeps grants as OR with AND inside a role',()=>{
  const first=randomUUID(),second=randomUUID(),user={id:randomUUID(),adminAccess:effectiveAdminAccess([
    {role:'operations',scope:{storeIds:[first],caseKinds:['TICKET']}},{role:'moderator',scope:{storeIds:[second]}}])};
  requireAdminScope(user,'cases.read',{storeId:first,caseKind:'TICKET'});
  requireAdminScope(user,'cases.read',{storeId:second,caseKind:'DISPUTE'});
  assert.throws(()=>requireAdminScope(user,'cases.read',{storeId:first,caseKind:'DISPUTE'}),{code:'ADMIN_SCOPE_REQUIRED'});
  const args=['search'],sql=adminScopeSql(user,'cases.read',{storeIds:'o.store_id::text',caseKinds:'c.kind'},args);
  assert.match(sql,/AND/);assert.match(sql,/OR/);assert.doesNotMatch(sql,new RegExp(first));assert.deepEqual(args.slice(1),[[first],['TICKET'],[second]]);
  assert.throws(()=>normalizeScope({storeIds:[]}),{code:'INVALID_ADMIN_SCOPE'});
  assert.throws(()=>normalizeScope({storeIds:["' OR TRUE --"]}),{code:'INVALID_ADMIN_SCOPE'});
  assert.throws(()=>normalizeScope({unknown:['TICKET']}),{code:'INVALID_ADMIN_SCOPE'});
});
