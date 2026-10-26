import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import sharp from 'sharp';
import { StoreService } from '../src/store.service.js';
import { CatalogService } from '../src/catalog.service.js';
import { MediaService } from '../src/media.service.js';

test('catalog categories, variants, prices, media and public visibility', { skip: !process.env.CATALOG_TEST_DATABASE_URL }, async () => {
  const pool = new pg.Pool({ connectionString: process.env.CATALOG_TEST_DATABASE_URL });
  const stores = new StoreService(pool);
  const objects = new Map();
  const storage = { put: async (key, data) => objects.set(key, data), remove: async key => objects.delete(key),
    signedUrl: async key => `https://cdn.example.test/${key}` };
  const catalog = new CatalogService(pool, stores, storage);
  const media = new MediaService(pool, catalog, storage, async () => {});
  const owner = { id: randomUUID(), email: 'owner@example.test', emailVerifiedAt: new Date().toISOString() };
  const outsider = randomUUID();
  let store; let root; let child; let banner;
  try {
    store = await stores.create(owner, { name: `Shop Test ${randomUUID().slice(0, 8)}`, contactEmail: owner.email,
      contactPhone: '+84901234567', pickupAddress: '123 Test Street' });
    root = (await catalog.createCategory({ name: 'Thời trang', slug: `fashion-${randomUUID().slice(0, 8)}` })).category;
    child = (await catalog.createCategory({ name: 'Áo thể thao', slug: `sportswear-${randomUUID().slice(0, 8)}`, parentId: root.id })).category;
    await assert.rejects(catalog.updateCategory(root.id, { parentId: child.id }), { code: 'CATEGORY_CYCLE' });
    assert.equal((await catalog.categories()).categories.some(item => item.id === root.id && item.children.some(sub => sub.id === child.id)), true);
    await assert.rejects(catalog.createProduct(store.id, outsider, { title: 'Áo thể thao', priceMinor: 100000 }), { status: 403 });
    await assert.rejects(catalog.createProduct(store.id, owner.id, { title: 'Áo thể thao', variants: [{ sku: 'TEST-A', priceMinor: 100000, salePriceMinor: 120000 }] }), { code: 'INVALID_SALE_PRICE' });
    const created = await catalog.createProduct(store.id, owner.id, { title: 'Áo thể thao', brand: 'Ánh Dương', categoryId: child.id,
      attributes: { Màu: ['Đỏ', 'Xanh'] },
      variants: [
        { sku: `RED-${randomUUID().slice(0, 8)}`, attributes: { Màu: 'Đỏ' }, priceMinor: 100000, salePriceMinor: 80000, stock: 5 },
        { sku: `BLUE-${randomUUID().slice(0, 8)}`, attributes: { Màu: 'Xanh' }, priceMinor: 120000, stock: 0 },
      ] });
    const id = created.product.id;
    const red = created.product.variants.find(item => item.priceOriginalMinor === 100000);
    const blue = created.product.variants.find(item => item.priceOriginalMinor === 120000);
    assert.equal(created.product.status, 'draft');
    assert.equal(red.priceMinor, 80000);
    assert.equal(blue.stock, 0);
    await assert.rejects(catalog.saveVariant(id, owner.id, { sku: red.sku, priceMinor: 90000, stock: 1 }), { code: 'SKU_TAKEN' });
    const futureSku = `FUTURE-${randomUUID().slice(0, 8)}`;
    const future = await catalog.saveVariant(id, owner.id, { sku: futureSku, priceMinor: 90000, salePriceMinor: 50000,
      saleStartsAt: new Date(Date.now() + 86_400_000).toISOString(), saleEndsAt: new Date(Date.now() + 172_800_000).toISOString(), stock: 1 });
    assert.equal(future.product.variants.find(item => item.sku === futureSku.toUpperCase()).priceMinor, 90000);
    assert.equal((await catalog.listProducts({ search: 'ao the thao', store: store.slug })).total, 0);
    await catalog.setProductStatus(id, owner.id, 'active');
    assert.equal((await catalog.publicProduct(id)).product.priceOriginalMinor, 100000);
    banner = (await catalog.createBanner({ title: 'Test Banner', imageKey: 'banners/test.webp', targetUrl: '/products' })).banner;
    const home = await catalog.home();
    assert.ok(home.featuredProducts.some(item => item.id === id));
    assert.ok(home.featuredStores.some(item => item.id === store.id));
    assert.ok(home.banners.some(item => item.id === banner.id));
    const visible = await catalog.listProducts({ search: 'ao the thao', category: root.slug, store: store.slug, sort: 'price_asc' });
    assert.equal(visible.total, 1);
    assert.equal(visible.products[0].priceMinor, 80000);
    assert.equal(visible.products[0].priceOriginalMinor, 100000);
    await catalog.updateCategory(root.id, { isActive: false });
    assert.equal((await catalog.listProducts({ store: store.slug })).total, 0);
    await assert.rejects(catalog.publicProduct(id), { status: 404 });
    await catalog.updateCategory(root.id, { isActive: true });
    assert.equal((await catalog.listProducts({ store: store.slug, minPrice: '80001' })).total, 0);
    assert.equal((await catalog.listProducts({ store: store.slug, sale: 'true', inStock: 'true' })).total, 1);
    await assert.rejects(catalog.listProducts({ sort: 'random' }), { code: 'INVALID_FILTER' });
    const image = await sharp({ create: { width: 30, height: 30, channels: 3, background: '#ff0000' } }).png().toBuffer();
    await assert.rejects(media.upload(id, owner.id, image, 'image/jpeg'), { status: 415 });
    const uploaded = await media.upload(id, owner.id, image, 'image/png', { variantId: red.id, isPrimary: true });
    assert.equal(uploaded.image.isPrimary, true);
    assert.equal((await catalog.publicProduct(id)).product.images[0].variantId, red.id);
    await assert.rejects(media.remove(id, uploaded.image.id, outsider), { status: 403 });
    const duplicate = await catalog.duplicateProduct(id, owner.id);
    assert.equal(duplicate.product.status, 'draft');
    assert.equal(duplicate.product.variants.length, 3);
    await catalog.setProductStatus(duplicate.product.id, owner.id, 'active');
    const firstPage = await catalog.listProducts({ store: store.slug, page: 1, limit: 1, sort: 'newest' });
    const secondPage = await catalog.listProducts({ store: store.slug, page: 2, limit: 1, sort: 'newest' });
    assert.equal(firstPage.total, 2);
    assert.equal(secondPage.total, 2);
    assert.notEqual(firstPage.products[0].id, secondPage.products[0].id);
    await catalog.setProductStatus(duplicate.product.id, owner.id, 'hidden');
    await catalog.setProductStatus(id, owner.id, 'hidden');
    assert.equal((await catalog.listProducts({ search: 'ao the thao', store: store.slug })).total, 0);
    await catalog.setProductStatus(id, owner.id, 'active');
    await stores.settings(store.id, owner.id, { acceptingOrders: false });
    assert.equal((await catalog.listProducts({ search: 'ao the thao', store: store.slug })).total, 0);
  } finally {
    if (banner) await pool.query('DELETE FROM catalog.catalog_banners WHERE id=$1', [banner.id]);
    if (store) {
      await pool.query(`DELETE FROM catalog.inventory_reservations r USING catalog.product_variants v
        WHERE r.variant_id=v.id AND v.store_id=$1`, [store.id]);
      await pool.query(`DELETE FROM catalog.inventory_movements m USING catalog.product_variants v
        WHERE m.variant_id=v.id AND v.store_id=$1`, [store.id]);
      await pool.query(`DELETE FROM catalog.inventory i USING catalog.product_variants v
        WHERE i.variant_id=v.id AND v.store_id=$1`, [store.id]);
      await pool.query('DELETE FROM catalog.store_audit_logs WHERE store_id=$1', [store.id]);
      await pool.query("DELETE FROM catalog.store_outbox WHERE payload->>'storeId'=$1", [store.id]);
      await pool.query('DELETE FROM catalog.stores WHERE id=$1', [store.id]);
    }
    if (child) await pool.query('DELETE FROM catalog.categories WHERE id=$1', [child.id]);
    if (root) await pool.query('DELETE FROM catalog.categories WHERE id=$1', [root.id]);
    await pool.end();
  }
});
