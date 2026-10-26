import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { createMailQueue } from '../src/services/mail-queue.service.js';
import { IdentityRepository } from '../src/models/identity.model.js';

test('mail outbox encrypts password OTP and sends it in the email body, not the URL', async () => {
  let row;
  let message;
  const queue = createMailQueue(
    { queueEmail: async value => { row = value; } },
    { sendMail: async value => { message = value; } },
    { key: randomBytes(32), from: 'no-reply@example.test', frontendOrigin: 'https://shop.example.test' },
  );
  const code = '012345';
  await queue.passwordReset('buyer@example.test', code);
  assert.equal(row.ciphertext.includes(Buffer.from(code)), false);
  assert.ok(row.expiresAt > new Date());
  await queue.deliver(row);
  assert.match(message.subject, /OTP/);
  assert.ok(message.text.includes(code));
  assert.ok(message.html.includes(code));
  assert.ok(message.text.includes('/reset-password?email=buyer%40example.test'));
  assert.equal(message.text.includes('#token='), false);
  assert.equal(message.html.includes('#token='), false);
  assert.equal(message.to, 'buyer@example.test');
});

test('email worker discards expired OTP instead of sending a dead code', async () => {
  const updates = [];
  const fake = { transaction: fn => fn({ query: async (sql, params) => {
    if (sql.startsWith('SELECT * FROM identity_email_outbox')) return { rows: [{ id: 7, expires_at: new Date(0) }] };
    updates.push({ sql, params }); return { rows: [] };
  } }) };
  let delivered = 0;
  await IdentityRepository.prototype.deliverEmails.call(fake, async () => { delivered++; });
  assert.equal(delivered, 0);
  assert.ok(updates.some(item => item.sql.includes('discarded_at=now()') && item.params[0] === 7));
});

test('email verification still delivers a one-time link', async () => {
  let row;
  let message;
  const queue = createMailQueue(
    { queueEmail: async value => { row = value; } },
    { sendMail: async value => { message = value; } },
    { key: randomBytes(32), from: 'no-reply@example.test', frontendOrigin: 'https://shop.example.test' },
  );
  await queue.verification('buyer@example.test', 'opaque-verification-token');
  await queue.deliver(row);
  assert.ok(message.text.includes('#token=opaque-verification-token'));
});
