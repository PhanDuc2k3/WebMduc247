import pg from 'pg';
import {spawnSync} from 'node:child_process';
if(process.env.NODE_ENV!=='development')throw Error('Local development configuration required');
const url=new URL(process.env.CATALOG_DATABASE_URL||process.env.IDENTITY_DATABASE_URL);
if(!['localhost','127.0.0.1','[::1]'].includes(url.hostname))throw Error('Local PostgreSQL only');
const client=new pg.Client({connectionString:url.href});await client.connect();
try{if(!(await client.query('SELECT 1 FROM pg_database WHERE datname=$1',['admin_store_management_test'])).rowCount)await client.query('CREATE DATABASE admin_store_management_test');}finally{await client.end();}
url.pathname='/admin_store_management_test';
const env={...process.env,S3_BUCKET:'',STORE_APPROVAL_REQUIRED:'false',IDENTITY_DATABASE_URL:url.href,CATALOG_DATABASE_URL:url.href,ORDER_DATABASE_URL:url.href,ENGAGEMENT_DATABASE_URL:url.href,ADMIN_STORE_TEST_DATABASE_URL:url.href};
for(const service of ['identity','catalog','order','engagement']){
  const result=spawnSync(process.execPath,[`services/${service}-service/scripts/migrate.js`],{env,stdio:'inherit'});if(result.status)process.exit(result.status);
}
const result=spawnSync(process.execPath,['--test','services/catalog-service/tests/store-admin.test.js'],{env,stdio:'inherit'});if(result.status)process.exit(result.status);
if(process.env.CHAT_MONGO_URL){
  const mongo=new URL(process.env.CHAT_MONGO_URL);if(!['localhost','127.0.0.1','[::1]'].includes(mongo.hostname))throw Error('Local Mongo only');mongo.pathname='/admin_store_management_test';
  if(!mongo.username&&process.env.CHAT_MONGO_USER&&process.env.CHAT_MONGO_PASSWORD){mongo.username=process.env.CHAT_MONGO_USER;mongo.password=process.env.CHAT_MONGO_PASSWORD;mongo.searchParams.set('authSource','admin');}
  env.CHAT_TEST_MONGO_URL=mongo.href;
}
const chat=spawnSync(process.execPath,['--test','--test-force-exit','services/chat-service/tests/store-admin.test.js'],{env,stdio:'inherit'});process.exitCode=chat.status||0;
