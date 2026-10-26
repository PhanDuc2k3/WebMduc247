import test from 'node:test';
import assert from 'node:assert/strict';
import { createDecipheriv, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import sharp from 'sharp';
import { LocalAvatarStorage } from '../../services/identity-service/src/services/local-avatar-storage.service.js';

test('HTTP avatar upload uses the live scanner and stores only a valid processed image', {
  skip: process.env.PROFILE_TEST_LOCAL_AVATAR !== '1' || !process.env.IDENTITY_TEST_DATABASE_URL ||
    !process.env.IDENTITY_TEST_API_URL || !process.env.IDENTITY_MAIL_KEY,
}, async () => {
  const db = new pg.Client({ connectionString: process.env.IDENTITY_TEST_DATABASE_URL });
  await db.connect();
  const origin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
  const base = process.env.IDENTITY_TEST_API_URL;
  const email = `avatar-${randomUUID()}@example.test`;
  const password = 'avatar-password-123';
  let userId;
  let avatarKey;
  const post = async (path, body) => {
    const response = await fetch(base + path, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return { response, data: await response.json() };
  };
  try {
    const registration = await post('/api/v2/auth/register', { email, fullName: 'Avatar Test', password, confirmPassword: password });
    assert.equal(registration.response.status, 201);
    userId = registration.data.user.id;
    const mail = await db.query("SELECT nonce,ciphertext,tag FROM identity_email_outbox WHERE recipient=$1 AND purpose='verify_email'", [email]);
    const decipher = createDecipheriv('aes-256-gcm', Buffer.from(process.env.IDENTITY_MAIL_KEY, 'base64'), mail.rows[0].nonce);
    decipher.setAuthTag(mail.rows[0].tag);
    const token = Buffer.concat([decipher.update(mail.rows[0].ciphertext), decipher.final()]).toString('utf8');
    assert.equal((await post('/api/v2/auth/verify-email', { email, token })).response.status, 200);
    const login = await post('/api/v2/auth/login', { email, password });
    const png = await sharp({ create: { width: 20, height: 20, channels: 3, background: '#369' } }).png().toBuffer();
    const upload = (bytes, mime) => fetch(base + '/api/v2/users/me/avatar', { method: 'POST',
      headers: { Origin: origin, Authorization: `Bearer ${login.data.accessToken}`, 'Content-Type': mime }, body: bytes });
    assert.equal((await upload(png, 'image/jpeg')).status, 415);
    assert.equal((await upload(Buffer.alloc(2 * 1024 * 1024 + 1), 'image/png')).status, 413);
    const valid = await upload(png, 'image/png');
    assert.equal(valid.status, 200);
    assert.match((await valid.json()).avatarUrl, /^data:image\/webp;base64,/);
    const saved = await db.query('SELECT avatar_key FROM user_profiles WHERE user_id=$1', [userId]);
    avatarKey = saved.rows[0].avatar_key;
    assert.match(avatarKey, /^avatars\//);
  } finally {
    if (avatarKey) await new LocalAvatarStorage(fileURLToPath(new URL('../../.local-avatars/', import.meta.url))).remove(avatarKey);
    if (userId) {
      await db.query('DELETE FROM identity_email_outbox WHERE recipient=$1', [email]);
      await db.query('DELETE FROM security_events WHERE user_id=$1', [userId]);
      await db.query("DELETE FROM identity_outbox WHERE payload->>'userId'=$1", [userId]);
      await db.query('DELETE FROM users WHERE id=$1', [userId]);
    }
    await db.end();
  }
});
