import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { stripTypeScriptTypes } from 'node:module';

const source = (await readFile(new URL('./identityApi.ts', import.meta.url), 'utf8'))
  .replace('import.meta.env.VITE_IDENTITY_API_URL', '"http://identity.test"');
let moduleId = 0;
const user = { id: 'test-admin', roles: ['platform_admin'] };
const json = (data, status = 200, headers = {}) => Response.json(data, { status, headers });
const deferred = () => {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
};

async function setup(t, handler) {
  const previous = { window: globalThis.window, localStorage: globalThis.localStorage };
  globalThis.window = new EventTarget();
  const storage=new Map();
  globalThis.localStorage = { removeItem:key=>storage.delete(key),getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value) };
  t.after(() => {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    }
  });
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    const call = { path: new URL(url).pathname, ...options };
    calls.push(call);
    return handler(call);
  });
  // Execute the actual Vite module with only its build-time URL substituted.
  const js = stripTypeScriptTypes(source);
  const api = await import(`data:text/javascript;base64,${Buffer.from(`${js}\n// test ${moduleId++}`).toString('base64')}`);
  return { ...api, calls,storage };
}

test('StrictMode/provider bootstrap shares one refresh and one concurrent me request', async t => {
  const api = await setup(t, ({ path }) => {
    if (path.endsWith('/refresh')) return json({ accessToken: 'fresh' });
    if (path.endsWith('/me')) return json({ user });
    return json({ ok: true });
  });
  const results = await Promise.all(Array.from({ length: 20 }, () => api.identityApi.me()));
  assert.ok(results.every(result => result.id === user.id));
  assert.equal(api.calls.filter(call => call.path.endsWith('/refresh')).length, 1);
  assert.equal(api.calls.filter(call => call.path.endsWith('/me')).length, 1);
  assert.ok(api.calls.every(call => call.credentials === 'include'));
});

test('expired cookie is not refreshed on every later poll; login recovers and logout stops polling refresh', async t => {
  const api = await setup(t, ({ path }) => {
    if (path.endsWith('/refresh')) return json({ code: 'UNAUTHORIZED' }, 401);
    if (path.endsWith('/login')) return json({ accessToken: 'login-token', user });
    if (path.endsWith('/me')) return json({ user });
    return json({});
  });
  await assert.rejects(api.identityApi.me(), { status: 401 });
  for (let poll = 0; poll < 5; poll++) {
    await assert.rejects(api.authorizedRequest('http://chat.test/conversations'), { status: 401 });
    await assert.rejects(api.identityApi.me(), { status: 401 });
  }
  assert.equal(api.calls.length, 1);
  await api.identityApi.login('admin@example.test', 'test-only');
  assert.deepEqual(await api.identityApi.me(), user);
  await api.identityApi.logout();
  await assert.rejects(api.identityApi.me(), { status: 401 });
  assert.equal(api.calls.filter(call => call.path.endsWith('/refresh')).length, 1);
  await api.identityApi.login('admin@example.test', 'test-only');
  assert.deepEqual(await api.identityApi.me(), user);
});

test('late old-token 401 responses reuse the refreshed token for JSON and blob requests', async t => {
  const releaseLate = deferred(), lateStarted = deferred();
  const api = await setup(t, async ({ path, headers }) => {
    if (path.endsWith('/login')) return json({ accessToken: 'old', user });
    if (path.endsWith('/refresh')) return json({ accessToken: 'new' });
    if (headers.Authorization === 'Bearer old') {
      if (path === '/late-proof') { lateStarted.resolve(); await releaseLate.promise; }
      return json({}, 401);
    }
    assert.equal(headers.Authorization, 'Bearer new');
    return path === '/late-proof' ? new Response('proof') : json({ ok: true });
  });
  await api.identityApi.login('admin@example.test', 'test-only');
  const late = api.authorizedBlobRequest('http://order.test/late-proof');
  await lateStarted.promise;
  assert.deepEqual(await api.authorizedRequest('http://order.test/early'), { ok: true });
  releaseLate.resolve();
  assert.equal(await (await late).text(), 'proof');
  assert.equal(api.calls.filter(call => call.path.endsWith('/refresh')).length, 1);
});

test('parallel protected API 401s share the same refresh', async t => {
  const api = await setup(t, ({ path, headers }) => {
    if (path.endsWith('/login')) return json({ accessToken: 'old', user });
    if (path.endsWith('/refresh')) return json({ accessToken: 'new' });
    return headers.Authorization === 'Bearer old' ? json({}, 401) : json({ ok: true });
  });
  await api.identityApi.login('admin@example.test', 'test-only');
  await Promise.all(Array.from({ length: 20 }, () => api.authorizedRequest('http://order.test/orders')));
  assert.equal(api.calls.filter(call => call.path.endsWith('/refresh')).length, 1);
});

