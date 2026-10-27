import test from 'node:test';
import assert from 'node:assert/strict';
import { isPlatformAdmin, adminDestination, canVisitAdminPath } from './adminPolicy.ts';
test('UI access needs effective permissions; a generic platform role grants nothing', () => {
  for (const value of [null, {}, { role: 'admin' }, { roles: ['buyer'] }, { roles: ['seller'] }]) assert.equal(isPlatformAdmin(value), false);
  assert.equal(isPlatformAdmin({ roles: ['buyer','platform_admin'] }), false);
  const editor={adminAccess:{permissions:['storefront.read','storefront.update']}};
  assert.equal(isPlatformAdmin(editor),true);
  assert.equal(canVisitAdminPath(editor,'/admin/storefront'),true);
  assert.equal(canVisitAdminPath(editor,'/admin/users'),false);
  assert.equal(canVisitAdminPath(editor,'/admin/new-module'),false);
});
test('post-login destination remains in the delivered admin area', () => {
  for (const path of [null, 'https://evil.example', '//evil.example', '/admin/login', '/admin/users/../../login', '/admin/../login']) assert.equal(adminDestination(path), '/admin');
  for (const path of ['/admin/users','/admin/stores','/admin/products','/admin/orders','/admin/audit']) assert.equal(adminDestination(path),path);
  assert.equal(adminDestination('/admin?tab=summary'), '/admin?tab=summary');
});
