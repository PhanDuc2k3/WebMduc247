import { createHash } from 'node:crypto';
import { PlatformAdminError } from './platform-admin.js';

const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;

// The caller owns the transaction. Failed mutations, audit and command receipts roll back together.
export async function adminCommand(db, schema, actor, scope, input, execute) {
  if (!['public', 'catalog'].includes(schema)) throw new Error('Unsupported admin command owner');
  const fingerprint = createHash('sha256').update(JSON.stringify(canonical({ scope, input }))).digest('hex');
  await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [`admin:${actor.id}:${input.requestId}`]);
  const previous = (await db.query(`SELECT fingerprint,result FROM ${schema}.admin_commands WHERE actor_id=$1 AND request_id=$2`,
    [actor.id, input.requestId])).rows[0];
  if (previous) {
    if (previous.fingerprint !== fingerprint) throw new PlatformAdminError(409, 'IDEMPOTENCY_CONFLICT', 'Mã yêu cầu đã được dùng cho nội dung khác.');
    return previous.result;
  }
  const result = { ...await execute(), correlationId: input.requestId };
  await db.query(`INSERT INTO ${schema}.admin_commands(actor_id,request_id,scope,fingerprint,result) VALUES($1,$2,$3,$4,$5)`,
    [actor.id, input.requestId, scope, fingerprint, result]);
  return result;
}
