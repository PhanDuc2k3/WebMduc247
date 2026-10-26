import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';

export const randomToken = () => randomBytes(32).toString('base64url');
export const hashToken = value => createHash('sha256').update(value).digest('hex');
export const newId = () => randomUUID();
export const normalizeEmail = value => String(value ?? '').trim().toLowerCase();

export function signAccessToken({ userId, familyId, secret, issuer, audience, ttlSeconds = 600, now = Date.now() }) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ sub: userId, sid: familyId, iss: issuer, aud: audience, iat: Math.floor(now / 1000), exp: Math.floor(now / 1000) + ttlSeconds })).toString('base64url');
  const content = `${header}.${payload}`;
  const signature = createHmac('sha256', secret).update(content).digest('base64url');
  return `${content}.${signature}`;
}

export function verifyAccessToken(token, { secret, issuer, audience, now = Date.now() }) {
  if (typeof token !== 'string' || token.length > 4096) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
    if (header.alg !== 'HS256' || header.typ !== 'JWT') return null;
    const expected = createHmac('sha256', secret).update(`${parts[0]}.${parts[1]}`).digest();
    const actual = Buffer.from(parts[2], 'base64url');
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    const seconds = Math.floor(now / 1000);
    if (payload.iss !== issuer || payload.aud !== audience || !Number.isInteger(payload.iat) || !Number.isInteger(payload.exp) || payload.iat > seconds || payload.exp <= seconds || payload.exp - payload.iat > 600) return null;
    if (!/^[0-9a-f-]{36}$/i.test(payload.sub) || !/^[0-9a-f-]{36}$/i.test(payload.sid)) return null;
    return payload;
  } catch { return null; }
}
