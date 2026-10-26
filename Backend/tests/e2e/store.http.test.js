import test from 'node:test';
import assert from 'node:assert/strict';
import { createDecipheriv, randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import pg from 'pg';
import sharp from 'sharp';

const enabled = Boolean(process.env.CATALOG_TEST_DATABASE_URL && process.env.IDENTITY_TEST_DATABASE_URL && process.env.IDENTITY_MAIL_KEY && process.env.IDENTITY_TEST_API_URL && process.env.CATALOG_TEST_API_URL && process.env.CATALOG_SYNC_SECRET);
const origin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
const identity = process.env.IDENTITY_TEST_API_URL;
const catalog = process.env.CATALOG_TEST_API_URL;

async function call(base, path, method = 'GET', body, bearer) {
  const response = await fetch(base + path, {
    method,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(method !== 'GET' ? { Origin: origin } : {}), ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: response.status, data: await response.json() };
}

test('HTTP store and catalog flow across identity, seller and public APIs', { skip: !enabled }, async () => {
  const pool = new pg.Pool({ connectionString: process.env.CATALOG_TEST_DATABASE_URL });
  const identityPool = new pg.Pool({ connectionString: process.env.IDENTITY_TEST_DATABASE_URL });
  const password = 'test-password-123';
  const email = `store-e2e-${randomUUID()}@example.test`;
  const strangerEmail = `store-outsider-${randomUUID()}@example.test`;
  let userId; let strangerId; let storeId; let categoryId;
  try {
    const verify = async address => {
      const { rows } = await identityPool.query("SELECT nonce,ciphertext,tag FROM identity_email_outbox WHERE recipient=$1 AND purpose='verify_email' ORDER BY id DESC LIMIT 1", [address]);
      assert.equal(rows.length, 1);
      const decipher = createDecipheriv('aes-256-gcm', Buffer.from(process.env.IDENTITY_MAIL_KEY, 'base64'), rows[0].nonce);
      decipher.setAuthTag(rows[0].tag);
      const linkToken = Buffer.concat([decipher.update(rows[0].ciphertext), decipher.final()]).toString('utf8');
      assert.equal((await call(identity, '/api/v2/auth/verify-email', 'POST', { email: address, token: linkToken })).status, 200);
    };
    const register = await call(identity, '/api/v2/auth/register', 'POST', { email, fullName: 'Store Owner', password, confirmPassword: password });
    assert.equal(register.status, 201);
    userId = register.data.user.id;
    const outsider = await call(identity, '/api/v2/auth/register', 'POST', { email: strangerEmail, fullName: 'Store Outsider', password, confirmPassword: password });
    assert.equal(outsider.status, 201);
    strangerId = outsider.data.user.id;
    assert.equal((await call(identity, '/api/v2/auth/login', 'POST', { email, password })).status, 401);
    await verify(email);
    await verify(strangerEmail);
    const login = await call(identity, '/api/v2/auth/login', 'POST', { email, password });
    const outsiderLogin = await call(identity, '/api/v2/auth/login', 'POST', { email: strangerEmail, password });
    assert.equal(login.status, 200); assert.equal(outsiderLogin.status, 200);
    const token = login.data.accessToken;
    const otherToken = outsiderLogin.data.accessToken;
    assert.equal((await call(catalog, '/api/v2/seller/stores', 'POST', { name: 'Unauthorized Shop' })).status, 401);
    const created = await call(catalog, '/api/v2/seller/stores', 'POST', { name: 'Test Shop', contactEmail: email, contactPhone: '+84901234567', pickupAddress: '123 Test Street' }, token);
    assert.equal(created.status, 201, JSON.stringify(created.data));
    storeId = created.data.store.id;
    const slug = created.data.store.slug;
    const publicProfile = await call(catalog, `/api/v2/stores/${slug}`);
    assert.equal(publicProfile.status, 200);
    assert.equal('pickupAddress' in publicProfile.data.store, false);
    assert.equal((await call(catalog, `/api/v2/seller/stores/${storeId}`, 'GET', undefined, otherToken)).status, 403);
    assert.equal((await call(catalog, `/api/v2/seller/stores/${storeId}/settings`, 'PATCH', { acceptingOrders: false }, otherToken)).status, 403);
    const categoryResponse = await fetch(`${catalog}/api/v2/internal/categories`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Catalog-Secret': process.env.CATALOG_SYNC_SECRET },
      body: JSON.stringify({ name: 'Test Category', slug: `test-${randomUUID().slice(0, 8)}` }),
    });
    assert.equal(categoryResponse.status, 201);
    categoryId = (await categoryResponse.json()).category.id;
    assert.ok((await call(catalog, '/api/v2/categories')).data.categories.some(item => item.id === categoryId));
    const invite = await call(catalog, `/api/v2/seller/stores/${storeId}/invitations`, 'POST', { email: strangerEmail }, token);
    assert.equal(invite.status, 201);
    assert.equal((await call(catalog, '/api/v2/seller/invitations/accept', 'POST', { token: invite.data.token }, otherToken)).status, 200);
    assert.equal((await call(catalog, `/api/v2/seller/stores/${storeId}`, 'GET', undefined, otherToken)).status, 200);
    assert.equal((await call(catalog, `/api/v2/seller/stores/${storeId}/settings`, 'PATCH', { acceptingOrders: false }, otherToken)).status, 403);
    assert.equal((await call(catalog, `/api/v2/seller/stores/${storeId}/members/${strangerId}`, 'DELETE', undefined, token)).status, 200);
    assert.equal((await call(catalog, `/api/v2/seller/stores/${storeId}`, 'GET', undefined, otherToken)).status, 403);
    const product = await call(catalog, `/api/v2/seller/stores/${storeId}/products`, 'POST', { title: 'Test Product', priceMinor: 100, stock: 2, categoryId }, token);
    assert.equal(product.status, 201);
    assert.equal((await call(catalog, `/api/v2/stores/${slug}/products`)).data.products.length, 0);
    assert.equal((await call(catalog, '/api/v2/products?search=Test%20Product')).data.total, 0);
    assert.equal((await call(catalog, '/api/v2/products?sort=unknown')).status, 400);
    const second = await call(catalog, `/api/v2/seller/products/${product.data.product.id}/variants`, 'POST',
      { sku: `SECOND-${randomUUID().slice(0, 8)}`, attributes: { size: 'L' }, priceMinor: 200, salePriceMinor: 150, stock: 3 }, token);
    assert.equal(second.status, 201);
    assert.equal(second.data.product.variants.find(item => item.priceOriginalMinor === 200).priceMinor, 150);
    const png = await sharp({ create: { width: 24, height: 24, channels: 3, background: '#476de4' } }).png().toBuffer();
    const imageResponse = await fetch(`${catalog}/api/v2/seller/products/${product.data.product.id}/images`, {
      method: 'POST', headers: { Origin: origin, Authorization: `Bearer ${token}`, 'Content-Type': 'image/png' }, body: png,
    });
    assert.equal(imageResponse.status, 201);
    const uploaded = await imageResponse.json();
    await call(catalog, `/api/v2/seller/products/${product.data.product.id}/publish`, 'POST', {}, token);
    assert.equal((await call(catalog, `/api/v2/stores/${slug}/products`)).data.products.length, 1);
    assert.equal((await call(catalog, '/api/v2/products?search=test%20product&inStock=true')).data.total, 1);
    assert.equal((await call(catalog, `/api/v2/products?category=${(await pool.query('SELECT slug FROM catalog.categories WHERE id=$1', [categoryId])).rows[0].slug}`)).data.total, 1);
    assert.equal((await call(catalog, '/api/v2/products?minRating=4')).data.total, 0);
    assert.equal((await call(catalog, '/api/v2/search?q=Test%20Product')).data.products.length, 1);
    assert.ok((await call(catalog, '/api/v2/home')).data.featuredProducts.some(item => item.id === product.data.product.id));
    const detail = await call(catalog, `/api/v2/products/${product.data.product.id}`);
    assert.equal(detail.status, 200);
    assert.equal(detail.data.product.currency, 'VND');
    assert.ok(detail.data.product.variants.some(item => item.stock === 2));
    assert.ok(detail.data.product.variants.some(item => item.stock === 3));
    assert.equal(detail.data.product.images.length, 1);
    assert.equal((await call(catalog, `/api/v2/seller/products/${product.data.product.id}/images/${uploaded.image.id}`, 'DELETE', undefined, token)).status, 200);
    await call(catalog, `/api/v2/seller/products/${product.data.product.id}/status`, 'PATCH', { status: 'hidden' }, token);
    assert.equal((await call(catalog, `/api/v2/stores/${slug}/products`)).data.products.length, 0);
    const paused = await call(catalog, `/api/v2/seller/stores/${storeId}/settings`, 'PATCH', { acceptingOrders: false }, token);
    assert.equal(paused.status, 200);
    assert.equal((await call(catalog, `/api/v2/stores/by-id/${storeId}/checkout-policy`)).data.acceptingOrders, false);
    assert.equal((await call(catalog, `/api/v2/stores/${slug}`)).status, 404);
    for (let attempt = 0; attempt < 15; attempt++) {
      const me = await call(identity, '/api/v2/auth/me', 'GET', undefined, token);
      if (me.data.user.roles.includes('seller')) break;
      await delay(1000);
    }
    const me = await call(identity, '/api/v2/auth/me', 'GET', undefined, token);
    assert.ok(me.data.user.roles.includes('seller'));
  } finally {
    if (storeId) {
      await pool.query(`DELETE FROM catalog.inventory_reservations r USING catalog.product_variants v
        WHERE r.variant_id=v.id AND v.store_id=$1`, [storeId]);
      await pool.query(`DELETE FROM catalog.inventory_movements m USING catalog.product_variants v
        WHERE m.variant_id=v.id AND v.store_id=$1`, [storeId]);
      await pool.query(`DELETE FROM catalog.inventory i USING catalog.product_variants v
        WHERE i.variant_id=v.id AND v.store_id=$1`, [storeId]);
      await pool.query('DELETE FROM catalog.store_audit_logs WHERE store_id=$1', [storeId]);
      await pool.query("DELETE FROM catalog.store_outbox WHERE payload->>'storeId'=$1", [storeId]);
      await pool.query('DELETE FROM catalog.stores WHERE id=$1', [storeId]);
    }
    if (categoryId) await pool.query('DELETE FROM catalog.categories WHERE id=$1', [categoryId]);
    if (userId) await pool.query('DELETE FROM users WHERE id=$1', [userId]);
    if (strangerId) await pool.query('DELETE FROM users WHERE id=$1', [strangerId]);
    await pool.end();
    await identityPool.end();
  }
});
