import { createHash, randomBytes, randomUUID } from 'node:crypto';

export class StoreError extends Error {
  constructor(status, code, message) { super(message); this.status = status; this.code = code; }
}
const bad = (message = 'Dữ liệu không hợp lệ.') => new StoreError(400, 'INVALID_STORE', message);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
function url(value) {
  if (value == null || value === '') return null;
  if (typeof value !== 'string' || value.length > 2048) throw bad('URL ảnh phải dùng HTTPS.');
  try {
    const parsed = new URL(value);
    if (parsed.protocol === 'https:' && parsed.hostname) return parsed.href;
  } catch { /* Invalid URL. */ }
  throw bad('URL ảnh phải dùng HTTPS.');
}
const string = (value, min, max) => {
  if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max) throw bad();
  return value.trim();
};
const optionalString = (value, max) => value == null ? '' : string(value, 0, max);
const makeSlug = name => name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'd')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50).replace(/-$/g, '');
const cleanSlug = value => {
  if (typeof value !== 'string' || value.length < 3 || value.length > 60 || !slugPattern.test(value)) {
    throw new StoreError(400, 'INVALID_SLUG', 'Slug phải dài 3–60 ký tự, chỉ gồm chữ thường, số và dấu gạch ngang.');
  }
  return value;
};
const publicStore = row => ({
  id: row.id, slug: row.slug, name: row.name, description: row.description,
  logoUrl: row.logo_url, bannerUrl: row.banner_url, category: row.category,
  createdAt: row.created_at, status: row.status,
  productCount: row.product_count == null ? null : Number(row.product_count), rating: null, followers: null,
  ...(row.contact_info ? { contactInfo: row.contact_info } : {}),
  ...(row.business_hours ? { businessHours: row.business_hours } : {}),
});
export class StoreService {
  constructor(pool) { this.pool = pool; }
  async transaction(fn) {
    const db = await this.pool.connect();
    try { await db.query('BEGIN'); const result = await fn(db); await db.query('COMMIT'); return result; }
    catch (error) { await db.query('ROLLBACK'); throw error; }
    finally { db.release(); }
  }
  async role(db, storeId, userId) {
    if (!uuid.test(storeId)) throw new StoreError(404, 'STORE_NOT_FOUND', 'Không tìm thấy cửa hàng.');
    const { rows } = await db.query("SELECT role FROM catalog.store_members WHERE store_id=$1 AND user_id=$2 AND status='active'", [storeId, userId]);
    if (!rows[0]) throw new StoreError(403, 'STORE_FORBIDDEN', 'Không có quyền với cửa hàng này.');
    return rows[0].role;
  }
  async owner(db, storeId, userId) {
    if (await this.role(db, storeId, userId) !== 'owner') throw new StoreError(403, 'OWNER_REQUIRED', 'Chỉ chủ cửa hàng được thực hiện thao tác này.');
  }
  async create(user, body) {
    if (!user?.emailVerifiedAt) throw new StoreError(403, 'EMAIL_VERIFICATION_REQUIRED', 'Vui lòng xác minh email trước khi tạo cửa hàng.');
    const name = string(body.name, 3, 120);
    const description = optionalString(body.description, 4000);
    const contactEmail = string(body.contactEmail, 3, 254);
    const contactPhone = string(body.contactPhone, 9, 20);
    const pickupAddress = string(body.pickupAddress, 5, 500);
    const returnAddress = body.returnAddress == null ? pickupAddress : string(body.returnAddress, 5, 500);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) throw bad('Email liên hệ không hợp lệ.');
    const manualSlug = body.slug != null && body.slug !== '';
    const base = cleanSlug(manualSlug ? body.slug : makeSlug(name));
    const logoUrl = url(body.logoUrl);
    const bannerUrl = url(body.bannerUrl);
    const category = body.category == null ? null : string(body.category, 2, 80);
    const storeId = randomUUID();
    for (let attempt = 0; attempt < (manualSlug ? 1 : 100); attempt++) {
      const suffix = attempt ? `-${attempt + 1}` : '';
      const slug = cleanSlug(base.slice(0, 60 - suffix.length).replace(/-$/g, '') + suffix);
      try {
        return await this.transaction(async db => {
          const { rows } = await db.query(`INSERT INTO catalog.stores(id,owner_user_id,slug,name,description,logo_url,banner_url,category)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`, [storeId, user.id, slug, name, description, logoUrl, bannerUrl, category]);
          await db.query("INSERT INTO catalog.store_members(store_id,user_id,role) VALUES ($1,$2,'owner')", [storeId, user.id]);
          await db.query('INSERT INTO catalog.store_addresses(store_id,pickup_address,return_address) VALUES ($1,$2,$3)', [storeId, pickupAddress, returnAddress]);
          await db.query('INSERT INTO catalog.store_settings(store_id,contact_info) VALUES ($1,$2)', [storeId, { email: contactEmail, phone: contactPhone }]);
          await db.query('INSERT INTO catalog.store_audit_logs(store_id,actor_id,action,changed_fields) VALUES ($1,$2,$3,$4)', [storeId, user.id, 'created', JSON.stringify(['name', 'slug', 'contactInfo', 'pickupAddress'])]);
          await db.query('INSERT INTO catalog.store_outbox(event_type,payload) VALUES ($1,$2)', ['StoreCreated.v1', { storeId, ownerUserId: user.id, status: 'active' }]);
          return publicStore(rows[0]);
        });
      } catch (error) {
        if (error.code === '23505') {
          if (manualSlug) throw new StoreError(409, 'SLUG_TAKEN', 'Slug đã được sử dụng.');
          continue;
        }
        throw error;
      }
    }
    throw new StoreError(409, 'SLUG_TAKEN', 'Không thể tạo slug không trùng.');
  }
  async categories() {
    const { rows } = await this.pool.query(`SELECT DISTINCT category FROM catalog.stores
      WHERE status='active' AND category IS NOT NULL AND btrim(category)<>'' ORDER BY category`);
    return { categories: rows.map(row => row.category) };
  }
  async list({ page = 1, limit = 12, search = '', sort = 'newest', category = '', featured = false } = {}) {
    page = Number(page); limit = Number(limit);
    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 50 || typeof search !== 'string' || search.length > 100 || typeof category !== 'string' || category.length > 80 || !['newest', 'name'].includes(sort)) throw bad();
    const text = search.trim().replace(/[\\%_]/g, '\\$&');
    const where = `WHERE s.status='active' AND ($1='' OR
      unaccent(lower(s.name)) LIKE '%' || unaccent(lower($1)) || '%' ESCAPE '\\'
      OR s.slug LIKE '%' || lower($1) || '%' ESCAPE '\\')
      AND ($2='' OR s.category=$2)`;
    const order = sort === 'name' ? 's.name ASC, s.id ASC' : 's.created_at DESC, s.id DESC';
    const pageLimit = featured ? Math.min(limit, 8) : limit;
    const [count, result] = await Promise.all([
      this.pool.query(`SELECT count(*)::int AS total FROM catalog.stores s ${where}`, [text, category]),
      this.pool.query(`WITH RECURSIVE active_categories AS (
        SELECT id FROM catalog.categories WHERE parent_id IS NULL AND is_active=true
        UNION ALL SELECT c.id FROM catalog.categories c JOIN active_categories a ON c.parent_id=a.id WHERE c.is_active=true)
        SELECT s.*, (SELECT count(*)::int FROM catalog.products p WHERE p.store_id=s.id AND p.status IN ('active','published')
        AND (p.category_id IS NULL OR p.category_id IN (SELECT id FROM active_categories))
        AND EXISTS (SELECT 1 FROM catalog.product_variants v LEFT JOIN catalog.inventory i ON i.variant_id=v.id
          WHERE v.product_id=p.id AND v.status='active' AND coalesce(i.on_hand-i.reserved,v.stock)>0)) AS product_count
        FROM catalog.stores s ${where} ORDER BY ${order} LIMIT $3 OFFSET $4`, [text, category, pageLimit, (page - 1) * pageLimit]),
    ]);
    return { stores: result.rows.map(publicStore), page, limit: pageLimit, total: count.rows[0].total };
  }
  async publicBySlug(slug) {
    const { rows } = await this.pool.query(`WITH RECURSIVE active_categories AS (
      SELECT id FROM catalog.categories WHERE parent_id IS NULL AND is_active=true
      UNION ALL SELECT c.id FROM catalog.categories c JOIN active_categories a ON c.parent_id=a.id WHERE c.is_active=true)
      SELECT s.*,t.contact_info,t.business_hours,
      (SELECT count(*)::int FROM catalog.products p WHERE p.store_id=s.id AND p.status IN ('active','published')
        AND (p.category_id IS NULL OR p.category_id IN (SELECT id FROM active_categories))
        AND EXISTS (SELECT 1 FROM catalog.product_variants v LEFT JOIN catalog.inventory i ON i.variant_id=v.id
          WHERE v.product_id=p.id AND v.status='active' AND coalesce(i.on_hand-i.reserved,v.stock)>0)) AS product_count FROM catalog.stores s
      JOIN catalog.store_settings t ON t.store_id=s.id WHERE s.slug=$1 AND s.status='active'`, [slug]);
    if (!rows[0]) throw new StoreError(404, 'STORE_NOT_FOUND', 'Không tìm thấy cửa hàng.');
    return publicStore(rows[0]);
  }
  async checkoutPolicy(storeId) {
    if (!uuid.test(storeId)) throw new StoreError(404, 'STORE_NOT_FOUND', 'Không tìm thấy cửa hàng.');
    const { rows } = await this.pool.query(`SELECT s.status,t.accepting_orders FROM catalog.stores s
      JOIN catalog.store_settings t ON t.store_id=s.id WHERE s.id=$1`, [storeId]);
    if (!rows[0]) throw new StoreError(404, 'STORE_NOT_FOUND', 'Không tìm thấy cửa hàng.');
    return { storeId, acceptingOrders: rows[0].status === 'active' && rows[0].accepting_orders };
  }
  async mine(userId) {
    const { rows } = await this.pool.query(`SELECT s.*,m.role FROM catalog.stores s JOIN catalog.store_members m ON m.store_id=s.id
      WHERE m.user_id=$1 AND m.status='active' ORDER BY s.created_at DESC`, [userId]);
    return { stores: rows.map(row => ({ ...publicStore(row), role: row.role })) };
  }
  async manage(storeId, userId) {
    const role = await this.role(this.pool, storeId, userId);
    const { rows } = await this.pool.query(`SELECT s.*,a.pickup_address,a.return_address,t.accepting_orders,t.business_hours,t.contact_info
      FROM catalog.stores s JOIN catalog.store_addresses a ON a.store_id=s.id JOIN catalog.store_settings t ON t.store_id=s.id WHERE s.id=$1`, [storeId]);
    return { ...publicStore(rows[0]), role, pickupAddress: rows[0].pickup_address, returnAddress: rows[0].return_address,
      acceptingOrders: rows[0].accepting_orders, businessHours: rows[0].business_hours, contactInfo: rows[0].contact_info };
  }
  async update(storeId, userId, body) {
    const allowed = ['name', 'description', 'logoUrl', 'bannerUrl', 'category', 'pickupAddress', 'returnAddress'];
    const fields = Object.keys(body);
    if (!fields.length || fields.some(key => !allowed.includes(key))) throw bad('Không thể sửa trường này.');
    const values = {};
    if ('name' in body) values.name = string(body.name, 3, 120);
    if ('description' in body) values.description = optionalString(body.description, 4000);
    if ('logoUrl' in body) values.logo_url = url(body.logoUrl);
    if ('bannerUrl' in body) values.banner_url = url(body.bannerUrl);
    if ('category' in body) values.category = body.category == null ? null : string(body.category, 2, 80);
    if ('pickupAddress' in body) values.pickup_address = string(body.pickupAddress, 5, 500);
    if ('returnAddress' in body) values.return_address = string(body.returnAddress, 5, 500);
    await this.transaction(async db => {
      await this.owner(db, storeId, userId);
      const mainKeys = Object.keys(values).filter(key => !key.endsWith('_address'));
      if (mainKeys.length) await db.query(`UPDATE catalog.stores SET ${mainKeys.map((key, i) => `${key}=$${i + 2}`).join(',')},updated_at=now() WHERE id=$1`, [storeId, ...mainKeys.map(key => values[key])]);
      const addressKeys = Object.keys(values).filter(key => key.endsWith('_address'));
      if (addressKeys.length) await db.query(`UPDATE catalog.store_addresses SET ${addressKeys.map((key, i) => `${key}=$${i + 2}`).join(',')} WHERE store_id=$1`, [storeId, ...addressKeys.map(key => values[key])]);
      await db.query('INSERT INTO catalog.store_audit_logs(store_id,actor_id,action,changed_fields) VALUES ($1,$2,$3,$4)', [storeId, userId, 'updated', JSON.stringify(fields)]);
    });
    return this.manage(storeId, userId);
  }
  async settings(storeId, userId, body) {
    const fields = Object.keys(body);
    if (!fields.length || fields.some(key => !['acceptingOrders', 'businessHours', 'contactInfo'].includes(key))) throw bad();
    if ('acceptingOrders' in body && typeof body.acceptingOrders !== 'boolean') throw bad();
    if ('businessHours' in body && (typeof body.businessHours !== 'object' || body.businessHours === null || Array.isArray(body.businessHours))) throw bad();
    if ('contactInfo' in body && (typeof body.contactInfo !== 'object' || body.contactInfo === null || Array.isArray(body.contactInfo))) throw bad();
    if ('contactInfo' in body) {
      const contact = body.contactInfo;
      if (Object.keys(contact).some(key => !['email', 'phone'].includes(key)) ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(contact.email || '')) ||
        typeof contact.phone !== 'string' || contact.phone.length < 9 || contact.phone.length > 20) throw bad('Thông tin liên hệ không hợp lệ.');
    }
    if ('businessHours' in body && JSON.stringify(body.businessHours).length > 4000) throw bad('Lịch hoạt động quá dài.');
    await this.transaction(async db => {
      await this.owner(db, storeId, userId);
      const locked = await db.query('SELECT platform_suspended FROM catalog.stores WHERE id=$1 FOR UPDATE',[storeId]);
      if (locked.rows[0]?.platform_suspended && body.acceptingOrders === true)
        throw new StoreError(409,'PLATFORM_SUSPENDED','Cửa hàng đang bị sàn tạm ngừng. Vui lòng liên hệ quản trị viên để mở lại.');
      const columns = { acceptingOrders: 'accepting_orders', businessHours: 'business_hours', contactInfo: 'contact_info' };
      await db.query(`UPDATE catalog.store_settings SET ${fields.map((key, i) => `${columns[key]}=$${i + 2}`).join(',')} WHERE store_id=$1`, [storeId, ...fields.map(key => body[key])]);
      if ('acceptingOrders' in body) {
        const status = body.acceptingOrders ? 'active' : 'paused';
        await db.query('UPDATE catalog.stores SET status=$2,updated_at=now() WHERE id=$1', [storeId, status]);
        await db.query('INSERT INTO catalog.store_outbox(event_type,payload) VALUES ($1,$2)', ['StoreStatusChanged.v1', { storeId, status, acceptingOrders: body.acceptingOrders }]);
      }
      await db.query('INSERT INTO catalog.store_audit_logs(store_id,actor_id,action,changed_fields) VALUES ($1,$2,$3,$4)', [storeId, userId, 'settings_updated', JSON.stringify(fields)]);
    });
    return this.manage(storeId, userId);
  }
  async overview(storeId, userId) {
    const store = await this.manage(storeId, userId);
    const { rows } = await this.pool.query('SELECT count(*)::int AS total FROM catalog.products WHERE store_id=$1', [storeId]);
    return { store, metrics: { productCount: rows[0].total, pendingOrderCount: null, recognizedRevenue: null, sourceStatus: 'orders_unavailable' } };
  }
  async members(storeId, userId) {
    await this.role(this.pool, storeId, userId);
    const { rows } = await this.pool.query("SELECT user_id AS \"userId\",role,status,joined_at AS \"joinedAt\" FROM catalog.store_members WHERE store_id=$1 AND status='active' ORDER BY joined_at", [storeId]);
    return { members: rows };
  }
  async invite(storeId, userId, body) {
    const email = string(body.email, 3, 254).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || Object.keys(body).some(key => key !== 'email')) throw bad('Email không hợp lệ.');
    const token = randomBytes(32).toString('base64url');
    const hash = createHash('sha256').update(token).digest('hex');
    await this.transaction(async db => {
      await this.owner(db, storeId, userId);
      await db.query("INSERT INTO catalog.store_invitations(store_id,email,token_hash,expires_at) VALUES ($1,$2,$3,now()+interval '7 days')", [storeId, email, hash]);
      await db.query('INSERT INTO catalog.store_audit_logs(store_id,actor_id,action,changed_fields) VALUES ($1,$2,$3,$4)', [storeId, userId, 'member_invited', JSON.stringify(['members'])]);
    });
    return { token, email, expiresInDays: 7 };
  }
  async acceptInvite(user, body) {
    if (typeof body.token !== 'string' || body.token.length > 100 || Object.keys(body).some(key => key !== 'token')) throw bad();
    const hash = createHash('sha256').update(body.token).digest('hex');
    return this.transaction(async db => {
      const { rows } = await db.query('SELECT * FROM catalog.store_invitations WHERE token_hash=$1 FOR UPDATE', [hash]);
      const invite = rows[0];
      if (!invite || invite.accepted_at || invite.expires_at <= new Date() || invite.email !== user.email.toLowerCase()) throw new StoreError(400, 'INVALID_INVITATION', 'Lời mời không hợp lệ hoặc đã hết hạn.');
      const member = await db.query(`INSERT INTO catalog.store_members(store_id,user_id,role,status) VALUES ($1,$2,'staff','active')
        ON CONFLICT (store_id,user_id) DO UPDATE SET status='active' WHERE catalog.store_members.role='staff'`, [invite.store_id, user.id]);
      if (!member.rowCount) throw new StoreError(409, 'ALREADY_OWNER', 'Chủ cửa hàng đã là thành viên.');
      await db.query('UPDATE catalog.store_invitations SET accepted_at=now() WHERE id=$1', [invite.id]);
      await db.query('INSERT INTO catalog.store_audit_logs(store_id,actor_id,action,changed_fields) VALUES ($1,$2,$3,$4)', [invite.store_id, user.id, 'member_joined', JSON.stringify(['members'])]);
      await db.query('INSERT INTO catalog.store_outbox(event_type,payload) VALUES ($1,$2)', ['StoreMemberAdded.v1', { storeId: invite.store_id, userId: user.id, role: 'staff' }]);
      return { storeId: invite.store_id, role: 'staff' };
    });
  }
  async removeMember(storeId, ownerId, memberId) {
    if (!uuid.test(memberId)) throw bad();
    return this.transaction(async db => {
      await this.owner(db, storeId, ownerId);
      const { rows } = await db.query("UPDATE catalog.store_members SET status='removed' WHERE store_id=$1 AND user_id=$2 AND role='staff' AND status='active' RETURNING user_id", [storeId, memberId]);
      if (!rows[0]) throw new StoreError(404, 'MEMBER_NOT_FOUND', 'Không tìm thấy nhân viên.');
      await db.query('INSERT INTO catalog.store_audit_logs(store_id,actor_id,action,changed_fields) VALUES ($1,$2,$3,$4)', [storeId, ownerId, 'member_removed', JSON.stringify(['members'])]);
      await db.query('INSERT INTO catalog.store_outbox(event_type,payload) VALUES ($1,$2)', ['StoreMemberRemoved.v1', { storeId, userId: memberId }]);
      return { removed: true };
    });
  }
}
