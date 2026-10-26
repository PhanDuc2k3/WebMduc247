import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { LocalAvatarStorage } from '../src/services/local-avatar-storage.service.js';

test('development avatar storage saves, reads, and removes a private image', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'identity-avatar-'));
  const storage = new LocalAvatarStorage(directory);
  const key = 'avatars/12dd046b-e3ad-47c5-a852-680552362145/7134c581-745b-4124-8774-4af3d5b1204b.webp';
  const data = Buffer.from('webp-test');
  try {
    await storage.put(key, data);
    assert.equal(await storage.signedUrl(key), `data:image/webp;base64,${data.toString('base64')}`);
    await storage.remove(key);
    assert.equal(await storage.signedUrl(key), null);
    assert.throws(() => storage.file('../escape.webp'), /Invalid avatar key/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
