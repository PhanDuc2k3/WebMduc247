import { StoreError } from './store.service.js';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const invalid = (code = 'INVALID_INVENTORY', message = 'Dữ liệu tồn kho không hợp lệ.') => new StoreError(400, code, message);
const quantity = value => {
  if (!Number.isInteger(value) || value < 1 || value > 1_000_000) throw invalid('INVALID_QUANTITY', 'Số lượng phải là số nguyên dương.');
  return value;
};
const reservationDto = row => ({ id: row.id, variantId: row.variant_id, orderRef: row.order_ref, quantity: row.quantity,
  status: row.status, expiresAt: row.expires_at, createdAt: row.created_at });
const balanceDto = row => ({ variantId: row.variant_id, onHand: row.on_hand, reserved: row.reserved,
  available: row.on_hand - row.reserved, version: Number(row.version), updatedAt: row.updated_at });

export class InventoryService {
  constructor(pool, stores) { this.pool = pool; this.stores = stores; }
  transaction(fn) { return this.stores.transaction(fn); }
  async authorizeSellerVariant(variantId, userId) {
    if (!uuid.test(String(variantId))) throw new StoreError(404, 'VARIANT_NOT_FOUND', 'Không tìm thấy SKU.');
    const { rows } = await this.pool.query('SELECT store_id FROM catalog.product_variants WHERE id=$1', [variantId]);
    if (!rows[0]) throw new StoreError(404, 'VARIANT_NOT_FOUND', 'Không tìm thấy SKU.');
    await this.stores.role(this.pool, rows[0].store_id, userId);
  }
  async lock(db, variantId) {
    if (!uuid.test(String(variantId))) throw new StoreError(404, 'VARIANT_NOT_FOUND', 'Không tìm thấy SKU.');
    await db.query(`INSERT INTO catalog.inventory(variant_id,on_hand)
      SELECT id,stock FROM catalog.product_variants WHERE id=$1 ON CONFLICT (variant_id) DO NOTHING`, [variantId]);
    const { rows } = await db.query(`WITH RECURSIVE active_categories AS (
      SELECT id FROM catalog.categories WHERE parent_id IS NULL AND is_active=true
      UNION ALL SELECT c.id FROM catalog.categories c JOIN active_categories a ON c.parent_id=a.id WHERE c.is_active=true)
      SELECT i.*,v.status AS variant_status,v.product_id,v.store_id,p.status AS product_status,
        s.status AS store_status,t.accepting_orders,
        (p.category_id IS NULL OR p.category_id IN (SELECT id FROM active_categories)) AS category_visible
      FROM catalog.inventory i JOIN catalog.product_variants v ON v.id=i.variant_id
      JOIN catalog.products p ON p.id=v.product_id
      JOIN catalog.stores s ON s.id=v.store_id
      JOIN catalog.store_settings t ON t.store_id=s.id
      WHERE i.variant_id=$1 FOR UPDATE OF i`, [variantId]);
    if (!rows[0]) throw new StoreError(404, 'VARIANT_NOT_FOUND', 'Không tìm thấy SKU.');
    return rows[0];
  }
  async event(db, type, payload) {
    await db.query('INSERT INTO catalog.store_outbox(event_type,payload) VALUES ($1,$2)', [type, payload]);
  }
  async movement(db, variantId, delta, reason, reference, actorId, source) {
    await db.query(`INSERT INTO catalog.inventory_movements(variant_id,delta,reason,reference,actor_id,source)
      VALUES ($1,$2,$3,$4,$5,$6)`, [variantId, delta, reason, reference || null, actorId || null, source]);
  }
  async expireLocked(db, variantId) {
    const { rows } = await db.query(`UPDATE catalog.inventory_reservations SET status='EXPIRED',updated_at=now()
      WHERE variant_id=$1 AND status='ACTIVE' AND expires_at<=now() RETURNING *`, [variantId]);
    if (!rows.length) return 0;
    const released = rows.reduce((sum, row) => sum + row.quantity, 0);
    await db.query('UPDATE catalog.inventory SET reserved=reserved-$2,version=version+1,updated_at=now() WHERE variant_id=$1', [variantId, released]);
    for (const row of rows) {
      await this.movement(db, variantId, 0, 'reservation_expired', row.order_ref, null, 'reservation');
      await this.event(db, 'InventoryReservationExpired.v1', { reservationId: row.id, variantId, orderRef: row.order_ref, quantity: row.quantity });
    }
    return rows.length;
  }
  async availability(variantId, requested = 1) {
    const amount = quantity(Number(requested));
    return this.transaction(async db => {
      const locked = await this.lock(db, variantId);
      await this.expireLocked(db, variantId);
      const { rows } = await db.query(`SELECT i.*,v.status AS variant_status,p.status AS product_status,
        s.status AS store_status,t.accepting_orders
        FROM catalog.inventory i JOIN catalog.product_variants v ON v.id=i.variant_id
        JOIN catalog.products p ON p.id=v.product_id JOIN catalog.stores s ON s.id=v.store_id
        JOIN catalog.store_settings t ON t.store_id=s.id WHERE i.variant_id=$1`, [variantId]);
      const row = rows[0];
      const sellable = row.variant_status === 'active' && ['active','published'].includes(row.product_status) &&
        row.store_status === 'active' && row.accepting_orders && locked.category_visible;
      return { ...balanceDto(row), sellable, canFulfill: sellable && row.on_hand - row.reserved >= amount, requested: amount };
    });
  }
  async quote(variantId, requested = 1) {
    const availability = await this.availability(variantId, requested);
    const { rows } = await this.pool.query(`SELECT v.id AS variant_id,v.sku,v.attributes_json,v.price_minor,v.sale_price_minor,
      v.sale_starts_at,v.sale_ends_at,p.id AS product_id,p.name AS product_name,p.brand,p.category_id,
      p.image_url,p.seed_key,
      s.id AS store_id,s.name AS store_name,s.slug AS store_slug,
      (SELECT object_key FROM catalog.product_images WHERE product_id=p.id
        AND (variant_id IS NULL OR variant_id=v.id) ORDER BY (variant_id=v.id) DESC,position,id LIMIT 1) AS image_key
      FROM catalog.product_variants v JOIN catalog.products p ON p.id=v.product_id
      JOIN catalog.stores s ON s.id=v.store_id WHERE v.id=$1`, [variantId]);
    const row = rows[0];
    if (!row) throw new StoreError(404, 'VARIANT_NOT_FOUND', 'Không tìm thấy SKU.');
    const saleActive = row.sale_price_minor != null &&
      (!row.sale_starts_at || new Date(row.sale_starts_at) <= new Date()) &&
      (!row.sale_ends_at || new Date(row.sale_ends_at) > new Date());
    return { ...availability, sku: row.sku, attributes: row.attributes_json,
      productId: row.product_id, productName: row.product_name, brand: row.brand,categoryId:row.category_id,
      storeId: row.store_id, storeName: row.store_name, storeSlug: row.store_slug,
      imageKey: row.image_key, seedImageUrl: row.seed_key && /^https:\/\//.test(row.image_url || '') ? row.image_url : null,
      currency: 'VND', priceMinor: Number(saleActive ? row.sale_price_minor : row.price_minor),
      priceOriginalMinor: Number(row.price_minor), saleStartsAt: row.sale_starts_at, saleEndsAt: row.sale_ends_at };
  }
  async reserve(input) {
    const variantId = input?.variantId;
    if (!uuid.test(String(variantId))) throw invalid('INVALID_VARIANT');
    const amount = quantity(input.quantity);
    const orderRef = input.orderRef;
    const key = input.idempotencyKey;
    const ttlSeconds = input.ttlSeconds == null ? 900 : Number(input.ttlSeconds);
    if (typeof orderRef !== 'string' || !orderRef.trim() || orderRef.length > 120 ||
      typeof key !== 'string' || !key.trim() || key.length > 120 ||
      !Number.isInteger(ttlSeconds) || ttlSeconds < 30 || ttlSeconds > 1800) throw invalid();
    const findExisting = async () => {
      const { rows } = await this.pool.query('SELECT * FROM catalog.inventory_reservations WHERE idempotency_key=$1', [key]);
      const existing = rows[0];
      if (!existing) return null;
      if (existing.variant_id !== variantId || existing.order_ref !== orderRef || existing.quantity !== amount) {
        throw new StoreError(409, 'IDEMPOTENCY_CONFLICT', 'Khóa idempotency đã dùng cho yêu cầu khác.');
      }
      return { reservation: reservationDto(existing), idempotent: true };
    };
    const existing = await findExisting();
    if (existing) {
      if (existing.reservation.status === 'ACTIVE' && new Date(existing.reservation.expiresAt) <= new Date()) {
        await this.expireVariant(variantId);
        return findExisting();
      }
      return existing;
    }
    try {
      const result = await this.transaction(async db => {
        const locked = await this.lock(db, variantId);
        await this.expireLocked(db, variantId);
        const repeated = await db.query('SELECT * FROM catalog.inventory_reservations WHERE idempotency_key=$1', [key]);
        if (repeated.rows[0]) {
          const row = repeated.rows[0];
          if (row.variant_id !== variantId || row.order_ref !== orderRef || row.quantity !== amount) {
            throw new StoreError(409, 'IDEMPOTENCY_CONFLICT', 'Khóa idempotency đã dùng cho yêu cầu khác.');
          }
          return { reservation: reservationDto(row), idempotent: true };
        }
        if (locked.variant_status !== 'active' || !['active','published'].includes(locked.product_status) ||
          locked.store_status !== 'active' || !locked.accepting_orders || !locked.category_visible) {
          return { error: { code: 'SKU_NOT_SELLABLE', message: 'SKU hoặc cửa hàng hiện không nhận đơn.' } };
        }
        const fresh = await db.query('SELECT on_hand,reserved FROM catalog.inventory WHERE variant_id=$1', [variantId]);
        const available = fresh.rows[0].on_hand - fresh.rows[0].reserved;
        if (available < amount) {
          return { error: { code: 'INSUFFICIENT_STOCK', message: `Chỉ còn ${available} sản phẩm.`, available } };
        }
        const { rows } = await db.query(`INSERT INTO catalog.inventory_reservations(variant_id,order_ref,quantity,expires_at,idempotency_key)
          VALUES ($1,$2,$3,now()+($4 * interval '1 second'),$5) RETURNING *`, [variantId, orderRef, amount, ttlSeconds, key]);
        await db.query('UPDATE catalog.inventory SET reserved=reserved+$2,version=version+1,updated_at=now() WHERE variant_id=$1', [variantId, amount]);
        await this.movement(db, variantId, 0, 'reservation_created', orderRef, null, 'reservation');
        await this.event(db, 'InventoryReserved.v1', { reservationId: rows[0].id, variantId, orderRef, quantity: amount });
        return { reservation: reservationDto(rows[0]), idempotent: false };
      });
      if (result.error) {
        const error = new StoreError(409, result.error.code, result.error.message);
        if (result.error.available !== undefined) error.details = { available: result.error.available };
        throw error;
      }
      return result;
    } catch (error) {
      if (error.code === '23505') {
        const repeated = await findExisting();
        if (repeated) return repeated;
      }
      throw error;
    }
  }
  async transition(id, action) {
    if (!uuid.test(String(id))) throw new StoreError(404, 'RESERVATION_NOT_FOUND', 'Không tìm thấy reservation.');
    const lookup = await this.pool.query('SELECT variant_id FROM catalog.inventory_reservations WHERE id=$1', [id]);
    if (!lookup.rows[0]) throw new StoreError(404, 'RESERVATION_NOT_FOUND', 'Không tìm thấy reservation.');
    const variantId = lookup.rows[0].variant_id;
    const result = await this.transaction(async db => {
      await this.lock(db, variantId);
      await this.expireLocked(db, variantId);
      const { rows } = await db.query('SELECT * FROM catalog.inventory_reservations WHERE id=$1 FOR UPDATE', [id]);
      const row = rows[0];
      if (!row) return { missing: true };
      if (row.status !== 'ACTIVE') {
        if (row.status === 'COMMITTED' && action === 'commit') return { reservation: reservationDto(row), idempotent: true };
        if (['RELEASED','EXPIRED'].includes(row.status) && action === 'release') return { reservation: reservationDto(row), idempotent: true };
        await this.movement(db, variantId, 0, `invalid_${action}_after_${row.status.toLowerCase()}`, row.order_ref, null, 'reservation');
        return { conflict: row.status };
      }
      if (action === 'commit') {
        await db.query(`UPDATE catalog.inventory SET on_hand=on_hand-$2,reserved=reserved-$2,version=version+1,updated_at=now()
          WHERE variant_id=$1`, [variantId, row.quantity]);
        await db.query('UPDATE catalog.product_variants SET stock=stock-$2 WHERE id=$1', [variantId, row.quantity]);
        await this.movement(db, variantId, -row.quantity, 'reservation_committed', row.order_ref, null, 'reservation');
        await this.event(db, 'InventoryCommitted.v1', { reservationId: id, variantId, orderRef: row.order_ref, quantity: row.quantity });
      } else {
        await db.query('UPDATE catalog.inventory SET reserved=reserved-$2,version=version+1,updated_at=now() WHERE variant_id=$1', [variantId, row.quantity]);
        await this.movement(db, variantId, 0, 'reservation_released', row.order_ref, null, 'reservation');
        await this.event(db, 'InventoryReleased.v1', { reservationId: id, variantId, orderRef: row.order_ref, quantity: row.quantity });
      }
      const status = action === 'commit' ? 'COMMITTED' : 'RELEASED';
      const updated = await db.query('UPDATE catalog.inventory_reservations SET status=$2,updated_at=now() WHERE id=$1 RETURNING *', [id, status]);
      return { reservation: reservationDto(updated.rows[0]), idempotent: false };
    });
    if (result.missing) throw new StoreError(404, 'RESERVATION_NOT_FOUND', 'Không tìm thấy reservation.');
    if (result.conflict) throw new StoreError(409, 'INVALID_RESERVATION_STATE', `Reservation đã ở trạng thái ${result.conflict}.`);
    return result;
  }
  async commitBatch(ids) {
    if (!Array.isArray(ids) || ids.length < 1 || ids.length > 100 ||
      ids.some(id => !uuid.test(String(id))) || new Set(ids).size !== ids.length)
      throw invalid('INVALID_RESERVATIONS', 'Danh sách reservation không hợp lệ.');
    const lookup = await this.pool.query('SELECT id,variant_id FROM catalog.inventory_reservations WHERE id=ANY($1::uuid[])', [ids]);
    if (lookup.rows.length !== ids.length) throw new StoreError(404, 'RESERVATION_NOT_FOUND', 'Không tìm thấy reservation.');
    for (const variantId of [...new Set(lookup.rows.map(row => row.variant_id))].sort()) await this.expireVariant(variantId);
    return this.transaction(async db => {
      const found = await db.query('SELECT id,variant_id FROM catalog.inventory_reservations WHERE id=ANY($1::uuid[])', [ids]);
      if (found.rows.length !== ids.length) throw new StoreError(404, 'RESERVATION_NOT_FOUND', 'Không tìm thấy reservation.');
      for (const variantId of [...new Set(found.rows.map(row => row.variant_id))].sort()) {
        await this.lock(db, variantId);
        await this.expireLocked(db, variantId);
      }
      const { rows } = await db.query('SELECT * FROM catalog.inventory_reservations WHERE id=ANY($1::uuid[]) ORDER BY id FOR UPDATE', [ids]);
      if (rows.every(row => row.status === 'COMMITTED')) return { reservations: rows.map(reservationDto), idempotent: true };
      if (rows.some(row => row.status !== 'ACTIVE') || new Set(rows.map(row => row.order_ref)).size !== 1)
        throw new StoreError(409, 'INVALID_RESERVATION_STATE', 'Không thể xác nhận toàn bộ reservation.');
      for (const row of rows) {
        await db.query(`UPDATE catalog.inventory SET on_hand=on_hand-$2,reserved=reserved-$2,
          version=version+1,updated_at=now() WHERE variant_id=$1`, [row.variant_id,row.quantity]);
        await db.query('UPDATE catalog.product_variants SET stock=stock-$2 WHERE id=$1', [row.variant_id,row.quantity]);
        await this.movement(db,row.variant_id,-row.quantity,'reservation_committed',row.order_ref,null,'reservation');
        await this.event(db,'InventoryCommitted.v1',{ reservationId:row.id,variantId:row.variant_id,
          orderRef:row.order_ref,quantity:row.quantity });
      }
      const updated = await db.query(`UPDATE catalog.inventory_reservations SET status='COMMITTED',updated_at=now()
        WHERE id=ANY($1::uuid[]) RETURNING *`, [ids]);
      return { reservations:updated.rows.map(reservationDto), idempotent:false };
    });
  }
  async reservation(id) {
    if (!uuid.test(String(id))) throw new StoreError(404, 'RESERVATION_NOT_FOUND', 'Không tìm thấy reservation.');
    const { rows } = await this.pool.query('SELECT * FROM catalog.inventory_reservations WHERE id=$1', [id]);
    if (!rows[0]) throw new StoreError(404, 'RESERVATION_NOT_FOUND', 'Không tìm thấy reservation.');
    return { reservation: reservationDto(rows[0]) };
  }
  async restockBatch(ids, cancellationKey) {
    if (!Array.isArray(ids) || ids.length < 1 || ids.length > 100 ||
      ids.some(id => !uuid.test(String(id))) || new Set(ids).size !== ids.length ||
      typeof cancellationKey !== 'string' || !/^[\w:-]{8,120}$/.test(cancellationKey))
      throw invalid('INVALID_RESTOCK', 'Yêu cầu hoàn tồn không hợp lệ.');
    const ordered = [...ids].sort();
    return this.transaction(async db => {
      await db.query('SELECT pg_advisory_xact_lock(hashtext($1))', [cancellationKey]);
      const existing = await db.query('SELECT reservation_ids FROM catalog.inventory_order_restocks WHERE cancellation_key=$1 FOR UPDATE', [cancellationKey]);
      if (existing.rows[0]) {
        if (JSON.stringify([...existing.rows[0].reservation_ids].sort()) !== JSON.stringify(ordered))
          throw new StoreError(409,'IDEMPOTENCY_CONFLICT','Khóa hoàn tồn đã dùng cho yêu cầu khác.');
        return { restocked:true,idempotent:true };
      }
      const lookup = await db.query('SELECT id,variant_id FROM catalog.inventory_reservations WHERE id=ANY($1::uuid[])', [ids]);
      if (lookup.rows.length !== ids.length) throw new StoreError(404,'RESERVATION_NOT_FOUND','Không tìm thấy reservation.');
      for (const variantId of [...new Set(lookup.rows.map(row => row.variant_id))].sort()) await this.lock(db,variantId);
      const { rows } = await db.query('SELECT * FROM catalog.inventory_reservations WHERE id=ANY($1::uuid[]) ORDER BY id FOR UPDATE', [ids]);
      if (rows.some(row => row.status !== 'COMMITTED'))
        throw new StoreError(409,'INVALID_RESERVATION_STATE','Chỉ hoàn tồn cho hàng đã trừ.');
      for (const row of rows) {
        await db.query('UPDATE catalog.inventory SET on_hand=on_hand+$2,version=version+1,updated_at=now() WHERE variant_id=$1',
          [row.variant_id,row.quantity]);
        await db.query('UPDATE catalog.product_variants SET stock=stock+$2 WHERE id=$1', [row.variant_id,row.quantity]);
        await this.movement(db,row.variant_id,row.quantity,'order_cancelled',cancellationKey,null,'reservation');
        await this.event(db,'InventoryRestocked.v1',{ reservationId:row.id,variantId:row.variant_id,
          quantity:row.quantity,cancellationKey });
      }
      await db.query('INSERT INTO catalog.inventory_order_restocks(cancellation_key,reservation_ids) VALUES ($1,$2)', [cancellationKey,ordered]);
      return { restocked:true,idempotent:false };
    });
  }
  commit(id) { return this.transition(id, 'commit'); }
  release(id) { return this.transition(id, 'release'); }
  async sellerInventory(variantId, userId, { page = 1, limit = 20 } = {}) {
    page = Number(page); limit = Number(limit);
    if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 50) throw invalid();
    await this.authorizeSellerVariant(variantId, userId);
    return this.transaction(async db => {
      const locked = await this.lock(db, variantId);
      await this.stores.role(db, locked.store_id, userId);
      await this.expireLocked(db, variantId);
      const balance = await db.query('SELECT * FROM catalog.inventory WHERE variant_id=$1', [variantId]);
      const count = await db.query('SELECT count(*)::int AS total FROM catalog.inventory_movements WHERE variant_id=$1', [variantId]);
      const history = await db.query(`SELECT id,delta,reason,reference,actor_id AS "actorId",source,occurred_at AS "occurredAt"
        FROM catalog.inventory_movements WHERE variant_id=$1 ORDER BY occurred_at DESC,id DESC LIMIT $2 OFFSET $3`,
        [variantId, limit, (page - 1) * limit]);
      return { ...balanceDto(balance.rows[0]), movements: history.rows, total: count.rows[0].total, page, limit };
    });
  }
  async adjust(variantId, userId, body) {
    const delta = body?.delta;
    const reason = body?.reason;
    const reference = body?.reference == null ? null : String(body.reference);
    if (!Number.isInteger(delta) || delta === 0 || Math.abs(delta) > 1_000_000 ||
      typeof reason !== 'string' || reason.trim().length < 3 || reason.length > 300 ||
      (reference && reference.length > 120)) throw invalid('INVALID_ADJUSTMENT');
    await this.authorizeSellerVariant(variantId, userId);
    const result = await this.transaction(async db => {
      const locked = await this.lock(db, variantId);
      await this.stores.role(db, locked.store_id, userId);
      await this.expireLocked(db, variantId);
      const fresh = await db.query('SELECT * FROM catalog.inventory WHERE variant_id=$1', [variantId]);
      const row = fresh.rows[0];
      const next = row.on_hand + delta;
      if (next > 1_000_000) return { overLimit: true };
      if (next < 0 || next < row.reserved) return { denied: row.on_hand - row.reserved };
      await db.query('UPDATE catalog.inventory SET on_hand=$2,version=version+1,updated_at=now() WHERE variant_id=$1', [variantId, next]);
      await db.query('UPDATE catalog.product_variants SET stock=$2 WHERE id=$1', [variantId, next]);
      await this.movement(db, variantId, delta, reason.trim(), reference, userId, 'seller');
      await this.event(db, 'InventoryAdjusted.v1', { variantId, delta, actorId: userId, reference });
      if (next - row.reserved === 0) await this.event(db, 'InventoryOutOfStock.v1', { variantId });
      const balance = await db.query('SELECT * FROM catalog.inventory WHERE variant_id=$1', [variantId]);
      return balanceDto(balance.rows[0]);
    });
    if (result.denied !== undefined) {
      const error = new StoreError(409, 'STOCK_BELOW_RESERVED', 'Không thể giảm tồn thấp hơn số hàng đang giữ.');
      error.details = { available: result.denied };
      throw error;
    }
    if (result.overLimit) throw new StoreError(409, 'STOCK_LIMIT', 'Tồn kho vượt giới hạn 1.000.000 đơn vị.');
    return result;
  }
  async expireVariant(variantId) {
    return this.transaction(async db => { await this.lock(db, variantId); return this.expireLocked(db, variantId); });
  }
  async reconcile(limit = 100) {
    const expired = await this.pool.query(`SELECT DISTINCT variant_id FROM catalog.inventory_reservations
      WHERE status='ACTIVE' AND expires_at<=now() LIMIT $1`, [limit]);
    let expiredCount = 0;
    for (const row of expired.rows) expiredCount += await this.expireVariant(row.variant_id);
    const anomalies = await this.pool.query(`SELECT i.variant_id,i.on_hand,i.reserved,
      coalesce(sum(r.quantity) FILTER (WHERE r.status='ACTIVE'),0)::int AS expected
      FROM catalog.inventory i LEFT JOIN catalog.inventory_reservations r ON r.variant_id=i.variant_id
      GROUP BY i.variant_id HAVING i.reserved<>coalesce(sum(r.quantity) FILTER (WHERE r.status='ACTIVE'),0)
      LIMIT $1`, [limit]);
    let repaired = 0;
    for (const anomaly of anomalies.rows) {
      await this.transaction(async db => {
        const row = await this.lock(db, anomaly.variant_id);
        const count = await db.query(`SELECT coalesce(sum(quantity),0)::int AS expected FROM catalog.inventory_reservations
          WHERE variant_id=$1 AND status='ACTIVE'`, [anomaly.variant_id]);
        const expected = count.rows[0].expected;
        if (row.reserved === expected) return;
        const issue = expected > row.on_hand ? 'ACTIVE_EXCEEDS_ON_HAND' : 'RESERVED_MISMATCH';
        await db.query(`INSERT INTO catalog.inventory_anomalies(variant_id,issue,observed_on_hand,observed_reserved,expected_reserved)
          VALUES ($1,$2,$3,$4,$5) ON CONFLICT (variant_id) DO UPDATE SET issue=excluded.issue,
          observed_on_hand=excluded.observed_on_hand,observed_reserved=excluded.observed_reserved,
          expected_reserved=excluded.expected_reserved,detected_at=now(),resolved_at=NULL`,
          [anomaly.variant_id, issue, row.on_hand, row.reserved, expected]);
        if (expected <= row.on_hand) {
          await db.query('UPDATE catalog.inventory SET reserved=$2,version=version+1,updated_at=now() WHERE variant_id=$1', [anomaly.variant_id, expected]);
          await this.movement(db, anomaly.variant_id, 0, 'reserved_reconciled', null, null, 'reconciliation');
          await db.query('UPDATE catalog.inventory_anomalies SET resolved_at=now() WHERE variant_id=$1', [anomaly.variant_id]);
          repaired++;
        }
      });
    }
    const pending = await this.pool.query(`SELECT
      count(*) FILTER (WHERE dead_letter_at IS NULL)::int AS pending,
      count(*) FILTER (WHERE dead_letter_at IS NOT NULL)::int AS dead
      FROM catalog.store_outbox WHERE published_at IS NULL AND event_type LIKE 'Inventory%'`);
    return { expired: expiredCount, anomalies: anomalies.rows.length, repaired,
      pendingEvents: pending.rows[0].pending, deadLetterEvents: pending.rows[0].dead };
  }
}
