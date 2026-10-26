import pg from 'pg';import {spawnSync}from'node:child_process';
if(process.env.NODE_ENV!=='development')throw Error('Local test helper requires NODE_ENV=development');
const url=new URL(process.env.CATALOG_DATABASE_URL||process.env.IDENTITY_DATABASE_URL);const client=new pg.Client({connectionString:url.href});await client.connect();
try{const exists=await client.query('SELECT 1 FROM pg_database WHERE datname=$1',['catalog_storefront_test']);if(!exists.rowCount)await client.query('CREATE DATABASE catalog_storefront_test');}finally{await client.end();}
url.pathname='/catalog_storefront_test';const env={...process.env,CATALOG_DATABASE_URL:url.href,STOREFRONT_TEST_DATABASE_URL:url.href};
for(const args of [['services/catalog-service/scripts/migrate.js'],['--test','services/catalog-service/tests/storefront.test.js']]){const result=spawnSync(process.execPath,args,{env,stdio:'inherit'});if(result.status!==0)process.exit(result.status||1);}
