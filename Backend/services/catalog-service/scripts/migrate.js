import pg from 'pg';
import { readFile, readdir } from 'node:fs/promises';
const url = process.env.CATALOG_DATABASE_URL || process.env.IDENTITY_DATABASE_URL;
if (!url) throw new Error('CATALOG_DATABASE_URL is required');
const pool = new pg.Pool({ connectionString: url });
try {
  await pool.query('CREATE SCHEMA IF NOT EXISTS catalog');
  await pool.query('CREATE TABLE IF NOT EXISTS catalog.schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
  const directory = new URL('../database/migrations/', import.meta.url);
  for (const name of (await readdir(directory)).filter(file => file.endsWith('.sql')).sort()) {
    const applied = await pool.query('SELECT 1 FROM catalog.schema_migrations WHERE name=$1', [name]);
    if (applied.rowCount) continue;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(await readFile(new URL(name, directory), 'utf8'));
      await client.query('INSERT INTO catalog.schema_migrations(name) VALUES ($1)', [name]);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally { client.release(); }
  }
  console.log('Catalog schema ready');
} finally { await pool.end(); }
