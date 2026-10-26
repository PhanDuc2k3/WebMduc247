import test from 'node:test';
import assert from 'node:assert/strict';
import { IdentityRepository } from '../src/models/identity.model.js';
import { IdentityService } from '../src/services/identity.service.js';
import { newId } from '../src/utils/crypto.js';
import { createMailQueue } from '../src/services/mail-queue.service.js';
import { randomBytes, randomInt } from 'node:crypto';
import sharp from 'sharp';
import { ProfileRepository } from '../src/models/profile.model.js';
import { ProfileService } from '../src/services/profile.service.js';

test('PostgreSQL migrations support registration, rotation, reset, and store permission', { skip: !process.env.IDENTITY_TEST_DATABASE_URL }, async () => {
  const repo = new IdentityRepository(process.env.IDENTITY_TEST_DATABASE_URL);
  const sent = [];
  const mailer = { verification: async (_, token) => sent.push(token), passwordReset: async (_, token) => sent.push(token) };
  const config = { jwtSecret: 'integration-test-secret-with-32-chars', mailKey: Buffer.alloc(32, 4), issuer: 'identity-service', audience: 'backend-v2', refreshDays: 30, loginLimit: 5, emailVerificationRequired: true };
  const service = new IdentityService({ repository: repo, mailer, config });
  const context = { ip: '127.0.0.2', userAgent: 'integration-test' };
  const email = `${newId()}@example.test`;
  try {
    const registered = await service.register({ email, fullName: 'Integration Test', password: 'long-password-123', confirmPassword: 'long-password-123' }, context);
    await service.verifyEmail({ email, token: sent.at(-1) }, context);
    const login = await service.login({ email, password: 'long-password-123' }, context);
    const rotated = await service.refresh(login.refreshToken, context);
    await assert.rejects(service.refresh(login.refreshToken, context), { status: 401 });
    await assert.rejects(service.refresh(rotated.refreshToken, context), { status: 401 });
    const second = await service.login({ email, password: 'long-password-123' }, context);
    for (let i = 0; i < 6; i++) {
      assert.ok((await service.login({ email, password: 'long-password-123' }, context)).accessToken);
    }
    const storeId = newId(); const otherStoreId = newId();
    await assert.rejects(service.authorizeSeller(`Bearer ${second.accessToken}`, storeId), { status: 403 });
    await repo.pool.query("INSERT INTO user_roles(user_id,role) VALUES ($1,'seller')", [registered.user.id]);
    await repo.pool.query('INSERT INTO store_memberships(user_id,store_id) VALUES ($1,$2)', [registered.user.id, storeId]);
    await service.authorizeSeller(`Bearer ${second.accessToken}`, storeId);
    await assert.rejects(service.authorizeSeller(`Bearer ${second.accessToken}`, otherStoreId), { status: 403 });
    await service.forgotPassword({ email }, context);
    assert.match(sent.at(-1), /^\d{6}$/);
    await service.resetPassword({ email, code: sent.at(-1), newPassword: 'new-password-123', confirmPassword: 'new-password-123' }, context);
    await assert.rejects(service.me(`Bearer ${second.accessToken}`), { status: 401 });
    await assert.rejects(service.refresh(second.refreshToken, context), { status: 401 });
    const delivered = [];
    const queuedMail = createMailQueue(repo, { sendMail: async message => delivered.push(message) }, { key: randomBytes(32), from: 'no-reply@example.test', frontendOrigin: 'https://shop.example.test' });
    await queuedMail.verification(email, 'opaque-test-token');
    await repo.deliverEmails(queuedMail.deliver);
    assert.ok(delivered.some(message => message.text.includes('opaque-test-token')));
    const immediateService = new IdentityService({ repository: repo, mailer, config: { ...config, emailVerificationRequired: false } });
    const immediateEmail = `${newId()}@example.test`;
    const sentBefore = sent.length;
    const immediate = await immediateService.register({ email: immediateEmail, fullName: 'Immediate User', password: 'long-password-123', confirmPassword: 'long-password-123' }, context);
    assert.equal(immediate.requiresEmailVerification, false);
    assert.equal(immediate.user.emailVerifiedAt, null);
    assert.equal(sent.length, sentBefore);
    assert.ok((await immediateService.login({ email: immediateEmail, password: 'long-password-123' }, context)).accessToken);
    await assert.rejects(service.login({ email: immediateEmail, password: 'long-password-123' }, context), { status: 401 });
    await service.resendVerification({ email: immediateEmail }, context);
    await service.verifyEmail({ email: immediateEmail, token: sent.at(-1) }, context);
    assert.ok((await service.login({ email: immediateEmail, password: 'long-password-123' }, context)).accessToken);
    const pendingEmail = `${newId()}@example.test`;
    await service.register({ email: pendingEmail, fullName: 'Pending User', password: 'long-password-123', confirmPassword: 'long-password-123' }, context);
    const pendingLogin = await immediateService.login({ email: pendingEmail, password: 'long-password-123' }, context);
    const pendingRefresh = await immediateService.refresh(pendingLogin.refreshToken, context);
    assert.ok(pendingRefresh.accessToken);
    assert.equal((await immediateService.me(`Bearer ${pendingRefresh.accessToken}`)).user.emailVerifiedAt, null);
    await assert.rejects(service.me(`Bearer ${pendingRefresh.accessToken}`), { status: 401 });
    await assert.rejects(service.refresh(pendingLogin.refreshToken, context), { status: 401 });
  } finally { await repo.close(); }
});

