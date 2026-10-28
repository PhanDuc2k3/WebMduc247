import {adminOrderScopeSql} from './admin-scope.js';
import {requireAdminPermission, requireAdminScope, permissionGrants} from '../../../packages/contracts/admin-rbac.js';
import {dashboardRange, dashboardMeta, metricComparison, listDateRange} from '../../../packages/contracts/admin-dashboard.js';
import {adminId, adminQuery, adminPage, adminMoney, PlatformAdminError} from '../../../packages/contracts/platform-admin.js';
import {maskName} from '../../../packages/contracts/admin-privacy.js';
const statuses = ['PENDING_INVENTORY','PENDING_PAYMENT','PLACED','CONFIRMED','PREPARING','READY_TO_SHIP',
  'SHIPPING','DELIVERED','COMPLETED','CANCEL_PENDING','CANCELLED'];
const orderDto = row => ({ id:row.id,groupId:row.group_id,buyerId:row.user_id,storeId:row.store_id,
  storeName:row.store_snapshot_json?.name || 'Chưa có tên cửa hàng',status:row.status,paymentMethod:row.payment_method,
  paymentStatus:row.payment_status,totalMinor:adminMoney(row.payable_total_minor),createdAt:row.created_at,
  itemCount:row.item_count == null ? undefined : Number(row.item_count),version:Number(row.version) });
