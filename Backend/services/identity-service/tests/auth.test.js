import test from 'node:test';
import assert from 'node:assert/strict';
import { IdentityService } from '../src/services/identity.service.js';
import { hashToken, newId, verifyAccessToken } from '../src/utils/crypto.js';
import { loadConfig } from '../src/config/env.js';

const config = { jwtSecret: 'test-secret-with-at-least-32-characters', mailKey: Buffer.alloc(32, 3), issuer: 'identity-service', audience: 'backend-v2', refreshDays: 30, loginLimit: 5, emailVerificationRequired: true };
const ctx = { ip: '127.0.0.1', userAgent: 'test-browser' };
const fakePassword = { hash: async value => `hash:${value}`, verify: async (hash, value) => hash === `hash:${value}` };

test('runtime rejects disabling email verification', () => {
  const env = {
    IDENTITY_DATABASE_URL: 'postgresql://localhost/test',
    IDENTITY_JWT_SECRET: 'test-secret-with-at-least-32-characters',
    IDENTITY_MAIL_KEY: Buffer.alloc(32).toString('base64'),
    FRONTEND_ORIGIN: 'http://localhost:5173',
    SMTP_HOST: 'localhost', SMTP_USER: 'test', SMTP_PASSWORD: 'test', MAIL_FROM: 'no-reply@example.test',
  };
  assert.equal(loadConfig(env).emailVerificationRequired, true);
  assert.throws(() => loadConfig({ ...env, REQUIRE_EMAIL_VERIFICATION: 'false' }), /Email verification is required/);
  const production = { ...env, NODE_ENV: 'production', FRONTEND_ORIGIN: 'https://mduc247.site',
    PHONE_OTP_MODE: 'sms-webhook', SMS_WEBHOOK_URL: 'https://sms.example.test/send', SMS_WEBHOOK_TOKEN: 'test-token' };
  assert.throws(() => loadConfig(production), /avatar storage is required/);
  const withStorage = { ...production, S3_BUCKET: 'avatars', S3_ACCESS_KEY: 'test', S3_SECRET_KEY: 'test' };
  assert.throws(() => loadConfig(withStorage), /ClamAV scanner is required/);
  assert.ok(loadConfig({ ...withStorage, CLAMAV_HOST: 'scanner' }).scanner);
  assert.equal(loadConfig({ ...withStorage, CLAMAV_HOST: 'scanner', PHONE_OTP_MODE: 'email' }).phoneSender.mode, 'email');
  assert.throws(() => loadConfig({ ...withStorage, CLAMAV_HOST: 'scanner', PHONE_OTP_MODE: 'email-dev' }), /Invalid PHONE_OTP_MODE/);
});