test('429 honors Retry-After seconds, HTTP dates, and a safe fallback before retrying', async t => {
  for (const format of ['seconds', 'date', 'missing']) {
    await t.test(format, async t => {
      let now = Date.parse('2026-10-26T12:00:00Z');
      t.mock.method(Date, 'now', () => now);
      const seconds = format === 'missing' ? 900 : 60;
      const headers = format === 'missing' ? {} : { 'Retry-After': format === 'date' ? new Date(now + 60000).toUTCString() : '60' };
      let refreshes = 0;
      const api = await setup(t, ({ path }) => {
        if (path.endsWith('/refresh')) return ++refreshes === 1 ? json({ code: 'RATE_LIMITED' }, 429, headers) : json({ accessToken: 'new' });
        return json({ user });
      });
      await assert.rejects(api.identityApi.me(), { status: 429 });
      now += seconds * 1000 - 1;
      await assert.rejects(api.identityApi.me(), { status: 429 });
      await assert.rejects(api.authorizedBlobRequest('http://order.test/proof'), { status: 429 });
      assert.equal(refreshes, 1);
      now++;
      assert.deepEqual(await api.identityApi.me(), user);
      assert.equal(refreshes, 2);
    });
  }
});

test('explicit login recovers immediately during refresh cooldown without retrying refresh', async t => {
  const api = await setup(t, ({ path }) => {
    if (path.endsWith('/refresh')) return json({}, 429, { 'Retry-After': '900' });
    if (path.endsWith('/login')) return json({ accessToken: 'signed-in', user });
    return json({ user });
  });
  await assert.rejects(api.identityApi.me(), { status: 429, retryAfterSeconds: 900 });
  await api.identityApi.login('admin@example.test', 'test-only');
  assert.deepEqual(await api.identityApi.me(), user);
  assert.equal(api.calls.filter(call => call.path.endsWith('/refresh')).length, 1);
});

test('a failed old refresh cannot clear a newly logged-in session', async t => {
  const started = deferred(), finish = deferred();
  const api = await setup(t, async ({ path }) => {
    if (path.endsWith('/refresh')) { started.resolve(); return finish.promise; }
    if (path.endsWith('/login')) return json({ accessToken: 'signed-in', user });
    return json({ user });
  });
  const old = assert.rejects(api.identityApi.me(), { code: 'SESSION_CHANGED' });
  await started.promise;
  await api.identityApi.login('admin@example.test', 'test-only');
  finish.resolve(json({}, 401));
  await old;
  assert.equal(api.identityApi.getAccessToken(), 'signed-in');
  assert.deepEqual(await api.identityApi.me(), user);
});

test('a successful old refresh cannot resurrect a logged-out session', async t => {
  const started = deferred(), finish = deferred();
  const api = await setup(t, async ({ path, headers }) => {
    if (path.endsWith('/login')) return json({ accessToken: 'old', user });
    if (path.endsWith('/logout')) return json({});
    if (path.endsWith('/refresh')) { started.resolve(); return finish.promise; }
    if (headers.Authorization === 'Bearer old') return json({}, 401);
    return json({ user });
  });
  await api.identityApi.login('admin@example.test', 'test-only');
  const old = assert.rejects(api.identityApi.me(), { code: 'SESSION_CHANGED' });
  await started.promise;
  await api.identityApi.logout();
  finish.resolve(json({ accessToken: 'should-not-return' }));
  await old;
  assert.equal(api.identityApi.getAccessToken(), null);
  await assert.rejects(api.identityApi.me(), { status: 401 });
  assert.equal(api.calls.filter(call => call.path.endsWith('/refresh')).length, 1);
});

test('repeated endpoint 401 retries once and a permission 403 never refreshes', async t => {
  const api = await setup(t, ({ path }) => {
    if (path.endsWith('/login')) return json({ accessToken: 'old', user });
    if (path.endsWith('/refresh')) return json({ accessToken: 'new' });
    return json({}, path === '/forbidden' ? 403 : 401);
  });
  await api.identityApi.login('admin@example.test', 'test-only');
  await assert.rejects(api.authorizedRequest('http://order.test/forbidden'), { status: 403 });
  assert.equal(api.calls.length, 2);
  await assert.rejects(api.authorizedRequest('http://order.test/rejected'), { status: 401 });
  assert.equal(api.calls.filter(call => call.path.endsWith('/refresh')).length, 1);
  assert.equal(api.calls.filter(call => call.path === '/rejected').length, 2);
});

