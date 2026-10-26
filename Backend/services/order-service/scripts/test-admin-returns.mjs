import pg from 'pg';
import { spawnSync } from 'node:child_process';

if(process.env.NODE_ENV !== 'development') throw new Error('Admin returns test helper requires NODE_ENV=development.');
const source = process.env.ORDER_DATABASE_URL || process.env.IDENTITY_DATABASE_URL;
if(!source) throw new Error('ORDER_DATABASE_URL is required.');
const testDatabase = 'order_admin_returns_test';
const url = new URL(source);
const client = new pg.Client({connectionString:url.href});
await client.connect();
try {
  if(!(await client.query('SELECT 1 FROM pg_database WHERE datname=$1',[testDatabase])).rowCount)
    await client.query('CREATE DATABASE order_admin_returns_test');
} finally { await client.end(); }
url.pathname = `/${testDatabase}`;
const env = {...process.env,ORDER_DATABASE_URL:url.href,ADMIN_RETURNS_TEST_DATABASE_URL:url.href};
for(const args of [['services/order-service/scripts/migrate.js'],['--test','services/order-service/tests/admin-returns.test.js','services/order-service/tests/admin-cases.test.js','services/order-service/tests/case-resolution.test.js']]) {
  const result = spawnSync(process.execPath,args,{env,stdio:'inherit'});
  if(result.status !== 0) process.exit(result.status || 1);
}
