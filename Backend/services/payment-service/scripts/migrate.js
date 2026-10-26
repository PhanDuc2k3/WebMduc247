import pg from 'pg';
import { readFile, readdir } from 'node:fs/promises';
const url = process.env.PAYMENT_DATABASE_URL || process.env.IDENTITY_DATABASE_URL;
if (!url) throw new Error('PAYMENT_DATABASE_URL is required');
const pool = new pg.Pool({ connectionString:url });
try {
  await pool.query('CREATE SCHEMA IF NOT EXISTS payment_service');
  await pool.query(`CREATE TABLE IF NOT EXISTS payment_service.schema_migrations
    (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`);
  const directory = new URL('../database/migrations/',import.meta.url);
  for (const name of (await readdir(directory)).filter(item=>item.endsWith('.sql')).sort()) {
    if ((await pool.query('SELECT 1 FROM payment_service.schema_migrations WHERE name=$1',[name])).rowCount) continue;
    const db = await pool.connect();
    try { await db.query('BEGIN'); await db.query(await readFile(new URL(name,directory),'utf8'));
      await db.query('INSERT INTO payment_service.schema_migrations(name) VALUES ($1)',[name]);
      await db.query('COMMIT'); }
    catch (error) { await db.query('ROLLBACK'); throw error; }
    finally { db.release(); }
  }
  console.log('Payment schema ready');
} finally { await pool.end(); }
