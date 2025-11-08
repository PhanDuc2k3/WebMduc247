const crypto = require('crypto');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

/**
 * Generate 2FA secret và QR code URL
 */
const generate2FASecret = (email) => {
  const secret = speakeasy.generateSecret({
    name: `ShopMDuc247 (${email})`,
    issuer: 'ShopMDuc247',
    length: 32
  });

  return {
    secret: secret.base32,
    otpauthUrl: secret.otpauth_url
  };
};

/**
 * Generate QR code image data URL từ otpauth URL
 */
const generateQRCode = async (otpauthUrl) => {
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
    return qrCodeDataUrl;
  } catch (error) {
    console.error('Error generating QR code:', error);
    throw new Error('Không thể tạo QR code');
  }
};

/**
 * Verify TOTP code
 */
const verify2FACode = (secret, token) => {
  try {
    const verified = speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: 2 // Cho phép ±2 time steps (60 giây)
    });
    return verified;
  } catch (error) {
    console.error('Error verifying 2FA code:', error);
    return false;
  }
};

/**
 * Generate backup codes (10 codes)
 */
const generateBackupCodes = () => {
  const codes = [];
  for (let i = 0; i < 10; i++) {
    // Generate 8-digit backup code
    const code = Math.floor(10000000 + Math.random() * 90000000).toString();
    codes.push(code);
  }
  return codes;
};

/**
 * Verify backup code
 */
const verifyBackupCode = (backupCodes, code) => {
  return backupCodes.includes(code);
};

module.exports = {
  generate2FASecret,
  generateQRCode,
  verify2FACode,
  generateBackupCodes,
  verifyBackupCode
};