function fixture(emailVerificationRequired = true) {
  const users = new Map();
  const tokens = new Map();
  const sessions = new Map();
  const limits = new Map();
  const mail = [];
  const events = [];
  const memberships = new Set();
  const repo = {
    async limit(bucket, max) { const count = (limits.get(bucket) || 0) + 1; limits.set(bucket, count); return count <= max; },
    async limitAvailable(bucket, max) { return (limits.get(bucket) || 0) < max; },
    async event(action, data) { events.push({ action, ...data }); },
    async userByEmail(email) { return users.get(email) || null; },
    async createUser({ email, fullName, passwordHash, verificationHash, verificationExpires }) {
      if (users.has(email)) throw { code: '23505' };
      const user = { id: newId(), email, full_name: fullName, password_hash: passwordHash, status: emailVerificationRequired ? 'pending_verification' : 'active', email_verified_at: null, roles: ['buyer'] };
      users.set(email, user);
      if (emailVerificationRequired) tokens.set(verificationHash, { userId: user.id, purpose: 'verify_email', expires: verificationExpires, consumed: false });
      return user;
    },
    async replaceToken(userId, purpose, tokenHash, expires) {
      if (tokens.has(tokenHash)) throw { code: '23505' };
      for (const token of tokens.values()) if (token.userId === userId && token.purpose === purpose) token.consumed = true;
      tokens.set(tokenHash, { userId, purpose, expires, consumed: false, attempts: 0 });
    },
    async consumeVerification(email, tokenHash) {
      const token = tokens.get(tokenHash); const user = users.get(email);
      if (!token || !user || token.userId !== user.id || token.purpose !== 'verify_email' || token.consumed || token.expires <= new Date()) return false;
      token.consumed = true; user.email_verified_at = new Date(); user.status = 'active'; return true;
    },
    async createSession({ userId, familyId, tokenHash, expiresAt }) { sessions.set(tokenHash, { userId, familyId, expiresAt, revoked: false }); },
    async rotateSession(oldHash, newHash, expiresAt) {
      const old = sessions.get(oldHash);
      if (!old) return { kind: 'invalid' };
      if (old.revoked) {
        for (const session of sessions.values()) if (session.familyId === old.familyId) session.revoked = true;
        return { kind: 'reuse', userId: old.userId };
      }
      if (old.expiresAt <= new Date()) return { kind: 'invalid' };
      old.revoked = true;
      sessions.set(newHash, { ...old, expiresAt, revoked: false });
      return { kind: 'ok', userId: old.userId, familyId: old.familyId };
    },
    async revokeFamily(userId, familyId) { for (const s of sessions.values()) if (s.userId === userId && s.familyId === familyId) s.revoked = true; },
    async revokeAll(userId) { for (const s of sessions.values()) if (s.userId === userId) s.revoked = true; },
    async currentUser(userId, familyId) {
      if (![...sessions.values()].some(s => s.userId === userId && s.familyId === familyId && !s.revoked)) return null;
      return [...users.values()].find(u => u.id === userId) || null;
    },
    async sellerMember(userId, storeId) { return memberships.has(`${userId}:${storeId}`); },
    async resetPassword(email, codeHash, passwordHash) {
      const user = users.get(email);
      const latest = [...tokens.entries()].reverse().find(([, item]) => item.userId === user?.id && item.purpose === 'reset_password' && !item.consumed);
      if (!latest) return false;
      const [expected, token] = latest;
      if (token.expires <= new Date() || token.attempts >= 5) return false;
      if (expected !== codeHash) { token.attempts++; return false; }
      token.consumed = true; user.password_hash = passwordHash; await this.revokeAll(user.id); return user.id;
    },
  };
  const mailer = {
    async verification(email, token) { mail.push({ type: 'verify', email, token }); },
    async passwordReset(email, code) { mail.push({ type: 'reset', email, code }); },
  };
  return { service: new IdentityService({ repository: repo, mailer, config: { ...config, emailVerificationRequired }, password: fakePassword }), users, tokens, sessions, limits, mail, events, memberships };
}

async function activeAccount(f) {
  await f.service.register({ email: ' USER@Example.COM ', fullName: 'Test User', password: 'long-password-123', confirmPassword: 'long-password-123' }, ctx);
  await f.service.verifyEmail({ email: 'user@example.com', token: f.mail[0].token }, ctx);
}

test('registration and reset password policy accepts eight characters with lowercase and special character', () => {
  const service = fixture().service;
  assert.doesNotThrow(() => service.checkPassword('abcdefg!', 'abcdefg!'));
  assert.doesNotThrow(() => service.checkPassword('àbcdefg!', 'àbcdefg!'));
  for (const password of ['abcdef!', 'ABCDEFG!', 'abcdefg1', 'abcdefg ']) {
    assert.throws(() => service.checkPassword(password, password), { status: 400, code: 'WEAK_PASSWORD' });
  }
  assert.throws(() => service.checkPassword('abcdefg!', 'different!'), { status: 400, code: 'WEAK_PASSWORD' });
});

test('registration normalizes email, rejects duplicate, and verification is one-time', async () => {
  const f = fixture();
  const result = await f.service.register({ email: ' USER@Example.COM ', fullName: 'Test User', password: 'long-password-123', confirmPassword: 'long-password-123' }, ctx);
  assert.equal(result.user.email, 'user@example.com');
  assert.equal(result.requiresEmailVerification, true);
  assert.equal(JSON.stringify(result).includes('password'), false);
  await assert.rejects(f.service.register({ email: 'user@example.com', fullName: 'Test User', password: 'long-password-123', confirmPassword: 'long-password-123' }, ctx), { status: 409 });
  await assert.rejects(f.service.login({ email: 'user@example.com', password: 'long-password-123' }, ctx), { status: 401 });
  await f.service.verifyEmail({ email: 'user@example.com', token: f.mail[0].token }, ctx);
  await assert.rejects(f.service.verifyEmail({ email: 'user@example.com', token: f.mail[0].token }, ctx), { status: 400 });
});

