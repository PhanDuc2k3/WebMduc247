import { existsSync } from 'node:fs';
import pg from 'pg';

const devEnv = new URL('../../../.env.development.local', import.meta.url);
if (process.env.NODE_ENV === 'production') throw new Error('Catalog seed is disabled in production');
if (existsSync(devEnv)) process.loadEnvFile(devEnv);
else if (!['dev', 'test'].includes(process.env.CATALOG_SEED_MODE)) throw new Error('Set CATALOG_SEED_MODE=dev or test for an explicit non-production seed');
const databaseUrl = process.env.CATALOG_DATABASE_URL || process.env.IDENTITY_DATABASE_URL;
if (!databaseUrl) throw new Error('CATALOG_DATABASE_URL is required');
const host = new URL(databaseUrl).hostname;
if (!['127.0.0.1', 'localhost', 'identity-db'].includes(host) && process.env.CATALOG_SEED_MODE !== 'test') {
  throw new Error('Refusing to seed a non-local database');
}
const pool = new pg.Pool({ connectionString: databaseUrl });
const slugify = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const ownerId = '00000000-0000-4000-8000-000000000001';
const reset = process.argv.includes('--reset');
const db = await pool.connect();
try {
  await db.query('BEGIN');
  if (reset) {
    const reserved = await db.query(`SELECT count(*)::int AS total FROM catalog.inventory_reservations r
      JOIN catalog.product_variants v ON v.id=r.variant_id JOIN catalog.products p ON p.id=v.product_id
      WHERE p.seed_key IS NOT NULL`);
    if (reserved.rows[0].total) throw new Error('Cannot reset seeded products while reservations exist');
    await db.query(`DELETE FROM catalog.inventory_movements m USING catalog.product_variants v,catalog.products p
      WHERE m.variant_id=v.id AND v.product_id=p.id AND p.seed_key IS NOT NULL`);
    await db.query(`DELETE FROM catalog.inventory i USING catalog.product_variants v,catalog.products p
      WHERE i.variant_id=v.id AND v.product_id=p.id AND p.seed_key IS NOT NULL`);
    await db.query('DELETE FROM catalog.products WHERE seed_key IS NOT NULL');
    await db.query('DELETE FROM catalog.categories WHERE seed_key IS NOT NULL AND parent_id IS NOT NULL');
    await db.query('DELETE FROM catalog.categories WHERE seed_key IS NOT NULL');
    await db.query('DELETE FROM catalog.stores WHERE seed_key IS NOT NULL');
    await db.query('COMMIT');
    console.log('Removed only seeded catalog records');
  } else {
    const { catalogMockStores, catalogMockProducts } = await import('../../../../Frontend/src/mocks/catalogData.ts');
    const stores = new Map();
    const categories = new Map();
    for (const seed of catalogMockStores) {
      const { rows } = await db.query(`INSERT INTO catalog.stores(owner_user_id,slug,name,description,status,logo_url,banner_url,category,seed_key)
        VALUES ($1,$2,$3,$4,'active',$5,$6,$7,$8)
        ON CONFLICT (seed_key) DO UPDATE SET name=excluded.name,description=excluded.description,
          logo_url=excluded.logo_url,banner_url=excluded.banner_url,category=excluded.category
        RETURNING id`, [ownerId, slugify(seed.name).slice(0, 45) + '-' + slugify(seed._id), seed.name,
        seed.description, seed.logoUrl, seed.bannerUrl, seed.customCategory || seed.category, seed._id]);
      const storeId = rows[0].id;
      stores.set(seed._id, storeId);
      await db.query(`INSERT INTO catalog.store_settings(store_id,contact_info) VALUES ($1,$2)
        ON CONFLICT (store_id) DO NOTHING`, [storeId, { email: 'demo@example.test', phone: '0000000000' }]);
      await db.query(`INSERT INTO catalog.store_addresses(store_id,pickup_address,return_address) VALUES ($1,$2,$2)
        ON CONFLICT (store_id) DO NOTHING`, [storeId, seed.storeAddress || 'Địa chỉ demo']);
    }
    for (const seed of catalogMockProducts) {
      const rootKey = `cat:${seed.category}`;
      if (!categories.has(rootKey)) {
        const { rows } = await db.query(`INSERT INTO catalog.categories(name,slug,seed_key) VALUES ($1,$2,$3)
          ON CONFLICT (seed_key) DO UPDATE SET name=excluded.name RETURNING id`, [seed.category, slugify(seed.category), rootKey]);
        categories.set(rootKey, rows[0].id);
      }
      const subKey = `sub:${seed.category}:${seed.subCategory}`;
      if (!categories.has(subKey)) {
        const { rows } = await db.query(`INSERT INTO catalog.categories(parent_id,name,slug,seed_key) VALUES ($1,$2,$3,$4)
          ON CONFLICT (seed_key) DO UPDATE SET name=excluded.name RETURNING id`, [categories.get(rootKey),
          seed.subCategory, slugify(seed.category + '-' + seed.subCategory), subKey]);
        categories.set(subKey, rows[0].id);
      }
      const storeId = stores.get(seed.store._id);
      const variantSeeds = seed.variations.flatMap(variation => variation.options.map(option => ({
        sku: `${seed.sku}-${slugify(variation.color).toUpperCase()}-${slugify(option.name).toUpperCase()}`.slice(0, 80),
        attributes: { color: variation.color, size: option.name },
        price: seed.price + option.additionalPrice, sale: seed.salePrice == null ? null : seed.salePrice + option.additionalPrice,
        stock: option.stock,
      })));
      const { rows } = await db.query(`INSERT INTO catalog.products(store_id,category_id,name,slug,description,brand,status,price,price_minor,stock,is_featured,image_url,seed_key)
        VALUES ($1,$2,$3,$4,$5,$6,'active',$7,$8,$9,$10,$11,$12)
        ON CONFLICT (seed_key) DO UPDATE SET category_id=excluded.category_id,name=excluded.name,
          description=excluded.description,brand=excluded.brand,is_featured=excluded.is_featured,image_url=excluded.image_url
        RETURNING id`, [storeId, categories.get(subKey), seed.name, `${slugify(seed.name).slice(0, 50)}-${slugify(seed._id)}`,
        seed.description, seed.brand, seed.price, seed.price, variantSeeds.reduce((sum, item) => sum + item.stock, 0),
        seed.isFeatured, seed.images[0], seed._id]);
      const productId = rows[0].id;
      for (const variant of variantSeeds) {
        const inserted = await db.query(`INSERT INTO catalog.product_variants(product_id,store_id,sku,attributes_json,price_minor,sale_price_minor,stock)
          VALUES ($1,$2,$3,$4,$5,$6,$7)
          ON CONFLICT (store_id,sku) DO UPDATE SET price_minor=excluded.price_minor,
            sale_price_minor=excluded.sale_price_minor RETURNING id,stock`, [productId, storeId, variant.sku,
          variant.attributes, variant.price, variant.sale, variant.stock]);
        const inventory = await db.query(`INSERT INTO catalog.inventory(variant_id,on_hand) VALUES ($1,$2)
          ON CONFLICT (variant_id) DO NOTHING RETURNING variant_id`, [inserted.rows[0].id, inserted.rows[0].stock]);
        if (inventory.rowCount) await db.query(`INSERT INTO catalog.inventory_movements(variant_id,delta,reason,source)
          VALUES ($1,$2,'seed_initial_stock','seed')`, [inserted.rows[0].id, inserted.rows[0].stock]);
      }
    }
    await db.query('COMMIT');
    console.log(`Seeded ${stores.size} demo stores and ${catalogMockProducts.length} demo products idempotently`);
  }
} catch (error) {
  await db.query('ROLLBACK');
  throw error;
} finally {
  db.release();
  await pool.end();
}
