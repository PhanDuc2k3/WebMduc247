import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import pg from 'pg';

const directory = fileURLToPath(new URL('../database/migrations/', import.meta.url));
const client = new pg.Client({ connectionString: process.env.IDENTITY_DATABASE_URL });
if (!process.env.IDENTITY_DATABASE_URL) throw new Error('Missing IDENTITY_DATABASE_URL');
await client.connect();
try {
  await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
  for (const name of (await readdir(directory)).filter(name => name.endsWith('.sql')).sort()) {
    await client.query('BEGIN');
    try {
      const existing = await client.query('SELECT 1 FROM schema_migrations WHERE name=$1', [name]);
      if (!existing.rowCount) {
        await client.query(await readFile(path.join(directory, name), 'utf8'));
        await client.query('INSERT INTO schema_migrations(name) VALUES ($1)', [name]);
        console.log(`Applied ${name}`);
      }
      await client.query('COMMIT');
    } catch (error) { await client.query('ROLLBACK'); throw error; }
  }
} finally { await client.end(); }
