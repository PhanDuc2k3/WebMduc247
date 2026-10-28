import pg from 'pg';
import {spawnSync} from 'node:child_process';
if(process.env.NODE_ENV!=='development')throw Error('Local development configuration required');
const url=new URL(process.env.IDENTITY_DATABASE_URL);if(!['localhost','127.0.0.1','[::1]'].includes(url.hostname))throw Error('Local PostgreSQL only');
const db=new pg.Client({connectionString:url.href});await db.connect();try{if(!(await db.query('SELECT 1 FROM pg_database WHERE datname=$1',['admin_user_management_test'])).rowCount)await db.query('CREATE DATABASE admin_user_management_test');}finally{await db.end();}
url.pathname='/admin_user_management_test';const env={...process.env,S3_BUCKET:'',IDENTITY_DATABASE_URL:url.href,CATALOG_DATABASE_URL:url.href,ORDER_DATABASE_URL:url.href,PAYMENT_DATABASE_URL:url.href,ADMIN_USER_TEST_DATABASE_URL:url.href};
for(const name of ['identity','catalog','order','payment']){const result=spawnSync(process.execPath,[`services/${name}-service/scripts/migrate.js`],{env,stdio:'inherit'});if(result.status)process.exit(result.status);}
const result=spawnSync(process.execPath,['--test','services/identity-service/tests/user-admin.test.js'],{env,stdio:'inherit'});process.exitCode=result.status||0;
