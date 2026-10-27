import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

export function createMailQueue(repository, transport, { key, from, frontendOrigin }) {
  if (!Buffer.isBuffer(key) || key.length !== 32) throw new Error('IDENTITY_MAIL_KEY must decode to 32 bytes');
  async function queue(recipient, purpose, token, ttlMs) {
    const nonce = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, nonce);
    const ciphertext = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
    await repository.queueEmail({ recipient, purpose, nonce, ciphertext, tag: cipher.getAuthTag(), expiresAt: new Date(Date.now() + ttlMs) });
  }
  async function deliver(row) {
    const decipher = createDecipheriv('aes-256-gcm', key, row.nonce);
    decipher.setAuthTag(row.tag);
    const value = Buffer.concat([decipher.update(row.ciphertext), decipher.final()]).toString('utf8');
    if (row.purpose === 'verify_email') {
      const url = `${frontendOrigin}/verify-email?email=${encodeURIComponent(row.recipient)}#token=${encodeURIComponent(value)}`;
      await transport.sendMail({ from, to: row.recipient, subject: 'Xác minh email', text: `Mở liên kết trong 15 phút: ${url}` });
    } else if(row.purpose==='security_notice') {
      await transport.sendMail({from,to:row.recipient,subject:'Thông báo bảo mật quản trị MDUC247',text:value});
    } else {
      const url = `${frontendOrigin}/reset-password?email=${encodeURIComponent(row.recipient)}`;
      await transport.sendMail({ from, to: row.recipient, subject: 'Mã OTP đặt lại mật khẩu',
        text: `Mã OTP đặt lại mật khẩu MDUC247 của bạn: ${value}\nMã có hiệu lực 10 phút và chỉ dùng một lần. Nếu bạn không yêu cầu, hãy bỏ qua email này.\nNhập mã tại: ${url}`,
        html: `<div style="max-width:520px;margin:auto;padding:24px;font-family:Arial,sans-serif;color:#1f2937">
          <h2 style="margin:0 0 16px">MDUC247 · Đặt lại mật khẩu</h2>
          <p>Nhập mã xác thực dưới đây để đặt lại mật khẩu:</p>
          <p style="padding:16px;border-radius:8px;background:#f1f5f9;text-align:center;font-size:32px;font-weight:bold;letter-spacing:8px">${value}</p>
          <p>Mã có hiệu lực <strong>10 phút</strong> và chỉ dùng một lần.</p>
          <p><a href="${url}">Mở trang nhập mã</a></p>
          <p style="font-size:13px;color:#64748b">Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.</p>
        </div>` });
    }
  }
  return {
    verification: (email, token) => queue(email, 'verify_email', token, 15 * 60_000),
    passwordReset: (email, token) => queue(email, 'reset_password', token, 10 * 60_000),
    deliver,
  };
}
