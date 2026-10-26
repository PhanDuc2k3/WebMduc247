import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

test('reviewed deletion removes Identity data and leaves an anonymous completed request', {
  skip: !process.env.IDENTITY_TEST_DATABASE_URL,
}, async () => {
  const db = new pg.Client({ connectionString: process.env.IDENTITY_TEST_DATABASE_URL });
  await db.connect();
  const userId = randomUUID();
  const email = `privacy-${randomUUID()}@example.test`;
  try {
    await db.query("INSERT INTO users(id,email,full_name,password_hash,status,email_verified_at) VALUES ($1,$2,'Privacy Test','unused','active',now())", [userId, email]);
    await db.query("INSERT INTO user_profiles(user_id,display_name) VALUES ($1,'Privacy Test')", [userId]);
    await db.query('INSERT INTO user_preferences(user_id) VALUES ($1)', [userId]);
    await db.query("INSERT INTO security_events(user_id,action) VALUES ($1,'test_event')", [userId]);
    const request = await db.query('INSERT INTO privacy_requests(user_id) VALUES ($1) RETURNING id', [userId]);
    execFileSync(process.execPath, [fileURLToPath(new URL('../scripts/privacy.js', import.meta.url)),
      'complete', request.rows[0].id, '--cross-service-reviewed'], {
      env: { ...process.env, IDENTITY_DATABASE_URL: process.env.IDENTITY_TEST_DATABASE_URL },
    });
    assert.equal((await db.query('SELECT 1 FROM users WHERE id=$1', [userId])).rowCount, 0);
    assert.equal((await db.query('SELECT 1 FROM security_events WHERE user_id=$1', [userId])).rowCount, 0);
    const completed = await db.query('SELECT user_id,status FROM privacy_requests WHERE id=$1', [request.rows[0].id]);
    assert.equal(completed.rows[0].user_id, null);
    assert.equal(completed.rows[0].status, 'COMPLETED');
  } finally {
    await db.query('DELETE FROM users WHERE id=$1', [userId]);
    await db.end();
  }
});

test('rejected deletion request keeps the account and records the reason', {
  skip: !process.env.IDENTITY_TEST_DATABASE_URL,
}, async () => {
  const db = new pg.Client({ connectionString: process.env.IDENTITY_TEST_DATABASE_URL });
  await db.connect();
  const userId = randomUUID();
  try {
    await db.query("INSERT INTO users(id,email,full_name,password_hash,status,email_verified_at) VALUES ($1,$2,'Privacy Test','unused','active',now())",
      [userId, `privacy-${randomUUID()}@example.test`]);
    await db.query("INSERT INTO user_profiles(user_id,display_name) VALUES ($1,'Privacy Test')", [userId]);
    await db.query('INSERT INTO user_preferences(user_id) VALUES ($1)', [userId]);
    const request = await db.query('INSERT INTO privacy_requests(user_id) VALUES ($1) RETURNING id', [userId]);
    execFileSync(process.execPath, [fileURLToPath(new URL('../scripts/privacy.js', import.meta.url)),
      'reject', request.rows[0].id, 'Pending order'], {
      env: { ...process.env, IDENTITY_DATABASE_URL: process.env.IDENTITY_TEST_DATABASE_URL },
    });
    assert.equal((await db.query('SELECT 1 FROM users WHERE id=$1', [userId])).rowCount, 1);
    const rejected = await db.query('SELECT status,resolution_note FROM privacy_requests WHERE id=$1', [request.rows[0].id]);
    assert.equal(rejected.rows[0].status, 'REJECTED');
    assert.equal(rejected.rows[0].resolution_note, 'Pending order');
  } finally { await db.query('DELETE FROM users WHERE id=$1', [userId]); await db.end(); }
});
