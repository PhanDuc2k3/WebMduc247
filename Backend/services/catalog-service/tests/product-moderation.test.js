import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import pg from 'pg';
import sharp from 'sharp';
import http from 'node:http';
import {StoreService} from '../src/store.service.js';
import {CatalogService} from '../src/catalog.service.js';
import {CatalogAdminService} from '../src/platform-admin.service.js';
import {MediaService} from '../src/media.service.js';
import {InventoryService} from '../src/inventory.service.js';
import {ProductModerationService,productCommand,revisionDiff,PRODUCT_BULK_LIMIT} from '../src/product-moderation.service.js';
import {effectiveAdminAccess} from '../../../packages/contracts/admin-rbac.js';
const actor=(scope={},role='moderator')=>{const id=randomUUID();return {id,adminAccess:effectiveAdminAccess([{role,scope}],id)};};
const command=(version,extra={})=>({version,action:'suspend',reason:'Kiểm tra bằng chứng vi phạm sản phẩm',reasonCode:'MISLEADING_CONTENT',evidence:[],requestId:randomUUID(),...extra});
test('product moderation command validates evidence, codes, deadlines and versions',()=>{
  assert.throws(()=>productCommand(command(0,{reasonCode:''})),{code:'REASON_CODE_REQUIRED'});
  assert.throws(()=>productCommand(command(0,{evidence:['javascript:alert(1)']})),{code:'INVALID_EVIDENCE'});
  assert.throws(()=>productCommand(command(0,{evidence:['https://user:password@example.test']})),{code:'INVALID_EVIDENCE'});
  assert.throws(()=>productCommand(command(0,{action:'request_changes',remedyBy:'not-a-date'})),{code:'INVALID_DEADLINE'});
  assert.throws(()=>productCommand(command(0,{selectAll:true})),{code:'INVALID_COMMAND'});
  assert.throws(()=>productCommand(command(-1)),{code:'INVALID_ADMIN_ACTION'});
  assert.deepEqual(revisionDiff({name:'Before',images:[]},{name:'After',images:[]}),[{field:'name',before:'Before',after:'After'}]);
});

