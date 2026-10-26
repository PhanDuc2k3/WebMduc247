import { createHmac, randomInt, randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { HttpError, invalid } from '../utils/errors.js';
import { scanWithClamAv } from './clam-scanner.service.js';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const phonePattern = /^\+[1-9]\d{7,14}$/;
const localityPattern = /^[\p{L}\p{M}\p{N} ./'-]+$/u;
const namePattern = /^[\p{L}\p{M}\p{N} .'-]+$/u;
const missing = () => new HttpError(404, 'NOT_FOUND', 'Không tìm thấy dữ liệu.');

export const maskPhone = value => value ? `${value.slice(0, Math.min(3, value.length - 4))}${'*'.repeat(Math.max(0, value.length - 7))}${value.slice(-4)}` : null;

function textField(value, min, max, pattern) {
  if (typeof value !== 'string') throw invalid();
  const trimmed = value.trim();
  if (trimmed.length < min || trimmed.length > max || (pattern && !pattern.test(trimmed))) throw invalid();
  return trimmed;
}

function addressInput(body) {
  const allowed = ['receiverName', 'receiverPhone', 'provinceCode', 'districtCode', 'wardCode', 'addressLine', 'note', 'isDefault'];
  if (Object.keys(body).some(key => !allowed.includes(key))) throw invalid();
  return {
    receiverName: textField(body.receiverName, 2, 120, namePattern),
    receiverPhone: textField(body.receiverPhone, 9, 16, phonePattern),
    provinceCode: textField(body.provinceCode, 1, 100, localityPattern),
    districtCode: body.districtCode == null || body.districtCode === '' ? '' : textField(body.districtCode, 1, 100, localityPattern),
    wardCode: textField(body.wardCode, 1, 100, localityPattern),
    addressLine: textField(body.addressLine, 5, 250),
    note: body.note == null || body.note === '' ? null : textField(body.note, 1, 300),
    isDefault: body.isDefault === true,
  };
}

function addressDto(row, detailed = false) {
  return {
    id: row.id,
    receiverName: row.receiver_name,
    ...(detailed ? { receiverPhone: row.receiver_phone } : { receiverPhoneMasked: maskPhone(row.receiver_phone) }),
    provinceCode: row.province_code,
    districtCode: row.district_code,
    wardCode: row.ward_code,
    addressLine: row.address_line,
    note: row.note,
    isDefault: row.is_default,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class ProfileService {
  constructor({ repository, identityService, avatarStorage, scanner, phoneSender, otpKey }) {
    this.repo = repository;
    this.identity = identityService;
    this.avatarStorage = avatarStorage;
    this.scanner = scanner;
    this.phoneSender = phoneSender;
    this.otpKey = otpKey;
  }

  async getProfile(userId) {
    const row = await this.repo.profile(userId);
    if (!row) throw missing();
    return { userId: row.id, displayName: row.display_name, avatarUrl: row.avatar_key && this.avatarStorage ? await this.avatarStorage.signedUrl(row.avatar_key) : null,
      email: row.email, emailVerified: Boolean(row.email_verified_at), phoneMasked: maskPhone(row.phone_e164), phoneVerified: Boolean(row.phone_verified_at),
      phoneEmailConfirmed: Boolean(row.phone_email_confirmed_at),
      status: row.status, roles: row.roles, marketingOptIn: row.marketing_opt_in };
  }

  async exportPersonalData(userId) {
    const data = await this.repo.exportPersonalData(userId);
    if (!data) throw missing();
    const { account } = data;
    return {
      scope: 'identity-service', generatedAt: new Date().toISOString(),
      account: { id: account.id, email: account.email, fullName: account.full_name,
        status: account.status, emailVerifiedAt: account.email_verified_at,
        createdAt: account.created_at, updatedAt: account.updated_at },
      profile: { displayName: account.display_name, phone: account.phone_e164,
        phoneVerifiedAt: account.phone_verified_at, phoneEmailConfirmedAt: account.phone_email_confirmed_at, avatarKey: account.avatar_key,
        avatarDownloadUrl: account.avatar_key && this.avatarStorage ? await this.avatarStorage.signedUrl(account.avatar_key) : null,
        marketingOptIn: account.marketing_opt_in, preferencesUpdatedAt: account.preferences_updated_at },
      addresses: data.addresses.map(row => ({ id: row.id, receiverName: row.receiver_name,
        receiverPhone: row.receiver_phone, provinceCode: row.province_code,
        districtCode: row.district_code, wardCode: row.ward_code, addressLine: row.address_line,
        note: row.note, isDefault: row.is_default, deletedAt: row.deleted_at,
        createdAt: row.created_at, updatedAt: row.updated_at })),
      phoneChallenges: data.phoneChallenges.map(row => ({ phone: row.phone_e164, attempts: row.attempts,
        expiresAt: row.expires_at, consumedAt: row.consumed_at, createdAt: row.created_at })),
      sessions: data.sessions.map(row => ({ id: row.id, device: row.device, createdAt: row.created_at,
        expiresAt: row.expires_at, rotatedAt: row.rotated_at, revokedAt: row.revoked_at })),
      securityEvents: data.securityEvents.map(row => ({ action: row.action, ip: row.ip,
        userAgent: row.user_agent, occurredAt: row.occurred_at })),
    };
  }

  deletionRequestDto(row) {
    return row ? { id: row.id, status: row.status, createdAt: row.created_at,
      updatedAt: row.updated_at, resolvedAt: row.resolved_at, resolutionNote: row.resolution_note } : null;
  }

  async getDeletionRequest(userId) {
    return { request: this.deletionRequestDto(await this.repo.deletionRequest(userId)) };
  }

  async requestDeletion(user, body, context) {
    if (Object.keys(body).length !== 1 || typeof body.password !== 'string') throw invalid();
    await this.identity.throttle('privacy-delete', user.email, context, 3);
    const account = await this.identity.repo.userByEmail(user.email);
    if (!account || account.id !== user.id || !(await this.identity.password.verify(account.password_hash, body.password))) {
      throw new HttpError(401, 'INVALID_CREDENTIALS', 'Mật khẩu không hợp lệ.');
    }
    const request = await this.repo.createDeletionRequest(user.id);
    if (!request) throw missing();
    await this.identity.repo.event('deletion_requested', { ...context, userId: user.id });
    return { request: this.deletionRequestDto(request), message: 'Đã ghi nhận yêu cầu xóa tài khoản để xem xét.' };
  }

  async cancelDeletionRequest(userId, context) {
    const request = await this.repo.cancelDeletionRequest(userId);
    if (!request) throw missing();
    await this.identity.repo.event('deletion_request_cancelled', { ...context, userId });
    return { request: this.deletionRequestDto(request), message: 'Đã hủy yêu cầu xóa tài khoản.' };
  }

  async updateProfile(userId, body) {
    if (Object.keys(body).length !== 1 || !Object.hasOwn(body, 'displayName')) throw invalid();
    const displayName = textField(body.displayName, 2, 120, namePattern);
    await this.repo.updateDisplayName(userId, displayName);
    return this.getProfile(userId);
  }

  async updatePreference(userId, body) {
    if (Object.keys(body).length !== 1 || typeof body.marketingOptIn !== 'boolean') throw invalid();
    await this.repo.preference(userId, body.marketingOptIn);
    return this.getProfile(userId);
  }

  hashCode(userId, code) {
    return createHmac('sha256', this.otpKey).update(`${userId}:${code}`).digest('hex');
  }

  async requestPhone(user, body, context) {
    if (!this.phoneSender) throw new HttpError(503, 'PHONE_OTP_UNAVAILABLE', 'Xác nhận số điện thoại chưa được cấu hình.');
    if (Object.keys(body).length !== 1) throw invalid();
    const phone = textField(body.phone, 9, 16, phonePattern);
    await this.identity.throttle('phone-change', user.email, context, 3);
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const deliveryChannel = this.identity.config?.phoneSender?.mode === 'sms-webhook' ? 'sms' : 'email';
    const created = await this.repo.createPhoneChallenge(user.id, phone, this.hashCode(user.id, code), new Date(Date.now() + 5 * 60_000), deliveryChannel);
    if (!created) throw new HttpError(429, 'PHONE_COOLDOWN', 'Vui lòng đợi trước khi gửi mã mới.');
    try { await this.phoneSender({ email: user.email, phone, code }); }
    catch { await this.repo.cancelPhoneChallenge(user.id); throw new HttpError(503, 'PHONE_OTP_UNAVAILABLE', 'Không thể gửi mã xác nhận.'); }
    await this.identity.repo.event('phone_challenge_sent', { ...context, userId: user.id });
    return { message: deliveryChannel === 'email'
      ? 'Mã xác nhận đã gửi tới email tài khoản, có hiệu lực 5 phút. Mã này không xác minh quyền sở hữu số điện thoại.'
      : 'Mã xác thực đã gửi tới số điện thoại mới và có hiệu lực 5 phút.',
    deliveryChannel };
  }

  async verifyPhone(user, body, context) {
    if (Object.keys(body).length !== 1 || typeof body.code !== 'string' || !/^\d{6}$/.test(body.code)) throw invalid();
    await this.identity.throttle('phone-verify', user.email, context, 5);
    let result;
    try { result = await this.repo.consumePhoneChallenge(user.id, this.hashCode(user.id, body.code)); }
    catch (error) {
      if (error.code === '23505') throw new HttpError(409, 'PHONE_IN_USE', 'Số điện thoại không khả dụng.');
      throw error;
    }
    if (result === 'taken') throw new HttpError(409, 'PHONE_IN_USE', 'Số điện thoại không khả dụng.');
    if (result !== 'ok') throw new HttpError(400, 'INVALID_CODE', 'Mã không hợp lệ hoặc đã hết hạn.');
    await this.identity.repo.event('phone_updated', { ...context, userId: user.id });
    return this.getProfile(user.id);
  }

  async uploadAvatar(userId, buffer, mime) {
    if (!this.avatarStorage || !this.scanner) throw new HttpError(503, 'AVATAR_UNAVAILABLE', 'Chức năng ảnh đại diện chưa được cấu hình.');
    if (!Buffer.isBuffer(buffer) || buffer.length === 0 || buffer.length > 2 * 1024 * 1024) throw new HttpError(413, 'AVATAR_TOO_LARGE', 'Ảnh phải nhỏ hơn 2 MB.');
    const allowed = { jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
    let metadata;
    try { metadata = await sharp(buffer, { failOn: 'error', limitInputPixels: 16_777_216 }).metadata(); }
    catch { throw new HttpError(415, 'INVALID_IMAGE', 'Ảnh không hợp lệ.'); }
    if (!allowed[metadata.format] || mime !== allowed[metadata.format] || metadata.width > 4096 || metadata.height > 4096) throw new HttpError(415, 'INVALID_IMAGE', 'Chỉ chấp nhận JPEG, PNG hoặc WebP hợp lệ.');
    await this.scanner(buffer);
    const processed = await sharp(buffer).rotate().resize(256, 256, { fit: 'cover' }).webp({ quality: 85 }).toBuffer();
    const key = `avatars/${userId}/${randomUUID()}.webp`;
    let oldKey;
    try {
      await this.avatarStorage.put(key, processed);
      oldKey = await this.repo.updateAvatarKey(userId, key);
    } catch (error) {
      await this.avatarStorage.remove(key).catch(() => {});
      throw error;
    }
    if (oldKey) await this.avatarStorage.remove(oldKey).catch(() => {});
    return this.getProfile(userId);
  }

  async listAddresses(userId) { return { addresses: (await this.repo.addresses(userId)).map(row => addressDto(row)) }; }
  async getAddress(userId, id) {
    if (!uuid.test(id)) throw missing();
    const row = await this.repo.address(userId, id);
    if (!row) throw missing();
    return { address: addressDto(row, true) };
  }
  async createAddress(userId, body) {
    const result = await this.repo.createAddress(userId, addressInput(body));
    if (result.kind === 'limit') throw new HttpError(409, 'ADDRESS_LIMIT', 'Tối đa 20 địa chỉ.');
    return { address: addressDto(result.address, true) };
  }
  async updateAddress(userId, id, body) {
    if (!uuid.test(id)) throw missing();
    if (Object.keys(body).length === 0) throw invalid();
    const current = await this.repo.address(userId, id);
    if (!current) throw missing();
    if (Object.hasOwn(body, 'isDefault')) throw invalid();
    const merged = { receiverName: current.receiver_name, receiverPhone: current.receiver_phone,
      provinceCode: current.province_code, districtCode: current.district_code, wardCode: current.ward_code,
      addressLine: current.address_line, note: current.note, ...body };
    const row = await this.repo.updateAddress(userId, id, addressInput(merged));
    if (!row) throw missing();
    return { address: addressDto(row, true) };
  }
  async deleteAddress(userId, id) {
    if (!uuid.test(id) || !(await this.repo.deleteAddress(userId, id))) throw missing();
    return { message: 'Đã xóa địa chỉ.' };
  }
  async setDefaultAddress(userId, id) {
    if (!uuid.test(id) || !(await this.repo.setDefaultAddress(userId, id))) throw missing();
    return this.getAddress(userId, id);
  }
  async shippingSnapshot(userId, id) {
    const profile = await this.repo.profile(userId);
    const { address } = await this.getAddress(userId, id);
    return { buyerId: userId, buyerName: profile.display_name, recipientName: address.receiverName, recipientPhone: address.receiverPhone,
      provinceCode: address.provinceCode, districtCode: address.districtCode, wardCode: address.wardCode,
      addressLine: address.addressLine, note: address.note };
  }
}
