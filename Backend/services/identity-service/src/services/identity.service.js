import argon2 from 'argon2';
import { createHmac, randomInt } from 'node:crypto';
import { hashToken, newId, normalizeEmail, randomToken, signAccessToken, verifyAccessToken } from '../utils/crypto.js';
import { HttpError, invalid, unauthorized } from '../utils/errors.js';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// A valid hash keeps unknown-email login checks close to the same cost as known users.
const dummyPasswordHash = '$argon2id$v=19$m=19456,t=2,p=1$2N2oKv5QikTuvcJ21+bX6g$6Mw2Ei+O9auyJOrhufyEjrwzzwxvBbN6PXYBi22FD08';
const publicUser = user => ({ id: user.id, email: user.email, fullName: user.full_name, emailVerifiedAt: user.email_verified_at, roles: user.roles ?? ['buyer'] });

export class IdentityService {
  constructor({ repository, mailer, config, password = argon2 }) {
    this.repo = repository;
    this.mailer = mailer;
    this.config = config;
    this.password = password;
  }
  async throttle(action, email, context, max = 5) {
    const ip = context.ip || 'unknown';
    const account = hashToken(normalizeEmail(email));
    const ipAllowed = await this.repo.limit(`${action}:ip:${ip}`, max * 4, 900);
    if (!ipAllowed) {
      await this.repo.event('rate_limited', context);
      throw new HttpError(429, 'RATE_LIMITED', 'Thử lại sau ít phút.');
    }
    const accountAllowed = await this.repo.limit(`${action}:account:${account}`, max, 900);
    if (!accountAllowed) {
      await this.repo.event('rate_limited', context);
      throw new HttpError(429, 'RATE_LIMITED', 'Thử lại sau ít phút.');
    }
  }
  async checkLoginThrottle(email, context) {
    const ip = context.ip || 'unknown';
    const account = hashToken(normalizeEmail(email));
    if (!(await this.repo.limitAvailable(`login:ip:${ip}`, this.config.loginLimit * 4, 900)) ||
        !(await this.repo.limitAvailable(`login:account:${account}`, this.config.loginLimit, 900))) {
      await this.repo.event('rate_limited', context);
      throw new HttpError(429, 'RATE_LIMITED', 'Thử lại sau ít phút.');
    }
  }
  checkEmail(email) {
    if (typeof email !== 'string') throw invalid();
    const normalized = normalizeEmail(email);
    if (normalized.length > 254 || !emailPattern.test(normalized)) throw invalid();
    return normalized;
  }
  checkPassword(password, confirmation) {
    const length = typeof password === 'string' ? Array.from(password).length : 0;
    if (typeof password !== 'string' || length < 8 || length > 128 ||
        Buffer.byteLength(password) > 512 || !/\p{Ll}/u.test(password) || !/[\p{P}\p{S}]/u.test(password) ||
        (confirmation !== undefined && password !== confirmation)) {
      throw new HttpError(400, 'WEAK_PASSWORD', 'Mật khẩu cần 8–128 ký tự, ít nhất 1 chữ thường, 1 ký tự đặc biệt và xác nhận phải khớp.');
    }
  }
  hashResetCode(email, code) {
    return createHmac('sha256', this.config.mailKey)
      .update('reset-password-otp-v1\0').update(email).update('\0').update(code).digest('hex');
  }
  accountCanSignIn(user) {
    const verificationRequired = this.config.emailVerificationRequired === true;
    return verificationRequired
      ? user?.status === 'active' && Boolean(user.email_verified_at)
      : user?.status === 'active' || user?.status === 'pending_verification';
  }
  async register(body, context) {
    const email = this.checkEmail(body.email);
    if (typeof body.confirmPassword !== 'string') throw invalid();
    this.checkPassword(body.password, body.confirmPassword);
    if (typeof body.fullName !== 'string') throw invalid();
    const fullName = body.fullName.trim();
    if (fullName.length < 2 || fullName.length > 120) throw invalid();
    await this.throttle('register', email, context, 3);
    const verificationRequired = this.config.emailVerificationRequired === true;
    const token = verificationRequired ? randomToken() : null;
    const expires = verificationRequired ? new Date(Date.now() + 15 * 60_000) : null;
    let user;
    try {
      user = await this.repo.createUser({ email, fullName, passwordHash: await this.password.hash(body.password, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 }), verificationHash: token ? hashToken(token) : null, verificationExpires: expires, emailVerificationRequired: verificationRequired });
    } catch (error) {
      if (error.code === '23505') throw new HttpError(409, 'EMAIL_EXISTS', 'Email đã được đăng ký.');
      throw error;
    }
    await this.repo.event('registered', { ...context, userId: user.id });
    if (token) await this.mailer.verification(email, token);
    return { user: publicUser(user), requiresEmailVerification: verificationRequired, message: verificationRequired ? 'Tài khoản đã tạo. Vui lòng xác minh email.' : 'Tài khoản đã được tạo thành công.' };
  }
  async resendVerification(body, context) {
    const email = this.checkEmail(body.email);
    await this.throttle('resend', email, context, 3);
    if (this.config.emailVerificationRequired !== true) return { message: 'Hiện không cần xác minh email.' };
    const user = await this.repo.userByEmail(email);
    if (['pending_verification', 'active'].includes(user?.status) && !user.email_verified_at) {
      const token = randomToken();
      await this.repo.replaceToken(user.id, 'verify_email', hashToken(token), new Date(Date.now() + 15 * 60_000));
      await this.mailer.verification(email, token);
      await this.repo.event('verification_resent', { ...context, userId: user.id });
    }
    return { message: 'Nếu tài khoản cần xác minh, email hướng dẫn đã được gửi.' };
  }
  async verifyEmail(body, context) {
    const email = this.checkEmail(body.email);
    await this.throttle('verify', email, context, 5);
    if (typeof body.token !== 'string' || body.token.length < 40 || body.token.length > 128) throw invalid();
    const ok = await this.repo.consumeVerification(email, hashToken(body.token));
    if (!ok) throw new HttpError(400, 'INVALID_TOKEN', 'Mã xác minh không hợp lệ hoặc đã hết hạn.');
    await this.repo.event('email_verified', { ...context, userId: (await this.repo.userByEmail(email)).id });
    return { message: 'Email đã được xác minh.' };
  }
  async login(body, context, { platformAdmin = false } = {}) {
    const email = this.checkEmail(body.email);
    if (typeof body.password !== 'string') throw invalid();
    await this.checkLoginThrottle(email, context);
    const user = await this.repo.userByEmail(email);
    const valid = await this.password.verify(user?.password_hash ?? dummyPasswordHash, body.password);
    if (!user || !valid || !this.accountCanSignIn(user)) {
      await this.throttle('login', email, context, this.config.loginLimit);
      await this.repo.event('login_failed', { ...context, userId: user?.id });
      throw new HttpError(401, 'INVALID_CREDENTIALS', 'Email hoặc mật khẩu không hợp lệ.');
    }
    if (platformAdmin && !user.roles?.includes('platform_admin')) {
      await this.throttle('login', email, context, this.config.loginLimit);
      await this.repo.event('admin_login_denied', { ...context, userId: user.id });
      throw new HttpError(403, 'PLATFORM_ADMIN_REQUIRED', 'Tài khoản không có quyền quản trị sàn.');
    }
    const familyId = newId();
    const refreshToken = randomToken();
    await this.repo.createSession({ userId: user.id, familyId, tokenHash: hashToken(refreshToken), device: context.userAgent?.slice(0, 500), expiresAt: new Date(Date.now() + this.config.refreshDays * 86400_000) });
    await this.repo.event(platformAdmin ? 'admin_login_success' : 'login_success', { ...context, userId: user.id });
    return { user: publicUser(user), accessToken: this.access(user.id, familyId), refreshToken };
  }
  access(userId, familyId) {
    return signAccessToken({ userId, familyId, secret: this.config.jwtSecret, issuer: this.config.issuer, audience: this.config.audience });
  }
  async refresh(refreshToken, context) {
    if (typeof refreshToken !== 'string' || refreshToken.length < 40 || refreshToken.length > 128) throw unauthorized();
    await this.throttle('refresh', hashToken(refreshToken), context, 20);
    const next = randomToken();
    const result = await this.repo.rotateSession(hashToken(refreshToken), hashToken(next), new Date(Date.now() + this.config.refreshDays * 86400_000), this.config.emailVerificationRequired === true);
    if (result.kind === 'reuse') await this.repo.event('refresh_reuse', { ...context, userId: result.userId });
    if (result.kind !== 'ok') throw unauthorized();
    return { accessToken: this.access(result.userId, result.familyId), refreshToken: next };
  }
  async authenticate(header) {
    const match = typeof header === 'string' && /^Bearer (\S+)$/i.exec(header);
    const claims = match && verifyAccessToken(match[1], { secret: this.config.jwtSecret, issuer: this.config.issuer, audience: this.config.audience });
    if (!claims) throw unauthorized();
    const user = await this.repo.currentUser(claims.sub, claims.sid);
    if (!this.accountCanSignIn(user)) throw unauthorized();
    return { user, familyId: claims.sid };
  }
  async me(header) {
    return this.meAuthorized(await this.authenticate(header));
  }
  meAuthorized({ user }) {
    return { user: publicUser(user) };
  }
  async authorizeSeller(header, storeId) {
    const { user } = await this.authenticate(header);
    if (!/^[0-9a-f-]{36}$/i.test(String(storeId))) throw invalid();
    if (!user.roles.includes('seller') || !(await this.repo.sellerMember(user.id, storeId))) throw new HttpError(403, 'FORBIDDEN', 'Không có quyền với cửa hàng này.');
    return user;
  }
  async logout(header, all, context) {
    return this.logoutAuthorized(await this.authenticate(header), all, context);
  }
  async logoutAuthorized({ user, familyId }, all, context) {
    if (all) await this.repo.revokeAll(user.id);
    else await this.repo.revokeFamily(user.id, familyId);
    await this.repo.event(all ? 'logout_all' : 'logout', { ...context, userId: user.id });
    return { message: 'Đã đăng xuất.' };
  }
  async forgotPassword(body, context) {
    const email = this.checkEmail(body.email);
    await this.throttle('forgot', email, context, 3);
    const user = await this.repo.userByEmail(email);
    if (user?.status === 'active') {
      let code;
      for (let attempt = 0; attempt < 3; attempt++) {
        code = String(randomInt(0, 1_000_000)).padStart(6, '0');
        try {
          await this.repo.replaceToken(user.id, 'reset_password', this.hashResetCode(email, code), new Date(Date.now() + 10 * 60_000));
          break;
        } catch (error) {
          if (error.code !== '23505' || attempt === 2) throw error;
        }
      }
      await this.mailer.passwordReset(email, code);
      await this.repo.event('password_reset_requested', { ...context, userId: user.id });
    }
    return { message: 'Nếu email tồn tại, mã OTP đặt lại mật khẩu đã được gửi.' };
  }
  async resetPassword(body, context) {
    const email = this.checkEmail(body.email);
    if (typeof body.confirmPassword !== 'string') throw invalid();
    this.checkPassword(body.newPassword, body.confirmPassword);
    await this.throttle('reset', email, context, 5);
    if (typeof body.code !== 'string' || !/^\d{6}$/.test(body.code)) throw new HttpError(400, 'INVALID_CODE', 'Mã OTP không hợp lệ hoặc đã hết hạn.');
    const passwordHash = await this.password.hash(body.newPassword, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });
    const userId = await this.repo.resetPassword(email, this.hashResetCode(email, body.code), passwordHash);
    if (!userId) throw new HttpError(400, 'INVALID_CODE', 'Mã OTP không hợp lệ hoặc đã hết hạn.');
    await this.repo.event('password_reset', { ...context, userId });
    return { message: 'Đã đặt lại mật khẩu. Vui lòng đăng nhập lại.' };
  }
}