test('PostgreSQL password OTP counts wrong attempts, expires, and cannot be reused', { skip: !process.env.IDENTITY_TEST_DATABASE_URL }, async () => {
  const repo = new IdentityRepository(process.env.IDENTITY_TEST_DATABASE_URL);
  const email = `${newId()}@example.test`;
  const userId = newId();
  const service = new IdentityService({ repository: repo, mailer: {}, config: {
    jwtSecret: 'integration-test-secret-with-32-chars', mailKey: Buffer.alloc(32, 7),
  } });
  try {
    await repo.pool.query("INSERT INTO users(id,email,full_name,password_hash,status,email_verified_at) VALUES ($1,$2,'OTP Test','old-hash','active',now())", [userId, email]);
    const addCode = (code, expiresAt) => repo.pool.query(`INSERT INTO verification_tokens(user_id,purpose,token_hash,expires_at)
      VALUES ($1,'reset_password',$2,$3) RETURNING id`, [userId, service.hashResetCode(email, code), expiresAt]);
    const first = await addCode('123456', new Date(Date.now() + 600_000));
    assert.equal(await repo.resetPassword(email, service.hashResetCode(email, '000000'), 'new-hash'), false);
    assert.equal((await repo.pool.query('SELECT attempts FROM verification_tokens WHERE id=$1', [first.rows[0].id])).rows[0].attempts, 1);
    assert.equal(await repo.resetPassword(email, service.hashResetCode(email, '123456'), 'new-hash'), userId);
    assert.equal(await repo.resetPassword(email, service.hashResetCode(email, '123456'), 'another-hash'), false);
    const second = await addCode('654321', new Date(Date.now() + 600_000));
    for (let i = 0; i < 5; i++) assert.equal(await repo.resetPassword(email, service.hashResetCode(email, '000000'), 'another-hash'), false);
    assert.equal((await repo.pool.query('SELECT attempts FROM verification_tokens WHERE id=$1', [second.rows[0].id])).rows[0].attempts, 5);
    assert.equal(await repo.resetPassword(email, service.hashResetCode(email, '654321'), 'another-hash'), false);
    await repo.pool.query('UPDATE verification_tokens SET consumed_at=now() WHERE id=$1', [second.rows[0].id]);
    await addCode('111111', new Date(Date.now() - 1000));
    assert.equal(await repo.resetPassword(email, service.hashResetCode(email, '111111'), 'another-hash'), false);
  } finally {
    await repo.pool.query('DELETE FROM users WHERE id=$1', [userId]);
    await repo.close();
  }
});

