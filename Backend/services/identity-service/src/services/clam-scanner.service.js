import { connect } from 'node:net';
import { HttpError } from '../utils/errors.js';

export function scanWithClamAv(buffer, { host, port }) {
  return new Promise((resolve, reject) => {
    const socket = connect(port, host);
    let response = '';
    let complete = false;
    const finish = error => {
      if (complete) return;
      complete = true;
      socket.destroy();
      if (error) reject(error); else resolve();
    };
    socket.setTimeout(10_000, () => finish(new HttpError(503, 'SCANNER_UNAVAILABLE', 'Bộ quét ảnh tạm thời không khả dụng.')));
    socket.on('error', () => finish(new HttpError(503, 'SCANNER_UNAVAILABLE', 'Bộ quét ảnh tạm thời không khả dụng.')));
    socket.on('connect', () => {
      socket.write('zINSTREAM\0');
      const size = Buffer.alloc(4);
      size.writeUInt32BE(buffer.length);
      socket.write(size);
      socket.write(buffer);
      socket.write(Buffer.alloc(4));
    });
    socket.on('data', chunk => {
      response += chunk.toString('utf8');
      if (response.includes('\0') || response.includes('\n')) {
        if (/\bOK\b/.test(response) && !/FOUND|ERROR/.test(response)) finish();
        else if (/FOUND/.test(response)) finish(new HttpError(422, 'INFECTED_FILE', 'Ảnh không đạt kiểm tra an toàn.'));
        else finish(new HttpError(503, 'SCANNER_UNAVAILABLE', 'Bộ quét ảnh tạm thời không khả dụng.'));
      }
    });
    socket.on('end', () => { if (!complete) finish(new HttpError(503, 'SCANNER_UNAVAILABLE', 'Bộ quét ảnh tạm thời không khả dụng.')); });
  });
}
