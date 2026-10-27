import pg from 'pg';
import {spawnSync} from 'node:child_process';
if(process.env.NODE_ENV!=='development'||!process.env.IDENTITY_DATABASE_URL)throw Error('Requires local development database configuration');
const source=new URL(process.env.IDENTITY_DATABASE_URL),db=new pg.Client({connectionString:source.href});await db.connect();
try{
  if(process.argv.includes('--reset'))await db.query('DROP DATABASE IF EXISTS admin_rbac_test WITH (FORCE)');
  if(!(await db.query('SELECT 1 FROM pg_database WHERE datname=$1',['admin_rbac_test'])).rowCount)await db.query('CREATE DATABASE admin_rbac_test');
}finally{await db.end();}
source.pathname='/admin_rbac_test';
const env={...process.env,IDENTITY_DATABASE_URL:source.href,CATALOG_DATABASE_URL:source.href,ORDER_DATABASE_URL:source.href,
  ADMIN_RBAC_TEST_DATABASE_URL:source.href,ADMIN_AUTHORIZATION_TOKEN:'isolated-rbac-test-internal-token',INVENTORY_INTERNAL_TOKEN:'isolated-rbac-test-inventory-token'};
for(const path of ['services/identity-service/scripts/migrate.js','services/catalog-service/scripts/migrate.js','services/order-service/scripts/migrate.js']){
  const result=spawnSync(process.execPath,[path],{env,stdio:'inherit'});if(result.status)process.exit(result.status);
}
const result=spawnSync(process.execPath,['--test','services/identity-service/tests/admin-rbac.test.js','services/identity-service/tests/admin-rbac.integration.test.js'],{env,stdio:'inherit'});
process.exitCode=result.status||0;
