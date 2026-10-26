import { randomUUID } from 'node:crypto';
import { StoreError } from './store.service.js';
import { ProductSearchService } from './product-search.service.js';
import { StorefrontService } from './storefront.service.js';
import { flattenStorefrontCategories,resolveStorefront } from './storefront-config.js';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const bad = (code = 'INVALID_CATALOG', message = 'Dữ liệu catalog không hợp lệ.') => new StoreError(400, code, message);
const name = (value, min = 2, max = 200) => {
  if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max) throw bad();
  return value.trim();
};
const slugify = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70).replace(/-$/g, '');
const slug = value => {
  if (typeof value !== 'string' || value.length < 2 || value.length > 80 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) throw bad('INVALID_SLUG', 'Slug không hợp lệ.');
  return value;
};
const integer = (value, label, max = 1_000_000_000_000) => {
  if (!Number.isSafeInteger(value) || value < 0 || value > max) throw bad('INVALID_PRICE', `${label} phải là số nguyên không âm.`);
  return value;
};
const timestamp = value => {
  if (value == null || value === '') return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw bad('INVALID_SALE_TIME', 'Thời gian giảm giá không hợp lệ.');
  return date;
};
function variantInput(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw bad('INVALID_VARIANT');
  const sku = name(value.sku, 2, 80).toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9._-]+$/.test(sku)) throw bad('INVALID_SKU', 'SKU chỉ gồm chữ, số, dấu chấm, gạch ngang hoặc gạch dưới.');
  const priceMinor = integer(value.priceMinor, 'Giá gốc');
  const salePriceMinor = value.salePriceMinor == null ? null : integer(value.salePriceMinor, 'Giá giảm');
  if (salePriceMinor != null && salePriceMinor > priceMinor) throw bad('INVALID_SALE_PRICE', 'Giá giảm không được vượt giá gốc.');
  const saleStartsAt = timestamp(value.saleStartsAt);
  const saleEndsAt = timestamp(value.saleEndsAt);
  if (saleStartsAt && saleEndsAt && saleEndsAt <= saleStartsAt) throw bad('INVALID_SALE_TIME', 'Thời gian kết thúc phải sau bắt đầu.');
  const stock = integer(value.stock ?? 0, 'Tồn kho', 1_000_000);
  const attributes = value.attributes ?? {};
  if (!attributes || typeof attributes !== 'object' || Array.isArray(attributes) || Object.entries(attributes).some(([key, option]) =>
    key.length < 1 || key.length > 50 || typeof option !== 'string' || option.length < 1 || option.length > 100)) throw bad('INVALID_ATTRIBUTES');
  const status = value.status || 'active';
  if (!['active', 'inactive'].includes(status)) throw bad('INVALID_VARIANT');
  return { sku, priceMinor, salePriceMinor, saleStartsAt, saleEndsAt, stock, attributes, status };
}
function effective(variant, now = Date.now()) {
  const start = variant.sale_starts_at ? new Date(variant.sale_starts_at).getTime() : -Infinity;
  const end = variant.sale_ends_at ? new Date(variant.sale_ends_at).getTime() : Infinity;
  return variant.sale_price_minor != null && now >= start && now < end
    ? Number(variant.sale_price_minor) : Number(variant.price_minor);
}
const variantDto = row => ({
  id: row.id, sku: row.sku, attributes: row.attributes_json,
  priceOriginalMinor: Number(row.price_minor), priceMinor: effective(row),
  salePriceMinor: row.sale_price_minor == null ? null : Number(row.sale_price_minor),
  saleStartsAt: row.sale_starts_at, saleEndsAt: row.sale_ends_at,
  stock: row.available ?? row.stock, status: row.status, currency: 'VND',
});
const categoryDto = row => ({ id: row.id, parentId: row.parent_id, name: row.name, slug: row.slug,
  iconKey: row.icon_key, imageKey: row.image_key, sortOrder: row.sort_order, isActive: row.is_active });

export class CatalogService {
  constructor(pool, storeService, storage = null) {
    this.pool = pool; this.stores = storeService; this.storage = storage;
    this.productSearch = new ProductSearchService(pool, key => this.imageUrl(key));
  }
  async transaction(fn) { return this.stores.transaction(fn); }
  async imageUrl(key) { return key && this.storage ? this.storage.signedUrl(key) : null; }

