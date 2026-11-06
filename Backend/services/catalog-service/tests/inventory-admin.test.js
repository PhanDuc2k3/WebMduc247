import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import {randomUUID} from 'node:crypto';
import {InventoryAdminService} from '../src/inventory-admin.service.js';
import {effectiveAdminAccess} from '../../../packages/contracts/admin-rbac.js';
const actor=(role,scope={})=>{const id=randomUUID();return {id,adminAccess:effectiveAdminAccess([{role,scope}],id)};};
test('inventory console denies buyer/support before SQL',async()=>{const admin=new InventoryAdminService({query(){throw Error('SQL must not run');}});await assert.rejects(admin.list(actor('customer_support')),{status:403});});
test('inventory console isolates store scope, detects held/expiry issues and preserves reservations',{skip:!process.env.ADMIN_OPERATIONS_TEST_DATABASE_URL},async()=>{
  const url=new URL(process.env.ADMIN_OPERATIONS_TEST_DATABASE_URL);assert.ok(url.pathname.endsWith('_test'));const db=new pg.Client({connectionString:url.href});await db.connect();await db.query('BEGIN');
  try{const store=randomUUID(),product=randomUUID(),variant=randomUUID(),order=randomUUID();
    await db.query("INSERT INTO catalog.stores(id,owner_user_id,slug,name,status) VALUES($1,$2,$3,'Inventory admin fixture','active')",[store,randomUUID(),'inventory-'+store]);
    await db.query("INSERT INTO catalog.products(id,store_id,name,price,price_minor) VALUES($1,$2,'Inventory admin product',100000,100000)",[product,store]);
    await db.query("INSERT INTO catalog.product_variants(id,product_id,store_id,sku,price_minor) VALUES($1,$2,$3,'ADMIN-STOCK',100000)",[variant,product,store]);
    await db.query('INSERT INTO catalog.inventory(variant_id,on_hand,reserved) VALUES($1,10,3)',[variant]);
    await db.query("INSERT INTO catalog.inventory_reservations(variant_id,order_ref,quantity,expires_at,idempotency_key) VALUES($1,$2,2,now()-interval '1 hour',$3)",[variant,order,randomUUID()]);
    const admin=new InventoryAdminService(db),allowed=actor('operations',{storeIds:[store]}),denied=actor('operations',{storeIds:[randomUUID()]});
    assert.equal((await admin.list(allowed,{q:order,attention:'expired'})).total,1);assert.equal((await admin.list(allowed,{attention:'mismatch'})).total,1);assert.equal((await admin.list(denied)).total,0);
    await assert.rejects(admin.detail(denied,variant),{status:404});const detail=await admin.detail(allowed,variant);assert.equal(detail.record.available,7);assert.equal(detail.reservations[0].status,'ACTIVE');assert.equal(detail.reservations[0].quantity,2);
    assert.equal((await db.query('SELECT reserved FROM catalog.inventory WHERE variant_id=$1',[variant])).rows[0].reserved,3);
  }finally{await db.query('ROLLBACK');await db.end();}
});