test('registration skips email verification and allows immediate login when disabled', async () => {
  const f = fixture(false);
  const result = await f.service.register({ email: ' USER@Example.COM ', fullName: 'Test User', password: 'long-password-123', confirmPassword: 'long-password-123' }, ctx);
  assert.equal(result.requiresEmailVerification, false);
  assert.equal(result.user.emailVerifiedAt, null);
  assert.equal(f.users.get('user@example.com').status, 'active');
  assert.equal(f.mail.length, 0);
  assert.equal(f.tokens.size, 0);
  const login = await f.service.login({ email: 'user@example.com', password: 'long-password-123' }, ctx);
  assert.equal((await f.service.me(`Bearer ${login.accessToken}`)).user.email, 'user@example.com');
  await f.service.refresh(login.refreshToken, ctx);
  f.users.get('user@example.com').status = 'pending_verification';
  assert.ok((await f.service.login({ email: 'user@example.com', password: 'long-password-123' }, ctx)).accessToken);
  await f.service.resendVerification({ email: 'user@example.com' }, ctx);
  assert.equal(f.mail.length, 0);
  const verificationRestored = new IdentityService({ repository: f.service.repo, mailer: f.service.mailer, config, password: fakePassword });
  f.users.get('user@example.com').status = 'active';
  await assert.rejects(verificationRestored.login({ email: 'user@example.com', password: 'long-password-123' }, ctx), { status: 401 });
  await verificationRestored.resendVerification({ email: 'user@example.com' }, ctx);
  await verificationRestored.verifyEmail({ email: 'user@example.com', token: f.mail.at(-1).token }, ctx);
  assert.ok((await verificationRestored.login({ email: 'user@example.com', password: 'long-password-123' }, ctx)).accessToken);
});

test('expired links and replaced links are rejected', async () => {
  const f = fixture();
  await f.service.register({ email: 'user@example.com', fullName: 'Test User', password: 'long-password-123', confirmPassword: 'long-password-123' }, ctx);
  const old = f.mail[0].token;
  await f.service.resendVerification({ email: 'user@example.com' }, ctx);
  await assert.rejects(f.service.verifyEmail({ email: 'user@example.com', token: old }, ctx), { status: 400 });
  f.tokens.get(hashToken(f.mail[1].token)).expires = new Date(0);
  await assert.rejects(f.service.verifyEmail({ email: 'user@example.com', token: f.mail[1].token }, ctx), { status: 400 });
});

test('refresh rotates once, reuse revokes family, logout revokes access', async () => {
  const f = fixture(); await activeAccount(f);
  const login = await f.service.login({ email: 'user@example.com', password: 'long-password-123' }, ctx);
  assert.ok(verifyAccessToken(login.accessToken, { ...config, secret: config.jwtSecret }));
  const rotated = await f.service.refresh(login.refreshToken, ctx);
  await assert.rejects(f.service.refresh(login.refreshToken, ctx), { status: 401 });
  await assert.rejects(f.service.refresh(rotated.refreshToken, ctx), { status: 401 });
  assert.ok(f.events.some(event => event.action === 'refresh_reuse'));
  const second = await f.service.login({ email: 'user@example.com', password: 'long-password-123' }, ctx);
  await f.service.logout(`Bearer ${second.accessToken}`, false, ctx);
  await assert.rejects(f.service.refresh(second.refreshToken, ctx), { status: 401 });
  await assert.rejects(f.service.me(`Bearer ${second.accessToken}`), { status: 401 });
});