  async categories() {
    const { rows } = await this.pool.query('SELECT * FROM catalog.categories WHERE is_active=true ORDER BY sort_order,name,id');
    const entries = await Promise.all(rows.map(async row => [row.id, { ...categoryDto(row),
      iconUrl: await this.imageUrl(row.icon_key), imageUrl: await this.imageUrl(row.image_key), children: [] }])); 
    const map = new Map(entries);
    const roots = [];
    for (const category of map.values()) {
      if (!category.parentId) roots.push(category);
      else map.get(category.parentId)?.children.push(category);
    }
    return { categories: roots };
  }
  async createCategory(body, db = this.pool) {
    const title = name(body.name, 2, 120);
    const categorySlug = slug(body.slug || slugify(title));
    const parentId = body.parentId || null;
    if (parentId && !uuid.test(parentId)) throw bad('INVALID_PARENT');
    const sortOrder = body.sortOrder == null ? 0 : integer(body.sortOrder, 'Thứ tự', 10_000);
    const { rows } = await db.query(`INSERT INTO catalog.categories(parent_id,name,slug,icon_key,image_key,sort_order)
      VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`, [parentId, title, categorySlug, body.iconKey || null, body.imageKey || null, sortOrder]).catch(error => {
      if (error.code === '23505') throw new StoreError(409, 'CATEGORY_SLUG_TAKEN', 'Slug danh mục đã tồn tại.');
      throw error;
    });
    return { category: categoryDto(rows[0]) };
  }
  async updateCategory(id, body) {
    if (!uuid.test(id) || !body || typeof body !== 'object' || !Object.keys(body).length) throw bad();
    const allowed = ['name', 'slug', 'parentId', 'sortOrder', 'isActive', 'iconKey', 'imageKey'];
    if (Object.keys(body).some(key => !allowed.includes(key))) throw bad();
    const fields = {};
    if ('name' in body) fields.name = name(body.name, 2, 120);
    if ('slug' in body) fields.slug = slug(body.slug);
    if ('parentId' in body) { if (body.parentId != null && !uuid.test(body.parentId)) throw bad('INVALID_PARENT'); fields.parent_id = body.parentId; }
    if ('sortOrder' in body) fields.sort_order = integer(body.sortOrder, 'Thứ tự', 10_000);
    if ('isActive' in body) { if (typeof body.isActive !== 'boolean') throw bad(); fields.is_active = body.isActive; }
    if ('iconKey' in body) fields.icon_key = body.iconKey || null;
    if ('imageKey' in body) fields.image_key = body.imageKey || null;
    const keys = Object.keys(fields);
    try {
      const { rows } = await this.pool.query(`UPDATE catalog.categories SET ${keys.map((key, i) => `${key}=$${i + 2}`).join(',')} WHERE id=$1 RETURNING *`, [id, ...keys.map(key => fields[key])]);
      if (!rows[0]) throw new StoreError(404, 'CATEGORY_NOT_FOUND', 'Không tìm thấy danh mục.');
      return { category: categoryDto(rows[0]) };
    } catch (error) {
      if (error.code === '23514' && String(error.message).includes('CATEGORY_CYCLE')) throw bad('CATEGORY_CYCLE', 'Danh mục không thể là con của chính nó.');
      if (error.code === '23505') throw new StoreError(409, 'CATEGORY_SLUG_TAKEN', 'Slug danh mục đã tồn tại.');
      throw error;
    }
  }

