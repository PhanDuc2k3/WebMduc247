import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { scanWithClamAv } from '../src/services/clam-scanner.service.js';

async function scannerReply(reply) {
  const server = createServer(socket => {
    const chunks = [];
    socket.on('data', chunk => {
      chunks.push(chunk);
      const data = Buffer.concat(chunks);
      if (data.length >= 10 + 4 + 3 + 4) {
        assert.equal(data.subarray(0, 10).toString(), 'zINSTREAM\0');
        assert.equal(data.readUInt32BE(10), 3);
        assert.equal(data.subarray(14, 17).toString(), 'abc');
        socket.end(`stream: ${reply}\0`);
      }
    });
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { server, port: server.address().port };
}

test('ClamAV INSTREAM accepts clean bytes and rejects a detection', async () => {
  const clean = await scannerReply('OK');
  try { await scanWithClamAv(Buffer.from('abc'), { host: '127.0.0.1', port: clean.port }); }
  finally { await new Promise(resolve => clean.server.close(resolve)); }
  const infected = await scannerReply('Eicar FOUND');
  try { await assert.rejects(scanWithClamAv(Buffer.from('abc'), { host: '127.0.0.1', port: infected.port }), { status: 422 }); }
  finally { await new Promise(resolve => infected.server.close(resolve)); }
});
