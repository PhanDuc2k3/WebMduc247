import test from 'node:test';
import assert from 'node:assert/strict';
import { isPlatformAdmin, adminDestination } from './adminPolicy.ts';
test('only the authenticated platform role grants UI access; legacy role field is ignored', () => {
  for (const value of [null, {}, { role: 'admin' }, { roles: ['buyer'] }, { roles: ['seller'] }]) assert.equal(isPlatformAdmin(value), false);
  assert.equal(isPlatformAdmin({ roles: ['buyer','platform_admin'] }), true);
});
test('post-login destination remains in the delivered admin area', () => {
  for (const path of [null, 'https://evil.example', '//evil.example', '/admin/login', '/admin/users/../../login', '/admin/../login']) assert.equal(adminDestination(path), '/admin');
  for (const path of ['/admin/users','/admin/stores','/admin/products','/admin/orders','/admin/audit']) assert.equal(adminDestination(path),path);
  assert.equal(adminDestination('/admin?tab=summary'), '/admin?tab=summary');
});
