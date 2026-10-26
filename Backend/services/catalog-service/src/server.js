import http from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import pg from 'pg';
import { StoreError, StoreService } from './store.service.js';
import { CatalogService } from './catalog.service.js';
import { createCatalogStorage, configuredScanner, MediaService } from './media.service.js';
import { InventoryService } from './inventory.service.js';
import { CatalogAdminService } from './platform-admin.service.js';
import { PlatformAdminError } from '../../../packages/contracts/platform-admin.js';
import { StorefrontService } from './storefront.service.js';

const port = Number(process.env.CATALOG_PORT || 5102);
const databaseUrl = process.env.CATALOG_DATABASE_URL || process.env.IDENTITY_DATABASE_URL;
const identityUrl = process.env.CATALOG_IDENTITY_URL || 'http://127.0.0.1:5101';
const syncSecret = process.env.CATALOG_SYNC_SECRET || '';
const inventoryToken = process.env.INVENTORY_INTERNAL_TOKEN || '';
const inventoryWebhookUrl = process.env.INVENTORY_EVENT_WEBHOOK_URL || '';
const inventoryWebhookToken = process.env.INVENTORY_EVENT_WEBHOOK_TOKEN || '';
const frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
if (!databaseUrl) throw new Error('CATALOG_DATABASE_URL is required');
const pool = new pg.Pool({ connectionString: databaseUrl });
const service = new StoreService(pool);
const storage = await createCatalogStorage(process.env);
const catalog = new CatalogService(pool, service, storage);
const media = new MediaService(pool, catalog, storage, configuredScanner(process.env));
const inventory = new InventoryService(pool, service);
if (inventoryWebhookUrl && process.env.NODE_ENV === 'production' && !inventoryWebhookUrl.startsWith('https://')) {
  throw new Error('Production inventory event webhook must use HTTPS');
}
if (inventoryWebhookUrl && !inventoryWebhookToken) throw new Error('Inventory event webhook token is required');
if (process.env.NODE_ENV === 'production' && !inventoryToken) throw new Error('Inventory internal token is required');
async function failOutbox(db, event, error, permanent = false) {
  const attempts = event.attempts + 1;
  const delay = Math.min(300, 2 ** Math.min(attempts, 8));
  await db.query(`UPDATE catalog.store_outbox SET attempts=$2,last_error=$3,
    next_attempt_at=now()+($4 * interval '1 second'),
    dead_letter_at=CASE WHEN $5 THEN now() ELSE dead_letter_at END WHERE id=$1`,
    [event.id, attempts, String(error).slice(0, 200), delay, permanent || attempts >= 20]);
}
async function syncMemberships() {
  if (!syncSecret) return;
  const db = await pool.connect();
  try {
    await db.query('BEGIN');
    const { rows } = await db.query(`SELECT id,event_type,payload,attempts FROM catalog.store_outbox
      WHERE published_at IS NULL AND dead_letter_at IS NULL AND next_attempt_at<=now()
        AND event_type IN ('StoreCreated.v1','StoreMemberAdded.v1','StoreMemberRemoved.v1')
      ORDER BY id LIMIT 1 FOR UPDATE SKIP LOCKED`);
    const event = rows[0];
    if (!event) { await db.query('COMMIT'); return; }
    try {
      const response = await fetch(new URL('/api/v2/internal/store-membership', identityUrl), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Catalog-Secret': syncSecret },
        body: JSON.stringify({
          storeId: event.payload.storeId,
          userId: event.payload.ownerUserId || event.payload.userId,
          active: event.event_type !== 'StoreMemberRemoved.v1',
        }),
        signal: AbortSignal.timeout(5000),
      });
      if (response.ok) await db.query('UPDATE catalog.store_outbox SET published_at=now(),last_error=NULL WHERE id=$1', [event.id]);
      else await failOutbox(db, event, `Identity membership sync returned ${response.status}`, [400, 403, 404].includes(response.status));
    } catch (error) { await failOutbox(db, event, 'Identity sync unavailable'); }
    await db.query('COMMIT');
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  } finally { db.release(); }
}
async function publishInventoryEvent() {
  if (!inventoryWebhookUrl) return false;
  const db = await pool.connect();
  try {
    await db.query('BEGIN');
    const { rows } = await db.query(`SELECT id,event_type,payload,attempts FROM catalog.store_outbox
      WHERE published_at IS NULL AND dead_letter_at IS NULL AND next_attempt_at<=now()
        AND event_type LIKE 'Inventory%'
      ORDER BY id LIMIT 1 FOR UPDATE SKIP LOCKED`);
    if (!rows[0]) { await db.query('COMMIT'); return false; }
    const event = rows[0];
    try {
      const response = await fetch(inventoryWebhookUrl, { method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Inventory-Event-Token': inventoryWebhookToken,
          'X-Event-Id': String(event.id) },
        body: JSON.stringify({ id: event.id, type: event.event_type, payload: event.payload }),
        signal: AbortSignal.timeout(5000),
      });
      if (response.ok) await db.query('UPDATE catalog.store_outbox SET published_at=now(),last_error=NULL WHERE id=$1', [event.id]);
      else await failOutbox(db, event, `Inventory event webhook returned ${response.status}`, [400, 401, 403, 404].includes(response.status));
    } catch (error) { await failOutbox(db, event, 'Inventory webhook unavailable'); }
    await db.query('COMMIT');
    return true;
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  } finally { db.release(); }
}
const send = (res, status, data) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
  res.end(JSON.stringify(data));
};
const body = async (req, maxBytes = 32_768) => {
  const chunks = []; let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) throw new StoreError(413, 'BODY_TOO_LARGE', 'Dữ liệu quá lớn.');
    chunks.push(chunk);
  }
  let data;
  try { data = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); }
  catch { throw new StoreError(400, 'INVALID_JSON', 'JSON không hợp lệ.'); }
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new StoreError(400, 'INVALID_JSON', 'JSON không hợp lệ.');
  return data;
};
const binaryBody = async req => {
  const chunks = []; let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 5 * 1024 * 1024) throw new StoreError(413, 'IMAGE_TOO_LARGE', 'Ảnh phải nhỏ hơn 5 MB.');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
};
const internalSecretValid = req => {
  const expected = Buffer.from(syncSecret);
  const actual = Buffer.from(String(req.headers['x-catalog-secret'] || ''));
  return expected.length > 0 && expected.length === actual.length && timingSafeEqual(expected, actual);
};
const inventorySecretValid = req => {
  const expected = Buffer.from(inventoryToken);
  const actual = Buffer.from(String(req.headers['x-inventory-token'] || ''));
  return expected.length > 0 && expected.length === actual.length && timingSafeEqual(expected, actual);
};
const authenticate = async req => {
  if (!/^Bearer\s+\S+$/i.test(req.headers.authorization || '')) throw new StoreError(401, 'UNAUTHORIZED', 'Vui lòng đăng nhập.');
  let response;
  try { response = await fetch(new URL('/api/v2/auth/me', identityUrl), { headers: { Authorization: req.headers.authorization }, signal: AbortSignal.timeout(5000) }); }
  catch { throw new StoreError(503, 'IDENTITY_UNAVAILABLE', 'Dịch vụ tài khoản tạm thời không khả dụng.'); }
  if (!response.ok) throw new StoreError(response.status === 401 ? 401 : 503, response.status === 401 ? 'UNAUTHORIZED' : 'IDENTITY_UNAVAILABLE', response.status === 401 ? 'Phiên đăng nhập không hợp lệ.' : 'Dịch vụ tài khoản tạm thời không khả dụng.');
  const data = await response.json();
  return data.user;
};