const mfaSession=()=>({familyId:'session-test',verifiedAt:new Date().toISOString(),reauthenticatedAt:new Date().toISOString(),expiresAt:new Date(Date.now()+28800000).toISOString(),idleExpiresAt:new Date(Date.now()+1800000).toISOString(),reauthSeconds:300});
test('password-stage admin login stores no token and only MFA completion creates the client session',async t=>{
  const session=mfaSession(),api=await setup(t,({path})=>{
    if(path.endsWith('/admin/login'))return json({challengeToken:'purpose-limited',enrollmentRequired:false});
    if(path.endsWith('/mfa/verify'))return json({user:{...user,adminSession:session},accessToken:'verified-admin',adminSession:session});
    return json({user});
  });
  let updates=0;window.addEventListener('identityUpdated',()=>updates++);
  const challenge=await api.identityApi.adminLogin('admin@example.test','test-password');assert.equal(challenge.challengeToken,'purpose-limited');assert.equal(api.identityApi.getAccessToken(),null);assert.equal(updates,0);
  await api.identityApi.adminVerify(challenge.challengeToken,{code:'123456'});assert.equal(api.identityApi.getAccessToken(),'verified-admin');assert.equal(api.identityApi.getAdminSession().familyId,session.familyId);assert.equal(updates,1);
});
test('an expired admin mutation is sent once, clears cached session state, and never replays after sign-in',async t=>{
  const session=mfaSession(),api=await setup(t,({path})=>path.endsWith('/mfa/verify')?json({user,accessToken:'new-admin',adminSession:session}):json({},401));
  api.acceptAdminSession({user,accessToken:'old-admin',adminSession:session});let clears=0;window.addEventListener('adminSessionCleared',()=>clears++);
  const url='http://order.test/api/v2/admin/returns/test/decisions';
  await assert.rejects(api.authorizedRequest(url,{method:'POST',body:{action:'approve'}}),{code:'ADMIN_SESSION_EXPIRED'});
  assert.equal(api.calls.filter(c=>c.path.endsWith('/decisions')).length,1);assert.equal(api.calls.filter(c=>c.path.endsWith('/refresh')).length,0);
  assert.equal(api.identityApi.getAccessToken(),null);assert.equal(api.identityApi.getAdminSession(),null);assert.equal(clears,1);assert.equal(api.storage.get('admin_signed_out'),'true');
  await api.identityApi.adminVerify('new-challenge',{code:'123456'});assert.equal(api.calls.filter(c=>c.path.endsWith('/decisions')).length,1);
});
test('step-up requirements prompt the user and do not automatically retry the mutation',async t=>{
  const api=await setup(t,()=>json({code:'ADMIN_REAUTH_REQUIRED',message:'Reauthenticate'},428));
  api.acceptAdminSession({user,accessToken:'admin',adminSession:mfaSession()});let prompts=0;window.addEventListener('adminReauthRequired',()=>prompts++);
  await assert.rejects(api.authorizedRequest('http://identity.test/api/v2/admin/staff/test/access',{method:'PUT',body:{}}),{status:428});assert.equal(prompts,1);assert.equal(api.calls.length,1);assert.equal(api.identityApi.getAccessToken(),'admin');
});
test('failed logout still removes client data, blocks refresh, and records a non-secret sign-out marker',async t=>{
  const api=await setup(t,()=>{throw Error('Network unavailable');});api.acceptAdminSession({user,accessToken:'admin',adminSession:mfaSession()});
  await assert.rejects(api.identityApi.logout(),/Network unavailable/);assert.equal(api.identityApi.getAccessToken(),null);assert.equal(api.identityApi.getAdminSession(),null);assert.equal(api.storage.get('admin_signed_out'),'true');
  await assert.rejects(api.identityApi.me(),{status:401});assert.equal(api.calls.length,1);assert.ok(!JSON.stringify([...api.storage]).includes('accessToken'));
});
test('another-tab logout invalidates the in-memory admin session immediately',async t=>{
  const api=await setup(t,()=>json({}));api.acceptAdminSession({user,accessToken:'admin',adminSession:mfaSession()});
  const event=new Event('storage');Object.defineProperty(event,'key',{value:'admin_logout_at'});window.dispatchEvent(event);
  assert.equal(api.identityApi.getAccessToken(),null);assert.equal(api.identityApi.getAdminSession(),null);await assert.rejects(api.identityApi.me(),{status:401});assert.equal(api.calls.length,0);
});
