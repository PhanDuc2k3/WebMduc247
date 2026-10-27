import {testAdmin,syncTestAdmin} from '../../order-service/tests/admin-fixture.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import pg from 'pg';
import argon2 from 'argon2';
import {IdentityRepository} from '../src/models/identity.model.js';
import {IdentityService} from '../src/services/identity.service.js';
import {IdentityAdminService} from '../src/services/platform-admin.service.js';
import {CatalogAdminService} from '../../catalog-service/src/platform-admin.service.js';
import {CatalogService} from '../../catalog-service/src/catalog.service.js';
import {StoreService} from '../../catalog-service/src/store.service.js';
import {OrderAdminService} from '../../order-service/src/platform-admin.service.js';
import {OrderLifecycle} from '../../order-service/src/lifecycle.service.js';
import {AdminOrderObligations} from '../../order-service/src/admin-order-obligations.service.js';
import {adminAction,adminQuery,adminMoney} from '../../../packages/contracts/platform-admin.js';

test('admin query/action schemas reject injection fields, invalid pagination and unsafe actions',()=>{
  for(const query of [{page:0},{limit:51},{status:'anything'},{q:'x\0'},{userId:'forged'},{page:1.5}])
    assert.throws(()=>adminQuery(query),{code:'INVALID_ADMIN_FILTER'});
  assert.equal(adminQuery({q:'50%_off'}).pattern,'%50\\%\\_off%');
  for(const input of [{requestId:randomUUID(),action:'delete',version:0,reason:'valid reason'}, {requestId:randomUUID(),action:'suspend',version:-1,reason:'valid reason'},
    {requestId:randomUUID(),action:'suspend',version:0,reason:'short'},{requestId:randomUUID(),action:'suspend',version:0,reason:'valid reason',role:'platform_admin'}])
    assert.throws(()=>adminAction(input),{code:'INVALID_ADMIN_ACTION'});
  assert.throws(()=>adminAction({action:'suspend',version:0,reason:'valid reason'}),{code:'INVALID_REQUEST_ID'});
  assert.equal(adminMoney('100000'),100000);assert.equal(adminMoney(0),0);
  for(const value of [null,undefined,'',1.5,-1,'1.5','9007199254740993',Infinity,NaN])
    assert.throws(()=>adminMoney(value),{code:'INVALID_SOURCE_AMOUNT'});
});

