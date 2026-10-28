import { isIP } from 'node:net';
import { HttpError } from '../utils/errors.js';

export function applyCors(req, res, config) {
  const origin = req.headers.origin;
  if (origin === config.frontendOrigin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Expose-Headers', 'Retry-After');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Account-Support-Token');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
    res.setHeader('Vary', 'Origin');
  }
  if (req.method === 'OPTIONS') {
    res.writeHead(origin === config.frontendOrigin ? 204 : 403);
    res.end();
    return true;
  }
  return false;
}

export function requireOrigin(req, config) {
  // Browser writes, including cookie-changing endpoints, require the exact configured Origin.
  if (['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method) && req.headers.origin !== config.frontendOrigin) {
    throw new HttpError(403, 'ORIGIN_DENIED', 'Origin không hợp lệ.');
  }
}

export async function parseJsonBody(req) {
  let content = '';
  for await (const chunk of req) {
    content += chunk;
    if (content.length > 16_384) throw new HttpError(413, 'BODY_TOO_LARGE', 'Yêu cầu quá lớn.');
  }
  try {
    const value = JSON.parse(content || '{}');
    if (!value || Array.isArray(value) || typeof value !== 'object') throw new Error();
    req.body = value;
  } catch { throw new HttpError(400, 'INVALID_JSON', 'JSON không hợp lệ.'); }
}

export async function parseAvatarBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 2 * 1024 * 1024) throw new HttpError(413, 'AVATAR_TOO_LARGE', 'Ảnh phải nhỏ hơn 2 MB.');
    chunks.push(chunk);
  }
  req.body = Buffer.concat(chunks);
}

export function attachRequestContext(req, config) {
  const forwarded = config.trustedProxyIp === req.socket.remoteAddress ? String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() : '';
  req.context = {
    ip: isIP(forwarded) ? forwarded : req.socket.remoteAddress,
    userAgent: req.headers['user-agent'],
  };
}