export class OrderAdminService {
  constructor(pool) { this.pool = pool; }
  async summary(user, query = {}) {
    requireAdminPermission(user,'orders.read');
    const range=dashboardRange(query), args=[range.start,range.end,range.previousStart];
    const scope=adminOrderScopeSql(user,'orders.read',args);
    const financial=permissionGrants(user,'finance.view_sensitive').some(g=>!Object.keys(g.scope||{}).length);
    if(financial)requireAdminScope(user,'finance.view_sensitive',{});
    const [totals, trend] = await Promise.all([
      this.pool.query(`SELECT count(*)::int AS total,
        count(*) FILTER(WHERE status IN ('PLACED','CONFIRMED','PENDING_PAYMENT','PENDING_INVENTORY'))::int AS pending,
        count(*) FILTER(WHERE status IN ('DELIVERED','COMPLETED'))::int AS delivered,
        count(*) FILTER(WHERE status='CANCELLED')::int AS cancelled,
        ${financial ? "coalesce(sum(payable_total_minor) FILTER(WHERE status<>'CANCELLED'),0)" : 'NULL'} AS order_value_minor
        FROM order_service.orders o WHERE ${scope} AND o.created_at>=$1 AND o.created_at<$2 AND $3::timestamptz IS NOT NULL`,args),
      this.pool.query(`SELECT to_char(day,'YYYY-MM-DD') AS date,count(o.id)::int AS orders,
        ${financial ? "coalesce(sum(o.payable_total_minor) FILTER(WHERE o.status<>'CANCELLED'),0)" : 'NULL'} AS value_minor
        FROM generate_series(($1::timestamptz AT TIME ZONE 'Asia/Bangkok')::date,
          ($2::timestamptz AT TIME ZONE 'Asia/Bangkok')::date-1,interval '1 day') day
        LEFT JOIN order_service.orders o ON (o.created_at AT TIME ZONE 'Asia/Bangkok')::date=day::date AND ${scope}
        WHERE $3::timestamptz IS NOT NULL GROUP BY day ORDER BY day`,args),
    ]);
    const previous=(await this.pool.query(`SELECT count(*)::int AS total,
      ${financial ? "coalesce(sum(payable_total_minor) FILTER(WHERE status<>'CANCELLED'),0)" : 'NULL'} AS value
      FROM order_service.orders o WHERE ${scope} AND o.created_at>=$3 AND o.created_at<$1 AND $2::timestamptz IS NOT NULL`,args)).rows[0];
    const row = totals.rows[0];
    return { orders: { total: row.total, pending: row.pending, delivered: row.delivered,
      cancelled: row.cancelled, ...(financial?{orderValueMinor:adminMoney(row.order_value_minor)}:{}) },
      ...dashboardMeta(range), comparison:metricComparison(row.total,previous.total),
      ...(financial?{valueComparison:metricComparison(adminMoney(row.order_value_minor),adminMoney(previous.value))}:{}),
      definitions:{orders:'Đếm shop order (mỗi cửa hàng một đơn), theo ngày tạo, gồm đơn hủy; không đếm checkout group.',
        orderValueMinor:'Tổng tiền phải trả của shop order tạo trong kỳ, loại đơn CANCELLED; không phải tiền đã thu.'},
      trend: trend.rows.map(row => ({ date: row.date, orders: row.orders, ...(financial?{valueMinor:adminMoney(row.value_minor)}:{}) })) };
  }
  async recent(user, query = {}) {
    requireAdminPermission(user,'orders.read');
    const range=dashboardRange(query),args=[range.start,range.end], scope=adminOrderScopeSql(user,'orders.read',args);
    const { rows } = await this.pool.query(`SELECT id,status,payment_method,payable_total_minor,created_at,
      store_snapshot_json->>'name' AS store_name FROM order_service.orders o WHERE ${scope} AND created_at>=$1 AND created_at<$2 ORDER BY created_at DESC,id DESC LIMIT 5`,args);
    return { ...dashboardMeta(range), items: rows.map(row => ({ id: row.id, status: row.status, paymentMethod: row.payment_method,
      totalMinor: adminMoney(row.payable_total_minor), storeName: row.store_name || 'Chưa có tên cửa hàng', createdAt: row.created_at })) };
  }
  async list(user, query) {
    requireAdminPermission(user,'orders.read'); const options = adminQuery(query,{statuses});
    const args = [options.pattern,options.status];
    const range=listDateRange(query); args.push(range.start,range.end,query.statusGroup||'',query.excludeCancelled==='true');
    const scope=adminOrderScopeSql(user,'orders.read',args);
    args.push(query.buyerId||null);const buyer=`($${args.length}::uuid IS NULL OR o.user_id=$${args.length})`;
    args.push(query.storeId||null);const store=`($${args.length}::uuid IS NULL OR o.store_id=$${args.length})`;
    const where = `WHERE ${store} AND ${buyer} AND ${scope} AND ($3::timestamptz IS NULL OR o.created_at>=$3) AND ($4::timestamptz IS NULL OR o.created_at<$4)
      AND (NOT $6::boolean OR o.status<>'CANCELLED') AND ($5='' OR
        ($5='pending' AND o.status IN ('PLACED','CONFIRMED','PENDING_PAYMENT','PENDING_INVENTORY')) OR
        ($5='delivered' AND o.status IN ('DELIVERED','COMPLETED')) OR ($5='cancelled' AND o.status='CANCELLED') OR
        ($5='other' AND o.status NOT IN ('PLACED','CONFIRMED','PENDING_PAYMENT','PENDING_INVENTORY','DELIVERED','COMPLETED','CANCELLED')))
      AND (o.id::text ILIKE $1 OR o.group_id::text ILIKE $1 OR coalesce(o.store_snapshot_json->>'name','') ILIKE $1
      OR EXISTS(SELECT 1 FROM order_service.order_items i WHERE i.order_id=o.id AND i.product_name ILIKE $1)) AND ($2='' OR o.status=$2)`;
    const [count,list] = await Promise.all([
      this.pool.query(`SELECT count(*)::int AS total FROM order_service.orders o ${where}`,args),
      this.pool.query(`SELECT o.*,(SELECT sum(quantity)::int FROM order_service.order_items i WHERE i.order_id=o.id) AS item_count
        FROM order_service.orders o ${where} ORDER BY o.created_at DESC,o.id DESC LIMIT $${args.length+1} OFFSET $${args.length+2}`,[...args,options.limit,options.offset]),
    ]);
    return adminPage(list.rows.map(orderDto),count.rows[0].total,options);
  }
  async detail(user, id) {
    requireAdminPermission(user,'orders.read'); adminId(id);
    const args=[id],scope=adminOrderScopeSql(user,'orders.read',args);
    const { rows } = await this.pool.query(`SELECT o.* FROM order_service.orders o WHERE o.id=$1 AND ${scope}`,args);
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
