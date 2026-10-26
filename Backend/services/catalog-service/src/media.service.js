import { randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import sharp from 'sharp';
import { AvatarStorage } from '../../identity-service/src/services/avatar-storage.service.js';
import { scanWithClamAv } from '../../identity-service/src/services/clam-scanner.service.js';
import { StoreError } from './store.service.js';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

class LocalCatalogStorage {
  constructor(directory) { this.directory = directory; }
  file(key) {
    if (!/^products\/[0-9a-f-]{36}\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.webp$/i.test(key)) throw new Error('Invalid image key');
    return path.join(this.directory, ...key.split('/'));
  }
  async put(key, data) {
    const file = this.file(key);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, data, { flag: 'wx' });
  }
  async remove(key) {
    await unlink(this.file(key)).catch(error => { if (error.code !== 'ENOENT') throw error; });
  }
  async signedUrl(key) {
    try { return `data:image/webp;base64,${(await readFile(this.file(key))).toString('base64')}`; }
    catch (error) { if (error.code === 'ENOENT') return null; throw error; }
  }
}

export async function createCatalogStorage(env = process.env) {
  const configured = env.S3_BUCKET && env.S3_ACCESS_KEY && env.S3_SECRET_KEY;
  if (configured) {
    const storage = new AvatarStorage({
      bucket: env.S3_BUCKET, region: env.S3_REGION || 'us-east-1',
      endpoint: env.S3_ENDPOINT || null, publicEndpoint: env.S3_PUBLIC_ENDPOINT || null,
      accessKey: env.S3_ACCESS_KEY, secretKey: env.S3_SECRET_KEY,
      autoCreateBucket: env.S3_AUTO_CREATE_BUCKET === 'true',
    });
    try { await storage.ensureBucket(); return storage; }
    catch { if (env.NODE_ENV === 'production') throw new Error('Catalog object storage unavailable'); }
  }
  if (env.NODE_ENV === 'production') throw new Error('Catalog object storage must be configured in production');
  return new LocalCatalogStorage(fileURLToPath(new URL('../../../.local-catalog-images/', import.meta.url)));
}