  async createProduct(storeId, userId, body) {
    const allowed = ['title', 'name', 'slug', 'description', 'brand', 'categoryId', 'priceMinor', 'stock', 'variants', 'attributes'];
    if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(key => !allowed.includes(key))) throw bad();
    await this.stores.role(this.pool, storeId, userId);
    const title = name(body.title || body.name, 3, 200);
    if (body.description != null && (typeof body.description !== 'string' || body.description.length > 20_000)) throw bad();
    const description = body.description || '';
    const brand = body.brand == null || body.brand === '' ? null : name(body.brand, 2, 120);
    const categoryId = body.categoryId || null;
    if (categoryId && !uuid.test(categoryId)) throw bad('INVALID_CATEGORY');
    if (body.variants != null && (!Array.isArray(body.variants) || !body.variants.length)) throw bad('INVALID_VARIANT');
    const inputVariants = Array.isArray(body.variants) ? body.variants : [{
      sku: `AUTO-${randomUUID().slice(0, 12)}`, priceMinor: body.priceMinor, stock: body.stock ?? 0,
    }];
    if (inputVariants.length > 50) throw bad('VARIANT_LIMIT', 'Tối đa 50 biến thể.');
    const variants = inputVariants.map(variantInput);
    if (new Set(variants.map(item => item.sku)).size !== variants.length) throw new StoreError(409, 'SKU_TAKEN', 'SKU bị trùng.');
    const attributes = body.attributes || {};
    if (!attributes || typeof attributes !== 'object' || Array.isArray(attributes) || Object.entries(attributes).some(([key, values]) =>
      key.length > 50 || !Array.isArray(values) || values.length > 50 || values.some(value => typeof value !== 'string' || value.length > 100))) throw bad('INVALID_ATTRIBUTES');
    if (categoryId) {
      const category = await this.pool.query('SELECT 1 FROM catalog.categories WHERE id=$1 AND is_active=true', [categoryId]);
      if (!category.rowCount) throw bad('INVALID_CATEGORY');
    }
    const base = slug(body.slug || slugify(title));
    for (let attempt = 0; attempt < 100; attempt++) {
      const suffix = attempt ? `-${attempt + 1}` : '';
      const productSlug = slug(base.slice(0, 80 - suffix.length).replace(/-$/g, '') + suffix);
      try {
        const productId = await this.transaction(async db => {
          await this.stores.role(db, storeId, userId);
          const { rows } = await db.query(`INSERT INTO catalog.products(store_id,name,slug,description,brand,category_id,status,price,price_minor,stock)
            VALUES ($1,$2,$3,$4,$5,$6,'draft',$7,$8,$9) RETURNING *`, [storeId, title, productSlug, description, brand, categoryId,
            Math.min(...variants.map(item => item.priceMinor)), Math.min(...variants.map(item => item.priceMinor)),
            variants.reduce((sum, item) => sum + item.stock, 0)]);
          const product = rows[0];
          for (const variant of variants) {
            const inserted = await db.query(`INSERT INTO catalog.product_variants(product_id,store_id,sku,attributes_json,price_minor,sale_price_minor,sale_starts_at,sale_ends_at,stock,status)
              VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`, [product.id, storeId, variant.sku, variant.attributes,
              variant.priceMinor, variant.salePriceMinor, variant.saleStartsAt, variant.saleEndsAt, variant.stock, variant.status]);
            await db.query('INSERT INTO catalog.inventory(variant_id,on_hand) VALUES ($1,$2)', [inserted.rows[0].id, variant.stock]);
            await db.query(`INSERT INTO catalog.inventory_movements(variant_id,delta,reason,actor_id,source)
              VALUES ($1,$2,'initial_stock',$3,'catalog')`, [inserted.rows[0].id, variant.stock, userId]);
          }
          for (const [key, options] of Object.entries(attributes)) {
            await db.query('INSERT INTO catalog.product_attributes(product_id,attribute_name,option_values) VALUES ($1,$2,$3)', [product.id, key, JSON.stringify(options)]);
          }
          await db.query('INSERT INTO catalog.store_audit_logs(store_id,actor_id,action,changed_fields) VALUES ($1,$2,$3,$4)', [storeId, userId, 'product_created', JSON.stringify(['products'])]);
          return product.id;
        });
        return { product: await this.sellerProduct(productId, storeId, userId) };
      } catch (error) {
        if (error.code === '23505') {
          if (String(error.constraint).includes('products_store_slug')) {
            if (body.slug) throw new StoreError(409, 'PRODUCT_SLUG_TAKEN', 'Slug sản phẩm đã tồn tại trong shop.');
            continue;
          }
          throw new StoreError(409, 'SKU_TAKEN', 'SKU đã tồn tại trong shop.');
        }
        throw error;
      }
    }
    throw new StoreError(409, 'PRODUCT_SLUG_TAKEN', 'Không thể tạo slug sản phẩm.');
  }

  async sellerProduct(productId, storeId, userId) {
    await this.stores.role(this.pool, storeId, userId);
    const { rows } = await this.pool.query('SELECT * FROM catalog.products WHERE id=$1 AND store_id=$2', [productId, storeId]);
    if (!rows[0]) throw new StoreError(404, 'PRODUCT_NOT_FOUND', 'Không tìm thấy sản phẩm.');
    return this.detail(rows[0]);
  }
  async ownerStoreOfProduct(productId, userId, db = this.pool) {
    if (!uuid.test(productId)) throw new StoreError(404, 'PRODUCT_NOT_FOUND', 'Không tìm thấy sản phẩm.');
    const { rows } = await db.query('SELECT store_id,status FROM catalog.products WHERE id=$1', [productId]);
    if (!rows[0]) throw new StoreError(404, 'PRODUCT_NOT_FOUND', 'Không tìm thấy sản phẩm.');
    await this.stores.role(db, rows[0].store_id, userId);
    return rows[0];
  }
  async updateProduct(productId, userId, body) {
    const allowed = ['title', 'description', 'brand', 'categoryId'];
    if (!body || typeof body !== 'object' || !Object.keys(body).length || Object.keys(body).some(key => !allowed.includes(key))) throw bad();
    const fields = {};
    if ('title' in body) fields.name = name(body.title, 3, 200);
    if ('description' in body) {
      if (typeof body.description !== 'string' || body.description.length > 20_000) throw bad();
      fields.description = body.description;
    }
    if ('brand' in body) fields.brand = body.brand ? name(body.brand, 2, 120) : null;
    if ('categoryId' in body) {
      if (body.categoryId && !uuid.test(body.categoryId)) throw bad('INVALID_CATEGORY');
      fields.category_id = body.categoryId || null;
    }
    const keys = Object.keys(fields);
    const store = await this.ownerStoreOfProduct(productId, userId);
    await this.transaction(async db => {
      await this.stores.role(db, store.store_id, userId);
      if (fields.category_id) {
        const category = await db.query('SELECT 1 FROM catalog.categories WHERE id=$1 AND is_active=true', [fields.category_id]);
        if (!category.rowCount) throw bad('INVALID_CATEGORY');
      }
      await db.query(`UPDATE catalog.products SET ${keys.map((key, i) => `${key}=$${i + 2}`).join(',')},updated_at=now() WHERE id=$1`,
        [productId, ...keys.map(key => fields[key])]);
      await db.query('INSERT INTO catalog.store_outbox(event_type,payload) VALUES ($1,$2)', ['ProductUpdated.v1', { productId, storeId: store.store_id }]);
    });
    return { product: await this.sellerProduct(productId, store.store_id, userId) };
  }
  async setProductStatus(productId, userId, status) {
    if (!['active', 'hidden', 'discontinued', 'draft'].includes(status)) throw bad('INVALID_STATUS');
    const store = await this.ownerStoreOfProduct(productId, userId);
    await this.transaction(async db => {
      await this.stores.role(db, store.store_id, userId);
      const locked = await db.query('SELECT platform_suspended FROM catalog.products WHERE id=$1 FOR UPDATE',[productId]);
      if (locked.rows[0]?.platform_suspended)
        throw new StoreError(409,'PLATFORM_SUSPENDED','Sản phẩm đang bị sàn ẩn. Vui lòng liên hệ quản trị viên để khôi phục.');
      if (status === 'active') {
        const available = await db.query("SELECT 1 FROM catalog.product_variants WHERE product_id=$1 AND status='active' LIMIT 1", [productId]);
        if (!available.rowCount) throw bad('VARIANT_REQUIRED', 'Sản phẩm cần ít nhất một biến thể.');
      }
      await db.query('UPDATE catalog.products SET status=$2,updated_at=now() WHERE id=$1', [productId, status]);
      await db.query('INSERT INTO catalog.store_outbox(event_type,payload) VALUES ($1,$2)', [
        status === 'active' ? 'ProductPublished.v1' : 'ProductUpdated.v1', { productId, storeId: store.store_id, status },
      ]);
    });
    return { product: await this.sellerProduct(productId, store.store_id, userId) };
  }
  async duplicateProduct(productId, userId) {
    const store = await this.ownerStoreOfProduct(productId, userId);
    const original = await this.sellerProduct(productId, store.store_id, userId);
    return this.createProduct(store.store_id, userId, {
      title: `Bản sao ${original.name}`.slice(0, 200), description: original.description,
      brand: original.brand, categoryId: original.categoryId, attributes: original.attributes,
      variants: original.variants.map(variant => ({
        sku: `${variant.sku.slice(0, 60)}-COPY-${randomUUID().slice(0, 8)}`,
        attributes: variant.attributes, priceMinor: variant.priceOriginalMinor,
        salePriceMinor: variant.salePriceMinor, saleStartsAt: variant.saleStartsAt, saleEndsAt: variant.saleEndsAt,
        stock: variant.stock, status: variant.status,
      })),
    });
  }
  async saveVariant(productId, userId, body, variantId = null) {
    const store = await this.ownerStoreOfProduct(productId, userId);
    let input;
    if (variantId) {
      if (!uuid.test(variantId)) throw bad('INVALID_VARIANT');
      const { rows } = await this.pool.query('SELECT * FROM catalog.product_variants WHERE id=$1 AND product_id=$2', [variantId, productId]);
      if (!rows[0]) throw new StoreError(404, 'VARIANT_NOT_FOUND', 'Không tìm thấy biến thể.');
      const previous = rows[0];
      if ('stock' in body && body.stock !== previous.stock) {
        throw new StoreError(409, 'INVENTORY_ADJUSTMENT_REQUIRED', 'Hãy điều chỉnh tồn kho bằng thao tác có lý do.');
      }
      input = variantInput({
        sku: body.sku ?? previous.sku, attributes: body.attributes ?? previous.attributes_json,
        priceMinor: body.priceMinor ?? Number(previous.price_minor),
        salePriceMinor: 'salePriceMinor' in body ? body.salePriceMinor : previous.sale_price_minor == null ? null : Number(previous.sale_price_minor),
        saleStartsAt: 'saleStartsAt' in body ? body.saleStartsAt : previous.sale_starts_at,
        saleEndsAt: 'saleEndsAt' in body ? body.saleEndsAt : previous.sale_ends_at,
        stock: body.stock ?? previous.stock, status: body.status ?? previous.status,
      });
    } else input = variantInput(body);
    try {
      await this.transaction(async db => {
        await this.stores.role(db, store.store_id, userId);
        if (variantId) await db.query(`UPDATE catalog.product_variants SET sku=$3,attributes_json=$4,price_minor=$5,sale_price_minor=$6,
          sale_starts_at=$7,sale_ends_at=$8,status=$9 WHERE id=$1 AND product_id=$2`,
          [variantId, productId, input.sku, input.attributes, input.priceMinor, input.salePriceMinor, input.saleStartsAt, input.saleEndsAt, input.status]);
        else {
          const inserted = await db.query(`INSERT INTO catalog.product_variants(product_id,store_id,sku,attributes_json,price_minor,sale_price_minor,sale_starts_at,sale_ends_at,stock,status)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`, [productId, store.store_id, input.sku, input.attributes,
            input.priceMinor, input.salePriceMinor, input.saleStartsAt, input.saleEndsAt, input.stock, input.status]);
          await db.query('INSERT INTO catalog.inventory(variant_id,on_hand) VALUES ($1,$2)', [inserted.rows[0].id, input.stock]);
          await db.query(`INSERT INTO catalog.inventory_movements(variant_id,delta,reason,actor_id,source)
            VALUES ($1,$2,'initial_stock',$3,'catalog')`, [inserted.rows[0].id, input.stock, userId]);
        }
        await db.query(`UPDATE catalog.products SET price_minor=(SELECT min(price_minor) FROM catalog.product_variants WHERE product_id=$1),
          price=(SELECT min(price_minor) FROM catalog.product_variants WHERE product_id=$1),
          stock=(SELECT coalesce(sum(stock),0) FROM catalog.product_variants WHERE product_id=$1),updated_at=now() WHERE id=$1`, [productId]);
        await db.query('INSERT INTO catalog.store_outbox(event_type,payload) VALUES ($1,$2)', ['ProductPriceChanged.v1', { productId, storeId: store.store_id }]);
      });
    } catch (error) {
      if (error.code === '23505') throw new StoreError(409, 'SKU_TAKEN', 'SKU đã tồn tại trong shop.');
      throw error;
    }
    return { product: await this.sellerProduct(productId, store.store_id, userId) };
  }
  async detail(row) {
    const [variants, images, attributes, store, rating] = await Promise.all([
      this.pool.query(`SELECT v.*,i.on_hand,i.reserved,(i.on_hand-i.reserved) AS available
        FROM catalog.product_variants v LEFT JOIN catalog.inventory i ON i.variant_id=v.id
        WHERE v.product_id=$1 ORDER BY v.created_at,v.id`, [row.id]),
      this.pool.query('SELECT * FROM catalog.product_images WHERE product_id=$1 ORDER BY position,id', [row.id]),
      this.pool.query('SELECT attribute_name,option_values FROM catalog.product_attributes WHERE product_id=$1', [row.id]),
      this.pool.query('SELECT id,slug,name,logo_url FROM catalog.stores WHERE id=$1', [row.store_id]),
      this.pool.query('SELECT average_rating,review_count FROM catalog.product_rating_summary WHERE product_id=$1',[row.id]),
    ]);
    const active = variants.rows.filter(item => item.status === 'active');
    const cheapest = [...active].sort((a, b) => effective(a) - effective(b) || a.id.localeCompare(b.id))[0];
    const imagesDto = await Promise.all(images.rows.map(async item => ({ id: item.id, variantId: item.variant_id, position: item.position,
      isPrimary: item.is_primary, url: await this.imageUrl(item.object_key) })));
    const options = Object.fromEntries(attributes.rows.map(item => [item.attribute_name, item.option_values]));
    return {
      id: row.id, storeId: row.store_id, slug: row.slug, name: row.name, title: row.name, description: row.description,
      brand: row.brand, categoryId: row.category_id, status: row.status === 'published' ? 'active' : row.status,
      currency: 'VND', priceMinor: cheapest ? effective(cheapest) : Number(row.price_minor),
      priceOriginalMinor: cheapest ? Number(cheapest.price_minor) : Number(row.price_minor),
      inStock: active.some(item => (item.available ?? item.stock) > 0),
      stock: active.reduce((sum, item) => sum + (item.available ?? item.stock), 0),
      variants: variants.rows.map(variantDto), attributes: options, options,
      images: imagesDto, imageUrl: imagesDto.find(item => item.isPrimary)?.url || imagesDto[0]?.url ||
        (row.seed_key && /^https:\/\//.test(row.image_url || '') ? row.image_url : null),
      rating: rating.rows[0]?.review_count ? Number(rating.rows[0].average_rating) : null,
      reviewCount: rating.rows[0]?.review_count || 0, soldCount: null, reviewSource: 'reviews',
      reviewSummary: { rating: rating.rows[0]?.review_count ? Number(rating.rows[0].average_rating) : null,
        count: rating.rows[0]?.review_count || 0, source: 'reviews' },
      store: store.rows[0] ? { id: store.rows[0].id, slug: store.rows[0].slug, name: store.rows[0].name, logoUrl: store.rows[0].logo_url } : null,
      createdAt: row.created_at,
    };
  }
  async publicProduct(id) {
    if (!uuid.test(id)) throw new StoreError(404, 'PRODUCT_NOT_FOUND', 'Không tìm thấy sản phẩm.');
    const { rows } = await this.pool.query(`WITH RECURSIVE active_categories AS (
      SELECT id FROM catalog.categories WHERE parent_id IS NULL AND is_active=true
      UNION ALL SELECT c.id FROM catalog.categories c JOIN active_categories a ON c.parent_id=a.id WHERE c.is_active=true
    )
      SELECT p.* FROM catalog.products p JOIN catalog.stores s ON s.id=p.store_id
      JOIN catalog.store_settings t ON t.store_id=s.id
      WHERE p.id=$1 AND p.status IN ('active','published') AND s.status='active' AND t.accepting_orders=true
        AND (p.category_id IS NULL OR p.category_id IN (SELECT id FROM active_categories))`, [id]);
    if (!rows[0]) throw new StoreError(404, 'PRODUCT_NOT_FOUND', 'Không tìm thấy sản phẩm.');
    return { product: await this.detail(rows[0]) };
  }

  async listProducts(query = {}) {
    return this.productSearch.list(query);
  }
  async search(query) {
    const keyword = name(query.q || query.search, 2, 100);
    const [products, stores, categories] = await Promise.all([
      this.listProducts({ search: keyword, page: 1, limit: 8 }),
      this.stores.list({ search: keyword, page: 1, limit: 5 }),
      this.pool.query(`WITH RECURSIVE active_categories AS (
        SELECT id,parent_id,name,slug,sort_order FROM catalog.categories WHERE parent_id IS NULL AND is_active=true
        UNION ALL SELECT c.id,c.parent_id,c.name,c.slug,c.sort_order FROM catalog.categories c
          JOIN active_categories a ON c.parent_id=a.id WHERE c.is_active=true)
        SELECT id,name,slug FROM active_categories
        WHERE unaccent(lower(name)) LIKE '%'||unaccent(lower($1))||'%' ORDER BY sort_order,name LIMIT 5`, [keyword]),
    ]);
    return { products: products.products, stores: stores.stores, categories: categories.rows };
  }
  async home(previewConfig = null) {
    const categories=await this.categories(),flat=flattenStorefrontCategories(categories.categories);
    const storefront=previewConfig?{layout:resolveStorefront(previewConfig,flat),configured:true}:await new StorefrontService(this).publicConfig(flat);
    const layout=storefront.layout,limit=key=>layout.sections.find(section=>section.key===key)?.limit;
    const [featuredProducts, recentProducts, featuredStores, banners] = await Promise.all([
      this.listProducts({ page: 1, limit: Math.max(8,limit('featuredProducts')||0), sort: 'relevance' }),
      this.listProducts({ page: 1, limit: Math.max(12,limit('suggestions')||0), sort: 'newest' }),
      this.stores.list({ page: 1, limit: Math.max(8,limit('featuredStores')||0), featured: true }),
      this.pool.query(`SELECT * FROM catalog.catalog_banners WHERE
        (active_from IS NULL OR active_from<=now()) AND (active_to IS NULL OR active_to>now())
        ORDER BY sort_order,id LIMIT 6`),
    ]);
    if(layout.featuredProductIds.length){
      featuredProducts.products=(await Promise.all(layout.featuredProductIds.map(async id=>{
        try{return (await this.publicProduct(id)).product;}catch(error){if(error.status===404)return null;throw error;}
      }))).filter(Boolean);
    }
    if(layout.featuredStoreIds.length){
      const selected=await this.pool.query('SELECT id,slug FROM catalog.stores WHERE id=ANY($1::uuid[])',[layout.featuredStoreIds]);
      const byId=new Map(selected.rows.map(row=>[row.id,row.slug]));
      featuredStores.stores=(await Promise.all(layout.featuredStoreIds.map(async id=>{
        if(!byId.has(id))return null;
        try{return await this.stores.publicBySlug(byId.get(id));}catch(error){if(error.status===404)return null;throw error;}
      }))).filter(Boolean);
    }
    return { categories: categories.categories, featuredProducts: featuredProducts.products,
      newestProducts: recentProducts.products, bestSellers: [], bestSellerSource: 'orders_unavailable',
      featuredStores: featuredStores.stores, banners: await Promise.all(banners.rows.map(async row => ({
        id: row.id, title: row.title, imageUrl: await this.imageUrl(row.image_key), targetUrl: row.target_url,
      }))),layout,storefrontConfigured:storefront.configured };
  }
  async createBanner(body) {
    const title = name(body.title, 2, 160);
    if (typeof body.imageKey !== 'string' || !/^[a-z0-9/_-]+\.webp$/i.test(body.imageKey) || body.imageKey.includes('..')) throw bad('INVALID_IMAGE_KEY');
    if (typeof body.targetUrl !== 'string' || !body.targetUrl.startsWith('/') || body.targetUrl.startsWith('//') || body.targetUrl.length > 500) throw bad('INVALID_TARGET');
    const activeFrom = timestamp(body.activeFrom), activeTo = timestamp(body.activeTo);
    if (activeFrom && activeTo && activeTo <= activeFrom) throw bad('INVALID_BANNER_TIME');
    const sortOrder = body.sortOrder == null ? 0 : integer(body.sortOrder, 'Thứ tự', 10000);
    const { rows } = await this.pool.query(`INSERT INTO catalog.catalog_banners(title,image_key,target_url,sort_order,active_from,active_to)
      VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`, [title, body.imageKey, body.targetUrl, sortOrder, activeFrom, activeTo]);
    return { banner: { id: rows[0].id, title, imageUrl: await this.imageUrl(body.imageKey), targetUrl: body.targetUrl } };
  }
}
