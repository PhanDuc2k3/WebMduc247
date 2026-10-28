import pg from 'pg';
import {spawnSync} from 'node:child_process';
if(process.env.NODE_ENV!=='development')throw Error('Local development configuration required');
const url=new URL(process.env.ORDER_DATABASE_URL||process.env.IDENTITY_DATABASE_URL);
if(!['localhost','127.0.0.1','[::1]'].includes(url.hostname))throw Error('Local PostgreSQL only');
const client=new pg.Client({connectionString:url.href});await client.connect();
try{if(!(await client.query('SELECT 1 FROM pg_database WHERE datname=$1',['admin_dashboard_queue_test'])).rowCount)await client.query('CREATE DATABASE admin_dashboard_queue_test');}finally{await client.end();}
url.pathname='/admin_dashboard_queue_test';
const env={...process.env,S3_BUCKET:'',IDENTITY_DATABASE_URL:url.href,CATALOG_DATABASE_URL:url.href,ORDER_DATABASE_URL:url.href,PAYMENT_DATABASE_URL:url.href,ADMIN_DASHBOARD_TEST_DATABASE_URL:url.href};
for(const service of ['identity','catalog','order','payment']){
  const result=spawnSync(process.execPath,[`services/${service}-service/scripts/migrate.js`],{env,stdio:'inherit'});if(result.status)process.exit(result.status);
}
const result=spawnSync(process.execPath,['--test','services/order-service/tests/dashboard-queue.test.js'],{env,stdio:'inherit'});process.exitCode=result.status||0;