export function createHandler(storeService = service, catalogService = catalog, mediaService = media, inventoryService = inventory) {
  return async (req, res) => {
    const origin = req.headers.origin;
    if (origin === frontendOrigin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Variant-Id, X-Position, X-Primary');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
      res.setHeader('Vary', 'Origin');
    }
    if (req.method === 'OPTIONS') { res.writeHead(origin === frontendOrigin ? 204 : 403); res.end(); return; }
    try {
      const target = new URL(req.url, 'http://localhost');
      const path = target.pathname.replace(/^\/api\/v2/, '');
      if (['POST', 'PATCH', 'DELETE'].includes(req.method) && origin !== frontendOrigin &&
        !path.startsWith('/internal/') && !path.startsWith('/inventory/')) throw new StoreError(403, 'ORIGIN_DENIED', 'Origin không hợp lệ.');
      const query = Object.fromEntries(target.searchParams);
      if(req.method==='GET'&&path==='/storefront')return send(res,200,await new StorefrontService(catalogService).publicConfig());
      if (path.startsWith('/admin/')) {
        const user = await authenticate(req);
        const admin = new CatalogAdminService(storeService.pool,catalogService);
        const storefront=new StorefrontService(catalogService);
        if(req.method==='GET'&&path==='/admin/storefront')return send(res,200,await storefront.read(user));
        if(req.method==='GET'&&path==='/admin/storefront/preview')return send(res,200,await storefront.preview(user));
        if(req.method==='GET'&&path==='/admin/storefront/choices')return send(res,200,await storefront.choices(user,query));
        if(req.method==='POST'&&path==='/admin/storefront/draft')return send(res,200,await storefront.save(user,await body(req,131072),false));
        if(req.method==='POST'&&path==='/admin/storefront/publish')return send(res,200,await storefront.save(user,await body(req,131072),true));
        if(req.method==='POST'&&path==='/admin/storefront/categories')return send(res,201,await storefront.createCategory(user,await body(req)));
        if (req.method === 'GET' && path === '/admin/catalog/summary') return send(res,200,await admin.summary(user));
        if (req.method === 'GET' && path === '/admin/stores') return send(res,200,await admin.stores(user,query));
        if (req.method === 'GET' && path === '/admin/products') return send(res,200,await admin.products(user,query));
        if (req.method === 'GET' && path === '/admin/catalog/audit') return send(res,200,await admin.audit(user,query));
        const record = /^\/admin\/(stores|products)\/([0-9a-f-]{36})(\/status)?$/i.exec(path);
        if(record && req.method==='GET' && !record[3])return send(res,200,await admin.detail(user,record[1],record[2]));
        if(record && req.method==='PATCH' && record[3])return send(res,200,await admin.moderate(user,record[1],record[2],await body(req)));
        throw new StoreError(404,'NOT_FOUND','Không tìm thấy API quản trị.');
      }
      if (path.startsWith('/inventory/')) {
        if (!inventorySecretValid(req)) throw new StoreError(403, 'FORBIDDEN', 'Không có quyền với Inventory API.');
        const rating=/^\/inventory\/products\/([0-9a-f-]{36})\/rating-summary$/i.exec(path);
        if(req.method==='POST'&&rating){
          const input=await body(req);
          if(!Number.isInteger(input.reviewCount)||input.reviewCount<0||
            typeof input.averageRating!=='number'||input.averageRating<0||input.averageRating>5)
            throw new StoreError(400,'INVALID_RATING','Tổng hợp đánh giá không hợp lệ.');
          await pool.query(`INSERT INTO catalog.product_rating_summary(product_id,average_rating,review_count)
            VALUES ($1,$2,$3) ON CONFLICT(product_id) DO UPDATE SET
            average_rating=EXCLUDED.average_rating,review_count=EXCLUDED.review_count,updated_at=now()`,
            [rating[1],input.averageRating,input.reviewCount]);
          return send(res,200,{updated:true});
        }
        const availability = /^\/inventory\/variants\/([0-9a-f-]{36})\/availability$/i.exec(path);
        if (req.method === 'GET' && availability) return send(res, 200, await inventoryService.availability(availability[1], query.quantity || 1));
        const quote = /^\/inventory\/variants\/([0-9a-f-]{36})\/quote$/i.exec(path);
        if (req.method === 'GET' && quote) {
          const result = await inventoryService.quote(quote[1], query.quantity || 1);
          return send(res, 200, { ...result, imageUrl: await catalogService.imageUrl(result.imageKey) || result.seedImageUrl });
        }
        if (req.method === 'POST' && path === '/inventory/reservations') return send(res, 201, await inventoryService.reserve(await body(req)));
        if (req.method === 'POST' && path === '/inventory/reservations/commit-batch')
          return send(res, 200, await inventoryService.commitBatch((await body(req)).reservationIds));
        if (req.method === 'POST' && path === '/inventory/restock-batch') {
          const input = await body(req);
          return send(res, 200, await inventoryService.restockBatch(input.reservationIds,input.cancellationKey));
        }
        const membership = /^\/inventory\/stores\/([0-9a-f-]{36})\/membership$/i.exec(path);
        const chatProfile=/^\/inventory\/stores\/([0-9a-f-]{36})\/chat-profile$/i.exec(path);
        const notificationMembers=/^\/inventory\/stores\/([0-9a-f-]{36})\/notification-members$/i.exec(path);
        if(req.method==='GET'&&notificationMembers){
          const rows=(await pool.query(`SELECT user_id,role FROM catalog.store_members
            WHERE store_id=$1 AND status='active'`,[notificationMembers[1]])).rows;
          return send(res,200,{storeId:notificationMembers[1],
            members:rows.map(row=>({userId:row.user_id,role:row.role}))});
        }
        if(req.method==='GET'&&chatProfile){
          const row=(await pool.query('SELECT id,name,slug,status FROM catalog.stores WHERE id=$1',
            [chatProfile[1]])).rows[0];
          if(!row)throw new StoreError(404,'STORE_NOT_FOUND','Không tìm thấy shop.');
          return send(res,200,{storeId:row.id,name:row.name,slug:row.slug,status:row.status});
        }
        if (req.method === 'GET' && membership) {
          const role = await storeService.role(storeService.pool,membership[1],query.userId);
          return send(res, 200, { storeId:membership[1],userId:query.userId,role });
        }
        const aftersales = /^\/inventory\/stores\/([0-9a-f-]{36})\/aftersales-status$/i.exec(path);
        if(req.method==='GET'&&aftersales){
          const row=(await storeService.pool.query(`SELECT s.id,s.owner_user_id,s.platform_suspended,
            ARRAY(SELECT user_id FROM catalog.store_members WHERE store_id=s.id AND status='active') AS member_ids
            FROM catalog.stores s WHERE s.id=$1`,[aftersales[1]])).rows[0];
          if(!row)throw new StoreError(404,'STORE_NOT_FOUND','Không tìm thấy shop.');
          return send(res,200,{storeId:row.id,ownerId:row.owner_user_id,memberIds:row.member_ids,platformSuspended:row.platform_suspended});
        }
        const reservation = /^\/inventory\/reservations\/([0-9a-f-]{36})$/i.exec(path);
        if (req.method === 'GET' && reservation) return send(res, 200, await inventoryService.reservation(reservation[1]));
        const transition = /^\/inventory\/reservations\/([0-9a-f-]{36})\/(commit|release)$/i.exec(path);
        if (req.method === 'POST' && transition) return send(res, 200,
          await (transition[2] === 'commit' ? inventoryService.commit(transition[1]) : inventoryService.release(transition[1])));
        if (req.method === 'POST' && path === '/inventory/reconcile') return send(res, 200, await inventoryService.reconcile());
        throw new StoreError(404, 'NOT_FOUND', 'Không tìm thấy Inventory API.');
      }
      if (path.startsWith('/internal/')) {
        if (!internalSecretValid(req)) throw new StoreError(403, 'FORBIDDEN', 'Không có quyền quản trị catalog.');
        if (req.method === 'POST' && path === '/internal/categories') return send(res, 201, await catalogService.createCategory(await body(req)));
        if (req.method === 'POST' && path === '/internal/banners') return send(res, 201, await catalogService.createBanner(await body(req)));
        const categoryMatch = /^\/internal\/categories\/([0-9a-f-]{36})$/i.exec(path);
        if (req.method === 'PATCH' && categoryMatch) return send(res, 200, await catalogService.updateCategory(categoryMatch[1], await body(req)));
      }
      if (req.method === 'GET' && path === '/categories') return send(res, 200, await catalogService.categories());
      if (req.method === 'GET' && path === '/products') return send(res, 200, await catalogService.listProducts(query));
      if (req.method === 'GET' && path === '/products/search') return send(res, 200, await catalogService.productSearch.list(query, true));
      if (req.method === 'GET' && path === '/search') return send(res, 200, await catalogService.search(query));
      if (req.method === 'GET' && path === '/home') return send(res, 200, await catalogService.home());
      if (req.method === 'GET' && /^\/products\/[0-9a-f-]{36}$/i.test(path)) return send(res, 200, await catalogService.publicProduct(path.slice(10)));
      if (req.method === 'GET' && path === '/stores') return send(res, 200, await storeService.list(query));
      if (req.method === 'GET' && path === '/stores/categories') return send(res, 200, await storeService.categories());
      if (req.method === 'GET' && path === '/stores/featured') return send(res, 200, await storeService.list({ ...query, featured: true }));
      if (req.method === 'GET' && /^\/stores\/by-id\/[0-9a-f-]{36}\/checkout-policy$/i.test(path)) return send(res, 200, await storeService.checkoutPolicy(path.split('/')[3]));
      if (req.method === 'GET' && /^\/stores\/[a-z0-9-]+\/products$/.test(path)) return send(res, 200, await catalogService.listProducts({ store: path.split('/')[2], page: 1, limit: 50, inStock: 'true' }));
      if (req.method === 'GET' && /^\/stores\/[a-z0-9-]+$/.test(path)) return send(res, 200, { store: await storeService.publicBySlug(path.slice(8)) });
      const user = await authenticate(req);
      const sellerInventory = /^\/seller\/variants\/([0-9a-f-]{36})\/(inventory|inventory-adjustments)$/i.exec(path);
      if (sellerInventory) {
        if (req.method === 'GET' && sellerInventory[2] === 'inventory') return send(res, 200,
          await inventoryService.sellerInventory(sellerInventory[1], user.id, query));
        if (req.method === 'POST' && sellerInventory[2] === 'inventory-adjustments') return send(res, 200,
          await inventoryService.adjust(sellerInventory[1], user.id, await body(req)));
      }
      if (req.method === 'GET' && path === '/seller/stores') return send(res, 200, await storeService.mine(user.id));
      if (req.method === 'POST' && path === '/seller/stores') return send(res, 201, { store: await storeService.create(user, await body(req)) });
      if (req.method === 'POST' && path === '/seller/invitations/accept') return send(res, 200, await storeService.acceptInvite(user, await body(req)));
      const sellerProduct = /^\/seller\/products\/([0-9a-f-]{36})(?:\/(duplicate|publish|status|variants|images)(?:\/([0-9a-f-]{36}))?)?$/i.exec(path);
      if (sellerProduct) {
        const [, productId, section, childId] = sellerProduct;
        if (req.method === 'GET' && !section) {
          const row = await catalogService.ownerStoreOfProduct(productId, user.id);
          return send(res, 200, { product: await catalogService.sellerProduct(productId, row.store_id, user.id) });
        }
        if (req.method === 'PATCH' && !section) return send(res, 200, await catalogService.updateProduct(productId, user.id, await body(req)));
        if (req.method === 'POST' && section === 'duplicate') return send(res, 201, await catalogService.duplicateProduct(productId, user.id));
        if (req.method === 'POST' && section === 'publish') return send(res, 200, await catalogService.setProductStatus(productId, user.id, 'active'));
        if (req.method === 'PATCH' && section === 'status') return send(res, 200, await catalogService.setProductStatus(productId, user.id, (await body(req)).status));
        if (req.method === 'POST' && section === 'variants' && !childId) return send(res, 201, await catalogService.saveVariant(productId, user.id, await body(req)));
        if (req.method === 'PATCH' && section === 'variants' && childId) return send(res, 200, await catalogService.saveVariant(productId, user.id, await body(req), childId));
        if (req.method === 'POST' && section === 'images' && !childId) return send(res, 201, await mediaService.upload(productId, user.id, await binaryBody(req), req.headers['content-type'], {
          variantId: req.headers['x-variant-id'] || null, position: req.headers['x-position'] || 0, isPrimary: req.headers['x-primary'] === 'true',
        }));
        if (req.method === 'PATCH' && section === 'images' && !childId) {
          const data = await body(req);
          return send(res, 200, await mediaService.reorder(productId, user.id, data.ids, data.primaryId));
        }
        if (req.method === 'DELETE' && section === 'images' && childId) return send(res, 200, await mediaService.remove(productId, childId, user.id));
      }
      const memberPath = /^\/seller\/stores\/([0-9a-f-]{36})\/members(?:\/([0-9a-f-]{36}))?$/i.exec(path);
      const invitationPath = /^\/seller\/stores\/([0-9a-f-]{36})\/invitations$/i.exec(path);
      const productPath = /^\/seller\/stores\/([0-9a-f-]{36})\/products(?:\/([0-9a-f-]{36}))?$/i.exec(path);
      if (productPath) {
        if (req.method === 'GET' && !productPath[2]) {
          await storeService.role(pool, productPath[1], user.id);
          const { rows } = await pool.query('SELECT id FROM catalog.products WHERE store_id=$1 ORDER BY created_at DESC', [productPath[1]]);
          return send(res, 200, { products: await Promise.all(rows.map(row => catalogService.sellerProduct(row.id, productPath[1], user.id))) });
        }
        if (req.method === 'POST' && !productPath[2]) return send(res, 201, await catalogService.createProduct(productPath[1], user.id, await body(req)));
        if (req.method === 'PATCH' && productPath[2]) {
          const data = await body(req);
          if ('status' in data) return send(res, 200, await catalogService.setProductStatus(productPath[2], user.id, data.status === 'published' ? 'active' : data.status));
          return send(res, 200, await catalogService.updateProduct(productPath[2], user.id, data));
        }
      }
      if (memberPath) {
        if (req.method === 'GET' && !memberPath[2]) return send(res, 200, await storeService.members(memberPath[1], user.id));
        if (req.method === 'DELETE' && memberPath[2]) return send(res, 200, await storeService.removeMember(memberPath[1], user.id, memberPath[2]));
      }
      if (invitationPath && req.method === 'POST') return send(res, 201, await storeService.invite(invitationPath[1], user.id, await body(req)));
      const match = /^\/seller\/stores\/([0-9a-f-]{36})(?:\/(settings|overview))?$/i.exec(path);
      if (match) {
        const [, id, section] = match;
        if (req.method === 'GET' && !section) return send(res, 200, { store: await storeService.manage(id, user.id) });
        if (req.method === 'PATCH' && !section) return send(res, 200, { store: await storeService.update(id, user.id, await body(req)) });
        if (req.method === 'PATCH' && section === 'settings') return send(res, 200, { store: await storeService.settings(id, user.id, await body(req)) });
        if (req.method === 'GET' && section === 'overview') return send(res, 200, await storeService.overview(id, user.id));
      }
      throw new StoreError(404, 'NOT_FOUND', 'Không tìm thấy API.');
    } catch (error) {
      const known = error instanceof StoreError || error instanceof PlatformAdminError;
      if (!known) console.error('Catalog request failed');
      send(res, known ? error.status : 500, {
        code: known ? error.code : 'INTERNAL_ERROR',
        message: known ? error.message : 'Lỗi hệ thống.',
        ...(error instanceof StoreError && error.details ? error.details : {}),
      });
    }
  };
}

export async function startServer() {
  await pool.query("SELECT to_regclass('catalog.stores') AS stores").then(result => {
    if (!result.rows[0].stores) throw new Error('Catalog schema missing; run catalog:migrate first.');
  });
  http.createServer(createHandler()).listen(port, () => console.log(`Catalog service listening on ${port}`));
  const timer = setInterval(() => syncMemberships().catch(()=>console.error('Catalog membership sync failed:')), 1000);
  let publishing = false;
  const eventTimer = setInterval(() => {
    if (publishing) return;
    publishing = true;
    (async () => { for (let index = 0; index < 10; index++) if (!(await publishInventoryEvent())) break; })()
      .catch(()=>console.error('Inventory event publish failed:'))
      .finally(() => { publishing = false; });
  }, 5000);
  let reconciling = false;
  const reconcileTimer = setInterval(() => {
    if (reconciling) return;
    reconciling = true;
    inventory.reconcile().catch(()=>console.error('Inventory reconciliation failed:'))
      .finally(() => { reconciling = false; });
  }, 30_000);
  process.on('SIGTERM', () => { clearInterval(timer); clearInterval(eventTimer); clearInterval(reconcileTimer); void pool.end(); });
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await startServer();
