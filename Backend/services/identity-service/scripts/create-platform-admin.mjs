// Trusted operator CLI only. Input is JSON on stdin; never a public registration endpoint.
import pg from 'pg';
import argon2 from 'argon2';
import { randomBytes } from 'node:crypto';
const chunks = [];
for await (const chunk of process.stdin) chunks.push(chunk);
const input = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
const email = String(input.email || process.env.PLATFORM_ADMIN_EMAIL || '').trim().toLowerCase();
const fullName = String(input.fullName || 'Quản trị viên MDUC247').trim();
const generated = !input.password && !process.env.PLATFORM_ADMIN_PASSWORD;
if (generated && process.env.NODE_ENV === 'production') throw new Error('Production requires an explicitly supplied admin password.');
const password = input.password || process.env.PLATFORM_ADMIN_PASSWORD || `${randomBytes(21).toString('base64url')}!a`;
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || fullName.length < 2 || fullName.length > 120 ||
  typeof password !== 'string' || password.length < 12 || password.length > 128 || !/\p{Ll}/u.test(password) || !/[\p{P}\p{S}]/u.test(password))
  throw new Error('Provide a valid email, name and a password of at least 12 characters with lowercase and a special character.');
if (!process.env.IDENTITY_DATABASE_URL) throw new Error('IDENTITY_DATABASE_URL is required');
const client = new pg.Client({ connectionString: process.env.IDENTITY_DATABASE_URL });
await client.connect();
try {
  await client.query('BEGIN');
  const existing = await client.query('SELECT id FROM users WHERE email=$1', [email]);
  if (existing.rowCount) throw new Error('Email already exists. This command does not promote or reset existing accounts.');
  const hash = await argon2.hash(password, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });
  const { rows } = await client.query(`INSERT INTO users(email,full_name,password_hash,status,email_verified_at)
    VALUES ($1,$2,$3,'active',now()) RETURNING id`, [email, fullName, hash]);
  const id = rows[0].id;
  await client.query("INSERT INTO user_roles(user_id,role) VALUES ($1,'buyer'),($1,'platform_admin')", [id]);
  await client.query('INSERT INTO user_profiles(user_id,display_name) VALUES ($1,$2)', [id, fullName]);
  await client.query('INSERT INTO user_preferences(user_id) VALUES ($1)', [id]);
  await client.query("INSERT INTO security_events(user_id,action) VALUES ($1,'platform_admin_provisioned')", [id]);
  await client.query('COMMIT');
  // A generated development credential is emitted once for the operator to store privately.
  process.stdout.write(JSON.stringify({ id, email, fullName, ...(generated ? { password } : {}) }) + '\n');
} catch (error) { await client.query('ROLLBACK'); throw error; }
finally { await client.end(); }
