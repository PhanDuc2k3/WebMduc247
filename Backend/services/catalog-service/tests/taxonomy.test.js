import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import pg from 'pg';
import http from 'node:http';
import {StoreService} from '../src/store.service.js';
import {CatalogService} from '../src/catalog.service.js';
import {TaxonomyService} from '../src/taxonomy.service.js';
import {parseCsv,attributeDefinitions,specificationErrors} from '../src/taxonomy-contract.js';
import {effectiveAdminAccess} from '../../../packages/contracts/admin-rbac.js';
const actor=(role='moderator',scope={})=>{const id=randomUUID();return {id,adminAccess:effectiveAdminAccess([{role,scope}],id)};};
const mutation=(version,extra={})=>({version,reason:'Cập nhật danh mục theo chính sách catalog',requestId:randomUUID(),...extra});
const category=(name,slug,extra={})=>({name,slug,parentId:null,description:'Mô tả kiểm thử danh mục',sortOrder:0,isActive:true,iconKey:'package',imageKey:null,...extra});
const definition=(extra={})=>({code:'weight',label:'Khối lượng',type:'number',required:true,unit:'kg',allowedValues:[],...extra});
test('CSV quoting, row numbers and schema value types are validated before import',()=>{
  const csv=parseCsv('\uFEFFname,slug\r\n"A, B",a-b\r\n"C\nD",c-d');assert.equal(csv.rows[0].values.name,'A, B');assert.equal(csv.rows[1].line,3);
  assert.throws(()=>parseCsv('a,b\n"bad,b'),{code:'INVALID_CSV'});assert.throws(()=>parseCsv('a,a\n1,2'),{code:'INVALID_CSV'});
  const defs=attributeDefinitions([definition(),definition({code:'color',label:'Màu',type:'enum',unit:'',allowedValues:['red','blue']})]);
  assert.equal(specificationErrors(defs,{weight:5,color:'red'}).length,0);assert.equal(specificationErrors(defs,{weight:'5',color:'green'}).length,2);
  assert.throws(()=>attributeDefinitions([definition(),definition()]),{code:'INVALID_SCHEMA'});
});
test('taxonomy PostgreSQL acceptance',{skip:!process.env.ADMIN_TAXONOMY_TEST_DATABASE_URL},async t=>{
  const pool=new pg.Pool({connectionString:process.env.ADMIN_TAXONOMY_TEST_DATABASE_URL}),db=await pool.connect();await db.query('BEGIN');let seq=0,tail=Promise.resolve();
  const query=(...args)=>{const next=tail.then(()=>db.query(...args));tail=next.catch(()=>{});return next;};
  const txPool={query,connect:async()=>{const point=`taxonomy_${++seq}`;return {release(){},query:(sql,args)=>query(sql==='BEGIN'?`SAVEPOINT ${point}`:sql==='COMMIT'?`RELEASE SAVEPOINT ${point}`:sql==='ROLLBACK'?`ROLLBACK TO SAVEPOINT ${point}`:sql,args)};}};
  const stores=new StoreService(txPool,{approvalRequired:false}),catalog=new CatalogService(txPool,stores),service=new TaxonomyService(catalog),admin=actor(),owner={id:randomUUID(),emailVerifiedAt:new Date().toISOString()};
  const store=await stores.create(owner,{name:`Taxonomy ${randomUUID().slice(0,8)}`,contactEmail:'seller@example.test',contactPhone:'+84901234567',pickupAddress:'123 Test Street'});
  const state=async()=>Number((await db.query('SELECT version FROM catalog.taxonomy_state WHERE id=true')).rows[0].version);
  const execute=async input=>{const p=await service.preview(admin,input);return service.commit(admin,{previewId:p.id});};
  const make=async(name,extra={})=>(await execute(mutation(await state(),{action:'create',category:category(name,`tax-${randomUUID().slice(0,8)}`,extra)}))).result;
  // Only category input fields belong to commands, not read-side counts/versions.
  const categoryCommand=async(id,extra={},more={})=>{const row=(await service.read(admin)).categories.find(c=>c.id===id);const {id:ignored,version,productCount,childCount,...fields}=row;return mutation(version,{action:'update',id,category:{...fields,...extra},...more});};
  const product=async(categoryId,name='Taxonomy product',extra={})=>(await catalog.createProduct(store.id,owner.id,{title:name,categoryId,priceMinor:100000,stock:5,...extra})).product;
  try{
    await t.test('dedicated tree mutations validate parent cycles, slugs, metadata and scope',async()=>{
      const root=await make('Root catalog'),child=await make('Child catalog',{parentId:root.id});
      await assert.rejects(service.preview(admin,await categoryCommand(root.id,{parentId:child.id})),{code:'CATEGORY_CYCLE'});
      await db.query('SAVEPOINT expected_cycle');
      await assert.rejects(catalog.updateCategory(root.id,{parentId:child.id}),{code:'CATEGORY_CYCLE'});
      await db.query('ROLLBACK TO SAVEPOINT expected_cycle');
      const input=await categoryCommand(child.id,{description:'Mô tả mới',imageKey:'https://example.test/category.webp',iconKey:'tag',sortOrder:3});
      const p=await service.preview(admin,input),one=await service.commit(admin,{previewId:p.id});assert.deepEqual(await service.commit(admin,{previewId:p.id}),one);
      assert.equal(one.result.description,'Mô tả mới');assert.equal(one.result.iconKey,'tag');
      await assert.rejects(service.preview(actor('moderator',{storeIds:[store.id]}),input),{code:'ADMIN_SCOPE_REQUIRED'});
      await assert.rejects(service.preview(owner,input),{code:'ADMIN_PERMISSION_REQUIRED'});
      await assert.rejects(service.preview(admin,mutation(await state(),{action:'create',category:category('Duplicate',root.slug)})),{code:'CATEGORY_SLUG_TAKEN'});
    });
    await t.test('retiring an in-use subtree requires an active replacement, previews references and transfers atomically with notices/audit',async()=>{
      const root=await make('Retirement root'),child=await make('Retirement child',{parentId:root.id}),target=await make('Replacement category');const item=await product(child.id);await catalog.setProductStatus(item.id,owner.id,'active');
      const settings={navigation:[{id:'category-link',label:'Category link',targetUrl:`/category/${child.slug}?sort=newest`,enabled:true}],featuredCategories:[{id:'category-tile',categoryId:child.id,label:'Featured category',targetUrl:`/category/${child.slug}`,enabled:true}],banners:[]};
      await db.query('UPDATE catalog.storefront_settings SET draft=$1,published=$1,version=version+1 WHERE id=1',[settings]);
      const banner=await catalog.createBanner({title:'Legacy category banner',imageKey:'banners/legacy.webp',targetUrl:`/category/${child.slug}?campaign=old`});
      await assert.rejects(service.preview(admin,await categoryCommand(root.id,{isActive:false})),{code:'REPLACEMENT_REQUIRED'});
      const p=await service.preview(admin,await categoryCommand(root.id,{isActive:false},{replacementId:target.id}));
      assert.equal(p.impact.productCount,1);assert.equal(p.impact.descendantCount,1);assert.equal(p.impact.publishedReferences.length,3);
      await service.commit(admin,{previewId:p.id});const moved=await catalog.sellerProduct(item.id,store.id,owner.id);assert.equal(moved.categoryId,target.id);assert.equal(moved.status,'active');
      assert.equal((await catalog.publicProduct(item.id)).product.id,item.id);assert.equal((await catalog.listProducts({category:target.slug})).total,1);
      const tree=(await service.read(admin)).categories;assert.equal(tree.find(c=>c.id===child.id).isActive,false);
      assert.ok((await service.sellerSchema(owner,item.id)).notices.length);assert.ok((await service.read(admin)).history.some(h=>h.target_id===root.id&&h.after_data.movedProducts.length===1));
      await assert.rejects(catalog.createProduct(store.id,owner.id,{title:'Invalid disabled product',categoryId:child.id,priceMinor:5}),{code:'INVALID_CATEGORY'});
      await assert.rejects(service.resolve(child.slug),{code:'CATEGORY_UNAVAILABLE'});
      assert.equal((await db.query('SELECT published FROM catalog.storefront_settings WHERE id=1')).rows[0].published.featuredCategories[0].enabled,false);
      assert.ok((await db.query('SELECT active_to FROM catalog.catalog_banners WHERE id=$1',[banner.banner.id])).rows[0].active_to);
    });
    await t.test('preview detects new product references and storefront changes; referenced categories cannot be deleted',async()=>{
      const source=await make('Conflict source'),target=await make('Conflict target');
      const preview=await service.preview(admin,await categoryCommand(source.id,{parentId:target.id}));await product(source.id);
      await assert.rejects(service.commit(admin,{previewId:preview.id}),{code:'VERSION_CONFLICT'});
      const fresh=await service.preview(admin,await categoryCommand(source.id,{parentId:target.id}));await db.query('UPDATE catalog.storefront_settings SET version=version+1 WHERE id=1');
      await assert.rejects(service.commit(admin,{previewId:fresh.id}),{code:'VERSION_CONFLICT'});
      const current=(await service.read(admin)).categories.find(c=>c.id===source.id);await assert.rejects(service.preview(admin,mutation(current.version,{action:'delete',id:source.id})),{code:'CATEGORY_REFERENCED'});
      const empty=await make('Deletable category');await execute(mutation(empty.version,{action:'delete',id:empty.id}));assert.ok(!(await service.read(admin)).categories.some(c=>c.id===empty.id));
    });
    await t.test('slug changes rewrite internal links and reserve old aliases; ID mappings cannot form redirect cycles',async()=>{
      const item=await make('URL category'),first=item.slug,next=`new-${randomUUID().slice(0,8)}`;
      await db.query('UPDATE catalog.storefront_settings SET draft=$1,published=$1,version=version+1 WHERE id=1',[{navigation:[{id:'url',label:'URL',targetUrl:`/category/${first}?sort=price_asc`,enabled:true}],featuredCategories:[],banners:[]}]);
      const banner=await catalog.createBanner({title:'Rename legacy banner',imageKey:'banners/legacy.webp',targetUrl:`/category/${first}?source=legacy`});
      await product(item.id,'Slug reference product');await execute(await categoryCommand(item.id,{slug:next}));
      assert.equal((await service.resolve(first)).canonicalPath,`/category/${next}`);assert.equal((await service.resolve(first)).redirected,true);
      assert.equal((await db.query('SELECT published FROM catalog.storefront_settings WHERE id=1')).rows[0].published.navigation[0].targetUrl,`/category/${next}?sort=price_asc`);
      assert.equal((await db.query('SELECT target_url FROM catalog.catalog_banners WHERE id=$1',[banner.banner.id])).rows[0].target_url,`/category/${next}?source=legacy`);
      await assert.rejects(service.preview(admin,mutation(await state(),{action:'create',category:category('Reserved URL',first)})),{code:'CATEGORY_SLUG_TAKEN'});
      await execute(await categoryCommand(item.id,{slug:first}));assert.equal((await service.resolve(next)).canonicalPath,`/category/${first}`);assert.equal((await service.resolve(first)).redirected,false);
    });
    await t.test('typed inherited schemas keep legacy goods visible, enforce changes/publish and permit NEW_ONLY transition policy',async()=>{
      const root=await make('Schema root'),child=await make('Schema child',{parentId:root.id}),old=await product(child.id);await catalog.setProductStatus(old.id,owner.id,'active');
      const p=await service.preview(admin,mutation(0,{action:'schema',id:root.id,definitions:[definition()],legacyPolicy:'ON_EDIT'}));assert.equal(p.impact.missingProducts,1);
      await service.commit(admin,{previewId:p.id});assert.equal((await catalog.publicProduct(old.id)).product.id,old.id);
      await assert.rejects(catalog.updateProduct(old.id,owner.id,{description:'Must complete required schema'}),{code:'INVALID_SPECIFICATIONS'});
      await assert.rejects(product(child.id,'Missing required specs'),{code:'INVALID_SPECIFICATIONS'});
      await catalog.updateProduct(old.id,owner.id,{specifications:{weight:2.5}});assert.equal((await catalog.sellerProduct(old.id,store.id,owner.id)).specifications.weight,2.5);
      await assert.rejects(catalog.updateProduct(old.id,owner.id,{specifications:{weight:'2.5'}}),{code:'INVALID_SPECIFICATIONS'});
      assert.equal((await service.sellerSchema(owner,old.id)).schema.category_id,root.id);
      const own=(await service.read(admin)).schemas.find(s=>s.category_id===root.id);
      await execute(mutation(Number(own.version),{action:'schema',id:root.id,definitions:[definition(),definition({code:'material',type:'text',unit:''})],legacyPolicy:'NEW_ONLY'}));
      await catalog.updateProduct(old.id,owner.id,{description:'Legacy product may complete new fields later'});
    });
    await t.test('standard brands resolve aliases, reject duplicate names, merge legacy products and forbid merge chains/cycles',async()=>{
      const source=(await execute(mutation(0,{action:'brand',brand:{name:'Tax Brand A',aliases:['Tax Alias A'],logoUrl:null,status:'ACTIVE'}}))).result;
      const target=(await execute(mutation(0,{action:'brand',brand:{name:'Tax Brand B',aliases:[],logoUrl:'https://example.test/brand.webp',status:'ACTIVE'}}))).result;
      const item=await product(null,'Branded product',{brand:'Tax Alias A'});assert.equal(item.brand,'Tax Brand A');assert.equal(item.brandId,source.id);
      await assert.rejects(service.preview(admin,mutation(0,{action:'brand',brand:{name:'Other brand',aliases:['Tax Alias A'],logoUrl:null,status:'ACTIVE'}})),{code:'DUPLICATE_BRAND_NAME'});
      await execute(mutation(0,{action:'merge_brand',id:source.id,replacementId:target.id}));
      const merged=await catalog.sellerProduct(item.id,store.id,owner.id);assert.equal(merged.brandId,target.id);assert.equal(merged.brand,'Tax Brand B');
      await catalog.setProductStatus(item.id,owner.id,'active');assert.ok((await catalog.listProducts({brand:'Tax Alias A'})).products.some(p=>p.id===item.id));
      assert.equal((await product(null,'Brand alias after merge',{brand:'Tax Alias A'})).brandId,target.id);
      await assert.rejects(service.preview(admin,mutation(0,{action:'merge_brand',id:target.id,replacementId:source.id})),{code:'INVALID_REPLACEMENT'});
    });
    await t.test('CSV checks every row without mutation; valid parent/child rows and attributes commit once, stale previews reject all',async()=>{
      const headers='name,slug,parentSlug,description,sortOrder,isActive,iconKey,imageKey',tag=randomUUID().slice(0,8);
      const input=mutation(await state(),{kind:'categories',filename:'categories.csv',csv:`${headers}\nCSV Parent,csv-parent-${tag},,,0,true,package,\nCSV Child,csv-child-${tag},csv-parent-${tag},,1,true,tag,`});
      const preview=await service.previewCsv(admin,input);assert.equal(preview.status,'PREVIEWED',JSON.stringify(preview.errors));assert.ok(!(await service.read(admin)).categories.some(c=>c.slug===`csv-parent-${tag}`));
      const applied=await service.commitCsv(admin,{importId:preview.id});assert.equal(applied.applied,2);assert.deepEqual(await service.commitCsv(admin,{importId:preview.id}),applied);
      const invalid=await service.previewCsv(admin,mutation(await state(),{kind:'categories',filename:'invalid.csv',csv:`${headers}\nGood Row,csv-good-${tag},,,0,true,,\nBad Row,csv-good-${tag},,,0,true,,`}));
      assert.equal(invalid.status,'INVALID');assert.equal(invalid.errors[0].line,3);await assert.rejects(service.commitCsv(admin,{importId:invalid.id}),{code:'INVALID_IMPORT'});
      assert.ok(!(await service.read(admin)).categories.some(c=>c.slug===`csv-good-${tag}`));
      const cyclic=await service.previewCsv(admin,mutation(await state(),{kind:'categories',filename:'cycle.csv',csv:`${headers}\nCycle A,cycle-a-${tag},cycle-b-${tag},,0,true,,\nCycle B,cycle-b-${tag},cycle-a-${tag},,0,true,,`}));assert.equal(cyclic.status,'INVALID');
      const broken=await service.previewCsv(admin,mutation(await state(),{kind:'categories',filename:'quoted.csv',csv:`${headers}\n"Unclosed row`}));assert.equal(broken.status,'INVALID');assert.equal(broken.errors[0].line,2);
      const attrs=await service.previewCsv(admin,mutation(await state(),{kind:'attributes',filename:'attrs.csv',csv:`categorySlug,code,label,type,required,unit,allowedValues,legacyPolicy\ncsv-parent-${tag},color,Màu,enum,true,,red|blue,ON_EDIT`}));
      assert.equal(attrs.status,'PREVIEWED');await service.commitCsv(admin,{importId:attrs.id});
      assert.ok((await service.imports(admin)).items.some(i=>i.status==='APPLIED'));
      const stale=await service.previewCsv(admin,mutation(await state(),{kind:'categories',filename:'stale.csv',csv:`${headers}\nStale CSV,csv-stale-${tag},,,0,true,,`}));
      await make('Changed after CSV preview');await assert.rejects(service.commitCsv(admin,{importId:stale.id}),{code:'VERSION_CONFLICT'});
    });
    await t.test('audit failure rolls retirement, product transfer, notices and storefront changes back together',async()=>{
      const root=await make('Atomic source'),target=await make('Atomic replacement'),item=await product(root.id),p=await service.preview(admin,await categoryCommand(root.id,{isActive:false},{replacementId:target.id}));
      const faulty=new TaxonomyService(catalog);faulty.audit=async()=>{throw Error('Audit unavailable');};
      await assert.rejects(faulty.commit(admin,{previewId:p.id}),/Audit unavailable/);
      assert.equal((await catalog.sellerProduct(item.id,store.id,owner.id)).categoryId,root.id);assert.equal((await service.read(admin)).categories.find(c=>c.id===root.id).isActive,true);
      await service.commit(admin,{previewId:p.id});assert.equal((await catalog.sellerProduct(item.id,store.id,owner.id)).categoryId,target.id);
    });
    await t.test('HTTP authentication, global permissions, origin checks, typed seller schema and CSV preview gates',async()=>{
      const originalFetch=globalThis.fetch;let current=admin;
      globalThis.fetch=async(input,options)=>new URL(input).pathname==='/api/v2/auth/me'?Response.json({user:current}):originalFetch(input,options);
      const {createHandler}=await import('../src/server.js');const server=http.createServer(createHandler(stores,catalog));await new Promise(done=>server.listen(0,'127.0.0.1',done));
      const base=`http://127.0.0.1:${server.address().port}/api/v2`,origin=process.env.FRONTEND_ORIGIN||'http://localhost:5173';
      const request=(path,method='GET',body,auth=true,requestOrigin=origin)=>originalFetch(base+path,{method,headers:{Origin:requestOrigin,'Content-Type':'application/json',...(auth?{Authorization:'Bearer taxonomy-test'}:{})},...(body?{body:JSON.stringify(body)}:{})});
      try{
        assert.equal((await request('/admin/taxonomy','GET',null,false)).status,401);assert.equal((await request('/admin/taxonomy')).status,200);
        const cmd=mutation(await state(),{action:'create',category:category('HTTP category',`http-${randomUUID().slice(0,8)}`)});
        assert.equal((await request('/admin/taxonomy/preview','POST',cmd,true,'https://other.test')).status,403);
        const p=await request('/admin/taxonomy/preview','POST',cmd);assert.equal(p.status,200);const preview=await p.json();
        assert.equal((await request('/admin/taxonomy/commit','POST',{previewId:preview.id})).status,200);
        current=owner;assert.equal((await request('/admin/taxonomy')).status,403);
        assert.equal((await request('/admin/taxonomy/imports/preview','POST',mutation(await state(),{kind:'categories',csv:'bad',filename:'bad.csv'}))).status,403);
        const item=await product(null);assert.equal((await request(`/seller/products/${item.id}/taxonomy`)).status,200);
        current={id:randomUUID()};assert.equal((await request(`/seller/products/${item.id}/taxonomy`)).status,403);
        assert.equal((await request('/categories/resolve?slug='+cmd.category.slug,'GET',null,false)).status,200);
      }finally{globalThis.fetch=originalFetch;await new Promise(done=>server.close(done));}
    });
    await t.test('concurrent opposite reparenting cannot commit a cycle; new product vs retirement either conflicts or rejects assignment',async()=>{
      await db.query('ROLLBACK');await db.query('BEGIN');
      const actualStores=new StoreService(pool,{approvalRequired:false}),actualCatalog=new CatalogService(pool,actualStores),actualService=new TaxonomyService(actualCatalog),staff=actor();
      const a=(await actualCatalog.createCategory({name:'Concurrent category A',slug:`race-a-${randomUUID().slice(0,8)}`})).category;
      const b=(await actualCatalog.createCategory({name:'Concurrent category B',slug:`race-b-${randomUUID().slice(0,8)}`})).category;
      let raceStore,item;
      try{
        const results=await Promise.allSettled([actualCatalog.updateCategory(a.id,{parentId:b.id}),actualCatalog.updateCategory(b.id,{parentId:a.id})]);
        assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(results.find(r=>r.status==='rejected').reason.code,'CATEGORY_CYCLE');
        await pool.query('UPDATE catalog.categories SET parent_id=NULL WHERE id=ANY($1::uuid[])',[[a.id,b.id]]);
        raceStore=await actualStores.create(owner,{name:'Race taxonomy store',contactEmail:'race@example.test',contactPhone:'+84901234567',pickupAddress:'123 Test Street'});
        const current=(await actualService.read(staff)).categories.find(c=>c.id===a.id),{id,version,productCount,childCount,...fields}=current;
        const p=await actualService.preview(staff,mutation(version,{action:'update',id,category:{...fields,isActive:false}}));
        const raced=await Promise.allSettled([actualService.commit(staff,{previewId:p.id}),actualCatalog.createProduct(raceStore.id,owner.id,{title:'Racing category product',categoryId:a.id,priceMinor:100000,stock:2})]);
        if(raced[0].status==='rejected')assert.equal(raced[0].reason.code,'VERSION_CONFLICT');
        if(raced[1].status==='rejected')assert.ok(['CATEGORY_UNAVAILABLE','INVALID_CATEGORY'].includes(raced[1].reason.code));
        else{item=raced[1].value.product;assert.equal((await actualService.read(staff)).categories.find(c=>c.id===a.id).isActive,true);}
      }finally{
        await pool.query('DELETE FROM catalog.taxonomy_previews WHERE actor_id=$1',[staff.id]);await pool.query('DELETE FROM catalog.taxonomy_audit WHERE actor_id=$1',[staff.id]);await pool.query('DELETE FROM catalog.admin_commands WHERE actor_id=$1',[staff.id]);
        if(raceStore){
          await pool.query('DELETE FROM catalog.inventory_movements m USING catalog.product_variants v WHERE m.variant_id=v.id AND v.store_id=$1',[raceStore.id]);
          await pool.query('DELETE FROM catalog.inventory i USING catalog.product_variants v WHERE i.variant_id=v.id AND v.store_id=$1',[raceStore.id]);
          await pool.query('DELETE FROM catalog.store_profile_versions WHERE store_id=$1',[raceStore.id]);await pool.query('DELETE FROM catalog.store_audit_logs WHERE store_id=$1',[raceStore.id]);
          await pool.query("DELETE FROM catalog.store_outbox WHERE payload->>'storeId'=$1",[raceStore.id]);await pool.query('DELETE FROM catalog.stores WHERE id=$1',[raceStore.id]);
        }
        await pool.query('UPDATE catalog.categories SET parent_id=NULL WHERE id=ANY($1::uuid[])',[[a.id,b.id]]);await pool.query('DELETE FROM catalog.categories WHERE id=ANY($1::uuid[])',[[a.id,b.id]]);
      }
    });
  }finally{await db.query('ROLLBACK');db.release();await pool.end();}
});