export class MediaService {
  constructor(pool, catalog, storage, scanner = null) {
    this.pool = pool; this.catalog = catalog; this.storage = storage; this.scanner = scanner;
  }
  async upload(productId, userId, buffer, mime, { variantId = null, position = 0, isPrimary = false } = {}) {
    const store = await this.catalog.ownerStoreOfProduct(productId, userId);
    if (!this.scanner) throw new StoreError(503, 'SCANNER_UNAVAILABLE', 'Bộ quét ảnh không khả dụng.');
    if (!Buffer.isBuffer(buffer) || !buffer.length || buffer.length > 5 * 1024 * 1024) throw new StoreError(413, 'IMAGE_TOO_LARGE', 'Ảnh phải nhỏ hơn 5 MB.');
    const allowed = { jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
    let metadata;
    try { metadata = await sharp(buffer, { failOn: 'error', limitInputPixels: 24_000_000 }).metadata(); }
    catch { throw new StoreError(415, 'INVALID_IMAGE', 'Ảnh không hợp lệ.'); }
    if (!allowed[metadata.format] || mime !== allowed[metadata.format] || metadata.width > 6000 || metadata.height > 6000) {
      throw new StoreError(415, 'INVALID_IMAGE', 'Chỉ chấp nhận JPEG, PNG hoặc WebP hợp lệ.');
    }
    const index = Number(position);
    if (!Number.isInteger(index) || index < 0 || index > 100) throw new StoreError(400, 'INVALID_POSITION', 'Vị trí ảnh không hợp lệ.');
    if (variantId && (typeof variantId !== 'string' || !uuid.test(variantId))) throw new StoreError(400, 'INVALID_VARIANT', 'Biến thể không hợp lệ.');
    await this.scanner(buffer);
    const processed = await sharp(buffer).rotate().resize(1600, 1600, { fit: 'inside', withoutEnlargement: true }).webp({ quality: 84 }).toBuffer();
    const key = `products/${store.store_id}/${productId}/${randomUUID()}.webp`;
    await this.storage.put(key, processed);
    try {
      const result = await this.catalog.transaction(async db => {
        await this.catalog.stores.role(db, store.store_id, userId);
        const count = await db.query('SELECT count(*)::int AS total FROM catalog.product_images WHERE product_id=$1', [productId]);
        if (count.rows[0].total >= 12) throw new StoreError(409, 'IMAGE_LIMIT', 'Tối đa 12 ảnh cho mỗi sản phẩm.');
        if (variantId) {
          const variant = await db.query('SELECT 1 FROM catalog.product_variants WHERE id=$1 AND product_id=$2', [variantId, productId]);
          if (!variant.rowCount) throw new StoreError(400, 'INVALID_VARIANT', 'Biến thể không thuộc sản phẩm.');
        }
        const primary = isPrimary || count.rows[0].total === 0;
        if (primary) await db.query('UPDATE catalog.product_images SET is_primary=false WHERE product_id=$1', [productId]);
        const { rows } = await db.query(`INSERT INTO catalog.product_images(product_id,variant_id,object_key,position,is_primary)
          VALUES ($1,$2,$3,$4,$5) RETURNING *`, [productId, variantId, key, index, primary]);
        await db.query('INSERT INTO catalog.store_outbox(event_type,payload) VALUES ($1,$2)', ['ProductUpdated.v1', { productId, storeId: store.store_id }]);
        return rows[0];
      });
      return { image: { id: result.id, variantId: result.variant_id, position: result.position, isPrimary: result.is_primary, url: await this.storage.signedUrl(key) } };
    } catch (error) {
      await this.storage.remove(key).catch(() => {});
      throw error;
    }
  }
  async remove(productId, imageId, userId) {
    if (!uuid.test(imageId)) throw new StoreError(404, 'IMAGE_NOT_FOUND', 'Không tìm thấy ảnh.');
    const store = await this.catalog.ownerStoreOfProduct(productId, userId);
    const image = await this.catalog.transaction(async db => {
      await this.catalog.stores.role(db, store.store_id, userId);
      const { rows } = await db.query('DELETE FROM catalog.product_images WHERE id=$1 AND product_id=$2 RETURNING *', [imageId, productId]);
      if (!rows[0]) throw new StoreError(404, 'IMAGE_NOT_FOUND', 'Không tìm thấy ảnh.');
      if (rows[0].is_primary) await db.query(`UPDATE catalog.product_images SET is_primary=true WHERE id=(
        SELECT id FROM catalog.product_images WHERE product_id=$1 ORDER BY position,id LIMIT 1)`, [productId]);
      return rows[0];
    });
    await this.storage.remove(image.object_key).catch(() => {});
    return { removed: true };
  }
  async reorder(productId, userId, ids, primaryId) {
    const store = await this.catalog.ownerStoreOfProduct(productId, userId);
    if (!Array.isArray(ids) || ids.length > 12 || new Set(ids).size !== ids.length || ids.some(id => typeof id !== 'string') ||
      (primaryId != null && !ids.includes(primaryId))) throw new StoreError(400, 'INVALID_IMAGES', 'Danh sách ảnh không hợp lệ.');
    await this.catalog.transaction(async db => {
      await this.catalog.stores.role(db, store.store_id, userId);
      const existing = await db.query('SELECT id FROM catalog.product_images WHERE product_id=$1 FOR UPDATE', [productId]);
      if (existing.rows.length !== ids.length || existing.rows.some(row => !ids.includes(row.id))) throw new StoreError(400, 'INVALID_IMAGES', 'Danh sách ảnh không hợp lệ.');
      if (!primaryId) {
        const previous = await db.query('SELECT id FROM catalog.product_images WHERE product_id=$1 AND is_primary=true', [productId]);
        primaryId = previous.rows[0]?.id || ids[0];
      }
      for (let position = 0; position < ids.length; position++) await db.query('UPDATE catalog.product_images SET position=$3,is_primary=false WHERE id=$1 AND product_id=$2', [ids[position], productId, position]);
      if (primaryId) await db.query('UPDATE catalog.product_images SET is_primary=true WHERE id=$1 AND product_id=$2', [primaryId, productId]);
    });
    return { product: await this.catalog.sellerProduct(productId, store.store_id, userId) };
  }
}

export const configuredScanner = env => env.CLAMAV_HOST
  ? buffer => scanWithClamAv(buffer, { host: env.CLAMAV_HOST, port: Number(env.CLAMAV_PORT || 3310) }) : null;
