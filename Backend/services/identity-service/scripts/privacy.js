import { access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { AvatarStorage } from '../src/services/avatar-storage.service.js';
import { LocalAvatarStorage } from '../src/services/local-avatar-storage.service.js';
import { hashToken } from '../src/utils/crypto.js';

const [action, requestId, flagOrReason] = process.argv.slice(2);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
if (!process.env.IDENTITY_DATABASE_URL) throw new Error('IDENTITY_DATABASE_URL is required');
if (!['list', 'reject', 'complete'].includes(action)) throw new Error('Use: privacy.js list | reject <request-id> <reason> | complete <request-id> --cross-service-reviewed');
if (action !== 'list' && !uuid.test(requestId || '')) throw new Error('A valid request ID is required');
if (action === 'complete' && flagOrReason !== '--cross-service-reviewed') throw new Error('Complete requires --cross-service-reviewed after checking Order, Catalog, Payment, Engagement and Chat data');
if (action === 'reject' && (!flagOrReason || flagOrReason.length > 500)) throw new Error('Reject requires a reason of at most 500 characters');

const db = new pg.Client({ connectionString: process.env.IDENTITY_DATABASE_URL });
const localStorage = new LocalAvatarStorage(fileURLToPath(new URL('../../../.local-avatars/', import.meta.url)));

async function removeAvatar(key) {
  if (!key) return;
  const localFile = localStorage.file(key);
  try { await access(localFile); await localStorage.remove(key); return; }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (!process.env.S3_BUCKET || !process.env.S3_ACCESS_KEY || !process.env.S3_SECRET_KEY) {
    throw new Error('Avatar storage is unavailable; account was not deleted');
  }
  const storage = new AvatarStorage({ bucket: process.env.S3_BUCKET,
    region: process.env.S3_REGION || 'us-east-1', endpoint: process.env.S3_ENDPOINT || null,
    accessKey: process.env.S3_ACCESS_KEY, secretKey: process.env.S3_SECRET_KEY, autoCreateBucket: false });
  await storage.remove(key);
}

try {
  await db.connect();
  if (action === 'list') {
    const { rows } = await db.query(`SELECT r.id,r.user_id,u.email,r.created_at FROM privacy_requests r
      JOIN users u ON u.id=r.user_id WHERE r.status='PENDING' ORDER BY r.created_at`);
    console.log(JSON.stringify(rows, null, 2));
  } else {
    await db.query('BEGIN');
    try {
      const result = await db.query(`SELECT r.id,r.user_id,r.status,u.email,p.avatar_key
        FROM privacy_requests r JOIN users u ON u.id=r.user_id
        JOIN user_profiles p ON p.user_id=u.id WHERE r.id=$1 FOR UPDATE OF r,u`, [requestId]);
      const request = result.rows[0];
      if (!request || request.status !== 'PENDING') throw new Error('Pending request not found');
      if (action === 'reject') {
        await db.query("UPDATE privacy_requests SET status='REJECTED',resolution_note=$2,resolved_at=now(),updated_at=now() WHERE id=$1", [requestId, flagOrReason]);
      } else {
        await removeAvatar(request.avatar_key);
        await db.query('DELETE FROM security_events WHERE user_id=$1', [request.user_id]);
        await db.query('DELETE FROM identity_email_outbox WHERE recipient=$1', [request.email]);
        await db.query("DELETE FROM identity_outbox WHERE payload->>'userId'=$1 OR payload->>'email'=$2", [request.user_id, request.email]);
        await db.query('DELETE FROM auth_rate_limits WHERE bucket LIKE $1', [`%:account:${hashToken(request.email)}`]);
        await db.query('DELETE FROM users WHERE id=$1', [request.user_id]);
        await db.query(`UPDATE privacy_requests SET status='COMPLETED',resolution_note='Cross-service review confirmed by operator',
          resolved_at=now(),updated_at=now() WHERE id=$1`, [requestId]);
      }
      await db.query('COMMIT');
      console.log(`${action === 'reject' ? 'Rejected' : 'Completed'} privacy request ${requestId}`);
    } catch (error) { await db.query('ROLLBACK'); throw error; }
  }
} finally { await db.end(); }
