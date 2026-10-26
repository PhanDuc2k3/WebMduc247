import { createHash } from 'node:crypto';
import { OrderError } from './service.js';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const invalid = (code,message) => new OrderError(400,code,message);
const missing = () => new OrderError(404,'ORDER_NOT_FOUND','Không tìm thấy đơn hàng.');
const keyValid = value => typeof value === 'string' && /^[\w:-]{8,120}$/.test(value);
const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const pageInput = query => {
  const page = query.page == null ? 1 : Number(query.page);
  const limit = query.limit == null ? 20 : Number(query.limit);
  if (!Number.isInteger(page) || page < 1 || !Number.isInteger(limit) || limit < 1 || limit > 50)
    throw invalid('INVALID_PAGINATION','Phân trang không hợp lệ.');
  return { page,limit,offset:(page-1)*limit };
};
const statusList = ['PENDING_INVENTORY','PENDING_PAYMENT','PLACED','CONFIRMED','PREPARING','READY_TO_SHIP',
  'SHIPPING','DELIVERED','COMPLETED','CANCEL_PENDING','CANCELLED'];
const period = query => {
  const from = query.from ? new Date(query.from) : null;
  const to = query.to ? new Date(query.to) : null;
  if ((from && Number.isNaN(from.getTime())) || (to && Number.isNaN(to.getTime())) ||
    (from && to && from > to)) throw invalid('INVALID_DATE_RANGE','Khoảng thời gian không hợp lệ.');
  return { from,to };
};
const orderDto = row => ({
  id:row.id,groupId:row.group_id,storeId:row.store_id,store:row.store_snapshot_json,
  status:row.status,version:Number(row.version),paymentMethod:row.payment_method,
  paymentStatus:row.payment_status,currency:row.currency,
  refundedMinor:Number(row.refunded_minor || 0),
  subtotalMinor:Number(row.subtotal_minor),discountMinor:Number(row.discount_minor),
  shippingMinor:Number(row.shipping_estimate_minor),totalMinor:Number(row.payable_total_minor),
  address:row.shipping_address_json,shipmentRef:row.shipment_ref,createdAt:row.created_at,updatedAt:row.updated_at,
});
const itemDto = row => ({
  id:row.id,productId:row.product_id,variantId:row.variant_id,sku:row.sku,
  name:row.product_name,snapshot:row.product_snapshot_json,quantity:row.quantity,
  unitPriceMinor:Number(row.unit_price_minor),discountMinor:Number(row.discount_minor),
  lineTotalMinor:Number(row.line_total_minor),
});

