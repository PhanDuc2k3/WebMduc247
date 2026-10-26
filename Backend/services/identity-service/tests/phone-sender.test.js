import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createPhoneSender } from '../src/services/phone-sender.service.js';

test('email mode sends the phone-change OTP to the account email', async () => {
  const sent = [];
  const sender = createPhoneSender({ mode: 'email', mailFrom: 'no-reply@mduc247.site', nodeEnv: 'production' }, {
    sendMail: async message => { sent.push(message); },
  });
  await sender({ email: 'buyer@example.test', phone: '+84901234567', code: '123456' });
  assert.equal(sent.length, 1);
  assert.equal(sent[0].from, 'no-reply@mduc247.site');
  assert.equal(sent[0].to, 'buyer@example.test');
  assert.match(sent[0].text, /123456/);
  assert.doesNotMatch(sent[0].text, /\+84901234567/);
});

test('SMS mode sends the OTP to the requested phone and fails closed on provider errors', async () => {
  const requests = [];
  let responseStatus = 202;
  const server = createServer(async (req, res) => {
    let body = '';
    for await (const chunk of req) body += chunk;
    requests.push({ authorization: req.headers.authorization, body: JSON.parse(body) });
    res.writeHead(responseStatus).end();
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const sender = createPhoneSender({ mode: 'sms-webhook', webhookUrl: `http://127.0.0.1:${server.address().port}`, webhookToken: 'private-token' });
    await sender({ phone: '+84901234567', code: '123456' });
    assert.equal(requests[0].authorization, 'Bearer private-token');
    assert.equal(requests[0].body.to, '+84901234567');
    assert.match(requests[0].body.message, /123456/);
    responseStatus = 503;
    await assert.rejects(sender({ phone: '+84901234567', code: '654321' }), /SMS provider unavailable/);
    assert.equal(createPhoneSender({ mode: 'disabled' }), null);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
