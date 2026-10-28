import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { StoreService } from '../src/store.service.js';
import { CatalogService } from '../src/catalog.service.js';
import { InventoryService } from '../src/inventory.service.js';

test('100 concurrent reserves never confirm more than SKU stock five', { skip: !process.env.CATALOG_TEST_DATABASE_URL }, async () => {
  const pool = new pg.Pool({ connectionString: process.env.CATALOG_TEST_DATABASE_URL, max: 25 });
  const stores = new StoreService(pool);
  const catalog = new CatalogService(pool, stores);
  const inventory = new InventoryService(pool, stores);
  const owner = { id: randomUUID(), email: 'inventory-owner@example.test', emailVerifiedAt: new Date().toISOString() };
  let store;
  try {
    store = await stores.create(owner, { name: `Inventory Test ${randomUUID().slice(0, 8)}`,
      contactEmail: owner.email, contactPhone: '+84901234567', pickupAddress: '123 Test Street' });
    const created = await catalog.createProduct(store.id, owner.id, { title: 'Inventory Product', priceMinor: 100000, stock: 5 });
    const variantId = created.product.variants[0].id;
    await catalog.setProductStatus(created.product.id, owner.id, 'active');
    const attempts = await Promise.allSettled(Array.from({ length: 100 }, (_, index) => inventory.reserve({
      variantId, orderRef: `checkout-${index}`, quantity: 1, idempotencyKey: `reserve-${randomUUID()}`, ttlSeconds: 120,
    })));
    const winners = attempts.filter(item => item.status === 'fulfilled').map(item => item.value.reservation);
    assert.equal(winners.length, 5);
    assert.equal(attempts.filter(item => item.status === 'rejected').length, 95);
    assert.equal((await inventory.availability(variantId)).available, 0);
    assert.equal((await catalog.publicProduct(created.product.id)).product.variants[0].stock, 0);
    assert.equal((await catalog.listProducts({ store: store.slug, inStock: 'true' })).total, 0);
    assert.equal((await stores.publicBySlug(store.slug)).productCount, 0);
    await assert.rejects(inventory.adjust(variantId, owner.id, { delta: -1, reason: 'Stock count correction' }), { code: 'STOCK_BELOW_RESERVED' });
    const committed = await inventory.commit(winners[0].id);
    assert.equal(committed.reservation.status, 'COMMITTED');
    assert.equal((await inventory.commit(winners[0].id)).idempotent, true);
    await assert.rejects(inventory.release(winners[0].id), { code: 'INVALID_RESERVATION_STATE' });
    assert.equal((await inventory.availability(variantId)).onHand, 4);
    assert.equal((await inventory.availability(variantId)).reserved, 4);
    const released = await inventory.release(winners[1].id);
    assert.equal(released.reservation.status, 'RELEASED');
    assert.equal((await catalog.listProducts({ store: store.slug, inStock: 'true' })).total, 1);
    assert.equal((await stores.publicBySlug(store.slug)).productCount, 1);
    assert.equal((await inventory.release(winners[1].id)).idempotent, true);
    await assert.rejects(inventory.commit(winners[1].id), { code: 'INVALID_RESERVATION_STATE' });
    const retry = await inventory.reserve({ variantId, orderRef: 'checkout-0', quantity: 1,
      idempotencyKey: 'test-idempotency-' + winners[0].id, ttlSeconds: 120 });
    const retryAgain = await inventory.reserve({ variantId, orderRef: 'checkout-0', quantity: 1,
      idempotencyKey: 'test-idempotency-' + winners[0].id, ttlSeconds: 120 });
    assert.equal(retryAgain.reservation.id, retry.reservation.id);
    assert.equal(retryAgain.idempotent, true);
    await assert.rejects(inventory.reserve({ variantId, orderRef: 'other-order', quantity: 1,
      idempotencyKey: 'test-idempotency-' + winners[0].id }), { code: 'IDEMPOTENCY_CONFLICT' });
    await pool.query(`UPDATE catalog.inventory_reservations SET expires_at=now()-interval '1 second'
      WHERE id=$1`, [retry.reservation.id]);
    const sweep = await inventory.reconcile();
    assert.ok(sweep.expired >= 1);
    assert.equal((await inventory.release(retry.reservation.id)).reservation.status, 'EXPIRED');
    const expiredRetry = await inventory.reserve({ variantId, orderRef: 'checkout-0', quantity: 1,
      idempotencyKey: 'test-idempotency-' + winners[0].id, ttlSeconds: 120 });
    assert.equal(expiredRetry.reservation.id, retry.reservation.id);
    assert.equal(expiredRetry.reservation.status, 'EXPIRED');
    assert.equal((await inventory.reconcile()).expired, 0);
    for (const item of winners.slice(2)) await inventory.release(item.id);
    await pool.query('UPDATE catalog.inventory SET reserved=1 WHERE variant_id=$1', [variantId]);
    const repair = await inventory.reconcile();
    assert.ok(repair.repaired >= 1);
    assert.equal((await inventory.availability(variantId)).reserved, 0);
    const adjusted = await inventory.adjust(variantId, owner.id, { delta: -2, reason: 'Physical count', reference: 'count-1' });
    assert.equal(adjusted.onHand, 2);
    const history = await inventory.sellerInventory(variantId, owner.id);
    assert.ok(history.movements.some(item => item.reason === 'Physical count' && item.actorId === owner.id));
    assert.ok(history.movements.some(item => item.reason === 'invalid_release_after_committed'));
    const firstHistoryPage = await inventory.sellerInventory(variantId, owner.id, { page: 1, limit: 2 });
    const secondHistoryPage = await inventory.sellerInventory(variantId, owner.id, { page: 2, limit: 2 });
    assert.equal(firstHistoryPage.movements.length, 2);
    assert.equal(secondHistoryPage.movements.length, 2);
    assert.notEqual(firstHistoryPage.movements[0].id, secondHistoryPage.movements[0].id);
    await assert.rejects(inventory.sellerInventory(variantId, randomUUID()), { status: 403 });
    assert.equal((await inventory.availability(variantId, 3)).canFulfill, false);
    const extraIds = [];
    for (let index = 0; index < 2; index++) {
      const added = await catalog.saveVariant(created.product.id, owner.id, {
        sku: `EXPIRE-${index}-${randomUUID().slice(0, 8)}`, priceMinor: 100000, stock: 1,
      });
      const newId = added.product.variants.find(item => item.sku.startsWith(`EXPIRE-${index}`)).id;
      extraIds.push(newId);
      const held = await inventory.reserve({ variantId: newId, orderRef: `expiry-${index}`, quantity: 1,
        idempotencyKey: `expiry-${randomUUID()}`, ttlSeconds: 30 });
      await pool.query("UPDATE catalog.inventory_reservations SET expires_at=now()-interval '1 second' WHERE id=$1", [held.reservation.id]);
    }
    assert.equal((await inventory.reconcile(1)).expired, 1);
    assert.equal((await inventory.reconcile(1)).expired, 1);
    for (const extraId of extraIds) assert.equal((await inventory.availability(extraId)).available, 1);
    await stores.settings(store.id, owner.id, { acceptingOrders: false });
    assert.equal((await inventory.availability(variantId)).sellable, false);
    await assert.rejects(inventory.reserve({ variantId, orderRef: 'paused-order', quantity: 1,
      idempotencyKey: 'paused-' + randomUUID() }), { code: 'SKU_NOT_SELLABLE' });
    await stores.settings(store.id, owner.id, { acceptingOrders: true });
    await catalog.saveVariant(created.product.id, owner.id, { status: 'inactive' }, variantId);
    await assert.rejects(inventory.reserve({ variantId, orderRef: 'inactive-sku-order', quantity: 1,
      idempotencyKey: 'inactive-' + randomUUID() }), { code: 'SKU_NOT_SELLABLE' });
  } finally {
    if (store) {
      await pool.query(`DELETE FROM catalog.inventory_reservations r USING catalog.product_variants v
        WHERE r.variant_id=v.id AND v.store_id=$1`, [store.id]);
      await pool.query(`DELETE FROM catalog.inventory_movements m USING catalog.product_variants v
        WHERE m.variant_id=v.id AND v.store_id=$1`, [store.id]);
      await pool.query(`DELETE FROM catalog.inventory i USING catalog.product_variants v
        WHERE i.variant_id=v.id AND v.store_id=$1`, [store.id]);
      await pool.query('DELETE FROM catalog.store_audit_logs WHERE store_id=$1', [store.id]);
      await pool.query("DELETE FROM catalog.store_outbox WHERE payload->>'storeId'=$1::text OR payload->>'variantId' IN (SELECT id::text FROM catalog.product_variants WHERE store_id=$1::uuid)", [store.id]);
      await pool.query('DELETE FROM catalog.store_profile_versions WHERE store_id=$1',[store.id]);
      await pool.query('DELETE FROM catalog.stores WHERE id=$1', [store.id]);
    }
    await pool.end();
  }
});
