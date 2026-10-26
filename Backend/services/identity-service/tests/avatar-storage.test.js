import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { AvatarStorage } from '../src/services/avatar-storage.service.js';

test('avatar storage verifies an existing bucket before serving uploads', async () => {
  const storage = new AvatarStorage({ bucket: 'avatars', region: 'us-east-1', accessKey: 'test', secretKey: 'test', autoCreateBucket: false });
  const checks = [];
  storage.client = { send: async command => { checks.push(command.constructor.name); throw new Error('bucket unavailable'); } };
  await assert.rejects(storage.ensureBucket(), /bucket unavailable/);
  assert.deepEqual(checks, ['HeadBucketCommand']);
  storage.client = { send: async command => { checks.push(command.constructor.name); } };
  await storage.ensureBucket();
  assert.equal(checks.at(-1), 'HeadBucketCommand');
});

test('S3 adapter stores, signs, reads and removes an avatar through the HTTP protocol', async () => {
  const objects = new Map();
  const server = createServer(async (req, res) => {
    const key = new URL(req.url, 'http://localhost').pathname;
    if (req.method === 'HEAD' && key.replace(/\/$/, '') === '/avatars') return res.writeHead(200).end();
    if (req.method === 'PUT') {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      objects.set(key, Buffer.concat(chunks));
      return res.writeHead(200).end();
    }
    if (req.method === 'GET' && objects.has(key)) return res.writeHead(200).end(objects.get(key));
    if (req.method === 'DELETE') { objects.delete(key); return res.writeHead(204).end(); }
    res.writeHead(404).end();
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const endpoint = `http://127.0.0.1:${server.address().port}`;
    const storage = new AvatarStorage({ bucket: 'avatars', region: 'us-east-1', endpoint,
      publicEndpoint: endpoint, accessKey: 'test', secretKey: 'test', autoCreateBucket: false });
    const key = 'avatars/12dd046b-e3ad-47c5-a852-680552362145/7134c581-745b-4124-8774-4af3d5b1204b.webp';
    const data = Buffer.from('private-avatar');
    await storage.ensureBucket();
    await storage.put(key, data);
    const url = await storage.signedUrl(key);
    assert.ok(url.includes('X-Amz-Signature='));
    assert.deepEqual(Buffer.from(await (await fetch(url)).arrayBuffer()), data);
    await storage.remove(key);
    assert.equal(objects.size, 0);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
