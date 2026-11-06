import pg from 'pg';
import {spawnSync} from 'node:child_process';
if(process.env.NODE_ENV!=='development')throw Error('Development configuration required');
const source=new URL(process.env.IDENTITY_DATABASE_URL);
if(!['localhost','127.0.0.1','[::1]'].includes(source.hostname))throw Error('Local PostgreSQL only');
const db=new pg.Client({connectionString:source.href});await db.connect();
try{if(!(await db.query("SELECT 1 FROM pg_database WHERE datname='admin_basic_operations_test'")).rowCount)await db.query('CREATE DATABASE admin_basic_operations_test');}finally{await db.end();}
source.pathname='/admin_basic_operations_test';
const env={...process.env,IDENTITY_DATABASE_URL:source.href,CATALOG_DATABASE_URL:source.href,ORDER_DATABASE_URL:source.href,PAYMENT_DATABASE_URL:source.href,ADMIN_OPERATIONS_TEST_DATABASE_URL:source.href};
if(process.env.CHAT_MONGO_URL){const mongo=new URL(process.env.CHAT_MONGO_URL);if(!['localhost','127.0.0.1','[::1]'].includes(mongo.hostname))throw Error('Local Mongo only');
  if(!mongo.username&&process.env.CHAT_MONGO_PASSWORD){mongo.username=process.env.CHAT_MONGO_USER||'chatdev';mongo.password=process.env.CHAT_MONGO_PASSWORD;mongo.searchParams.set('authSource','admin');}
  mongo.pathname='/admin_basic_chat_test';env.CHAT_TEST_MONGO_URL=mongo.href;}
for(const service of ['identity','catalog','order','payment']){const result=spawnSync(process.execPath,[`services/${service}-service/scripts/migrate.js`],{env,stdio:'inherit'});if(result.status)process.exit(result.status);}
const result=spawnSync(process.execPath,['--test','services/payment-service/tests/admin-operations.test.js','services/catalog-service/tests/inventory-admin.test.js','services/chat-service/tests/admin-reports.test.js'],{env,stdio:'inherit'});process.exitCode=result.status||0;
