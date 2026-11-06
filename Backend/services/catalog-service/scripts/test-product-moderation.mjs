import pg from 'pg';
import {spawnSync} from 'node:child_process';
import {readdirSync} from 'node:fs';
if(process.env.NODE_ENV!=='development')throw Error('Local development configuration required');
const url=new URL(process.env.CATALOG_DATABASE_URL||process.env.IDENTITY_DATABASE_URL);
if(!['localhost','127.0.0.1','[::1]'].includes(url.hostname))throw Error('Local PostgreSQL only');
const name='admin_product_moderation_test';
const client=new pg.Client({connectionString:url.href});await client.connect();
try{if(!(await client.query('SELECT 1 FROM pg_database WHERE datname=$1',[name])).rowCount)await client.query(`CREATE DATABASE ${name}`);}finally{await client.end();}
url.pathname=`/${name}`;
const env={...process.env,NODE_ENV:'development',S3_BUCKET:'',STORE_APPROVAL_REQUIRED:'false',IDENTITY_DATABASE_URL:url.href,CATALOG_DATABASE_URL:url.href,ORDER_DATABASE_URL:url.href,ENGAGEMENT_DATABASE_URL:url.href,
  ADMIN_PRODUCT_TEST_DATABASE_URL:url.href,CATALOG_TEST_DATABASE_URL:url.href,ADMIN_STORE_TEST_DATABASE_URL:url.href,STOREFRONT_TEST_DATABASE_URL:url.href};
for(const service of ['identity','catalog','order','engagement']){
  const result=spawnSync(process.execPath,[`services/${service}-service/scripts/migrate.js`],{env,stdio:'inherit'});if(result.status)process.exit(result.status);
}
const tests=readdirSync(new URL('../tests/',import.meta.url)).filter(name=>name.endsWith('.test.js')).map(name=>`services/catalog-service/tests/${name}`);
// Storefront tests intentionally publish global layout settings; isolate test files.
const result=spawnSync(process.execPath,['--test','--test-concurrency=1',...tests],{env,stdio:'inherit'});
process.exitCode=result.status||0;
