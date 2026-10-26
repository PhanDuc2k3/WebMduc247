import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { ProductSearchService, parseProductSearchQuery } from '../src/product-search.service.js';

test('search query validation and normalization', () => {
  assert.equal(parseProductSearchQuery({ q: '  A\u0301o   thun  ' }).search, 'Áo thun');
  assert.equal(parseProductSearchQuery({}).search, '');
  assert.throws(() => parseProductSearchQuery({ q: '' }, true), { code: 'INVALID_SEARCH_QUERY' });
  assert.throws(() => parseProductSearchQuery({ q: 'a' }, true), { code: 'INVALID_SEARCH_QUERY' });
  assert.throws(() => parseProductSearchQuery({ q: 'x'.repeat(101) }, true), { code: 'INVALID_SEARCH_QUERY' });
  assert.throws(() => parseProductSearchQuery({ q: 'ab\u0000' }, true), { code: 'INVALID_SEARCH_QUERY' });
  assert.throws(() => parseProductSearchQuery({ q: 'abc', page: '0' }, true), { code: 'INVALID_FILTER' });
  assert.throws(() => parseProductSearchQuery({ q: 'abc', limit: '51' }, true), { code: 'INVALID_FILTER' });
  assert.throws(() => parseProductSearchQuery({ q: 'abc', sort: 'DROP TABLE' }, true), { code: 'INVALID_FILTER' });
  assert.throws(() => parseProductSearchQuery({ q: 'abc', categoryId: 'bad' }, true), { code: 'INVALID_FILTER' });
});

test('PostgreSQL search matches, ranks, filters and paginates visible products',
  { skip: !process.env.CATALOG_TEST_DATABASE_URL }, async () => {
    const pool = new pg.Pool({ connectionString: process.env.CATALOG_TEST_DATABASE_URL });
    const client = await pool.connect();
    const search = new ProductSearchService(client, async () => null);
    const storeId = randomUUID(), otherStoreId = randomUUID();
    const electronics = randomUUID(), fashion = randomUUID();
    const tag = randomUUID().slice(0, 8);
    const records = [
      { title: `Qzeta ${tag} iPhone 15`, price: 500000, stock: 5, category: electronics },
      { title: `Qzeta ${tag} iPhone 16`, price: 600000, stock: 4, category: electronics },
      { title: `Qzeta ${tag} Samsung Galaxy`, price: 450000, stock: 2, category: electronics },
      { title: `Áo thun Qzeta ${tag}`, price: 120000, stock: 8, category: fashion },
      { title: `Qzeta ${tag} Super Capacitor`, price: 300000, stock: 0, category: electronics,
        description: 'Supercapacitor resilient circuitry.' },
      { title: `Qzeta ${tag} Hidden`, price: 100000, stock: 3, category: electronics, status: 'hidden' },
    ];
    try {
      await client.query('BEGIN');
      for (const id of [storeId, otherStoreId]) {
        await client.query('INSERT INTO catalog.stores(id,owner_user_id,slug,name) VALUES ($1,$2,$3,$4)',
          [id, randomUUID(), `search-${id.slice(0, 8)}`, `Search Test ${tag}`]);
        await client.query('INSERT INTO catalog.store_settings(store_id) VALUES ($1)', [id]);
      }
      for (const [id, suffix] of [[electronics, 'electronics'], [fashion, 'fashion']]) {
        await client.query('INSERT INTO catalog.categories(id,name,slug) VALUES ($1,$2,$3)',
          [id, `Search ${suffix}`, `search-${suffix}-${id.slice(0, 8)}`]);
      }
      for (const [index, item] of records.entries()) {
        const id = randomUUID();
        await client.query(`INSERT INTO catalog.products(id,store_id,name,description,price,price_minor,stock,status,category_id)
          VALUES ($1,$2,$3,$4,$5::numeric,$5::bigint,$6,$7,$8)`,
        [id, storeId, item.title, item.description || '', item.price, item.stock, item.status || 'active', item.category]);
        await client.query(`INSERT INTO catalog.product_variants(product_id,store_id,sku,price_minor,stock)
          VALUES ($1,$2,$3,$4,$5)`, [id, storeId, `SEARCH-${tag}-${index}`, item.price, item.stock]);
      }
      await client.query('UPDATE catalog.products SET brand=$1 WHERE name=$2',
        ['DemoBrand', `Qzeta ${tag} iPhone 15`]);
      const otherId = randomUUID();
      await client.query(`INSERT INTO catalog.products(id,store_id,name,price,price_minor,stock,status,category_id)
        VALUES ($1,$2,$3,$4::numeric,$4::bigint,$5,'active',$6)`, [otherId, otherStoreId, `Qzeta ${tag} iPhone 14`, 400000, 3, electronics]);
      await client.query(`INSERT INTO catalog.product_variants(product_id,store_id,sku,price_minor,stock)
        VALUES ($1,$2,$3,$4,$5)`, [otherId, otherStoreId, `SEARCH-${tag}-other`, 400000, 3]);

      const exact = await search.list({ q: `Qzeta ${tag} iPhone 15` }, true);
      assert.equal(exact.products[0].name, `Qzeta ${tag} iPhone 15`);
      assert.equal((await search.list({ q: `qzeta ${tag} iphone` }, true)).total, 3);
      assert.equal((await search.list({ q: `qzeta ${tag} iphon` }, true)).total, 3);
      assert.equal((await search.list({ q: `qzeta ${tag} samsng` }, true)).products[0].name,
        `Qzeta ${tag} Samsung Galaxy`);
      assert.equal((await search.list({ q: `ao thun qzeta ${tag}` }, true)).products[0].name,
        `Áo thun Qzeta ${tag}`);
      assert.equal((await search.list({ q: `A\u0301o thun Qzeta ${tag}` }, true)).products[0].name,
        `Áo thun Qzeta ${tag}`);
      assert.equal((await search.list({ q: 'supercapacitor resilient' }, true)).products[0].name,
        `Qzeta ${tag} Super Capacitor`);
      assert.equal((await search.list({ q: `qzeta ${tag}`, categoryId: electronics, shopId: storeId }, true)).total, 4);
      assert.equal((await search.list({ q: `qzeta ${tag}`, shopId: otherStoreId }, true)).total, 1);
      assert.equal((await search.list({ q: `qzeta ${tag}`, minPrice: 500000 }, true)).total, 2);
      assert.equal((await search.list({ q: `qzeta ${tag} iphone`, brand: 'demobrand' }, true)).total, 1);
      assert.equal((await search.list({ q: `qzeta ${tag}`, inStock: 'true' }, true)).total, 5);
      const first = await search.list({ q: `qzeta ${tag}`, sort: 'price_asc', page: 1, limit: 1 }, true);
      const second = await search.list({ q: `qzeta ${tag}`, sort: 'price_asc', page: 2, limit: 1 }, true);
      assert.equal(first.total, 6);
      assert.equal(first.products[0].priceMinor, 120000);
      assert.notEqual(first.products[0].id, second.products[0].id);
      assert.equal((await search.list({ q: `qzeta ${tag} hidden` }, true)).total, 0);
      assert.equal((await search.list({ q: `qzeta ${tag}'; DROP TABLE catalog.products; --` }, true)).total, 0);
    } finally {
      await client.query('ROLLBACK').catch(() => {});
      client.release();
      await pool.end();
    }
  });
