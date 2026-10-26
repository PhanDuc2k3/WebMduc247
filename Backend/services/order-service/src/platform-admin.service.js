import { requirePlatformAdmin, adminId, adminQuery, adminPage, adminMoney, PlatformAdminError } from '../../../packages/contracts/platform-admin.js';
import { maskName } from '../../../packages/contracts/admin-privacy.js';
const statuses = ['PENDING_INVENTORY','PENDING_PAYMENT','PLACED','CONFIRMED','PREPARING','READY_TO_SHIP',
  'SHIPPING','DELIVERED','COMPLETED','CANCEL_PENDING','CANCELLED'];
const orderDto = row => ({ id:row.id,groupId:row.group_id,buyerId:row.user_id,storeId:row.store_id,
  storeName:row.store_snapshot_json?.name || 'Chưa có tên cửa hàng',status:row.status,paymentMethod:row.payment_method,
  paymentStatus:row.payment_status,totalMinor:adminMoney(row.payable_total_minor),createdAt:row.created_at,
  itemCount:row.item_count == null ? undefined : Number(row.item_count),version:Number(row.version) });
export class OrderAdminService {
  constructor(pool) { this.pool = pool; }
  async summary(user) {
    requirePlatformAdmin(user);
    const [totals, trend] = await Promise.all([
      this.pool.query(`SELECT count(*)::int AS total,
        count(*) FILTER(WHERE status IN ('PLACED','CONFIRMED','PENDING_PAYMENT','PENDING_INVENTORY'))::int AS pending,
        count(*) FILTER(WHERE status IN ('DELIVERED','COMPLETED'))::int AS delivered,
        count(*) FILTER(WHERE status='CANCELLED')::int AS cancelled,
        coalesce(sum(payable_total_minor) FILTER(WHERE status<>'CANCELLED'),0) AS order_value_minor FROM order_service.orders`),
      this.pool.query(`SELECT to_char(day,'YYYY-MM-DD') AS date,count(o.id)::int AS orders,
        coalesce(sum(o.payable_total_minor) FILTER(WHERE o.status<>'CANCELLED'),0) AS value_minor
        FROM generate_series((now() AT TIME ZONE 'Asia/Bangkok')::date-6,
          (now() AT TIME ZONE 'Asia/Bangkok')::date,interval '1 day') day
        LEFT JOIN order_service.orders o ON (o.created_at AT TIME ZONE 'Asia/Bangkok')::date=day::date
        GROUP BY day ORDER BY day`),
    ]);
    const row = totals.rows[0];
    return { orders: { total: row.total, pending: row.pending, delivered: row.delivered,
      cancelled: row.cancelled, orderValueMinor: adminMoney(row.order_value_minor) },
    trend: trend.rows.map(row => ({ date: row.date, orders: row.orders, valueMinor: adminMoney(row.value_minor) })) };
  }
  async recent(user) {
    requirePlatformAdmin(user);
    const { rows } = await this.pool.query(`SELECT id,status,payment_method,payable_total_minor,created_at,
      store_snapshot_json->>'name' AS store_name FROM order_service.orders ORDER BY created_at DESC,id DESC LIMIT 5`);
    return { items: rows.map(row => ({ id: row.id, status: row.status, paymentMethod: row.payment_method,
      totalMinor: adminMoney(row.payable_total_minor), storeName: row.store_name || 'Chưa có tên cửa hàng', createdAt: row.created_at })) };
  }
  async list(user, query) {
    requirePlatformAdmin(user); const options = adminQuery(query,{statuses});
    const args = [options.pattern,options.status];
    const where = `WHERE (o.id::text ILIKE $1 OR o.group_id::text ILIKE $1 OR coalesce(o.store_snapshot_json->>'name','') ILIKE $1
      OR EXISTS(SELECT 1 FROM order_service.order_items i WHERE i.order_id=o.id AND i.product_name ILIKE $1)) AND ($2='' OR o.status=$2)`;
    const [count,list] = await Promise.all([
      this.pool.query(`SELECT count(*)::int AS total FROM order_service.orders o ${where}`,args),
      this.pool.query(`SELECT o.*,(SELECT sum(quantity)::int FROM order_service.order_items i WHERE i.order_id=o.id) AS item_count
        FROM order_service.orders o ${where} ORDER BY o.created_at DESC,o.id DESC LIMIT $3 OFFSET $4`,[...args,options.limit,options.offset]),
    ]);
    return adminPage(list.rows.map(orderDto),count.rows[0].total,options);
  }
  async detail(user, id) {
    requirePlatformAdmin(user); adminId(id);
    const { rows } = await this.pool.query('SELECT * FROM order_service.orders WHERE id=$1',[id]);
    if (!rows[0]) throw new PlatformAdminError(404,'ORDER_NOT_FOUND','Không tìm thấy đơn hàng.');
    const row = rows[0], address = row.shipping_address_json || {};
    const phone = String(address.phone || address.receiverPhone || '');
    const [items,history] = await Promise.all([
      this.pool.query(`SELECT id,product_id,product_name,sku,quantity,unit_price_minor,discount_minor,line_total_minor
        FROM order_service.order_items WHERE order_id=$1 ORDER BY id`,[id]),
      this.pool.query(`SELECT from_status,to_status,actor_id,actor_type,reason,occurred_at,read_version,result_version,correlation_id FROM order_service.order_status_history
        WHERE shop_order_id=$1 ORDER BY occurred_at DESC,id DESC LIMIT 100`,[id]),
    ]);
    return { record:{...orderDto(row),subtotalMinor:adminMoney(row.subtotal_minor),discountMinor:adminMoney(row.discount_minor),
      shippingMinor:adminMoney(row.shipping_estimate_minor),refundedMinor:adminMoney(row.refunded_minor),shipmentRef:row.shipment_ref,
      delivery:{receiverName:maskName(address.receiverName || address.fullName),phoneMasked:phone?`${'*'.repeat(Math.max(4,phone.length-3))}${phone.slice(-3)}`:null,
        province:address.province || null,ward:address.ward || null},
      items:items.rows.map(item=>({id:item.id,productId:item.product_id,name:item.product_name,sku:item.sku,quantity:item.quantity,
        unitPriceMinor:adminMoney(item.unit_price_minor),discountMinor:adminMoney(item.discount_minor),lineTotalMinor:adminMoney(item.line_total_minor)}))},
    history:history.rows.map(item=>({previous_status:item.from_status,next_status:item.to_status,actor_id:item.actor_id,actor_name:item.actor_type,reason:item.reason,created_at:item.occurred_at,read_version:item.read_version,result_version:item.result_version,correlation_id:item.correlation_id})) };
  }
}