test('product moderation PostgreSQL acceptance',{skip:!process.env.ADMIN_PRODUCT_TEST_DATABASE_URL},async t=>{
  const pool=new pg.Pool({connectionString:process.env.ADMIN_PRODUCT_TEST_DATABASE_URL});
  const db=await pool.connect();await db.query('BEGIN');let index=0;
  let pending=Promise.resolve();const query=(...args)=>{const result=pending.then(()=>db.query(...args));pending=result.catch(()=>{});return result;};
  const txPool={query,connect:async()=>{const savepoint=`product_test_${++index}`;return {release(){},query:(sql,args)=>query(sql==='BEGIN'?`SAVEPOINT ${savepoint}`:sql==='COMMIT'?`RELEASE SAVEPOINT ${savepoint}`:sql==='ROLLBACK'?`ROLLBACK TO SAVEPOINT ${savepoint}`:sql,args)};}};
  const stores=new StoreService(txPool,{approvalRequired:false}),catalog=new CatalogService(txPool,stores,{signedUrl:async key=>`https://cdn.example.test/${key}`});
  const mod=new ProductModerationService(stores,catalog),admin=new CatalogAdminService(txPool,catalog),owner={id:randomUUID(),emailVerifiedAt:new Date().toISOString()},staff=actor(),reviewer=actor();
  const store=await stores.create(owner,{name:`Moderation ${randomUUID().slice(0,8)}`,contactEmail:'seller@example.test',contactPhone:'+84901234567',pickupAddress:'123 Test Street'});
  const make=async(name='Test moderation product')=>(await catalog.createProduct(store.id,owner.id,{title:name,brand:'TestBrand',priceMinor:100000,stock:5})).product;
  const version=async id=>Number((await db.query('SELECT admin_version FROM catalog.products WHERE id=$1',[id])).rows[0].admin_version);
  const cmd=async(id,extra={})=>command(await version(id),extra);
  try{
    await t.test('platform block survives seller edits, restoring a draft stays draft, decision + notice atomic and replay safe',async()=>{
      const product=await make(),input=await cmd(product.id,{evidence:['https://example.test/evidence']});
      const result=await mod.command(staff,product.id,input);assert.deepEqual(await mod.command(staff,product.id,input),result);
      assert.equal((await catalog.sellerProduct(product.id,store.id,owner.id)).publicationStatus,'draft');
      await assert.rejects(catalog.setProductStatus(product.id,owner.id,'active'),{code:'PLATFORM_SUSPENDED'});
      await catalog.updateProduct(product.id,owner.id,{title:'Seller changed a blocked product'});
      await assert.rejects(mod.command(staff,product.id,command(result.version,{action:'restore',reasonCode:'REMEDIATED'})),{code:'VERSION_CONFLICT'});
      const before=await mod.read(staff,product.id);assert.equal(before.decisions.length,1);assert.equal(before.notices.length,1);assert.equal(before.changesSinceDecision.some(d=>d.field==='name'),true);
      assert.equal(before.record.platformSuspended,true);assert.equal(before.record.status,'hidden');
      await mod.command(staff,product.id,await cmd(product.id,{action:'restore',reasonCode:'REMEDIATED'}));
      const restored=await catalog.sellerProduct(product.id,store.id,owner.id);assert.equal(restored.status,'draft');assert.equal(restored.platformSuspended,false);
      await assert.rejects(catalog.publicProduct(product.id),{status:404});
    });
    await t.test('content, variants, attributes and images invalidate old reviews; old images remain available',async()=>{
      const product=await make();let stale=await cmd(product.id);
      await catalog.saveVariant(product.id,owner.id,{priceMinor:200000},product.variants[0].id);
      await assert.rejects(mod.command(staff,product.id,stale),{code:'VERSION_CONFLICT'});
      stale=await cmd(product.id);await db.query('INSERT INTO catalog.product_attributes(product_id,attribute_name,option_values) VALUES($1,$2,$3)',[product.id,'Size','["L"]']);
      await assert.rejects(mod.command(staff,product.id,stale),{code:'VERSION_CONFLICT'});
      let removed=0;const media=new MediaService(txPool,catalog,{put:async()=>{},remove:async()=>removed++,signedUrl:async key=>`https://cdn.example.test/${key}`},async()=>{});
      stale=await cmd(product.id);const image=await sharp({create:{width:8,height:8,channels:3,background:'#ff0000'}}).png().toBuffer();
      const upload=await media.upload(product.id,owner.id,image,'image/png');
      await assert.rejects(mod.command(staff,product.id,stale),{code:'VERSION_CONFLICT'});
      stale=await cmd(product.id);await media.remove(product.id,upload.image.id,owner.id);assert.equal(removed,0);
      await assert.rejects(mod.command(staff,product.id,stale),{code:'VERSION_CONFLICT'});
      assert.ok((await mod.read(staff,product.id)).revisions.some(r=>r.snapshot.images.length));
    });
    await t.test('filter shop/category/brand/date/stock and independent seller/moderation states',async()=>{
      const product=await make(),category=(await catalog.createCategory({name:'Moderation category',slug:`moderation-${randomUUID().slice(0,8)}`})).category;
      await catalog.updateProduct(product.id,owner.id,{categoryId:category.id});await mod.command(staff,product.id,await cmd(product.id));
      const result=await admin.products(staff,{storeId:store.id,categoryId:category.id,brand:'TestBrand',stock:'in_stock',moderation:'BLOCKED',publicationStatus:'draft',from:new Date(Date.now()-86400000).toISOString().slice(0,10),to:new Date(Date.now()+86400000).toISOString().slice(0,10)});
      assert.equal(result.total,1);assert.equal(result.items[0].id,product.id);assert.equal(result.items[0].publicationStatus,'draft');
      assert.equal((await admin.products(staff,{storeId:randomUUID()})).total,0);
      assert.equal((await admin.products(staff,{storeId:store.id,stock:'out_of_stock'})).total,0);
      await assert.rejects(admin.products(staff,{stock:'other'}),{code:'INVALID_ADMIN_FILTER'});
      await assert.rejects(mod.read(actor({storeIds:[randomUUID()]}),product.id),{status:403});
    });
    await t.test('product reports link to immutable decisions, unrelated reports rejected, order snapshots unchanged',async()=>{
      const product=await make();await catalog.setProductStatus(product.id,owner.id,'active');
      const buyerId=randomUUID(),snapshot={name:product.name,priceMinor:100000,imageUrl:'https://example.test/original.webp'};
      const quote=(await db.query("INSERT INTO order_service.checkout_quotes(user_id,cart_version,quote_json) VALUES($1,0,'{}') RETURNING id",[buyerId])).rows[0];
      const group=(await db.query('INSERT INTO order_service.order_groups(buyer_id,grand_total_minor) VALUES($1,100000) RETURNING id',[buyerId])).rows[0];
      const order=(await db.query(`INSERT INTO order_service.orders(user_id,store_id,quote_id,group_id,payment_method,subtotal_minor,shipping_estimate_minor,payable_total_minor,shipping_address_json)
        VALUES($1,$2,$3,$4,'COD',100000,0,100000,'{}') RETURNING id`,[buyerId,store.id,quote.id,group.id])).rows[0];
      const item=(await db.query(`INSERT INTO order_service.order_items(order_id,variant_id,product_id,sku,product_name,quantity,unit_price_minor,line_total_minor,reservation_id,product_snapshot_json)
        VALUES($1,$2,$3,$4,$5,1,100000,100000,$6,$7) RETURNING *`,[order.id,product.variants[0].id,product.id,product.variants[0].sku,product.name,randomUUID(),snapshot])).rows[0];
      const buyer={id:randomUUID()},reportInput={reasonCode:'MISLEADING_CONTENT',reason:'Sản phẩm quảng cáo sai thông tin',evidence:[],requestId:randomUUID()};
      const report=await mod.report(buyer,product.id,reportInput);assert.deepEqual(await mod.report(buyer,product.id,reportInput),report);
      await assert.rejects(mod.command(staff,product.id,await cmd(product.id,{reportIds:[randomUUID()]})),{code:'INVALID_REPORT'});
      const result=await mod.command(staff,product.id,await cmd(product.id,{reportIds:[report.id]}));
      const data=await mod.read(staff,product.id);assert.equal(data.reports[0].decision_id,result.decisionId);assert.deepEqual(data.decisions[0].report_ids,[report.id]);
      const revision=data.decisions[0].snapshot;await catalog.updateProduct(product.id,owner.id,{description:'Changed seller description'});
      assert.deepEqual((await mod.read(staff,product.id)).decisions[0].snapshot,revision);
      await catalog.saveVariant(product.id,owner.id,{priceMinor:200000},product.variants[0].id);
      assert.deepEqual((await db.query('SELECT * FROM order_service.order_items WHERE id=$1',[item.id])).rows[0],item);
    });
    await t.test('seller remediation never lifts block; deadlines and submission versions retained',async()=>{
      const product=await make();await mod.command(staff,product.id,await cmd(product.id));
      const decision=await mod.command(staff,product.id,await cmd(product.id,{action:'request_changes',remedyBy:new Date(Date.now()+86400000).toISOString()}));
      await catalog.updateProduct(product.id,owner.id,{description:'Đã sửa mô tả theo chính sách'});
      const submit={action:'submit_remedy',decisionId:decision.decisionId,version:await version(product.id),reason:'Đã cập nhật theo yêu cầu kiểm duyệt',evidence:[],requestId:randomUUID()};
      assert.deepEqual(await mod.sellerCommand(owner,product.id,submit),await mod.sellerCommand(owner,product.id,submit));
      await mod.command(staff,product.id,await cmd(product.id,{action:'confirm_remedy',decisionId:decision.decisionId,reasonCode:'REMEDIATED'}));
      const data=await mod.read(staff,product.id);assert.equal(data.remedies[0].status,'CONFIRMED');assert.equal(data.record.platformSuspended,true);
    });
    await t.test('appeals bind original decision/version, independent reviewer, preserve past violations, no lifting newer blocks',async()=>{
      const product=await make();await catalog.setProductStatus(product.id,owner.id,'active');
      const original=await mod.command(staff,product.id,await cmd(product.id));
      const input={action:'appeal',decisionId:original.decisionId,version:await version(product.id),reason:'Đề nghị xem xét lại bằng chứng này',requestId:randomUUID()};
      const appeal=await mod.sellerCommand(owner,product.id,input);
      assert.deepEqual(await mod.sellerCommand(owner,product.id,input),appeal);
      await assert.rejects(mod.command(staff,product.id,await cmd(product.id,{action:'review_appeal',appealId:appeal.id,outcome:'OVERTURNED',reasonCode:'REMEDIATED'})),{code:'INDEPENDENT_REVIEW_REQUIRED'});
      await mod.command(reviewer,product.id,await cmd(product.id,{action:'restore',reasonCode:'REMEDIATED'}));
      await mod.command(staff,product.id,await cmd(product.id));
      await assert.rejects(mod.command(reviewer,product.id,await cmd(product.id,{action:'review_appeal',appealId:appeal.id,outcome:'OVERTURNED',reasonCode:'REMEDIATED'})),{code:'SUPERSEDED_DECISION'});
      const newer=(await mod.read(staff,product.id)).decisions[0];
      const newerAppeal=await mod.sellerCommand(owner,product.id,{...input,decisionId:newer.id,version:await version(product.id),requestId:randomUUID()});
      await mod.command(reviewer,product.id,await cmd(product.id,{action:'review_appeal',appealId:newerAppeal.id,outcome:'OVERTURNED',reasonCode:'REMEDIATED'}));
      const data=await mod.read(staff,product.id);assert.equal(data.record.platformSuspended,false);assert.equal(data.record.status,'active');assert.ok(data.decisions.some(d=>d.id===original.decisionId));
    });
    await t.test('rule changes versioned and auditable, scoped moderator cannot edit global policy',async()=>{
      const rule={code:'PRODUCT_TEST_RULE',group:'SPAM',label:'Test product rule',description:'A configured rule',enabled:true,version:0,reason:'Cập nhật chính sách kiểm duyệt hàng hóa',requestId:randomUUID()};
      await assert.rejects(mod.saveRule(actor({storeIds:[store.id]}),rule),{status:403});
      const result=await mod.saveRule(staff,rule);assert.equal(result.rule.version,1);assert.deepEqual(await mod.saveRule(staff,rule),result);
      await mod.saveRule(staff,{...rule,version:1,enabled:false,requestId:randomUUID()});
      const product=await make();await assert.rejects(mod.command(staff,product.id,await cmd(product.id,{reasonCode:rule.code})),{code:'RULE_DISABLED'});
      assert.equal((await db.query('SELECT count(*)::int AS total FROM catalog.product_rule_audit WHERE code=$1',[rule.code])).rows[0].total,2);
    });
    await t.test('bulk preview required, limited explicit selection, rechecks per-record scope and version, receipts survive retries',async()=>{
      const one=await make(),two=await make();
      await assert.rejects(mod.preview(staff,{items:Array.from({length:PRODUCT_BULK_LIMIT+1},()=>({id:randomUUID(),version:0})),command:command(0)}),{code:'INVALID_SELECTION'});
      const items=[{id:one.id,version:await version(one.id)},{id:two.id,version:await version(two.id)}];
      const preview=await mod.preview(staff,{items,command:{action:'suspend',reasonCode:'PRODUCT_SPAM',reason:'Hàng loạt kiểm tra spam sản phẩm',evidence:[]}});
      assert.ok(preview.items.every(i=>i.eligible));await catalog.updateProduct(two.id,owner.id,{title:'Seller edits after preview'});
      const job=await mod.createJob(staff,{previewId:preview.id});assert.equal((await mod.createJob(staff,{previewId:preview.id})).id,job.id);
      await assert.rejects(mod.job(reviewer,job.id),{status:404});
      const result=await mod.job(staff,job.id,true);assert.equal(result.status,'COMPLETED');assert.equal(result.items[0].status,'SUCCEEDED');assert.equal(result.items[1].error,'VERSION_CONFLICT');
      assert.deepEqual((await mod.job(staff,job.id,true)).items,result.items);
      const scoped=actor({storeIds:[store.id]}),p=await make(),s=await mod.preview(scoped,{items:[{id:p.id,version:await version(p.id)}],command:{action:'suspend',reasonCode:'PRODUCT_SPAM',reason:'Phạm vi kiểm duyệt sản phẩm',evidence:[]}});
      const scopedJob=await mod.createJob(scoped,{previewId:s.id});const changedScope={...scoped,adminAccess:effectiveAdminAccess([{role:'moderator',scope:{storeIds:[randomUUID()]}}],scoped.id)};
      assert.equal((await mod.job(changedScope,scopedJob.id,true)).items[0].error,'ADMIN_SCOPE_REQUIRED');
    });
    await t.test('signals are advisory and do not write decisions or block products',async()=>{
      const product=await make('Duplicate signal product'),copy=await make('Duplicate signal product');
      const media=new MediaService(txPool,catalog,{put:async()=>{},remove:async()=>{},signedUrl:async key=>`https://cdn.example.test/${key}`},async()=>{});
      const image=await sharp({create:{width:8,height:8,channels:3,background:'#00ff00'}}).png().toBuffer();
      await media.upload(product.id,owner.id,image,'image/png');await media.upload(copy.id,owner.id,image,'image/png');
      await catalog.saveVariant(product.id,owner.id,{priceMinor:300000},product.variants[0].id);
      const signals=await mod.signals(staff,product.id);assert.equal(signals.advisoryOnly,true);assert.equal(signals.duplicates.length,1);assert.equal(signals.reusedImages.length,1);assert.equal(signals.unusualPrice.after,300000);
      assert.equal((await mod.read(staff,product.id)).decisions.length,0);assert.equal((await catalog.sellerProduct(product.id,store.id,owner.id)).platformSuspended,false);
    });
    await t.test('large bulk job persists progress by chunks and resumes with the same decisions',async()=>{
      const products=[];for(let i=0;i<21;i++)products.push(await make(`Chunked product ${i}`));
      const items=[];for(const p of products)items.push({id:p.id,version:await version(p.id)});
      const p=await mod.preview(staff,{items,command:{action:'suspend',reasonCode:'PRODUCT_SPAM',reason:'Kiểm tra sản phẩm spam hàng loạt',evidence:[]}});
      const job=await mod.createJob(staff,{previewId:p.id});let progress=await mod.job(staff,job.id,true);
      assert.equal(progress.status,'RUNNING');assert.equal(progress.items.filter(i=>i.status==='SUCCEEDED').length,20);
      progress=await mod.job(staff,job.id,true);assert.equal(progress.status,'COMPLETED');assert.equal(progress.items.filter(i=>i.status==='SUCCEEDED').length,21);
      for(const product of products)assert.equal((await mod.read(staff,product.id)).decisions.length,1);
    });
    await t.test('optional prepublication review gates new + edited versions, preserves seller intent and platform block, stock alone needs no reapproval',async()=>{
      let policyVersion=Number((await mod.rules(staff)).policy.version);
      await mod.savePolicy(staff,{approvalRequired:true,version:policyVersion,reason:'Bật duyệt trước đăng để kiểm tra nghiệm thu',requestId:randomUUID()});
      try{
        const product=await make('Publication pending product');assert.equal(product.reviewStatus,'PENDING');assert.equal(product.status,'draft');
        const published=(await catalog.setProductStatus(product.id,owner.id,'active')).product;assert.equal(published.status,'hidden');assert.equal(published.publicationStatus,'active');
        await assert.rejects(catalog.publicProduct(product.id),{status:404});assert.equal((await catalog.listProducts({store:store.slug,search:'Publication pending product'})).total,0);
        assert.ok((await admin.products(staff,{moderation:'REVIEW_PENDING'})).items.some(i=>i.id===product.id));
        await mod.command(staff,product.id,await cmd(product.id,{action:'review_publication',outcome:'APPROVED',reasonCode:'REMEDIATED'}));
        let data=(await mod.read(staff,product.id));assert.equal(data.record.status,'active');assert.equal(data.record.approvedContentVersion,data.record.reviewContentVersion);
        const inventory=new InventoryService(txPool,stores);await inventory.adjust(product.variants[0].id,owner.id,{delta:1,reason:'Nhập bổ sung hàng kiểm thử',idempotencyKey:randomUUID()});
        assert.equal((await catalog.sellerProduct(product.id,store.id,owner.id)).reviewStatus,'APPROVED');
        const stale=await cmd(product.id,{action:'review_publication',outcome:'APPROVED',reasonCode:'REMEDIATED'});
        await catalog.updateProduct(product.id,owner.id,{title:'Publication product changed by seller'});
        assert.equal((await catalog.sellerProduct(product.id,store.id,owner.id)).reviewStatus,'PENDING');await assert.rejects(catalog.publicProduct(product.id),{status:404});
        await assert.rejects(mod.command(staff,product.id,stale),{code:'VERSION_CONFLICT'});
        await mod.command(staff,product.id,await cmd(product.id));
        await mod.command(staff,product.id,await cmd(product.id,{action:'review_publication',outcome:'APPROVED',reasonCode:'REMEDIATED'}));
        assert.equal((await catalog.sellerProduct(product.id,store.id,owner.id)).platformSuspended,true);await assert.rejects(catalog.publicProduct(product.id),{status:404});
        await mod.command(staff,product.id,await cmd(product.id,{action:'restore',reasonCode:'REMEDIATED'}));assert.equal((await catalog.publicProduct(product.id)).product.status,'active');
        await catalog.updateProduct(product.id,owner.id,{description:'A second content revision requiring review'});
        await mod.command(staff,product.id,await cmd(product.id,{action:'review_publication',outcome:'NEEDS_CHANGES',remedyBy:new Date(Date.now()+86400000).toISOString()}));
        assert.equal((await catalog.sellerProduct(product.id,store.id,owner.id)).reviewStatus,'NEEDS_CHANGES');
        assert.ok((await mod.read(staff,product.id)).remedies.length);
        const rejected=(await mod.read(staff,product.id)).decisions[0];
        const appeal=await mod.sellerCommand(owner,product.id,{action:'appeal',decisionId:rejected.id,version:await version(product.id),reason:'Đề nghị xét lại yêu cầu chỉnh sửa trước đăng',requestId:randomUUID()});
        await mod.command(reviewer,product.id,await cmd(product.id,{action:'review_appeal',appealId:appeal.id,outcome:'OVERTURNED',reasonCode:'REMEDIATED'}));
        assert.equal((await catalog.sellerProduct(product.id,store.id,owner.id)).reviewStatus,'PENDING');
        assert.equal((await mod.read(staff,product.id)).remedies[0].status,'OVERTURNED');await assert.rejects(catalog.publicProduct(product.id),{status:404});
        const draft=await make('Publication draft remains draft');await mod.command(staff,draft.id,await cmd(draft.id));
        await mod.command(staff,draft.id,await cmd(draft.id,{action:'review_publication',outcome:'APPROVED',reasonCode:'REMEDIATED'}));
        await mod.command(staff,draft.id,await cmd(draft.id,{action:'restore',reasonCode:'REMEDIATED'}));assert.equal((await catalog.sellerProduct(draft.id,store.id,owner.id)).status,'draft');
      }finally{
        policyVersion=Number((await mod.rules(staff)).policy.version);
        await mod.savePolicy(staff,{approvalRequired:false,version:policyVersion,reason:'Trả chính sách về chế độ mặc định sau kiểm thử',requestId:randomUUID()});
      }
    });
    await t.test('HTTP auth, origin, scoped reads, moderation, reports and seller appeals use the new routes',async()=>{
      const originalFetch=globalThis.fetch;let currentActor=staff;
      globalThis.fetch=async(input,options)=>new URL(input).pathname==='/api/v2/auth/me'?Response.json({user:currentActor}):originalFetch(input,options);
      const {createHandler}=await import('../src/server.js');const server=http.createServer(createHandler(stores,catalog));
      await new Promise(done=>server.listen(0,'127.0.0.1',done));const base=`http://127.0.0.1:${server.address().port}/api/v2`;
      const request=(path,method='GET',body,auth=true,origin=process.env.FRONTEND_ORIGIN||'http://localhost:5173')=>originalFetch(base+path,{method,headers:{Origin:origin,'Content-Type':'application/json',...(auth?{Authorization:'Bearer product-test'}:{})},...(body?{body:JSON.stringify(body)}:{})});
      try{
        const product=await make();
        assert.equal((await request('/product-report-reasons','GET',null,false)).status,200);
        assert.equal((await request(`/admin/products/${product.id}/moderation`,'GET',null,false)).status,401);
        assert.equal((await request(`/admin/products/${product.id}/moderation`)).status,200);
        const input=await cmd(product.id);
        assert.equal((await request(`/admin/products/${product.id}/moderation`,'POST',input,true,'https://other.test')).status,403);
        const result=await request(`/admin/products/${product.id}/moderation`,'POST',input);assert.equal(result.status,200);const decision=await result.json();
        currentActor=owner;
        assert.equal((await request(`/seller/products/${product.id}/publish`,'POST',{})).status,409);
        assert.equal((await request(`/seller/products/${product.id}/moderation`)).status,200);
        const appeal={action:'appeal',decisionId:decision.decisionId,version:await version(product.id),reason:'Kháng nghị qua API của người bán',requestId:randomUUID()};
        assert.equal((await request(`/seller/products/${product.id}/moderation`,'POST',appeal)).status,200);
        assert.equal((await request(`/admin/products/${product.id}/moderation`)).status,403);
      }finally{globalThis.fetch=originalFetch;await new Promise(done=>server.close(done));}
    });
    await t.test('concurrent seller publish and suspension serialize; a stale decision conflicts and seller cannot republish after block',async()=>{
      // Release rollback fixtures before independent committed connections touch global catalog versions.
      await db.query('ROLLBACK');await db.query('BEGIN');
      const actualStores=new StoreService(pool,{approvalRequired:false}),actualCatalog=new CatalogService(pool,actualStores),actualMod=new ProductModerationService(actualStores,actualCatalog);
      const raceStore=await actualStores.create(owner,{name:`Race ${randomUUID().slice(0,8)}`,contactEmail:'race@example.test',contactPhone:'+84901234567',pickupAddress:'123 Test Street'});
      let product,preview,job;
      try{
        product=(await actualCatalog.createProduct(raceStore.id,owner.id,{title:'Concurrent publication test',priceMinor:100000,stock:5})).product;
        const results=await Promise.allSettled([actualCatalog.setProductStatus(product.id,owner.id,'active'),actualMod.command(staff,product.id,command(product.version))]);
        if(results[0].status==='rejected')assert.equal(results[0].reason.code,'PLATFORM_SUSPENDED');
        if(results[1].status==='rejected'){
          assert.equal(results[1].reason.code,'VERSION_CONFLICT');
          const fresh=await actualCatalog.sellerProduct(product.id,raceStore.id,owner.id);await actualMod.command(staff,product.id,command(fresh.version));
        }
        const blocked=await actualCatalog.sellerProduct(product.id,raceStore.id,owner.id);assert.equal(blocked.platformSuspended,true);assert.equal(blocked.status,'hidden');
        await assert.rejects(actualCatalog.setProductStatus(product.id,owner.id,'active'),{code:'PLATFORM_SUSPENDED'});
        await assert.rejects(actualCatalog.publicProduct(product.id),{status:404});
        // A worker can lose its checkpoint after the per-product transaction commits.
        preview=await actualMod.preview(staff,{items:[{id:product.id,version:blocked.version}],command:{action:'restore',reasonCode:'REMEDIATED',reason:'Khôi phục sau khi xác minh đầy đủ',evidence:[]}});
        job=await actualMod.createJob(staff,{previewId:preview.id});let failCheckpoint=true;
        const flakyPool={query:(...args)=>pool.query(...args),connect:async()=>{const connection=await pool.connect();return {release:()=>connection.release(),query:(sql,args)=>{
          if(failCheckpoint&&sql.startsWith('UPDATE catalog.product_bulk_jobs')){failCheckpoint=false;throw Error('Simulated job checkpoint loss');}return connection.query(sql,args);
        }};}};
        const flakyMod=new ProductModerationService(new StoreService(flakyPool),actualCatalog);
        await assert.rejects(flakyMod.job(staff,job.id,true),/checkpoint loss/);
        assert.equal((await actualCatalog.sellerProduct(product.id,raceStore.id,owner.id)).platformSuspended,false);
        assert.equal((await actualMod.job(staff,job.id,true)).items[0].status,'SUCCEEDED');
        assert.equal((await actualMod.read(staff,product.id)).decisions.length,2);
      }finally{
        if(job)await pool.query('DELETE FROM catalog.product_bulk_jobs WHERE id=$1',[job.id]);
        if(preview)await pool.query('DELETE FROM catalog.product_bulk_previews WHERE id=$1',[preview.id]);
        await pool.query('DELETE FROM catalog.inventory_movements m USING catalog.product_variants v WHERE m.variant_id=v.id AND v.store_id=$1',[raceStore.id]);
        await pool.query('DELETE FROM catalog.inventory i USING catalog.product_variants v WHERE i.variant_id=v.id AND v.store_id=$1',[raceStore.id]);
        if(product){
          await pool.query('UPDATE catalog.products SET current_product_decision_id=NULL WHERE id=$1',[product.id]);
          await pool.query('DELETE FROM catalog.product_seller_notices WHERE product_id=$1',[product.id]);
          await pool.query('DELETE FROM catalog.product_decisions WHERE product_id=$1',[product.id]);
          await pool.query('DELETE FROM catalog.platform_admin_actions WHERE target_id=$1',[product.id]);
          await pool.query('DELETE FROM catalog.admin_commands WHERE scope=$1',[`product-moderation:${product.id}`]);
        }
        await pool.query('DELETE FROM catalog.store_profile_versions WHERE store_id=$1',[raceStore.id]);
        await pool.query('DELETE FROM catalog.store_audit_logs WHERE store_id=$1',[raceStore.id]);
        await pool.query("DELETE FROM catalog.store_outbox WHERE payload->>'storeId'=$1",[raceStore.id]);
        await pool.query('DELETE FROM catalog.stores WHERE id=$1',[raceStore.id]);
      }
    });
  }finally{await db.query('ROLLBACK');db.release();await pool.end();}
});
