import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { IdentityService } from '../src/services/identity.service.js';
import { IdentityAdminService } from '../src/services/platform-admin.service.js';
import { CatalogAdminService } from '../../catalog-service/src/platform-admin.service.js';
import { OrderAdminService } from '../../order-service/src/platform-admin.service.js';
import { createRequestHandler } from '../src/routes/index.js';

const config = { jwtSecret: 'admin-test-secret-at-least-thirty-two-characters', mailKey: Buffer.alloc(32),
  issuer: 'identity-service', audience: 'backend-v2', refreshDays: 30, loginLimit: 5,
  emailVerificationRequired: true, frontendOrigin: 'http://localhost:5173', secureCookie: false };
const context = { ip: '127.0.0.1', userAgent: 'admin-test' };
function fixture(roles = ['buyer','platform_admin']) {
  const user = { id: '11111111-1111-4111-8111-111111111111', email: 'admin@example.test', full_name: 'Admin Test',
    status: 'active', email_verified_at: new Date(), roles, password_hash: 'test-hash' };
  const sessions = [], events = [];
  const repo = { limit: async () => true, limitAvailable: async () => true,
    userByEmail: async email => email === user.email ? user : null, event: async action => events.push(action),
    createSession: async session => sessions.push(session),
    currentUser: async (id, familyId) => sessions.some(session => session.userId === id && session.familyId === familyId) ? user : null,
    pool: { query: async sql => ({ rows: sql.includes('admin_role_assignments') ? (user.roles.includes('platform_admin')?[{role:'legacy_admin',scope:{}}]:[]) : [{ total: 3, active: 2, suspended: 0, pending: 1, new_week: 2 }] }) },
  };
  const service = new IdentityService({ repository: repo, mailer: {}, config,
    password: { verify: async (_hash, value) => value === 'correct-password!' } });
  // This suite isolates the password gate; real MFA/session persistence is exercised in admin-auth.integration.
  service.adminAuth.beginLogin=async()=>({challengeToken:'password-stage-only',enrollmentRequired:true,expiresAt:new Date(Date.now()+300000).toISOString()});
  return { user, sessions, events, service, repo };
}

test('admin login denies buyer/seller before creating a session; client roles cannot grant access', async () => {
  for (const roles of [['buyer'], ['buyer','seller']]) {
    const f = fixture(roles);
    await assert.rejects(f.service.login({ email: f.user.email, password: 'correct-password!', roles: ['platform_admin'] }, context,
      { platformAdmin: true }), { status: 401, code: 'INVALID_CREDENTIALS' });
    assert.equal(f.sessions.length, 0);
    assert.ok(f.events.includes('admin_login_denied'));
    assert.ok((await f.service.login({ email: f.user.email, password: 'correct-password!' }, context)).accessToken);
  }
});

test('admin login requires valid credentials, verified active account and server-owned role', async () => {
  const f = fixture();
  for (const variant of [{ password: 'wrong' }, { status: 'suspended' }, { email_verified_at: null }]) {
    const old = { status: f.user.status, email_verified_at: f.user.email_verified_at };
    Object.assign(f.user, variant);
    await assert.rejects(f.service.login({ email: f.user.email, password: variant.password || 'correct-password!' }, context,
      { platformAdmin: true }), { status: 401 });
    Object.assign(f.user, old);
  }
  assert.equal(f.sessions.length, 0);
  const result = await f.service.login({ email: f.user.email, password: 'correct-password!' }, context, { platformAdmin: true });
  assert.ok(result.challengeToken);assert.equal(result.accessToken,undefined);assert.equal(result.refreshToken,undefined);assert.equal(result.user,undefined);
  assert.equal(f.sessions.length,0);assert.equal(f.events.includes('admin_login_success'),false);
});

test('public registration never forwards an admin role supplied by the client', async () => {
  const f = fixture(); let created;
  f.service.password.hash = async () => 'test-hash';
  f.service.mailer.verification = async () => {};
  f.repo.createUser = async input => { created = input; return { ...f.user, roles: ['buyer'] }; };
  const result = await f.service.register({ email: 'buyer@example.test', fullName: 'Buyer', password: 'correct-password!',
    confirmPassword: 'correct-password!', roles: ['platform_admin'], role: 'admin' }, context);
  assert.equal(created.roles, undefined); assert.equal(created.role, undefined);
  assert.deepEqual(result.user.roles, ['buyer']);
});

test('every dashboard data provider rejects absent and non-admin identity before SQL', async () => {
  let queries = 0;
  const pool = { query: async () => { queries++; throw new Error('Should not query'); } };
  const services = [new IdentityAdminService({ pool }), new CatalogAdminService(pool), new OrderAdminService(pool)];
  for (const service of services) {
    await assert.rejects(service.summary(null), { status: 401 });
    await assert.rejects(service.summary({ id: 'buyer', roles: ['buyer','seller'] }), { status: 403 });
    await assert.rejects(service.summary({ id: 'forged', role: 'admin' }), { status: 403 });
  }
  await assert.rejects(services[2].recent({ id: 'buyer', roles: ['buyer'] }), { status: 403 });
  assert.equal(queries, 0);
});

test('HTTP admin password stage sets only a device cookie and cannot enter the dashboard', async t => {
  const f = fixture();
  const server = http.createServer(createRequestHandler(f.service, {}, config));
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const body = JSON.stringify({ email: f.user.email, password: 'correct-password!' });
  const post = origin => fetch(`${base}/api/v2/auth/admin/login`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body });
  assert.equal((await post('https://foreign.example.test')).status, 403);
  const missing = await fetch(`${base}/api/v2/admin/identity/summary`); assert.equal(missing.status, 401);
  const response = await post(config.frontendOrigin); assert.equal(response.status, 200);
  const cookie = response.headers.get('set-cookie');
  assert.match(cookie, /HttpOnly/); assert.match(cookie, /SameSite=Strict/); assert.match(cookie, /Path=\/api\/v2\/auth/);
  const result = await response.json(); assert.equal(result.refreshToken, undefined);
  assert.ok(result.challengeToken);assert.equal(result.accessToken,undefined);assert.doesNotMatch(cookie,/identity_refresh=/);
  const headers = { Authorization: `Bearer ${result.accessToken}` };
  const summary = await fetch(`${base}/api/v2/admin/identity/summary`, { headers });
  assert.equal(summary.status,401);
  f.user.roles = ['buyer'];
  const revokedRole = await fetch(`${base}/api/v2/admin/identity/summary`, { headers });
  assert.equal(revokedRole.status,401);
});
