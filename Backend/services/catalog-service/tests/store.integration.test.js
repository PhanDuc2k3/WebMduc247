import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { StoreService } from '../src/store.service.js';
import { CatalogService } from '../src/catalog.service.js';
import { IdentityRepository } from '../../identity-service/src/models/identity.model.js';

test('store onboarding, slug rules, membership and pause policy', { skip: !process.env.CATALOG_TEST_DATABASE_URL }, async () => {
  const pool = new pg.Pool({ connectionString: process.env.CATALOG_TEST_DATABASE_URL });
  const service = new StoreService(pool);
  const catalog = new CatalogService(pool, service);
  const owner = { id: randomUUID(), email: 'owner@example.test', emailVerifiedAt: new Date().toISOString() };
  const staff = { id: randomUUID(), email: 'staff@example.test' };
  const outsider = randomUUID();
  const name = `Cửa hàng Test ${randomUUID().slice(0, 8)}`;
  let store; let secondStore;
  try {
    await assert.rejects(service.create({ ...owner, emailVerifiedAt: null }, { name, contactEmail: owner.email, contactPhone: '+84901234567', pickupAddress: '123 Test Street' }), { status: 403, code: 'EMAIL_VERIFICATION_REQUIRED' });
    store = await service.create(owner, { name, description: 'Test', contactEmail: owner.email, contactPhone: '+84901234567', pickupAddress: '123 Test Street' });
    assert.match(store.slug, /^[a-z0-9-]+$/);
    assert.equal(store.status, 'active');
    secondStore = await service.create(owner, { name, contactEmail: owner.email, contactPhone: '+84901234567', pickupAddress: '123 Test Street' });
    assert.notEqual(secondStore.slug, store.slug);
    await service.settings(secondStore.id, owner.id, { acceptingOrders: false });
    await assert.rejects(service.create(owner, { name: 'Other Store', slug: store.slug, contactEmail: owner.email, contactPhone: '+84901234567', pickupAddress: '123 Test Street' }), { status: 409, code: 'SLUG_TAKEN' });
    await assert.rejects(service.create(owner, { name: 'Other Store', slug: 'Bad Slug', contactEmail: owner.email, contactPhone: '+84901234567', pickupAddress: '123 Test Street' }), { status: 400, code: 'INVALID_SLUG' });
    await assert.rejects(service.manage(store.id, outsider), { status: 403 });
    await assert.rejects(service.settings(store.id, outsider, { acceptingOrders: false }), { status: 403 });
    await assert.rejects(service.update(store.id, owner.id, { slug: 'changed' }), { status: 400 });
    const updated = await service.update(store.id, owner.id, { description: 'Updated public description' });
    assert.equal(updated.description, 'Updated public description');
    await assert.rejects(catalog.createProduct(store.id, outsider, { title: 'Test Product', priceMinor: 100, stock: 2 }), { status: 403 });
    const draft = await catalog.createProduct(store.id, owner.id, { title: 'Test Product', priceMinor: 100, stock: 2 });
    assert.equal((await catalog.listProducts({ store: store.slug })).total, 0);
    assert.equal((await service.publicBySlug(store.slug)).productCount, 0);
    await catalog.setProductStatus(draft.product.id, owner.id, 'active');
    assert.equal((await catalog.listProducts({ store: store.slug })).total, 1);
    assert.equal((await service.publicBySlug(store.slug)).productCount, 1);
    await catalog.setProductStatus(draft.product.id, owner.id, 'hidden');
    assert.equal((await catalog.listProducts({ store: store.slug })).total, 0);
    const invite = await service.invite(store.id, owner.id, { email: staff.email });
    assert.equal((await service.acceptInvite(staff, { token: invite.token })).role, 'staff');
    await assert.rejects(service.settings(store.id, staff.id, { acceptingOrders: false }), { status: 403, code: 'OWNER_REQUIRED' });
    await assert.rejects(service.removeMember(store.id, staff.id, staff.id), { status: 403 });
    assert.equal((await service.members(store.id, staff.id)).members.length, 2);
    await service.removeMember(store.id, owner.id, staff.id);
    await assert.rejects(service.manage(store.id, staff.id), { status: 403 });
    await service.settings(store.id, owner.id, { acceptingOrders: false });
    assert.equal((await service.manage(store.id, owner.id)).status, 'paused');
    assert.equal((await service.checkoutPolicy(store.id)).acceptingOrders, false);
    const events = await pool.query("SELECT event_type FROM catalog.store_outbox WHERE payload->>'storeId'=$1", [store.id]);
    assert.ok(events.rows.some(event => event.event_type === 'StoreCreated.v1'));
    assert.ok(events.rows.some(event => event.event_type === 'StoreStatusChanged.v1'));
    await assert.rejects(service.publicBySlug(store.slug), { status: 404 });
    assert.equal((await service.list({ search: name })).total, 0);
    await service.settings(store.id, owner.id, { acceptingOrders: true });
    assert.equal((await service.checkoutPolicy(store.id)).acceptingOrders, true);
    assert.equal((await service.publicBySlug(store.slug)).id, store.id);
    assert.equal((await service.list({ search: name })).total, 1);
    assert.equal((await service.list({ search: 'cua hang test' })).total, 1);
    assert.equal((await service.overview(store.id, owner.id)).metrics.sourceStatus, 'orders_unavailable');
  } finally {
    for (const item of [store, secondStore].filter(Boolean)) {
      await pool.query(`DELETE FROM catalog.inventory_reservations r USING catalog.product_variants v
        WHERE r.variant_id=v.id AND v.store_id=$1`, [item.id]);
      await pool.query(`DELETE FROM catalog.inventory_movements m USING catalog.product_variants v
        WHERE m.variant_id=v.id AND v.store_id=$1`, [item.id]);
      await pool.query(`DELETE FROM catalog.inventory i USING catalog.product_variants v
        WHERE i.variant_id=v.id AND v.store_id=$1`, [item.id]);
      await pool.query('DELETE FROM catalog.store_audit_logs WHERE store_id=$1', [item.id]);
      await pool.query("DELETE FROM catalog.store_outbox WHERE payload->>'storeId'=$1", [item.id]);
      await pool.query('DELETE FROM catalog.stores WHERE id=$1', [item.id]);
    }
    await pool.end();
  }
});

test('identity seller projection follows active store membership', { skip: !process.env.CATALOG_TEST_DATABASE_URL }, async () => {
  const repo = new IdentityRepository(process.env.CATALOG_TEST_DATABASE_URL);
  const userId = randomUUID();
  const storeId = randomUUID();
  try {
    await repo.pool.query("INSERT INTO users(id,email,full_name,password_hash,status) VALUES ($1,$2,'Test Seller','test','active')", [userId, `seller-${userId}@example.test`]);
    assert.equal(await repo.syncStoreMembership(userId, storeId, true), true);
    assert.equal(await repo.sellerMember(userId, storeId), true);
    assert.equal(await repo.syncStoreMembership(userId, storeId, false), true);
    assert.equal(await repo.sellerMember(userId, storeId), false);
  } finally {
    await repo.pool.query('DELETE FROM users WHERE id=$1', [userId]);
    await repo.close();
  }
});
