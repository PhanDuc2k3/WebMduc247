import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { once } from 'node:events';
import { createRequestHandler } from '../src/routes/index.js';
import { HttpError } from '../src/utils/errors.js';

const config = { frontendOrigin: 'http://localhost:5173', refreshDays: 30, secureCookie: false };

async function fixture(t, refresh) {
  const server = http.createServer(createRequestHandler({ refresh }, {}, config));
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => server.close(resolve)));
  return () => fetch(`http://127.0.0.1:${server.address().port}/api/v2/auth/refresh`, {
    method: 'POST', headers: { Origin: config.frontendOrigin, 'Content-Type': 'application/json', Cookie: 'identity_refresh=invalid-test-cookie' }, body: '{}',
  });
}

test('invalid refresh clears the HttpOnly cookie so later reloads cannot replay it', async t => {
  const post = await fixture(t, async token => {
    assert.equal(token, 'invalid-test-cookie');
    throw new HttpError(401, 'UNAUTHORIZED', 'Sign in again');
  });
  const response = await post();
  assert.equal(response.status, 401);
  assert.match(response.headers.get('set-cookie'), /identity_refresh=;.*HttpOnly;.*Path=\/api\/v2\/auth;.*Max-Age=0/);
});

test('429 preserves the refresh cookie and exposes Retry-After to the frontend', async t => {
  const post = await fixture(t, async () => { throw new HttpError(429, 'RATE_LIMITED', 'Wait'); });
  const response = await post();
  assert.equal(response.status, 429);
  assert.equal(response.headers.get('set-cookie'), null);
  assert.equal(response.headers.get('retry-after'), '900');
  assert.equal(response.headers.get('access-control-expose-headers'), 'Retry-After');
  assert.equal(response.headers.get('access-control-allow-origin'), config.frontendOrigin);
});

test('successful refresh still rotates the HttpOnly cookie without returning it in JSON', async t => {
  const post = await fixture(t, async () => ({ accessToken: 'test-access', refreshToken: 'test-rotated-cookie' }));
  const response = await post();
  assert.equal(response.status, 200);
  assert.match(response.headers.get('set-cookie'), /identity_refresh=test-rotated-cookie; HttpOnly/);
  assert.deepEqual(await response.json(), { accessToken: 'test-access' });
});
