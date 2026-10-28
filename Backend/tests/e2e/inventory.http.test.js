import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from 'pg';

const enabled = Boolean(process.env.CATALOG_TEST_DATABASE_URL && process.env.IDENTITY_TEST_API_URL &&
  process.env.CATALOG_TEST_API_URL && process.env.INVENTORY_INTERNAL_TOKEN);
const origin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
const identity = process.env.IDENTITY_TEST_API_URL;
const catalog = process.env.CATALOG_TEST_API_URL;
const internal = process.env.INVENTORY_INTERNAL_TOKEN;
async function call(base, path, method = 'GET', data, headers = {}) {
  const response = await fetch(base + path, { method, headers: {
    ...(data ? { 'Content-Type': 'application/json' } : {}),
    ...(method !== 'GET' && !headers['X-Inventory-Token'] ? { Origin: origin } : {}),
    ...headers,
  }, ...(data ? { body: JSON.stringify(data) } : {}) });
  return { status: response.status, body: await response.json() };
}

test('Inventory HTTP reserves five units under 100 concurrent requests and retries safely', { skip: !enabled }, async () => {
  const pool = new pg.Pool({ connectionString: process.env.CATALOG_TEST_DATABASE_URL });
  const email = `inventory-e2e-${randomUUID()}@example.test`;
  const password = 'test-password-123';
  let userId; let storeId;
  try {
    await pool.query(`UPDATE auth_rate_limits SET window_start=now()-interval '1 hour'
      WHERE bucket IN ('register:ip:127.0.0.1','register:ip:::ffff:127.0.0.1','register:ip:::1',
        'login:ip:127.0.0.1','login:ip:::ffff:127.0.0.1','login:ip:::1')`);
    const registered = await call(identity, '/api/v2/auth/register', 'POST',
      { email, fullName: 'Inventory Owner', password, confirmPassword: password });
    assert.equal(registered.status, 201);
    userId = registered.body.user.id;
    const login = await call(identity, '/api/v2/auth/login', 'POST', { email, password });
    assert.equal(login.status, 200);
    const bearer = { Authorization: `Bearer ${login.body.accessToken}` };
    const auth = { 'X-Inventory-Token': internal };
    const store = await call(catalog, '/api/v2/seller/stores', 'POST',
      { name: 'Inventory HTTP Test', contactEmail: email, contactPhone: '+84901234567',
        pickupAddress: '123 Test Street' }, bearer);
    assert.equal(store.status, 201);
    storeId = store.body.store.id;
    const product = await call(catalog, `/api/v2/seller/stores/${storeId}/products`, 'POST',
      { title: 'Inventory HTTP Product', priceMinor: 100000, stock: 5 }, bearer);
    assert.equal(product.status, 201);
    const productId = product.body.product.id;
    const variantId = product.body.product.variants[0].id;
    assert.equal((await call(catalog, `/api/v2/seller/products/${productId}/publish`, 'POST', {}, bearer)).status, 200);
    assert.equal((await call(catalog, `/api/v2/inventory/variants/${variantId}/availability`)).status, 403);
    const before = await call(catalog, `/api/v2/inventory/variants/${variantId}/availability?quantity=5`, 'GET', undefined, auth);
    assert.equal(before.body.available, 5);
    assert.equal(before.body.canFulfill, true);
    const inputs = Array.from({ length: 100 }, (_, i) => ({
      variantId, orderRef: `http-checkout-${i}`, quantity: 1, idempotencyKey: `http-reserve-${randomUUID()}`, ttlSeconds: 120,
    }));
    const results = await Promise.all(inputs.map(data => call(catalog, '/api/v2/inventory/reservations', 'POST', data, auth)));
    const wins = results.map((result, index) => ({ result, input: inputs[index] })).filter(item => item.result.status === 201);
    assert.equal(wins.length, 5);
    const insufficient = results.filter(result => result.status === 409 && result.body.code === 'INSUFFICIENT_STOCK');
    assert.equal(insufficient.length, 95);
    assert.ok(insufficient.every(result => result.body.available === 0));
    assert.equal((await call(catalog, `/api/v2/inventory/variants/${variantId}/availability`, 'GET', undefined, auth)).body.available, 0);
    const retry = await call(catalog, '/api/v2/inventory/reservations', 'POST', wins[0].input, auth);
    assert.equal(retry.body.reservation.id, wins[0].result.body.reservation.id);
    assert.equal(retry.body.idempotent, true);
    const firstId = wins[0].result.body.reservation.id;
    assert.equal((await call(catalog, `/api/v2/inventory/reservations/${firstId}/commit`, 'POST', {}, auth)).body.reservation.status, 'COMMITTED');
    assert.equal((await call(catalog, `/api/v2/inventory/reservations/${firstId}/commit`, 'POST', {}, auth)).body.idempotent, true);
    const mixedBatch = await call(catalog, '/api/v2/inventory/reservations/commit-batch', 'POST',
      { reservationIds: [firstId, wins[3].result.body.reservation.id] }, auth);
    assert.equal(mixedBatch.status, 409);
    assert.equal((await pool.query('SELECT status FROM catalog.inventory_reservations WHERE id=$1',
      [wins[3].result.body.reservation.id])).rows[0].status, 'ACTIVE');
    assert.equal((await call(catalog, `/api/v2/inventory/reservations/${firstId}/release`, 'POST', {}, auth)).status, 409);
    const secondId = wins[1].result.body.reservation.id;
    assert.equal((await call(catalog, `/api/v2/inventory/reservations/${secondId}/release`, 'POST', {}, auth)).body.reservation.status, 'RELEASED');
    await pool.query("UPDATE catalog.inventory_reservations SET expires_at=now()-interval '1 second' WHERE id=$1", [wins[2].result.body.reservation.id]);
    assert.equal((await call(catalog, '/api/v2/inventory/reconcile', 'POST', {}, auth)).status, 200);
    assert.equal((await call(catalog, `/api/v2/inventory/reservations/${wins[2].result.body.reservation.id}/release`, 'POST', {}, auth)).body.reservation.status, 'EXPIRED');
    for (const item of wins.slice(3)) await call(catalog, `/api/v2/inventory/reservations/${item.result.body.reservation.id}/release`, 'POST', {}, auth);
    const adjusted = await call(catalog, `/api/v2/seller/variants/${variantId}/inventory-adjustments`, 'POST',
      { delta: -2, reason: 'Physical count' }, bearer);
    assert.equal(adjusted.status, 200);
    assert.equal(adjusted.body.onHand, 2);
    const history = await call(catalog, `/api/v2/seller/variants/${variantId}/inventory`, 'GET', undefined, bearer);
    assert.ok(history.body.movements.some(item => item.reason === 'Physical count' && item.actorId === userId));
  } finally {
    if (storeId) {
      await pool.query(`DELETE FROM catalog.inventory_reservations r USING catalog.product_variants v
        WHERE r.variant_id=v.id AND v.store_id=$1`, [storeId]);
      await pool.query(`DELETE FROM catalog.inventory_movements m USING catalog.product_variants v
        WHERE m.variant_id=v.id AND v.store_id=$1`, [storeId]);
      await pool.query(`DELETE FROM catalog.inventory i USING catalog.product_variants v
        WHERE i.variant_id=v.id AND v.store_id=$1`, [storeId]);
      await pool.query('DELETE FROM catalog.store_audit_logs WHERE store_id=$1', [storeId]);
      await pool.query(`DELETE FROM catalog.store_outbox WHERE payload->>'storeId'=$1::text
        OR payload->>'variantId' IN (SELECT id::text FROM catalog.product_variants WHERE store_id=$1::uuid)`, [storeId]);
      await pool.query('DELETE FROM catalog.store_profile_versions WHERE store_id=$1',[storeId]);
      await pool.query('DELETE FROM catalog.stores WHERE id=$1', [storeId]);
    }
    if (userId) await pool.query('DELETE FROM users WHERE id=$1', [userId]);
    await pool.end();
  }
});