test('PostgreSQL admin management preserves permissions, moderation holds, audit and order snapshots',
  {skip:!process.env.ADMIN_TEST_DATABASE_URL},async t=>{
    const url=new URL(process.env.ADMIN_TEST_DATABASE_URL);
    if(!url.pathname.endsWith('_test'))throw Error('ADMIN_TEST_DATABASE_URL must target a dedicated *_test database');
    const pool=new pg.Pool({connectionString:url.href});const repo=new IdentityRepository(url.href);
    const identityAdmin=new IdentityAdminService(repo),stores=new StoreService(pool),catalog=new CatalogService(pool,stores);
    const catalogAdmin=new CatalogAdminService(pool,catalog),orderAdmin=new OrderAdminService(pool);
    const [adminId,buyerId,pendingId,otherAdminId,storeId,productId,variantId,quoteId,groupId,orderId]=Array.from({length:10},()=>randomUUID());
    const actor=testAdmin(adminId),buyer={id:buyerId,roles:['buyer','seller']};
    const email=`${buyerId}@example.test`,password='Admin-integration-test!';
    const config={jwtSecret:'integration-admin-secret-over-thirty-two-characters',issuer:'identity-service',audience:'backend-v2',refreshDays:30,
      loginLimit:5,emailVerificationRequired:true,mailKey:Buffer.alloc(32)};
    const identity=new IdentityService({repository:repo,mailer:{},config});const context={ip:'127.0.0.9',userAgent:'admin-integration'};
    const userIds=[adminId,buyerId,pendingId,otherAdminId];
    try {
      const hash=await argon2.hash(password);
      for(const id of userIds){
        await pool.query(`INSERT INTO users(id,email,full_name,password_hash,status,email_verified_at) VALUES($1,$2,$3,$4,$5,$6)`,
          [id,id===buyerId?email:`${id}@example.test`,'Admin integration '+id.slice(0,8),hash,id===pendingId?'pending_verification':'active',id===pendingId?null:new Date()]);
        await pool.query('INSERT INTO user_roles(user_id,role) VALUES($1,$2)',[id,[adminId,otherAdminId].includes(id)?'platform_admin':'buyer']);
      }
      for(const id of [adminId,otherAdminId])await pool.query("INSERT INTO admin_role_assignments(user_id,role) VALUES($1,'legacy_admin')",[id]);
      await pool.query(`INSERT INTO catalog.stores(id,owner_user_id,slug,name,status) VALUES($1,$2,$3,$4,'active')`,[storeId,buyerId,`admin-test-${storeId}`,`Admin test store ${storeId}`]);
      await pool.query('INSERT INTO catalog.store_settings(store_id,accepting_orders) VALUES($1,true)',[storeId]);
      await pool.query("INSERT INTO catalog.store_addresses(store_id,pickup_address,return_address) VALUES($1,'Test pickup address','Test return address')",[storeId]);
      await pool.query("INSERT INTO catalog.store_members(store_id,user_id,role,status) VALUES($1,$2,'owner','active')",[storeId,buyerId]);
      await pool.query(`INSERT INTO catalog.products(id,store_id,name,slug,price,price_minor,stock,status)
        VALUES($1,$2,$3,$4,100000,100000,5,'active')`,[productId,storeId,`Admin test product ${productId}`,`admin-test-${productId}`]);
      await pool.query(`INSERT INTO catalog.product_variants(id,product_id,store_id,sku,price_minor,stock,status)
        VALUES($1,$2,$3,$4,100000,5,'active')`,[variantId,productId,storeId,`ADMIN-${variantId}`]);
      await pool.query(`INSERT INTO order_service.checkout_quotes(id,user_id,cart_version,quote_json) VALUES($1,$2,0,'{}')`,[quoteId,buyerId]);
      await pool.query(`INSERT INTO order_service.order_groups(id,buyer_id,grand_total_minor,current_total_minor) VALUES($1,$2,100000,100000)`,[groupId,buyerId]);
      await pool.query(`INSERT INTO order_service.orders(id,user_id,store_id,quote_id,group_id,status,payment_method,subtotal_minor,
        shipping_estimate_minor,payable_total_minor,shipping_address_json,store_snapshot_json)
        VALUES($1,$2,$3,$4,$5,'PLACED','COD',100000,0,100000,$6,$7)`,
        [orderId,buyerId,storeId,quoteId,groupId,{receiverName:'Test Receiver',phone:'0912345678',province:'Hà Nội',ward:'Test ward'}, {name:'Admin test store'}]);
      await pool.query(`INSERT INTO order_service.order_items(order_id,variant_id,product_id,sku,product_name,quantity,unit_price_minor,line_total_minor,reservation_id)
        VALUES($1,$2,$3,'ADMIN-TEST','Admin test product',1,100000,100000,$4)`,[orderId,variantId,productId,randomUUID()]);

      await t.test('all lists/details/actions reject non-admin actors before SQL access',async()=>{
        for(const action of [()=>identityAdmin.list(buyer,{}),()=>identityAdmin.detail(buyer,buyerId),()=>identityAdmin.moderate(buyer,pendingId,{}),
          ()=>identityAdmin.audit(buyer,{}),()=>catalogAdmin.stores(buyer,{}),()=>catalogAdmin.products(buyer,{}),
          ()=>catalogAdmin.detail(buyer,'products',productId),()=>catalogAdmin.moderate(buyer,'stores',storeId,{}),()=>catalogAdmin.audit(buyer,{}),
          ()=>orderAdmin.list(buyer,{}),()=>orderAdmin.detail(buyer,orderId)])await assert.rejects(action(),{status:403});
      });
      await t.test('account suspension revokes active access and refresh, restoration preserves verification',async()=>{
        const login=await identity.login({email,password},context);
        await identityAdmin.moderate(actor,buyerId,{requestId:randomUUID(),action:'suspend',reason:'Integration account suspension',version:0});
        await assert.rejects(identity.me('Bearer '+login.accessToken),{status:401});
        await assert.rejects(identity.refresh(login.refreshToken,context),{status:401});
        await assert.rejects(identityAdmin.moderate(actor,buyerId,{requestId:randomUUID(),action:'restore',reason:'Stale request must fail',version:0}),{code:'VERSION_CONFLICT'});
        await identityAdmin.moderate(actor,buyerId,{requestId:randomUUID(),action:'restore',reason:'Integration restore account',version:1});
        await identityAdmin.moderate(actor,pendingId,{requestId:randomUUID(),action:'suspend',reason:'Integration pending account',version:0});
        const restored=await identityAdmin.moderate(actor,pendingId,{requestId:randomUUID(),action:'restore',reason:'Keep email verification required',version:1});
        assert.equal(restored.status,'pending_verification');
        await assert.rejects(identityAdmin.moderate(actor,adminId,{requestId:randomUUID(),action:'suspend',reason:'Self lock forbidden',version:0}),{code:'ADMIN_PROTECTED'});
        await assert.rejects(identityAdmin.moderate(actor,otherAdminId,{requestId:randomUUID(),action:'suspend',reason:'Admin lock forbidden',version:0}),{code:'ADMIN_PROTECTED'});
        const detail=await identityAdmin.detail(actor,buyerId);assert.equal(detail.history.length,2);assert.equal(detail.record.password_hash,undefined);
      });
      await t.test('audit failure rolls account state and session revocation back atomically',async()=>{
        const login=await identity.login({email,password},context);
        const failing=new IdentityAdminService({pool:repo.pool,transaction:fn=>repo.transaction(db=>fn({query:(sql,args)=>{
          if(sql.includes('INSERT INTO platform_admin_actions'))throw Error('Simulated audit failure');return db.query(sql,args);
        }}))});
        await assert.rejects(failing.moderate(actor,buyerId,{requestId:randomUUID(),action:'suspend',reason:'This action must roll back',version:2}),/Simulated audit failure/);
        assert.equal((await identityAdmin.detail(actor,buyerId)).record.version,2);
        assert.equal((await identity.me('Bearer '+login.accessToken)).user.id,buyerId);
        await identity.logout('Bearer '+login.accessToken,false,context);
      });
      await t.test('product moderation hides public data and rejects seller publication or stale restoration',async()=>{
        assert.equal((await catalog.publicProduct(productId)).product.id,productId);
        await catalogAdmin.moderate(actor,'products',productId,{requestId:randomUUID(),action:'suspend',reason:'Integration hide product',version:0});
        await assert.rejects(catalog.publicProduct(productId),{status:404});
        await assert.rejects(catalog.setProductStatus(productId,buyerId,'active'),{code:'PLATFORM_SUSPENDED'});
        await assert.rejects(catalogAdmin.moderate(actor,'products',productId,{requestId:randomUUID(),action:'restore',reason:'Stale restore must fail',version:0}),{code:'VERSION_CONFLICT'});
        await catalogAdmin.moderate(actor,'products',productId,{requestId:randomUUID(),action:'restore',reason:'Integration restore product',version:1});
        assert.equal((await catalog.publicProduct(productId)).product.priceMinor,100000);
        assert.equal((await catalogAdmin.detail(actor,'products',productId)).history.length,2);
      });
      await t.test('store moderation cannot be undone by owner; restore respects owner pause preference',async()=>{
        await catalogAdmin.moderate(actor,'stores',storeId,{requestId:randomUUID(),action:'suspend',reason:'Integration stop store',version:0});
        await assert.rejects(catalog.publicProduct(productId),{status:404});
        await assert.rejects(stores.settings(storeId,buyerId,{acceptingOrders:true}),{code:'PLATFORM_SUSPENDED'});
        // The original accepting preference was true. An owner can still choose to stop accepting orders during a hold.
        await stores.settings(storeId,buyerId,{acceptingOrders:false});
        const restored=await catalogAdmin.moderate(actor,'stores',storeId,{requestId:randomUUID(),action:'restore',reason:'Integration restore store',version:1});
        assert.equal(restored.status,'paused');
        await assert.rejects(catalog.publicProduct(productId),{status:404});
        await stores.settings(storeId,buyerId,{acceptingOrders:true});
        assert.equal((await catalog.publicProduct(productId)).product.id,productId);
      });
      await t.test('search, pagination, audit filters and order snapshots return real bounded data',async()=>{
        const users=await identityAdmin.list(actor,{q:email,limit:1});assert.equal(users.total,1);assert.equal(users.items[0].id,buyerId);
        assert.equal((await identityAdmin.list(actor,{q:"%' OR 1=1 --"})).total,0);
        const products=await catalogAdmin.products(actor,{q:productId,limit:1});assert.equal(products.items[0].id,productId);
        const orders=await orderAdmin.list(actor,{q:orderId});assert.equal(orders.total,1);
        const detail=await orderAdmin.detail(actor,orderId);assert.equal(detail.record.items[0].lineTotalMinor,100000);
        assert.equal(detail.record.paymentStatus,'UNPAID');assert.doesNotMatch(JSON.stringify(detail),/0912345678/);
        const audit=await catalogAdmin.audit(actor,{kind:'product',q:productId});assert.equal(audit.total,2);
      });
      await t.test('CORE-001 current role revocation applies to an existing signed-in session',async()=>{
        const login=await identity.login({email:`${otherAdminId}@example.test`,password},context);
        const bearer='Bearer '+login.accessToken;
        assert.equal((await identity.me(bearer)).user.roles.includes('platform_admin'),true);
        await pool.query("DELETE FROM user_roles WHERE user_id=$1 AND role='platform_admin'",[otherAdminId]);
        try {
          const current=(await identity.me(bearer)).user;
          await assert.rejects(identityAdmin.list(current,{}),{status:403});
          await assert.rejects(catalogAdmin.stores(current,{}),{status:403});
          await assert.rejects(orderAdmin.list(current,{}),{status:403});
        }finally{await pool.query("INSERT INTO user_roles(user_id,role) VALUES($1,'platform_admin')",[otherAdminId]);}
      });
      await t.test('CORE-003/004/007 simultaneous retries produce one state change, audit and receipt',async()=>{
        const before=(await identityAdmin.detail(actor,buyerId)).record;
        const input={requestId:randomUUID(),action:'suspend',reason:'Core duplicate account suspension',version:before.version};
        const [first,second]=await Promise.all([identityAdmin.moderate(actor,buyerId,input),identityAdmin.moderate(actor,buyerId,input)]);
        assert.deepEqual(first,second);assert.equal(first.correlationId,input.requestId);
        assert.equal((await identityAdmin.detail(actor,buyerId)).record.version,before.version+1);
        const audit=(await pool.query('SELECT * FROM platform_admin_actions WHERE correlation_id=$1',[input.requestId])).rows;
        assert.equal(audit.length,1);assert.equal(Number(audit[0].read_version),before.version);
        assert.equal(Number(audit[0].result_version),before.version+1);assert.equal(audit[0].next_status,'suspended');
        await assert.rejects(identityAdmin.moderate(actor,buyerId,{...input,reason:'Reused key with other reason'}),{code:'IDEMPOTENCY_CONFLICT'});
        await identityAdmin.moderate(actor,buyerId,{requestId:randomUUID(),action:'restore',reason:'Core test restore account',version:before.version+1});
      });
      await t.test('CORE-004 two admins using one read version cannot both moderate the same product',async()=>{
        const before=(await catalogAdmin.detail(actor,'products',productId)).record;
        const other=testAdmin(otherAdminId);
        const inputs=[actor,other].map(()=>({requestId:randomUUID(),action:'suspend',reason:'Core competing moderation',version:before.version}));
        const results=await Promise.allSettled([catalogAdmin.moderate(actor,'products',productId,inputs[0]),catalogAdmin.moderate(other,'products',productId,inputs[1])]);
        assert.equal(results.filter(result=>result.status==='fulfilled').length,1);
        assert.equal(results.find(result=>result.status==='rejected').reason.code,'VERSION_CONFLICT');
        const win=results.findIndex(result=>result.status==='fulfilled');
        assert.deepEqual(await catalogAdmin.moderate(win===0?actor:other,'products',productId,inputs[win]),results[win].value);
        const outbox=(await pool.query("SELECT payload FROM catalog.store_outbox WHERE payload->>'correlationId'=$1",[inputs[win].requestId])).rows;
        assert.equal(outbox.length,1);assert.equal(outbox[0].payload.platformSuspended,true);
        await catalogAdmin.moderate(actor,'products',productId,{requestId:randomUUID(),action:'restore',reason:'Restore after concurrency test',version:before.version+1});
      });
      await t.test('CORE-005 catalog audit failure rolls back state, outbox and command receipt',async()=>{
        const before=(await catalogAdmin.detail(actor,'stores',storeId)).record;
        const input={requestId:randomUUID(),action:'suspend',reason:'Catalog audit must be atomic',version:before.version};
        const broken=new CatalogAdminService(pool,catalog);
        broken.transaction=fn=>catalogAdmin.transaction(db=>fn({query:(sql,args)=>{
          if(sql.includes('INSERT INTO catalog.platform_admin_actions'))throw Error('Catalog audit unavailable');return db.query(sql,args);
        }}));
        await assert.rejects(broken.moderate(actor,'stores',storeId,input),/Catalog audit unavailable/);
        assert.equal((await catalogAdmin.detail(actor,'stores',storeId)).record.version,before.version);
        assert.equal((await pool.query('SELECT 1 FROM catalog.admin_commands WHERE request_id=$1',[input.requestId])).rowCount,0);
        assert.equal((await pool.query("SELECT 1 FROM catalog.store_outbox WHERE payload->>'correlationId'=$1",[input.requestId])).rowCount,0);
      });
      await t.test('CORE-011/014 monetary units stay integer VND and personal data is masked at the API boundary',async()=>{
        const detail=await identityAdmin.detail(actor,buyerId),list=await identityAdmin.list(actor,{q:email});
        for(const data of [detail,list,await identityAdmin.audit(actor,{q:buyerId})])assert.equal(JSON.stringify(data).includes(email),false);
        assert.match(detail.record.email,/\*\*\*/);assert.match(detail.record.fullName,/\*\*\*/);
        const order=await orderAdmin.detail(actor,orderId);
        assert.equal(order.record.totalMinor,100000);assert.equal(order.record.items[0].lineTotalMinor,100000);
        assert.equal(JSON.stringify(order).includes('Test Receiver'),false);
        const summary=await orderAdmin.summary(actor);
        assert.ok(summary.trend.every(row=>/^\d{4}-\d{2}-\d{2}$/.test(row.date)));
        await pool.query('UPDATE catalog.store_settings SET contact_info=$2 WHERE store_id=$1',[storeId,{email:'private-contact@example.test',phone:'0912345678'}]);
        const shop=await catalogAdmin.detail(actor,'stores',storeId);
        assert.equal(JSON.stringify(shop).includes('private-contact@example.test'),false);
      });
      await t.test('CORE-003/009 audit keeps a stable actor reference after reviewed Identity erasure',async()=>{
        const before=(await identityAdmin.detail(actor,pendingId)).record;
        await identityAdmin.moderate(testAdmin(otherAdminId),pendingId,{requestId:randomUUID(),version:before.version,action:'suspend',reason:'Actor trace must survive account erasure'});
        await pool.query('DELETE FROM users WHERE id=$1',[otherAdminId]);
        const detail=await identityAdmin.detail(actor,pendingId);
        assert.equal(detail.history[0].actor_id,otherAdminId);assert.equal(detail.history[0].actor_name,null);
        const audit=await identityAdmin.audit(actor,{q:pendingId});assert.ok(audit.items.some(row=>row.actor_id===otherAdminId));
      });
      await t.test('CORE-006/008/013 blocked seller cancellation keeps a retryable intent and delegates refunds to Payment',async()=>{
        let restockFails=true,restockCalls=0;
        const order={pool,adminActor:async id=>id===actor.id?syncTestAdmin(pool,actor):{id,status:(await identityAdmin.detail(actor,id)).record.status},transaction:fn=>repo.transaction(fn),promotion:async()=>({}),
          identity:async path=>path.startsWith('/admin/users/')?identityAdmin.detail(actor,path.split('/').at(-1)):{user:actor},
          inventory:async(path,method,input)=>{
            if(path.endsWith('/aftersales-status')){
              const row=(await catalogAdmin.detail(actor,'stores',storeId)).record;
              return {ownerId:buyerId,memberIds:[buyerId],platformSuspended:row.suspended};
            }
            assert.equal(path,'/restock-batch');assert.equal(input.cancellationKey,'cancel:'+orderId);
            restockCalls++;if(restockFails)throw Error('Inventory temporarily unavailable');return {};
          }};
        const lifecycle=new OrderLifecycle(order),obligations=new AdminOrderObligations(lifecycle);
        const input={requestId:randomUUID(),version:1,reason:'Seller is blocked and cannot fulfill the existing order'};
        await assert.rejects(obligations.cancel(buyer,orderId,input,'Bearer test'),{status:403});
        await assert.rejects(obligations.cancel(actor,orderId,input,'Bearer test'),{code:'ADMIN_PERMISSION_REQUIRED'});
        await pool.query("INSERT INTO order_service.case_permissions(user_id,permission,granted_by,reason) VALUES($1,'orders.cancel_blocked','core-test','Core blocked seller obligations test')",[actor.id]);await syncTestAdmin(pool,actor);
        await assert.rejects(obligations.cancel(actor,orderId,input,'Bearer test'),{code:'SELLER_NOT_BLOCKED'});
        let shop=(await catalogAdmin.detail(actor,'stores',storeId)).record;
        await catalogAdmin.moderate(actor,'stores',storeId,{requestId:randomUUID(),version:shop.version,action:'suspend',reason:'Suspend store for obligations test'});
        await assert.rejects(obligations.cancel(actor,orderId,{...input,version:99,requestId:randomUUID()},'Bearer test'),{code:'VERSION_CONFLICT'});
        await pool.query("UPDATE order_service.orders SET status='SHIPPING' WHERE id=$1",[orderId]);
        await assert.rejects(obligations.cancel(actor,orderId,input,'Bearer test'),{code:'INVALID_TRANSITION'});
        await pool.query("UPDATE order_service.orders SET status='PLACED' WHERE id=$1",[orderId]);
        await pool.query("UPDATE order_service.orders SET payment_method='MOMO',payment_status='PAID' WHERE id=$1",[orderId]);
        await pool.query("UPDATE order_service.order_groups SET payment_method='MOMO',payment_status='PAID' WHERE id=$1",[groupId]);
        const brokenOrder={...order,transaction:fn=>repo.transaction(db=>fn({query:(sql,args)=>{
          if(sql.includes('INSERT INTO order_service.order_status_history'))throw Error('Cancellation audit unavailable');return db.query(sql,args);
        }}))};
        await assert.rejects(new AdminOrderObligations(new OrderLifecycle(brokenOrder)).cancel(actor,orderId,input,'Bearer test'),/Cancellation audit unavailable/);
        assert.equal((await orderAdmin.detail(actor,orderId)).record.status,'PLACED');
        // The same recovery path also works for a suspended owner while the shop itself remains active.
        shop=(await catalogAdmin.detail(actor,'stores',storeId)).record;
        await catalogAdmin.moderate(actor,'stores',storeId,{requestId:randomUUID(),version:shop.version,action:'restore',reason:'Keep shop state independent from owner account'});
        const owner=(await identityAdmin.detail(actor,buyerId)).record;
        await identityAdmin.moderate(actor,buyerId,{requestId:randomUUID(),version:owner.version,action:'suspend',reason:'Suspend sole owner for obligations test'});
        process.env.INVENTORY_INTERNAL_TOKEN||='test-only-inventory-token';
        const {createHandler}=await import('../../order-service/src/server.js');
        const http=await import('node:http'),server=http.createServer(createHandler(order,lifecycle));
        await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
        const endpoint=`http://127.0.0.1:${server.address().port}/api/v2/admin/orders/${orderId}/cancel-blocked-seller`;
        const headers={Authorization:'Bearer test','Content-Type':'application/json',Origin:process.env.FRONTEND_ORIGIN||'http://localhost:5173'};
        try{
          const first=await fetch(endpoint,{method:'POST',headers,body:JSON.stringify(input)});assert.equal(first.status,500);
          assert.equal((await orderAdmin.detail(actor,orderId)).record.status,'CANCEL_PENDING');
          restockFails=false;
          const second=await fetch(endpoint,{method:'POST',headers,body:JSON.stringify(input)});assert.equal(second.status,200);
          const result=await second.json();assert.equal(result.status,'CANCELLED');assert.equal(result.correlationId,input.requestId);
          assert.doesNotMatch(JSON.stringify(result),/Test Receiver|0912345678|address/);
          await obligations.cancel(actor,orderId,input,'Bearer test');
          await assert.rejects(obligations.cancel(actor,orderId,{...input,reason:'Changed reason with same key'},'Bearer test'),{code:'IDEMPOTENCY_CONFLICT'});
          const record=(await orderAdmin.detail(actor,orderId)).record;
          assert.equal(record.paymentStatus,'PAID');assert.equal(record.refundedMinor,0);assert.equal(restockCalls,2);
          const events=(await pool.query("SELECT payload FROM order_service.order_outbox WHERE aggregate_id=$1 AND event_type='OrderCancelled.v1'",[orderId])).rows;
          assert.equal(events.length,1);assert.equal(events[0].payload.refundRequired,true);
          assert.equal(events[0].payload.correlationId,'admin:'+input.requestId);
          const audit=(await pool.query("SELECT * FROM order_service.order_status_history WHERE shop_order_id=$1 AND actor_type='platform_admin'",[orderId])).rows;
          assert.equal(audit.length,1);assert.equal(audit[0].read_version,1);assert.equal(audit[0].result_version,2);
          assert.equal((await identityAdmin.detail(actor,buyerId)).record.status,'suspended');
          assert.equal((await catalogAdmin.detail(actor,'stores',storeId)).record.suspended,false);
          await pool.query("UPDATE order_service.case_permissions SET revoked_at=now() WHERE user_id=$1 AND permission='orders.cancel_blocked'",[actor.id]);await syncTestAdmin(pool,actor);
          await assert.rejects(obligations.cancel(actor,orderId,input,'Bearer test'),{code:'ADMIN_PERMISSION_REQUIRED'});
        }finally{await new Promise(resolve=>server.close(resolve));}
      });
    }finally{
      await pool.query('DELETE FROM admin_commands WHERE actor_id=ANY($1::uuid[])',[userIds]);
      await pool.query('DELETE FROM catalog.admin_commands WHERE actor_id=ANY($1::uuid[])',[userIds]);
      await pool.query('DELETE FROM order_service.case_permissions WHERE user_id=ANY($1::uuid[])',[userIds]);
      await pool.query('DELETE FROM order_service.order_commands WHERE shop_order_id=$1',[orderId]);
      await pool.query('DELETE FROM order_service.order_outbox WHERE aggregate_id=$1',[orderId]);
      await pool.query('DELETE FROM order_service.order_status_history WHERE shop_order_id=$1',[orderId]);
      await pool.query('DELETE FROM order_service.order_items WHERE order_id=$1',[orderId]);
      await pool.query('DELETE FROM order_service.orders WHERE id=$1',[orderId]);
      await pool.query('DELETE FROM order_service.order_groups WHERE id=$1',[groupId]);
      await pool.query('DELETE FROM order_service.checkout_quotes WHERE id=$1',[quoteId]);
      await pool.query('DELETE FROM catalog.store_outbox WHERE payload->>\'storeId\'=$1 OR payload->>\'productId\'=$2',[storeId,productId]);
      await pool.query('DELETE FROM catalog.platform_admin_actions WHERE target_id=ANY($1::uuid[])',[[storeId,productId]]);
      await pool.query('DELETE FROM catalog.store_audit_logs WHERE store_id=$1',[storeId]);
      await pool.query('DELETE FROM catalog.stores WHERE id=$1',[storeId]);
      await pool.query('DELETE FROM platform_admin_actions WHERE target_id=ANY($1::uuid[])',[userIds]);
      await pool.query('DELETE FROM users WHERE id=ANY($1::uuid[])',[userIds]);
      await pool.end();await repo.close();
    }
  });