test('PostgreSQL profile and addresses enforce ownership, one default, and snapshot copy', { skip: !process.env.IDENTITY_TEST_DATABASE_URL }, async () => {
  const repo = new IdentityRepository(process.env.IDENTITY_TEST_DATABASE_URL);
  const config = { jwtSecret: 'integration-test-secret-with-32-chars', issuer: 'identity-service', audience: 'backend-v2', refreshDays: 30, loginLimit: 5, emailVerificationRequired: false };
  const sent = [];
  const identity = new IdentityService({ repository: repo, mailer: { verification: async () => {}, passwordReset: async () => {} }, config });
  const objects = new Map();
  const avatarStorage = { put: async (key, data) => objects.set(key, data), remove: async key => objects.delete(key), signedUrl: async key => `https://objects.example.test/${key}` };
  const profile = new ProfileService({ repository: new ProfileRepository(repo), identityService: identity, avatarStorage, scanner: async () => {}, phoneSender: async payload => sent.push(payload), otpKey: Buffer.alloc(32, 2) });
  const context = { ip: '127.0.0.3', userAgent: 'profile-integration' };
  try {
    const first = await identity.register({ email: `${newId()}@example.test`, fullName: 'First Buyer', password: 'long-password-123', confirmPassword: 'long-password-123' }, context);
    const second = await identity.register({ email: `${newId()}@example.test`, fullName: 'Second Buyer', password: 'long-password-123', confirmPassword: 'long-password-123' }, context);
    const userId = first.user.id;
    const data = { receiverName: 'Receiver Name', receiverPhone: '+84901234567', provinceCode: '79', districtCode: '760', wardCode: '26734', addressLine: '123 Main Street', note: null };
    const a = (await profile.createAddress(userId, data)).address;
    const b = (await profile.createAddress(userId, { ...data, addressLine: '456 Second Street' })).address;
    assert.equal((await profile.listAddresses(userId)).addresses.filter(item => item.isDefault).length, 1);
    await Promise.all([profile.setDefaultAddress(userId, a.id), profile.setDefaultAddress(userId, b.id)]);
    const defaults = await repo.pool.query('SELECT count(*)::int AS total FROM addresses WHERE user_id=$1 AND is_default AND deleted_at IS NULL', [userId]);
    assert.equal(defaults.rows[0].total, 1);
    await assert.rejects(profile.getAddress(second.user.id, a.id), { status: 404 });
    await assert.rejects(profile.updateAddress(second.user.id, a.id, { addressLine: 'stolen' }), { status: 404 });
    await assert.rejects(profile.deleteAddress(second.user.id, a.id), { status: 404 });
    const before = await profile.shippingSnapshot(userId, a.id);
    await profile.updateAddress(userId, a.id, { addressLine: '789 New Street' });
    assert.equal(before.addressLine, '123 Main Street');
    await profile.setDefaultAddress(userId, a.id);
    await profile.deleteAddress(userId, a.id);
    assert.equal((await profile.getAddress(userId, b.id)).address.isDefault, true);
    assert.equal((await profile.listAddresses(userId)).addresses.length, 1);
    const phone = `+849${randomInt(10_000_000, 100_000_000)}`;
    await profile.requestPhone({ id: userId, email: first.user.email }, { phone }, context);
    await profile.verifyPhone({ id: userId, email: first.user.email }, { code: sent[0].code }, context);
    assert.equal((await profile.getProfile(userId)).phoneMasked.endsWith(phone.slice(-4)), true);
    const exportData = await profile.exportPersonalData(userId);
    assert.equal(exportData.account.email, first.user.email);
    assert.equal(exportData.profile.phone, phone);
    assert.ok(exportData.addresses.some(item => item.id === a.id && item.deletedAt));
    assert.equal(JSON.stringify(exportData).includes('password_hash'), false);
    assert.equal((await profile.exportPersonalData(second.user.id)).addresses.length, 0);
    const deletion = await profile.repo.createDeletionRequest(userId);
    assert.equal(deletion.status, 'PENDING');
    assert.equal((await profile.repo.createDeletionRequest(userId)).id, deletion.id);
    assert.equal((await profile.repo.cancelDeletionRequest(userId)).status, 'CANCELLED');
    await assert.rejects(profile.verifyPhone({ id: userId, email: first.user.email }, { code: sent[0].code }, context), { status: 400 });
    const png = await sharp({ create: { width: 20, height: 20, channels: 3, background: '#ff0000' } }).png().toBuffer();
    const updated = await profile.uploadAvatar(userId, png, 'image/png');
    assert.ok(updated.avatarUrl.includes('/avatars/'));
    assert.equal(objects.size, 1);
    assert.equal('password_hash' in updated, false);
  } finally { await repo.close(); }
});