export class OrderLifecycle {
  constructor(orderService) { this.order = orderService; this.pool = orderService.pool; }
  async membership(storeId,userId) {
    if (!uuid.test(String(storeId))) throw missing();
    return this.order.inventory('/stores/' + storeId + '/membership?userId=' + encodeURIComponent(userId));
  }
  async buyerList(userId,query) {
    const { page,limit,offset } = pageInput(query);
    const { from,to } = period(query);
    if (query.status && !statusList.includes(query.status) && query.status !== 'PARTIAL_CANCELLED')
      throw invalid('INVALID_STATUS','Trạng thái không hợp lệ.');
    const filters = [userId,query.status || null,from,to];
    const count = await this.pool.query(`SELECT count(*)::int AS total FROM order_service.order_groups g
      WHERE buyer_id=$1 AND ($2::text IS NULL OR status=$2)
      AND ($3::timestamptz IS NULL OR created_at>=$3)
      AND ($4::timestamptz IS NULL OR created_at<=$4)`, filters);
    const { rows } = await this.pool.query(`SELECT * FROM order_service.order_groups g
      WHERE buyer_id=$1 AND ($2::text IS NULL OR status=$2)
      AND ($3::timestamptz IS NULL OR created_at>=$3)
      AND ($4::timestamptz IS NULL OR created_at<$4)
      ORDER BY created_at DESC,id DESC LIMIT $5 OFFSET $6`, [...filters,limit,offset]);
    const ids = rows.map(row => row.id);
    const shops = ids.length ? (await this.pool.query(`SELECT * FROM order_service.orders
      WHERE group_id=ANY($1::uuid[]) ORDER BY created_at,id`,[ids])).rows : [];
    return { page,limit,total:count.rows[0].total,groups:rows.map(row => ({
      id:row.id,status:row.status,currency:row.currency,grandTotalMinor:Number(row.grand_total_minor),
      paymentMethod:row.payment_method,paymentStatus:row.payment_status,
      currentTotalMinor:Number(row.current_total_minor),cancelledTotalMinor:Number(row.cancelled_total_minor),
      createdAt:row.created_at,orders:shops.filter(shop => shop.group_id===row.id).map(orderDto),
    })) };
  }
  async buyerDetail(userId,groupId) {
    if (!uuid.test(String(groupId))) throw missing();
    const { rows } = await this.pool.query('SELECT * FROM order_service.order_groups WHERE id=$1 AND buyer_id=$2',[groupId,userId]);
    if (!rows[0]) throw missing();
    const shops = (await this.pool.query('SELECT * FROM order_service.orders WHERE group_id=$1 ORDER BY created_at,id',[groupId])).rows;
    return { group:{ id:rows[0].id,status:rows[0].status,currency:rows[0].currency,
      paymentMethod:rows[0].payment_method,paymentStatus:rows[0].payment_status,
      grandTotalMinor:Number(rows[0].grand_total_minor),currentTotalMinor:Number(rows[0].current_total_minor),
      cancelledTotalMinor:Number(rows[0].cancelled_total_minor),createdAt:rows[0].created_at,
      orders:await Promise.all(shops.map(row => this.detail(row))) } };
  }
  async chatOrder(groupId,buyerId){
    if(!uuid.test(String(groupId))||!uuid.test(String(buyerId)))throw missing();
    const row=(await this.pool.query(`SELECT id,status FROM order_service.order_groups
      WHERE id=$1 AND buyer_id=$2`,[groupId,buyerId])).rows[0];
    if(!row)throw missing();
    return {id:row.id,status:row.status};
  }
  async notificationShop(shopOrderId){
    if(!uuid.test(String(shopOrderId)))throw missing();
    const row=(await this.pool.query(`SELECT id,group_id,user_id,store_id,status
      FROM order_service.orders WHERE id=$1`,[shopOrderId])).rows[0];
    if(!row)throw missing();
    return {shopOrderId:row.id,groupId:row.group_id,buyerId:row.user_id,
      storeId:row.store_id,status:row.status};
  }
  async notificationGroup(groupId){
    if(!uuid.test(String(groupId)))throw missing();
    const group=(await this.pool.query('SELECT id,buyer_id FROM order_service.order_groups WHERE id=$1',
      [groupId])).rows[0];
    if(!group)throw missing();
    const shops=(await this.pool.query('SELECT id,store_id FROM order_service.orders WHERE group_id=$1',
      [groupId])).rows;
    return {groupId:group.id,buyerId:group.buyer_id,
      orders:shops.map(row=>({shopOrderId:row.id,storeId:row.store_id}))};
  }
  async detail(row) {
    const [items,history] = await Promise.all([
      this.pool.query('SELECT * FROM order_service.order_items WHERE order_id=$1 ORDER BY id',[row.id]),
      this.pool.query('SELECT * FROM order_service.order_status_history WHERE shop_order_id=$1 ORDER BY id',[row.id]),
    ]);
    return { ...orderDto(row),items:items.rows.map(itemDto),
      history:history.rows.map(item => ({ fromStatus:item.from_status,toStatus:item.to_status,
        actorId:item.actor_id,actorType:item.actor_type,reason:item.reason,
        correlationId:item.correlation_id,occurredAt:item.occurred_at })) };
  }
  async sellerList(userId,storeId,query) {
    await this.membership(storeId,userId);
    const { page,limit,offset } = pageInput(query);
    const { from,to } = period(query);
    if (query.status && !statusList.includes(query.status)) throw invalid('INVALID_STATUS','Trạng thái không hợp lệ.');
    const filters = [storeId,query.status || null,from,to];
    const count = await this.pool.query(`SELECT count(*)::int AS total FROM order_service.orders
      WHERE store_id=$1 AND ($2::text IS NULL OR status=$2)
      AND ($3::timestamptz IS NULL OR created_at>=$3) AND ($4::timestamptz IS NULL OR created_at<$4)`,filters);
    const { rows } = await this.pool.query(`SELECT * FROM order_service.orders
      WHERE store_id=$1 AND ($2::text IS NULL OR status=$2)
      AND ($3::timestamptz IS NULL OR created_at>=$3) AND ($4::timestamptz IS NULL OR created_at<$4)
      ORDER BY created_at DESC,id DESC LIMIT $5 OFFSET $6`,[...filters,limit,offset]);
    return { page,limit,total:count.rows[0].total,orders:rows.map(orderDto) };
  }
  async sellerDetail(userId,id) {
    if (!uuid.test(String(id))) throw missing();
    const row = (await this.pool.query('SELECT * FROM order_service.orders WHERE id=$1',[id])).rows[0];
    if (!row) throw missing();
    await this.membership(row.store_id,userId);
    return { order:await this.detail(row) };
  }
  async groupStatus(db,groupId) {
    const { rows } = await db.query('SELECT status,payable_total_minor FROM order_service.orders WHERE group_id=$1',[groupId]);
    const statuses = rows.map(row => row.status);
    const next = statuses.every(value => value==='CANCELLED') ? 'CANCELLED' :
      statuses.some(value => value==='CANCELLED') ? 'PARTIAL_CANCELLED' :
      statuses.every(value => value==='COMPLETED') ? 'COMPLETED' :
      statuses.some(value => value==='DELIVERED') ? 'DELIVERED' :
      statuses.some(value => value==='SHIPPING') ? 'SHIPPING' :
      statuses.some(value => value==='READY_TO_SHIP') ? 'READY_TO_SHIP' :
      statuses.some(value => value==='PREPARING') ? 'PREPARING' :
      statuses.some(value => value==='CONFIRMED') ? 'CONFIRMED' : 'PLACED';
    const currentTotal = rows.filter(row=>row.status!=='CANCELLED').reduce((total,row)=>total+Number(row.payable_total_minor),0);
    const cancelledTotal = rows.filter(row=>row.status==='CANCELLED').reduce((total,row)=>total+Number(row.payable_total_minor),0);
    await db.query(`UPDATE order_service.order_groups SET status=$2,current_total_minor=$3,
      cancelled_total_minor=$4,updated_at=now() WHERE id=$1`,[groupId,next,currentTotal,cancelledTotal]);
  }
  async paymentGroup(groupId) {
    if (!uuid.test(String(groupId))) throw missing();
    const row = (await this.pool.query('SELECT * FROM order_service.order_groups WHERE id=$1',[groupId])).rows[0];
    if (!row) throw missing();
    const orders = (await this.pool.query('SELECT id,store_id,status,payment_status,payable_total_minor FROM order_service.orders WHERE group_id=$1',[groupId])).rows;
    return { id:row.id,buyerId:row.buyer_id,currency:row.currency,paymentMethod:row.payment_method,
      status:row.status,paymentStatus:row.payment_status,amountMinor:Number(row.grand_total_minor),
      currentAmountMinor:Number(row.current_total_minor),orders:orders.map(item=>({
        id:item.id,storeId:item.store_id,status:item.status,paymentStatus:item.payment_status,
        amountMinor:Number(item.payable_total_minor) })) };
  }
  async refundCandidates() {
    const { rows }=await this.pool.query(`SELECT o.id AS shop_order_id,o.group_id,
      o.payable_total_minor,o.refunded_minor,g.payment_method
      FROM order_service.orders o JOIN order_service.order_groups g ON g.id=o.group_id
      WHERE o.status='CANCELLED' AND o.payment_status='PAID'
        AND g.payment_method<>'COD' AND o.refunded_minor<o.payable_total_minor
      ORDER BY o.updated_at,o.id LIMIT 20`);
    return { orders:rows.map(row=>({ shopOrderId:row.shop_order_id,groupId:row.group_id,
      totalMinor:Number(row.payable_total_minor),refundedMinor:Number(row.refunded_minor),
      paymentMethod:row.payment_method })) };
  }
  async promotionOrderStatus(shopOrderId) {
    if(!uuid.test(String(shopOrderId))) throw missing();
    const row=(await this.pool.query('SELECT status FROM order_service.orders WHERE id=$1',
      [shopOrderId])).rows[0];
    if(!row) throw missing();
    return { shopOrderId,status:row.status };
  }
  async promotionQuoteStatus(quoteId) {
    if(!uuid.test(String(quoteId))) throw missing();
    const row=(await this.pool.query(`SELECT g.status FROM order_service.orders o
      JOIN order_service.order_groups g ON g.id=o.group_id WHERE o.quote_id=$1 LIMIT 1`,
      [quoteId])).rows[0];
    if(!row) throw missing();
    return {quoteId,groupStatus:row.status};
  }
  async receivePayment(input) {
    if (!keyValid(input?.eventId) || !uuid.test(String(input?.groupId)) ||
      !['PaymentSucceeded.v1','PaymentFailed.v1','PaymentExpired.v1','CODCollected.v1','RefundSucceeded.v1'].includes(input.type) ||
      !Number.isSafeInteger(input.amountMinor) || input.amountMinor < 0 || input.currency!=='VND')
      throw invalid('INVALID_PAYMENT_EVENT','Sự kiện thanh toán không hợp lệ.');
    const digest = hash(input);
    const prepared = await this.order.transaction(async db => {
      await db.query('SELECT pg_advisory_xact_lock(hashtext($1))',[input.eventId]);
      const duplicate = (await db.query('SELECT payload_digest FROM order_service.payment_inbox WHERE event_id=$1',[input.eventId])).rows[0];
      if (duplicate) {
        if (duplicate.payload_digest!==digest) throw new OrderError(409,'IDEMPOTENCY_CONFLICT','Event ID đã dùng cho payload khác.');
        return { idempotent:true };
      }
      const group = (await db.query('SELECT * FROM order_service.order_groups WHERE id=$1 FOR UPDATE',[input.groupId])).rows[0];
      if (!group) throw missing();
      if (input.type==='CODCollected.v1') {
        if (group.payment_method!=='COD' || input.provider!=='DELIVERY' || !uuid.test(String(input.shopOrderId)))
          throw new OrderError(409,'PAYMENT_MISMATCH','Phương thức hoặc đơn không khớp.');
        const shop = (await db.query('SELECT * FROM order_service.orders WHERE id=$1 AND group_id=$2 FOR UPDATE',
          [input.shopOrderId,group.id])).rows[0];
        if (!shop || !['DELIVERED','COMPLETED'].includes(shop.status) ||
          Number(shop.payable_total_minor)!==input.amountMinor || shop.payment_status==='PAID')
          throw new OrderError(409,'PAYMENT_MISMATCH','Thu hộ không khớp đơn hoặc đã ghi nhận.');
        await db.query("UPDATE order_service.orders SET payment_status='PAID',updated_at=now() WHERE id=$1",[shop.id]);
        const remaining = (await db.query(`SELECT count(*)::int AS count FROM order_service.orders
          WHERE group_id=$1 AND status<>'CANCELLED' AND payment_status<>'PAID'`,[group.id])).rows[0].count;
        await db.query('UPDATE order_service.order_groups SET payment_status=$2,updated_at=now() WHERE id=$1',
          [group.id,remaining ? 'PARTIALLY_PAID' : 'PAID']);
      } else if (input.type==='RefundSucceeded.v1') {
        if (group.payment_method==='COD' || input.provider!==group.payment_method ||
          !uuid.test(String(input.shopOrderId)) ||
          !['PAID','PARTIALLY_REFUNDED'].includes(group.payment_status))
          throw new OrderError(409,'PAYMENT_MISMATCH','Hoàn tiền không khớp đơn.');
        const shop = (await db.query('SELECT * FROM order_service.orders WHERE id=$1 AND group_id=$2 FOR UPDATE',
          [input.shopOrderId,group.id])).rows[0];
        if (!shop || input.amountMinor===0 ||
          Number(shop.refunded_minor)+input.amountMinor>Number(shop.payable_total_minor))
          throw new OrderError(409,'PAYMENT_MISMATCH','Số tiền hoàn không hợp lệ.');
        const full=Number(shop.refunded_minor)+input.amountMinor===Number(shop.payable_total_minor);
        await db.query(`UPDATE order_service.orders SET refunded_minor=refunded_minor+$2,
          payment_status=CASE WHEN $3 THEN 'REFUNDED' ELSE payment_status END,
          updated_at=now() WHERE id=$1`,[shop.id,input.amountMinor,full]);
        const remaining = (await db.query(`SELECT count(*)::int AS count FROM order_service.orders
          WHERE group_id=$1 AND payment_status NOT IN ('REFUNDED','FAILED')`,[group.id])).rows[0].count;
        await db.query('UPDATE order_service.order_groups SET payment_status=$2,updated_at=now() WHERE id=$1',
          [group.id,remaining ? 'PARTIALLY_REFUNDED' : 'REFUNDED']);
        if (input.refundId) {
          const returned=(await db.query(`UPDATE order_service.return_requests SET status='REFUNDED',refund_confirmed_at=now(),
            version=version+1,updated_at=now() WHERE refund_reference=$1 AND shop_order_id=$2
            AND eligible_refund_minor=$3 AND status='REFUND_PENDING' RETURNING id`,
            [input.refundId,shop.id,input.amountMinor])).rows[0];
          if (returned) await db.query(`INSERT INTO order_service.return_history
            (request_id,from_status,to_status,actor_type,note)
            VALUES ($1,'REFUND_PENDING','REFUNDED','payment','Verified refund')`,[returned.id]);
        }
      } else {
        if (group.payment_method==='COD' || input.provider!==group.payment_method ||
          Number(group.grand_total_minor)!==input.amountMinor ||
          group.currency!==input.currency || group.status!=='PENDING_PAYMENT')
          throw new OrderError(409,'PAYMENT_MISMATCH','Giao dịch không khớp nhóm đơn hoặc trạng thái.');
        const next = input.type==='PaymentSucceeded.v1' ? 'PLACED' : 'CANCEL_PENDING';
        const payStatus = next==='PLACED' ? 'PAID' : 'FAILED';
        const shops = (await db.query('SELECT * FROM order_service.orders WHERE group_id=$1 FOR UPDATE',[group.id])).rows;
        for (const shop of shops) {
          await db.query('UPDATE order_service.orders SET status=$2,payment_status=$3,version=version+1,updated_at=now() WHERE id=$1',
            [shop.id,next,payStatus]);
          await db.query(`INSERT INTO order_service.order_status_history
            (shop_order_id,from_status,to_status,actor_type,reason,correlation_id)
            VALUES ($1,'PENDING_PAYMENT',$2,'system',$3,$4)`,
            [shop.id,next,input.type,input.eventId]);
          if (next==='CANCEL_PENDING') {
            const commandKey='payment:'+shop.id;
            await db.query(`INSERT INTO order_service.order_commands
              (actor_id,idempotency_key,request_hash,shop_order_id)
              VALUES ($1,$2,$3,$4) ON CONFLICT(actor_id,idempotency_key) DO NOTHING`,
              [group.buyer_id,commandKey,digest,shop.id]);
            await db.query('UPDATE order_service.orders SET cancellation_reason=$2 WHERE id=$1',
              [shop.id,input.type]);
          }
        }
        await db.query('UPDATE order_service.order_groups SET status=$2,payment_status=$3,updated_at=now() WHERE id=$1',
          [group.id,next,payStatus]);
        if (next==='PLACED') await db.query('INSERT INTO order_service.order_outbox(event_type,aggregate_id,payload) VALUES ($1,$2,$3)',
          ['PaymentApplied.v1',group.id,{ groupId:group.id,paymentProvider:input.provider }]);
      }
      await db.query('INSERT INTO order_service.payment_inbox(event_id,payload_digest) VALUES ($1,$2)',[input.eventId,digest]);
      return { idempotent:false,failed:['PaymentFailed.v1','PaymentExpired.v1'].includes(input.type),
        buyerId:group.buyer_id,shopIds:input.type==='PaymentFailed.v1'||input.type==='PaymentExpired.v1'
          ? (await db.query('SELECT id FROM order_service.orders WHERE group_id=$1',[group.id])).rows.map(item=>item.id) : [] };
    });
    if (prepared.failed) {
      for (const shopId of prepared.shopIds) await this.finishCancel(shopId,prepared.buyerId,'payment:'+shopId);
    }
    return { idempotent:prepared.idempotent };
  }
  async expireUnpaidOnline() {
    const { rows }=await this.pool.query(`SELECT id,grand_total_minor,currency,payment_method
      FROM order_service.order_groups WHERE status='PENDING_PAYMENT' AND payment_status='UNPAID'
      AND created_at<now()-interval '45 minutes' ORDER BY created_at LIMIT 10`);
    for (const row of rows) try {
      await this.receivePayment({ eventId:'order-timeout:'+row.id,type:'PaymentExpired.v1',
        groupId:row.id,amountMinor:Number(row.grand_total_minor),currency:row.currency,
        provider:row.payment_method });
    } catch (error) { console.error('Unpaid order expiry failed:'); }
  }
  async transition(userId,id,action,input,kind='seller') {
    if (!uuid.test(String(id)) || !keyValid(input?.idempotencyKey) ||
      !Number.isInteger(input.expectedVersion) || input.expectedVersion < 1)
      throw invalid('INVALID_COMMAND','Lệnh cập nhật đơn không hợp lệ.');
    const target = { confirm:['PLACED','CONFIRMED'],prepare:['CONFIRMED','PREPARING'],
      'ready-to-ship':['PREPARING','READY_TO_SHIP'] }[action];
    if (!target) throw invalid('INVALID_TRANSITION','Chuyển trạng thái không hợp lệ.');
    if (input.reason !== undefined && (typeof input.reason !== 'string' || input.reason.length > 200))
      throw invalid('INVALID_REASON','Lý do không hợp lệ.');
    const requestHash = hash({ id,action,expectedVersion:input.expectedVersion,kind });
    return this.order.transaction(async db => {
      await db.query('SELECT pg_advisory_xact_lock(hashtext($1),hashtext($2))',[userId,input.idempotencyKey]);
      const existing = (await db.query('SELECT * FROM order_service.order_commands WHERE actor_id=$1 AND idempotency_key=$2',
        [userId,input.idempotencyKey])).rows[0];
      if (existing) {
        if (existing.request_hash!==requestHash) throw new OrderError(409,'IDEMPOTENCY_CONFLICT','Khóa đã dùng cho lệnh khác.');
        return existing.result_json;
      }
      const row = (await db.query('SELECT * FROM order_service.orders WHERE id=$1 FOR UPDATE',[id])).rows[0];
      if (!row) throw missing();
      await this.membership(row.store_id,userId);
      if (Number(row.version)!==input.expectedVersion) throw new OrderError(409,'VERSION_CONFLICT','Đơn hàng đã được cập nhật.');
      if (row.status!==target[0]) throw new OrderError(409,'INVALID_TRANSITION','Trạng thái hiện tại không cho phép thao tác.');
      const updated = (await db.query(`UPDATE order_service.orders SET status=$2,version=version+1,updated_at=now()
        WHERE id=$1 RETURNING *`,[id,target[1]])).rows[0];
      await db.query(`INSERT INTO order_service.order_status_history
        (shop_order_id,from_status,to_status,actor_id,actor_type,reason,correlation_id)
        VALUES ($1,$2,$3,$4,'seller',$5,$6)`,
        [id,target[0],target[1],userId,input.reason || action,input.idempotencyKey]);
      const eventType = action==='confirm' ? 'ShopOrderConfirmed.v1' :
        action==='ready-to-ship' ? 'OrderReadyForShipment.v1' : 'ShopOrderPreparing.v1';
      await db.query('INSERT INTO order_service.order_outbox(event_type,aggregate_id,payload) VALUES ($1,$2,$3)',
        [eventType,id,{ shopOrderId:id,groupId:row.group_id,storeId:row.store_id,status:target[1],version:Number(updated.version) }]);
      await this.groupStatus(db,row.group_id);
      const result = { order:orderDto(updated) };
      await db.query(`INSERT INTO order_service.order_commands(actor_id,idempotency_key,request_hash,shop_order_id,result_json)
        VALUES ($1,$2,$3,$4,$5)`,[userId,input.idempotencyKey,requestHash,id,result]);
      return result;
    });
  }
  async buyerCancel(userId,groupId,input) {
    if (!uuid.test(String(groupId)) || !uuid.test(String(input?.shopOrderId))) throw missing();
    const group = (await this.pool.query('SELECT id FROM order_service.order_groups WHERE id=$1 AND buyer_id=$2',[groupId,userId])).rows[0];
    if (!group) throw missing();
    return this.cancel(userId,input.shopOrderId,input,'buyer',groupId);
  }
  async sellerReject(userId,id,input) { return this.cancel(userId,id,input,'seller'); }
  async cancel(userId,id,input,kind,groupId) {
    if (!uuid.test(String(id)) || !keyValid(input?.idempotencyKey) ||
      !Number.isInteger(input.expectedVersion) || input.expectedVersion < 1 ||
      typeof input.reason !== 'string' || input.reason.trim().length < 3 || input.reason.length > 200)
      throw invalid('INVALID_COMMAND','Lệnh hủy đơn không hợp lệ.');
    if (kind==='seller' && !['OUT_OF_STOCK','STORE_CLOSED','CANNOT_FULFILL'].includes(input.reason))
      throw invalid('INVALID_REASON','Lý do từ chối không hợp lệ.');
    const requestHash = hash({ id,kind,reason:input.reason,expectedVersion:input.expectedVersion });
    const prepared = await this.order.transaction(async db => {
      await db.query('SELECT pg_advisory_xact_lock(hashtext($1),hashtext($2))',[userId,input.idempotencyKey]);
      const existing = (await db.query('SELECT * FROM order_service.order_commands WHERE actor_id=$1 AND idempotency_key=$2',
        [userId,input.idempotencyKey])).rows[0];
      if (existing) {
        if (existing.request_hash!==requestHash) throw new OrderError(409,'IDEMPOTENCY_CONFLICT','Khóa đã dùng cho lệnh khác.');
        return { existing:true,result:existing.result_json };
      }
      const row = (await db.query('SELECT * FROM order_service.orders WHERE id=$1 FOR UPDATE',[id])).rows[0];
      if (!row || (groupId && row.group_id!==groupId) || (kind==='buyer' && row.user_id!==userId)) throw missing();
      if (kind==='seller') await this.membership(row.store_id,userId);
      if (Number(row.version)!==input.expectedVersion) throw new OrderError(409,'VERSION_CONFLICT','Đơn hàng đã được cập nhật.');
      if (!(kind==='buyer' ? row.status==='PLACED' : ['PLACED','CONFIRMED'].includes(row.status)))
        throw new OrderError(409,'INVALID_TRANSITION','Đơn hàng không thể hủy ở trạng thái này.');
      await db.query(`UPDATE order_service.orders SET status='CANCEL_PENDING',version=version+1,
        cancellation_reason=$2,updated_at=now() WHERE id=$1`,[id,input.reason]);
      await db.query(`INSERT INTO order_service.order_status_history
        (shop_order_id,from_status,to_status,actor_id,actor_type,reason,correlation_id)
        VALUES ($1,$2,'CANCEL_PENDING',$3,$4,$5,$6)`,
        [id,row.status,userId,kind,input.reason,input.idempotencyKey]);
      await db.query(`INSERT INTO order_service.order_commands
        (actor_id,idempotency_key,request_hash,shop_order_id) VALUES ($1,$2,$3,$4)`,
        [userId,input.idempotencyKey,requestHash,id]);
      return { existing:false };
    });
    if (prepared.existing && prepared.result) return prepared.result;
    return this.finishCancel(id,userId,input.idempotencyKey);
  }
  async finishCancel(id,actorId,key) {
    const row = (await this.pool.query('SELECT * FROM order_service.orders WHERE id=$1',[id])).rows[0];
    if (!row) throw missing();
    if (row.status==='CANCELLED') {
      await this.releaseCancelledPromotions(row);
      return { order:orderDto(row) };
    }
    if (row.status!=='CANCEL_PENDING') throw new OrderError(409,'INVALID_TRANSITION','Đơn hàng không chờ hủy.');
    const reservations = (await this.pool.query('SELECT reservation_id FROM order_service.order_items WHERE order_id=$1',[id])).rows.map(item=>item.reservation_id);
    await this.order.inventory('/restock-batch','POST',{ reservationIds:reservations,cancellationKey:'cancel:'+id });
    const result=await this.order.transaction(async db => {
      const current = (await db.query('SELECT * FROM order_service.orders WHERE id=$1 FOR UPDATE',[id])).rows[0];
      if (current.status==='CANCELLED') return { order:orderDto(current) };
      if (current.status!=='CANCEL_PENDING') throw new OrderError(409,'INVALID_TRANSITION','Đơn hàng không chờ hủy.');
      const updated = (await db.query(`UPDATE order_service.orders SET status='CANCELLED',version=version+1,
        updated_at=now() WHERE id=$1 RETURNING *`,[id])).rows[0];
      await db.query(`INSERT INTO order_service.order_status_history
        (shop_order_id,from_status,to_status,actor_id,actor_type,reason,correlation_id,read_version,result_version)
        VALUES ($1,'CANCEL_PENDING','CANCELLED',$2,'system',$3,$4,$5,$6)`,
        [id,actorId,current.cancellation_reason,key,current.version,current.version+1]);
      await db.query('INSERT INTO order_service.order_outbox(event_type,aggregate_id,payload) VALUES ($1,$2,$3)',
        ['OrderCancelled.v1',id,{ shopOrderId:id,groupId:current.group_id,storeId:current.store_id,
          totalMinor:Number(current.payable_total_minor),paymentMethod:current.payment_method,correlationId:key||'cancel:'+id,
          refundRequired:current.payment_method!=='COD' }]);
      await this.groupStatus(db,current.group_id);
      const result = { order:orderDto(updated) };
      await db.query('UPDATE order_service.order_commands SET result_json=$3 WHERE actor_id=$1 AND idempotency_key=$2',
        [actorId,key,result]);
      return result;
    });
    await this.releaseCancelledPromotions(row);
    return result;
  }
  async releaseCancelledPromotions(row){
    await this.order.promotion('/release-shop','POST',{shopOrderId:row.id}).catch(error=>
      console.error('Promotion shop release failed:'));
    let group;
    try{group=(await this.pool.query('SELECT status FROM order_service.order_groups WHERE id=$1',
      [row.group_id])).rows[0];}
    catch(error){console.error('Promotion group status lookup failed:');return;}
    if(group?.status==='CANCELLED')await this.order.promotion('/release-platform','POST',
      {orderRef:row.quote_id}).catch(error=>
      console.error('Promotion platform release failed:'));
  }
  async reconcileCancellations() {
    const { rows } = await this.pool.query(`SELECT c.actor_id,c.idempotency_key,c.shop_order_id FROM order_service.order_commands c
      JOIN order_service.orders o ON o.id=c.shop_order_id WHERE o.status='CANCEL_PENDING'
      AND c.result_json IS NULL ORDER BY c.created_at LIMIT 20`);
    for (const row of rows) try { await this.finishCancel(row.shop_order_id,row.actor_id,row.idempotency_key); }
    catch (error) { console.error('Order cancellation reconciliation failed:'); }
  }
  async receiveDelivery(input) {
    if (!uuid.test(String(input?.shopOrderId)) || !keyValid(input?.eventId) ||
      !['ShipmentAccepted.v1','ShipmentDelivered.v1'].includes(input.type) ||
      (input.shipmentRef != null && (typeof input.shipmentRef!=='string' || input.shipmentRef.length>120)))
      throw invalid('INVALID_DELIVERY_EVENT','Sự kiện giao hàng không hợp lệ.');
    const requestHash = hash({ shopOrderId:input.shopOrderId,type:input.type,shipmentRef:input.shipmentRef || null });
    return this.order.transaction(async db => {
      await db.query('SELECT pg_advisory_xact_lock(hashtext($1))',[input.eventId]);
      const existing = (await db.query("SELECT payload_hash FROM order_service.order_inbox WHERE source='delivery' AND event_id=$1",
        [input.eventId])).rows[0];
      if (existing) {
        if (existing.payload_hash!==requestHash) throw new OrderError(409,'IDEMPOTENCY_CONFLICT','Event ID đã dùng cho payload khác.');
        return { idempotent:true };
      }
      const row = (await db.query('SELECT * FROM order_service.orders WHERE id=$1 FOR UPDATE',[input.shopOrderId])).rows[0];
      if (!row) throw missing();
      const from = input.type==='ShipmentAccepted.v1' ? 'READY_TO_SHIP' : 'SHIPPING';
      const to = input.type==='ShipmentAccepted.v1' ? 'SHIPPING' : 'DELIVERED';
      if (row.status!==from) throw new OrderError(409,'INVALID_TRANSITION','Trạng thái đơn không nhận sự kiện này.');
      if (input.type==='ShipmentAccepted.v1' && !input.shipmentRef)
        throw invalid('SHIPMENT_REF_REQUIRED','Thiếu mã vận đơn.');
      if (input.type==='ShipmentDelivered.v1' && input.shipmentRef &&
        row.shipment_ref && input.shipmentRef!==row.shipment_ref)
        throw new OrderError(409,'SHIPMENT_REF_MISMATCH','Mã vận đơn không khớp.');
      const updated = (await db.query(`UPDATE order_service.orders SET status=$2,version=version+1,
        shipment_ref=COALESCE($3,shipment_ref),updated_at=now() WHERE id=$1 RETURNING *`,
        [row.id,to,input.shipmentRef || null])).rows[0];
      await db.query(`INSERT INTO order_service.order_status_history
        (shop_order_id,from_status,to_status,actor_type,reason,correlation_id)
        VALUES ($1,$2,$3,'delivery',$4,$5)`,[row.id,from,to,input.type,input.eventId]);
      await db.query("INSERT INTO order_service.order_inbox(source,event_id,payload_hash) VALUES ('delivery',$1,$2)",
        [input.eventId,requestHash]);
      await db.query('INSERT INTO order_service.order_outbox(event_type,aggregate_id,payload) VALUES ($1,$2,$3)',
        [to==='DELIVERED' ? 'OrderDelivered.v1' : 'OrderShipping.v1',row.id,
          { shopOrderId:row.id,groupId:row.group_id,shipmentRef:updated.shipment_ref,status:to }]);
      await this.groupStatus(db,row.group_id);
      return { order:orderDto(updated),idempotent:false };
    });
  }
  async buyerComplete(userId,groupId,shopOrderId,input) {
    if (!uuid.test(String(groupId)) || !uuid.test(String(shopOrderId)) || !keyValid(input?.idempotencyKey) ||
      !Number.isInteger(input.expectedVersion) || input.expectedVersion<1)
      throw invalid('INVALID_COMMAND','Lệnh xác nhận nhận hàng không hợp lệ.');
    const requestHash = hash({ groupId,shopOrderId,expectedVersion:input.expectedVersion,action:'complete' });
    return this.order.transaction(async db => {
      await db.query('SELECT pg_advisory_xact_lock(hashtext($1),hashtext($2))',[userId,input.idempotencyKey]);
      const existing = (await db.query('SELECT * FROM order_service.order_commands WHERE actor_id=$1 AND idempotency_key=$2',
        [userId,input.idempotencyKey])).rows[0];
      if (existing) {
        if (existing.request_hash!==requestHash) throw new OrderError(409,'IDEMPOTENCY_CONFLICT','Khóa đã dùng cho lệnh khác.');
        return existing.result_json;
      }
      const row = (await db.query('SELECT * FROM order_service.orders WHERE id=$1 FOR UPDATE',[shopOrderId])).rows[0];
      if (!row || row.group_id!==groupId || row.user_id!==userId) throw missing();
      if (row.status!=='DELIVERED') throw new OrderError(409,'INVALID_TRANSITION','Chưa thể hoàn tất đơn.');
      if (Number(row.version)!==input.expectedVersion) throw new OrderError(409,'VERSION_CONFLICT','Đơn hàng đã được cập nhật.');
      const updated = (await db.query(`UPDATE order_service.orders SET status='COMPLETED',version=version+1,
        updated_at=now() WHERE id=$1 RETURNING *`,[shopOrderId])).rows[0];
      await db.query(`INSERT INTO order_service.order_status_history
        (shop_order_id,from_status,to_status,actor_id,actor_type,reason,correlation_id)
        VALUES ($1,'DELIVERED','COMPLETED',$2,'buyer','received',$3)`,[shopOrderId,userId,input.idempotencyKey]);
      await db.query('INSERT INTO order_service.order_outbox(event_type,aggregate_id,payload) VALUES ($1,$2,$3)',
        ['OrderCompleted.v1',shopOrderId,{ shopOrderId,groupId }]);
      await this.groupStatus(db,groupId);
      const result = { order:orderDto(updated) };
      await db.query(`INSERT INTO order_service.order_commands(actor_id,idempotency_key,request_hash,shop_order_id,result_json)
        VALUES ($1,$2,$3,$4,$5)`,[userId,input.idempotencyKey,requestHash,shopOrderId,result]);
      return result;
    });
  }
}
