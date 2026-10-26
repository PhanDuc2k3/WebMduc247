import test from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { ProfileService } from '../src/services/profile.service.js';

const userId = '12dd046b-e3ad-47c5-a852-680552362145';
const otherId = '7134c581-745b-4124-8774-4af3d5b1204b';
const context = { ip: '127.0.0.1', userAgent: 'test' };
const authUser = { id: userId, email: 'buyer@example.test' };

function fixture({ scanner = async () => {}, put = async () => {}, updateAvatarKey } = {}) {
  const row = { id: userId, email: authUser.email, status: 'active', email_verified_at: null, display_name: 'Buyer Name', avatar_key: null, phone_e164: '+84901234567', phone_verified_at: new Date(), phone_email_confirmed_at: null, marketing_opt_in: false, roles: ['buyer'] };
  const calls = { sent: [], stored: [], removed: [], events: [] };
  const address = { id: userId, user_id: userId, receiver_name: 'Buyer Name', receiver_phone: '+84901234567', province_code: '79', district_code: '760', ward_code: '26734', address_line: '123 Main Street', note: null, is_default: true, created_at: new Date(), updated_at: new Date() };
  let challengeHash;
  let challengePhone;
  let deletionRequest = null;
  const repository = {
    profile: async id => id === userId ? row : null,
    updateDisplayName: async (_, name) => { row.display_name = name; },
    updateAvatarKey: async (_, key) => { if (updateAvatarKey) return updateAvatarKey(); const old = row.avatar_key; row.avatar_key = key; return old; },
    preference: async (_, value) => { row.marketing_opt_in = value; },
    createPhoneChallenge: async (_, phone, hash) => { challengePhone = phone; challengeHash = hash; return true; },
    cancelPhoneChallenge: async () => {},
    consumePhoneChallenge: async (_, hash) => { if (hash !== challengeHash) return 'invalid'; row.phone_e164 = challengePhone; row.phone_verified_at = null; row.phone_email_confirmed_at = new Date(); return 'ok'; },
    addresses: async () => [address],
    address: async (_user, id) => id === userId ? address : null,
    createAddress: async () => ({ kind: 'ok', address }),
    updateAddress: async (_user, id) => id === userId ? address : null,
    deleteAddress: async (_user, id) => id === userId,
    setDefaultAddress: async (_user, id) => id === userId,
    deletionRequest: async () => deletionRequest,
    createDeletionRequest: async () => deletionRequest ??= { id: otherId, status: 'PENDING', created_at: new Date(), updated_at: new Date(), resolved_at: null },
    cancelDeletionRequest: async () => { if (!deletionRequest || deletionRequest.status !== 'PENDING') return null; deletionRequest = { ...deletionRequest, status: 'CANCELLED', resolved_at: new Date() }; return deletionRequest; },
  };
  const identityService = { throttle: async () => {}, password: { verify: async (_hash, value) => value === 'correct-password' },
    repo: { event: async (action) => calls.events.push(action), userByEmail: async () => ({ ...row, password_hash: 'hash' }) } };
  const avatarStorage = { put: async (key, data) => { await put(); calls.stored.push({ key, data }); }, remove: async key => calls.removed.push(key), signedUrl: async key => `https://objects.example.test/${key}` };
  const service = new ProfileService({ repository, identityService, avatarStorage, scanner, phoneSender: async payload => calls.sent.push(payload), otpKey: Buffer.alloc(32, 1) });
  return { service, row, calls, address };
}

test('profile response masks phone and never exposes password or token', async () => {
  const f = fixture();
  const profile = await f.service.getProfile(userId);
  assert.equal(profile.phoneMasked.endsWith('4567'), true);
  assert.equal(JSON.stringify(profile).includes('+84901234567'), false);
  assert.equal('password_hash' in profile, false);
  await assert.rejects(f.service.updateProfile(userId, { userId: otherId, displayName: 'Wrong' }), { status: 400 });
  assert.equal((await f.service.updateProfile(userId, { displayName: 'Tên Người Mua' })).displayName, 'Tên Người Mua');
  assert.equal((await f.service.updatePreference(userId, { marketingOptIn: true })).marketingOptIn, true);
});

test('personal data export includes own stored fields without credential hashes', async () => {
  const f = fixture();
  f.service.repo.exportPersonalData = async id => id === userId ? {
    account: { id: userId, email: authUser.email, full_name: 'Buyer Name', status: 'active',
      email_verified_at: new Date(), created_at: new Date(), updated_at: new Date(),
      display_name: 'Buyer Name', avatar_key: null, phone_e164: '+84901234567',
      phone_verified_at: new Date(), marketing_opt_in: false, preferences_updated_at: new Date(),
      password_hash: 'secret-hash' },
    addresses: [{ ...f.address, deleted_at: new Date() }],
    phoneChallenges: [], sessions: [{ id: otherId, device: 'browser', token_hash: 'secret-token' }],
    securityEvents: [],
  } : null;
  const exported = await f.service.exportPersonalData(userId);
  assert.equal(exported.scope, 'identity-service');
  assert.equal(exported.addresses[0].receiverPhone, '+84901234567');
  assert.ok(exported.addresses[0].deletedAt);
  assert.equal(JSON.stringify(exported).includes('secret-hash'), false);
  assert.equal(JSON.stringify(exported).includes('secret-token'), false);
  await assert.rejects(f.service.exportPersonalData(otherId), { status: 404 });
});

