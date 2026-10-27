import pg from 'pg';
import {spawnSync} from 'node:child_process';
if(process.env.NODE_ENV!=='development'||!process.env.IDENTITY_DATABASE_URL)throw Error('Requires a configured local development database');
const source=new URL(process.env.IDENTITY_DATABASE_URL),db=new pg.Client({connectionString:source.href});await db.connect();
try{
  if(process.argv.includes('--reset'))await db.query('DROP DATABASE IF EXISTS admin_auth_test WITH (FORCE)');
  if(!(await db.query('SELECT 1 FROM pg_database WHERE datname=$1',['admin_auth_test'])).rowCount)await db.query('CREATE DATABASE admin_auth_test');
}finally{await db.end();}
source.pathname='/admin_auth_test';
const env={...process.env,IDENTITY_DATABASE_URL:source.href,ADMIN_AUTH_TEST_DATABASE_URL:source.href};
const migrated=spawnSync(process.execPath,['services/identity-service/scripts/migrate.js'],{env,stdio:'inherit'});if(migrated.status)process.exit(migrated.status);
// Rate-limit fixtures must not inherit IP counters from an earlier run of this isolated suite.
const setup=new pg.Client({connectionString:source.href});await setup.connect();
try{await setup.query('DELETE FROM auth_rate_limits');}finally{await setup.end();}
const result=spawnSync(process.execPath,['--test','services/identity-service/tests/admin-auth.test.js','services/identity-service/tests/admin-auth.integration.test.js'],{env,stdio:'inherit'});process.exitCode=result.status||0;