test('forgot password is generic, reset is one-time, and revokes all sessions', async () => {
  const f = fixture(); await activeAccount(f);
  const login = await f.service.login({ email: 'user@example.com', password: 'long-password-123' }, ctx);
  const unknown = await f.service.forgotPassword({ email: 'missing@example.com' }, ctx);
  const known = await f.service.forgotPassword({ email: 'user@example.com' }, ctx);
  assert.deepEqual(unknown, known);
  assert.match(f.mail.at(-1).code, /^\d{6}$/);
  await assert.rejects(f.service.resetPassword({ email: 'user@example.com', code: '999999', newPassword: 'another-password-123', confirmPassword: 'another-password-123' }, ctx), { status: 400 });
  const expired = f.mail.at(-1).code;
  f.tokens.get(f.service.hashResetCode('user@example.com', expired)).expires = new Date(0);
  await assert.rejects(f.service.resetPassword({ email: 'user@example.com', code: expired, newPassword: 'another-password-123', confirmPassword: 'another-password-123' }, ctx), { status: 400 });
  await f.service.forgotPassword({ email: 'user@example.com' }, ctx);
  await f.service.resetPassword({ email: 'user@example.com', code: f.mail.at(-1).code, newPassword: 'another-password-123', confirmPassword: 'another-password-123' }, ctx);
  await assert.rejects(f.service.refresh(login.refreshToken, ctx), { status: 401 });
  await assert.rejects(f.service.resetPassword({ email: 'user@example.com', code: f.mail.at(-1).code, newPassword: 'another-password-123', confirmPassword: 'another-password-123' }, ctx), { status: 400 });
});

test('resending password OTP invalidates the earlier code and five wrong attempts exhaust the new code', async () => {
  const f = fixture(); await activeAccount(f);
  const email = 'user@example.com';
  const newPassword = 'another-password-123';
  await f.service.forgotPassword({ email }, ctx);
  const oldCode = f.mail.at(-1).code;
  await f.service.forgotPassword({ email }, ctx);
  const currentCode = f.mail.at(-1).code;
  assert.notEqual(currentCode, oldCode);
  await assert.rejects(f.service.resetPassword({ email, code: oldCode, newPassword, confirmPassword: newPassword }, ctx), { status: 400 });
  const current = f.tokens.get(f.service.hashResetCode(email, currentCode));
  assert.equal(current.attempts, 1);
  const wrong = currentCode === '000000' ? '000001' : '000000';
  for (let attempt = 0; attempt < 4; attempt++) {
    await assert.rejects(f.service.resetPassword({ email, code: wrong, newPassword, confirmPassword: newPassword }, ctx), { status: 400 });
  }
  assert.equal(current.attempts, 5);
  assert.equal(current.consumed, false);
});

test('seller authorization requires role and matching store membership', async () => {
  const f = fixture(); await activeAccount(f);
  const login = await f.service.login({ email: 'user@example.com', password: 'long-password-123' }, ctx);
  const storeA = newId(); const storeB = newId();
  await assert.rejects(f.service.authorizeSeller(null, storeA), { status: 401 });
  await assert.rejects(f.service.authorizeSeller(`Bearer ${login.accessToken}`, storeA), { status: 403 });
  const user = f.users.get('user@example.com'); user.roles.push('seller'); f.memberships.add(`${user.id}:${storeA}`);
  await f.service.authorizeSeller(`Bearer ${login.accessToken}`, storeA);
  await assert.rejects(f.service.authorizeSeller(`Bearer ${login.accessToken}`, storeB), { status: 403 });
});

test('failed login is rate limited and does not permanently lock the account', async () => {
  const f = fixture(); await activeAccount(f);
  for (let i = 0; i < 8; i++) assert.ok((await f.service.login({ email: 'user@example.com', password: 'long-password-123' }, ctx)).accessToken);
  assert.equal(f.limits.get(`login:account:${hashToken('user@example.com')}`) || 0, 0);
  for (let i = 0; i < 5; i++) await assert.rejects(f.service.login({ email: 'user@example.com', password: 'incorrect-password' }, ctx), { status: 401 });
  await assert.rejects(f.service.login({ email: 'user@example.com', password: 'long-password-123' }, ctx), { status: 429 });
  f.limits.clear(); // Simulates the 15-minute window expiring.
  assert.ok((await f.service.login({ email: 'user@example.com', password: 'long-password-123' }, ctx)).accessToken);
});
