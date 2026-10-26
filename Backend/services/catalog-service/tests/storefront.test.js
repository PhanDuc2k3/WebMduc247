import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';import pg from 'pg';
import {StorefrontService} from '../src/storefront.service.js';import {StoreService} from '../src/store.service.js';import {CatalogService} from '../src/catalog.service.js';
import {defaultStorefront,validateStorefront,internalTarget} from '../src/storefront-config.js';
test('storefront schema rejects unsafe links, malformed lists, duplicate IDs and invalid section counts',()=>{
  for(const value of ['javascript:alert(1)','//evil.example','/\\evil.example','/admin/users','/%2f%2fevil.example'])assert.throws(()=>internalTarget(value),{code:'INVALID_STOREFRONT'});
  const valid=defaultStorefront([]);assert.equal(validateStorefront(valid).sections.length,6);
  for(const change of [config=>{config.sections=[null];},config=>{config.navigation.push({...config.navigation[0]});},
    config=>{config.sections[0].limit=999;},config=>{config.banners[0].imageUrl='data:text/html,evil';},config=>{config.role='platform_admin';}]){
    const config=structuredClone(valid);change(config);assert.throws(()=>validateStorefront(config),{code:'INVALID_STOREFRONT'});
  }
});
test('all draft, preview, publish and category operations require current admin role before querying',async()=>{
  let queries=0;const service=new StorefrontService({pool:{query:async()=>{queries++;throw Error('Unexpected query');}}});
  for(const actor of [null,{id:randomUUID(),roles:['buyer','seller']}])for(const call of [()=>service.read(actor),()=>service.preview(actor),
    ()=>service.save(actor,{reason:"Storefront test change",requestId:randomUUID(),},false),()=>service.save(actor,{reason:"Storefront test change",requestId:randomUUID(),},true),()=>service.createCategory(actor,{}),()=>service.choices(actor,{resource:'products'})])
    await assert.rejects(call(),{status:actor?403:401});
  assert.equal(queries,0);
});
test('PostgreSQL storefront drafts, publication, references and rollback remain isolated from the public layout',
 {skip:!process.env.STOREFRONT_TEST_DATABASE_URL},async t=>{
  const url=new URL(process.env.STOREFRONT_TEST_DATABASE_URL);if(!url.pathname.endsWith('_test'))throw Error('Use a dedicated *_test database');
  const pool=new pg.Pool({connectionString:url.href}),stores=new StoreService(pool),catalog=new CatalogService(pool,stores),cms=new StorefrontService(catalog);
  const actor={id:randomUUID(),roles:['platform_admin']},storeId=randomUUID(),productId=randomUUID(),variantId=randomUUID();
  let categoryId;const tag=randomUUID().slice(0,8),snapshot=(await pool.query('SELECT * FROM catalog.storefront_settings WHERE id=1')).rows[0];
  try{
    await pool.query(`INSERT INTO catalog.stores(id,owner_user_id,slug,name,status) VALUES($1,$2,$3,'CMS test store','active')`,[storeId,actor.id,'cms-'+tag]);
    await pool.query('INSERT INTO catalog.store_settings(store_id,accepting_orders) VALUES($1,true)',[storeId]);
    await pool.query(`INSERT INTO catalog.products(id,store_id,name,slug,price,price_minor,stock,status) VALUES($1,$2,'CMS test product',$3,100000,100000,5,'active')`,[productId,storeId,'cms-'+tag]);
    await pool.query(`INSERT INTO catalog.product_variants(id,product_id,store_id,sku,price_minor,stock,status) VALUES($1,$2,$3,$4,100000,5,'active')`,[variantId,productId,storeId,'CMS-'+tag]);
    let config;
    await t.test('create category is audited and can be selected as a real featured category',async()=>{
      const created=await cms.createCategory(actor,{version:(await cms.read(actor)).version,reason:"Storefront test category",requestId:randomUUID(),name:'CMS category '+tag,slug:'cms-'+tag,parentId:null});categoryId=created.category.id;
      assert.ok((await cms.read(actor)).categories.some(category=>category.id===categoryId));
      const initial=await cms.read(actor);config=structuredClone(initial.draft);
      config.navigation.push({id:'cms-private',label:'Private draft '+tag,targetUrl:'/products',enabled:true});
      config.featuredCategories.push({id:'cms-category',categoryId,label:'CMS featured '+tag,targetUrl:'/category/cms-'+tag,icon:'package',tone:'blue',enabled:true});
      config.featuredProductIds=[productId];config.featuredStoreIds=[storeId];
    });
    await t.test('saving a draft does not expose it publicly; protected preview reflects it',async()=>{
      const current=await cms.read(actor),publicBefore=await cms.publicConfig();
      const saved=await cms.save(actor,{reason:"Storefront test change",requestId:randomUUID(),version:current.version,config},false);
      assert.equal(saved.version,current.version+1);assert.equal(saved.change.action,'draft_saved');
      assert.deepEqual((await cms.publicConfig()).layout,publicBefore.layout);
      const preview=await cms.preview(actor);assert.ok(preview.layout.navigation.some(item=>item.id==='cms-private'));
      assert.equal(preview.featuredProducts[0].id,productId);
      await assert.rejects(cms.save(actor,{reason:"Storefront test change",requestId:randomUUID(),version:current.version,config},true),{code:'VERSION_CONFLICT'});
    });
    await t.test('publication applies ordered navigation, categories, banners, sections and selected catalog data',async()=>{
      config.navigation.reverse();config.sections.reverse();config.banners[0].title='CMS public banner '+tag;
      const current=await cms.read(actor);await cms.save(actor,{reason:"Storefront test change",requestId:randomUUID(),version:current.version,config},true);
      const home=await catalog.home();assert.equal(home.storefrontConfigured,true);
      assert.equal(home.layout.navigation[0].id,'cms-private');assert.equal(home.layout.sections[0].key,'suggestions');
      assert.equal(home.layout.banners[0].title,'CMS public banner '+tag);assert.equal(home.featuredProducts[0].id,productId);assert.equal(home.featuredStores[0].id,storeId);
    });
    await t.test('catalog edits hide unavailable selections and resolve category slugs freshly',async()=>{
      await pool.query('UPDATE catalog.categories SET slug=$2 WHERE id=$1',[categoryId,'cms-updated-'+tag]);
      assert.equal((await cms.publicConfig()).layout.featuredCategories.find(item=>item.id==='cms-category').targetUrl,'/category/cms-updated-'+tag);
      await pool.query("UPDATE catalog.products SET status='hidden' WHERE id=$1",[productId]);
      await pool.query("UPDATE catalog.stores SET status='paused' WHERE id=$1",[storeId]);
      await pool.query('UPDATE catalog.categories SET is_active=false WHERE id=$1',[categoryId]);
      const home=await catalog.home();assert.deepEqual(home.featuredProducts,[]);assert.deepEqual(home.featuredStores,[]);
      assert.ok(!home.layout.featuredCategories.some(item=>item.id==='cms-category'));
      const current=await cms.read(actor),updated=structuredClone(current.draft);updated.featuredCategories.find(item=>item.id==='cms-category').enabled=false;
      await cms.save(actor,{reason:"Storefront test change",requestId:randomUUID(),version:current.version,config:updated},true);
      assert.deepEqual((await catalog.home()).featuredProducts,[]);
      await pool.query("UPDATE catalog.products SET status='active' WHERE id=$1",[productId]);await pool.query("UPDATE catalog.stores SET status='active' WHERE id=$1",[storeId]);
      await pool.query('UPDATE catalog.categories SET is_active=true WHERE id=$1',[categoryId]);
    });
    await t.test('audit failure rolls draft/publication and category creation back',async()=>{
      const before=await cms.read(actor),modified=structuredClone(before.draft);modified.navigation[0].label='Must not commit';
      const faulty=Object.create(catalog);faulty.transaction=fn=>catalog.transaction(db=>fn({query:(sql,args)=>{if(sql.includes('INSERT INTO catalog.storefront_changes'))throw Error('Audit unavailable');return db.query(sql,args);}}));
      const service=new StorefrontService(faulty);
      await assert.rejects(service.save(actor,{reason:"Storefront test change",requestId:randomUUID(),version:before.version,config:modified},true),/Audit unavailable/);
      assert.equal((await cms.read(actor)).version,before.version);assert.deepEqual((await cms.read(actor)).published,before.published);
      await assert.rejects(service.createCategory(actor,{version:before.version,reason:"Storefront test category",requestId:randomUUID(),name:'Must roll back',slug:'cms-rollback-'+tag,parentId:null}),/Audit unavailable/);
      assert.equal((await pool.query('SELECT 1 FROM catalog.categories WHERE slug=$1',['cms-rollback-'+tag])).rowCount,0);
    });
    await t.test('intentionally empty/disabled content does not fall back to unwanted default entries',async()=>{
      const current=await cms.read(actor),empty=structuredClone(current.draft);empty.navigation=[];empty.featuredCategories=[];empty.banners=[];empty.sections.forEach(section=>section.enabled=false);
      await cms.save(actor,{reason:"Storefront test change",requestId:randomUUID(),version:current.version,config:empty},true);const published=await cms.publicConfig();
      assert.deepEqual(published.layout.navigation,[]);assert.deepEqual(published.layout.sections,[]);assert.deepEqual(published.layout.banners,[]);
    });
    await t.test('CORE metadata is required, retries are atomic and changed content cannot reuse a command',async()=>{
      const current=await cms.read(actor),input={version:current.version,config:current.draft,reason:'Core publication retry test',requestId:randomUUID()};
      for(const mutation of [{...input,reason:''},{...input,requestId:undefined}])await assert.rejects(cms.save(actor,mutation,true),{status:400});
      const [one,two]=await Promise.all([cms.save(actor,input,true),cms.save(actor,input,true)]);
      assert.deepEqual(JSON.parse(JSON.stringify(one)),JSON.parse(JSON.stringify(two)));
      assert.equal((await cms.read(actor)).version,current.version+1);
      const history=(await pool.query('SELECT * FROM catalog.storefront_changes WHERE correlation_id=$1',[input.requestId])).rows;
      assert.equal(history.length,1);assert.equal(Number(history[0].read_version),current.version);assert.equal(history[0].reason,input.reason);
      await assert.rejects(cms.save(actor,{...input,reason:'Different publication reason'},true),{code:'IDEMPOTENCY_CONFLICT'});
      await assert.rejects(cms.save(actor,{...input,requestId:randomUUID()},false),{code:'VERSION_CONFLICT'});
    });
    await t.test('CORE category retry returns the same category without a second create or audit',async()=>{
      const current=await cms.read(actor),input={name:'Core retry category',slug:'core-retry-'+tag,parentId:null,version:current.version,reason:'Core create category retry',requestId:randomUUID()};
      const [one,two]=await Promise.all([cms.createCategory(actor,input),cms.createCategory(actor,input)]);
      assert.deepEqual(one,two);
      assert.equal((await pool.query('SELECT 1 FROM catalog.categories WHERE slug=$1',[input.slug])).rowCount,1);
      assert.equal((await pool.query('SELECT 1 FROM catalog.storefront_changes WHERE correlation_id=$1',[input.requestId])).rowCount,1);
      await pool.query('DELETE FROM catalog.categories WHERE id=$1',[one.category.id]);
    });
  }finally{
    await pool.query('DELETE FROM catalog.admin_commands WHERE actor_id=$1',[actor.id]);
    await pool.query('UPDATE catalog.storefront_settings SET draft=$1,published=$2,version=$3,published_at=$4,updated_at=$5 WHERE id=1',[snapshot.draft,snapshot.published,snapshot.version,snapshot.published_at,snapshot.updated_at]);
    await pool.query('DELETE FROM catalog.storefront_changes WHERE actor_id=$1',[actor.id]);
    await pool.query('DELETE FROM catalog.stores WHERE id=$1',[storeId]);if(categoryId)await pool.query('DELETE FROM catalog.categories WHERE id=$1',[categoryId]);await pool.end();
  }
 });