test('deletion requests require the current password and can be cancelled', async () => {
  const f = fixture();
  await assert.rejects(f.service.requestDeletion(authUser, { password: 'wrong' }, context), { status: 401 });
  const submitted = await f.service.requestDeletion(authUser, { password: 'correct-password' }, context);
  assert.equal(submitted.request.status, 'PENDING');
  assert.equal((await f.service.getDeletionRequest(userId)).request.id, submitted.request.id);
  assert.equal((await f.service.requestDeletion(authUser, { password: 'correct-password' }, context)).request.id, submitted.request.id);
  assert.equal((await f.service.cancelDeletionRequest(userId, context)).request.status, 'CANCELLED');
  await assert.rejects(f.service.cancelDeletionRequest(userId, context), { status: 404 });
});

test('avatar rejects wrong MIME and scanner failure without storing a reference', async () => {
  const png = await sharp({ create: { width: 20, height: 20, channels: 3, background: '#ff0000' } }).png().toBuffer();
  const f = fixture();
  await assert.rejects(f.service.uploadAvatar(userId, png, 'image/jpeg'), { status: 415 });
  await assert.rejects(f.service.uploadAvatar(userId, Buffer.alloc(2 * 1024 * 1024 + 1), 'image/png'), { status: 413 });
  assert.equal(f.calls.stored.length, 0);
  assert.equal(f.row.avatar_key, null);
  const blocked = fixture({ scanner: async () => { throw new Error('scanner unavailable'); } });
  await assert.rejects(blocked.service.uploadAvatar(userId, png, 'image/png'));
  assert.equal(blocked.calls.stored.length, 0);
  assert.equal(blocked.row.avatar_key, null);
  const failedStore = fixture({ put: async () => { throw new Error('object store unavailable'); } });
  await assert.rejects(failedStore.service.uploadAvatar(userId, png, 'image/png'));
  assert.equal(failedStore.row.avatar_key, null);
  assert.equal(failedStore.calls.removed.length, 1);
  const failedDb = fixture({ updateAvatarKey: async () => { throw new Error('database unavailable'); } });
  await assert.rejects(failedDb.service.uploadAvatar(userId, png, 'image/png'));
  assert.equal(failedDb.row.avatar_key, null);
  assert.equal(failedDb.calls.removed.length, 1);
  const valid = await f.service.uploadAvatar(userId, png, 'image/png');
  assert.equal(f.calls.stored.length, 1);
  assert.ok(valid.avatarUrl.includes('/avatars/'));
});

test('phone change needs a valid OTP and never returns full account phone', async () => {
  const f = fixture();
  const requested = await f.service.requestPhone(authUser, { phone: '+84987654321' }, context);
  assert.equal(requested.message.includes('5 phút'), true);
  assert.equal(f.calls.sent.length, 1);
  await assert.rejects(f.service.verifyPhone(authUser, { code: '000000' }, context), { status: 400 });
  const result = await f.service.verifyPhone(authUser, { code: f.calls.sent[0].code }, context);
  assert.equal(result.phoneMasked.endsWith('4321'), true);
  assert.equal(requested.deliveryChannel, 'email');
  assert.equal(result.phoneVerified, false);
  assert.equal(result.phoneEmailConfirmed, true);
  assert.equal('phone' in result, false);
});

test('address list masks receiver phone and foreign ids return 404', async () => {
  const f = fixture();
  const listed = await f.service.listAddresses(userId);
  assert.equal('receiverPhone' in listed.addresses[0], false);
  assert.equal((await f.service.getAddress(userId, userId)).address.receiverPhone, '+84901234567');
  await assert.rejects(f.service.getAddress(userId, otherId), { status: 404 });
  await assert.rejects(f.service.updateAddress(userId, otherId, { receiverName: 'Other' }), { status: 404 });
  await assert.rejects(f.service.deleteAddress(userId, otherId), { status: 404 });
  await assert.rejects(f.service.setDefaultAddress(userId, otherId), { status: 404 });
});

test('address accepts province and ward names without a district', async () => {
  const f = fixture();
  let saved;
  f.service.repo.createAddress = async (_userId, data) => {
    saved = data;
    return { kind: 'ok', address: f.address };
  };
  await f.service.createAddress(userId, {
    receiverName: 'Người Nhận', receiverPhone: '+84901234567',
    provinceCode: 'Hà Nội', wardCode: 'Phường Đống Đa',
    addressLine: 'Số 10 đường mẫu', note: 'Giao ở cổng chính',
  });
  assert.equal(saved.provinceCode, 'Hà Nội');
  assert.equal(saved.wardCode, 'Phường Đống Đa');
  assert.equal(saved.districtCode, '');
});
