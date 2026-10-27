import pg from 'pg';
import { spawnSync } from 'node:child_process';
if (process.env.NODE_ENV !== 'development') throw new Error('This local test database helper requires NODE_ENV=development.');
if (!process.env.IDENTITY_DATABASE_URL) throw new Error('IDENTITY_DATABASE_URL is required');
const url = new URL(process.env.IDENTITY_DATABASE_URL);
const client = new pg.Client({ connectionString:url.href }); await client.connect();
try {
  const exists = await client.query('SELECT 1 FROM pg_database WHERE datname=$1',['identity_admin_test']);
  if (!exists.rowCount) await client.query('CREATE DATABASE identity_admin_test');
} finally { await client.end(); }
url.pathname='/identity_admin_test';
const env={...process.env,IDENTITY_DATABASE_URL:url.href,CATALOG_DATABASE_URL:url.href,ORDER_DATABASE_URL:url.href,
  ADMIN_TEST_DATABASE_URL:url.href,CATALOG_TEST_DATABASE_URL:url.href};
for (const path of ['services/identity-service/scripts/migrate.js','services/catalog-service/scripts/migrate.js','services/order-service/scripts/migrate.js']) {
  const result=spawnSync(process.execPath,[path],{env,stdio:'inherit'});
  if(result.status!==0)process.exit(result.status||1);
}
const setup=new pg.Client({connectionString:url.href});await setup.connect();try{await setup.query('UPDATE order_service.admin_approval_policies SET threshold_minor=9007199254740991');}finally{await setup.end();}
const result=spawnSync(process.execPath,['--test','services/identity-service/tests/admin-management.integration.test.js'],{env,stdio:'inherit'});
if(result.status!==0)process.exit(result.status||1);
const catalog=spawnSync('npm',['run','catalog:test'],{env,stdio:'inherit'});
process.exitCode=catalog.status||0;
