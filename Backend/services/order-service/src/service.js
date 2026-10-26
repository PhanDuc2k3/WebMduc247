import { createHash, randomUUID } from 'node:crypto';

export class OrderError extends Error {
  constructor(status, code, message, details) { super(message); Object.assign(this, { status, code, details }); }
}
const bad = (code, message, details) => new OrderError(400, code, message, details);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const money = value => Number.isSafeInteger(value) && value >= 0;
const sum = values => values.reduce((total, value) => total + value, 0);

export class OrderService {
  constructor(pool, catalogUrl, identityUrl, inventoryToken) {
    Object.assign(this, { pool, catalogUrl, identityUrl, inventoryToken });
    this.onlineMethods = new Set(String(process.env.ORDER_ONLINE_METHODS || '').split(',').map(item=>item.trim().toUpperCase()).filter(Boolean));
    this.engagementUrl=process.env.ORDER_ENGAGEMENT_URL||'http://127.0.0.1:5105';
    this.promotionToken=process.env.PROMOTION_INTERNAL_TOKEN||'';
  }
  async transaction(fn) {
    const db = await this.pool.connect();
    try { await db.query('BEGIN'); const result = await fn(db); await db.query('COMMIT'); return result; }
    catch (error) { await db.query('ROLLBACK'); throw error; }
    finally { db.release(); }
  }
  async remote(url, options = {}) {
    let response;
    try { response = await fetch(url, { ...options, signal: AbortSignal.timeout(5000) }); }
    catch { throw new OrderError(503, 'DEPENDENCY_UNAVAILABLE', 'Dịch vụ liên quan tạm thời không khả dụng.'); }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new OrderError(response.status >= 500 ? 503 : response.status,
      data.code || 'DEPENDENCY_ERROR', data.message || 'Không thể xác thực dữ liệu.', data.details);
    return data;
  }
  async identity(path, bearer) {
    return this.remote(new URL('/api/v2' + path, this.identityUrl), { headers: { Authorization: bearer } });
  }
  async inventory(path, method = 'GET', input) {
    return this.remote(new URL('/api/v2/inventory' + path, this.catalogUrl), {
      method, headers: { 'X-Inventory-Token': this.inventoryToken, ...(input ? { 'Content-Type': 'application/json' } : {}) },
      ...(input ? { body: JSON.stringify(input) } : {}),
    });
  }
  async promotion(path,method='POST',input){
    return this.remote(new URL('/api/v2/internal/promotions'+path,this.engagementUrl),{
      method,headers:{ 'X-Promotion-Token':this.promotionToken,
        ...(input?{ 'Content-Type':'application/json' }:{}) },
      ...(input?{ body:JSON.stringify(input) }:{})
    });
  }
  async address(addressId, bearer) {
    if (!uuid.test(String(addressId))) throw bad('ADDRESS_REQUIRED', 'Vui lòng chọn địa chỉ giao hàng.');
    const { address } = await this.identity('/users/me/addresses/' + addressId, bearer);
    if (!address || ![address.receiverName,address.receiverPhone,address.provinceCode,
      address.wardCode,address.addressLine].every(value => typeof value === 'string' && value.trim()) ||
      typeof address.districtCode !== 'string') {
      throw bad('ADDRESS_INCOMPLETE', 'Địa chỉ giao hàng chưa đầy đủ.');
    }
    return address;
  }
  async cartRow(db, userId) {
    await db.query('INSERT INTO order_service.carts(user_id) VALUES ($1) ON CONFLICT(user_id) DO NOTHING', [userId]);
    const { rows } = await db.query('SELECT * FROM order_service.carts WHERE user_id=$1 FOR UPDATE', [userId]);
    return rows[0];
  }
  async lines(db, cartId) {
    return (await db.query('SELECT * FROM order_service.cart_items WHERE cart_id=$1 ORDER BY created_at,id', [cartId])).rows;
  }
  async enrich(line) {
    try {
      const quote = await this.inventory('/variants/' + line.variant_id + '/quote?quantity=' + line.quantity);
      return { id: line.id, variantId: line.variant_id, quantity: line.quantity, selected: line.selected,
        observedPriceMinor: line.observed_price_minor == null ? null : Number(line.observed_price_minor),
        ...quote, error: !quote.sellable ? { code: 'SKU_NOT_SELLABLE', message: 'Sản phẩm hiện không nhận đơn.' } :
          !quote.canFulfill ? { code: 'INSUFFICIENT_STOCK', message: 'Số lượng vượt quá tồn khả dụng.', available: quote.available } : null };
    } catch (error) {
      if (error.status >= 500) throw error;
      return { id: line.id, variantId: line.variant_id, quantity: line.quantity, selected: line.selected,
        error: { code: error.code || 'SKU_NOT_FOUND', message: error.message } };
    }
  }
  async cart(userId,withPromotions=true) {
    const cart = await this.transaction(db => this.cartRow(db, userId));
    const items = await Promise.all((await this.lines(this.pool, cart.id)).map(line => this.enrich(line)));
    if(!withPromotions) return { id:cart.id,version:Number(cart.version),items };
    const eligible=items.filter(item=>item.selected&&!item.error);
    if(!eligible.length) return { id:cart.id,version:Number(cart.version),items,promotionUnavailable:false };
    try{
      const count=(await this.pool.query('SELECT count(*)::int AS count FROM order_service.order_groups WHERE buyer_id=$1',
        [userId])).rows[0].count;
      const offer=await this.promotion('/quote','POST',{ userId,firstOrder:count===0,
        lines:eligible.map(item=>({ id:item.id,variantId:item.variantId,storeId:item.storeId,
          productId:item.productId,categoryId:item.categoryId,quantity:item.quantity,
          priceMinor:item.priceMinor,priceOriginalMinor:item.priceOriginalMinor })) });
      const byId=new Map(offer.lines.map(line=>[line.id,line]));
      return { id:cart.id,version:Number(cart.version),
        items:items.map(item=>{
          const flash=byId.get(item.id);
          return flash?.flashCampaignId?{ ...item,priceMinor:flash.unitPriceMinor,
            flashCampaignId:flash.flashCampaignId,flashEndsAt:flash.flashEndsAt,
            flashDiscountMinor:flash.flashDiscountMinor }:item;
        }),promotionUnavailable:false };
    }catch(error){
      if(error.status<500) throw error;
      return { id:cart.id,version:Number(cart.version),items,promotionUnavailable:true };
    }
  }
  async promotionContext(userId) {
    const cart=await this.cart(userId,false);
    const count=(await this.pool.query('SELECT count(*)::int AS count FROM order_service.order_groups WHERE buyer_id=$1',
      [userId])).rows[0].count;
    return { userId,firstOrder:count===0,cartVersion:cart.version,
      items:cart.items.filter(item=>item.selected) };
  }
  async add(userId, input) {
    const variantId = input?.variantId, quantity = input?.quantity;
    if (!uuid.test(String(variantId)) || !Number.isInteger(quantity) || quantity < 1 || quantity > 99)
      throw bad('INVALID_CART_ITEM', 'SKU hoặc số lượng không hợp lệ.');
    const quote = await this.inventory('/variants/' + variantId + '/quote?quantity=' + quantity);
    if (!quote.sellable) throw new OrderError(409, 'SKU_NOT_SELLABLE', 'Sản phẩm hiện không nhận đơn.');
    if (!quote.canFulfill) throw new OrderError(409, 'INSUFFICIENT_STOCK', 'Số lượng vượt quá tồn khả dụng.', { available: quote.available });
    await this.transaction(async db => {
      const cart = await this.cartRow(db, userId);
      const existing = (await db.query('SELECT quantity FROM order_service.cart_items WHERE cart_id=$1 AND variant_id=$2', [cart.id,variantId])).rows[0];
      const total = quantity + (existing?.quantity || 0);
      if (total > 99 || total > quote.available) throw new OrderError(409, 'INSUFFICIENT_STOCK', 'Số lượng vượt quá tồn khả dụng.', { available: quote.available });
      await db.query(`INSERT INTO order_service.cart_items(cart_id,variant_id,quantity,observed_price_minor)
        VALUES ($1,$2,$3,$4) ON CONFLICT(cart_id,variant_id) DO UPDATE SET quantity=$3,
        selected=true,observed_price_minor=$4`, [cart.id,variantId,total,quote.priceMinor]);
      await db.query('UPDATE order_service.carts SET version=version+1,updated_at=now() WHERE id=$1', [cart.id]);
    });
    return this.cart(userId);
  }
  async edit(userId, id, input) {
    if (!uuid.test(String(id)) || !input || (!Object.hasOwn(input,'quantity') && !Object.hasOwn(input,'selected')) ||
      Object.keys(input).some(key => !['quantity','selected'].includes(key)) ||
      (input.quantity !== undefined && (!Number.isInteger(input.quantity) || input.quantity < 1 || input.quantity > 99)) ||
      (input.selected !== undefined && typeof input.selected !== 'boolean')) throw bad('INVALID_CART_ITEM', 'Dữ liệu giỏ hàng không hợp lệ.');
    await this.transaction(async db => {
      const cart = await this.cartRow(db, userId);
      const line = (await db.query('SELECT * FROM order_service.cart_items WHERE cart_id=$1 AND id=$2', [cart.id,id])).rows[0];
      if (!line) throw new OrderError(404, 'CART_ITEM_NOT_FOUND', 'Không tìm thấy sản phẩm trong giỏ.');
      if (input.quantity !== undefined) {
        const quote = await this.inventory('/variants/' + line.variant_id + '/quote?quantity=' + input.quantity);
        if (quote.sellable && !quote.canFulfill) throw new OrderError(409, 'INSUFFICIENT_STOCK', 'Số lượng vượt quá tồn khả dụng.', { available: quote.available });
      }
      await db.query('UPDATE order_service.cart_items SET quantity=$3,selected=$4 WHERE cart_id=$1 AND id=$2',
        [cart.id,id,input.quantity ?? line.quantity,input.selected ?? line.selected]);
      await db.query('UPDATE order_service.carts SET version=version+1,updated_at=now() WHERE id=$1', [cart.id]);
    });
    return this.cart(userId);
  }
  async remove(userId, id) {
    if (!uuid.test(String(id))) throw bad('INVALID_CART_ITEM', 'Dòng giỏ hàng không hợp lệ.');
    await this.transaction(async db => {
      const cart = await this.cartRow(db, userId);
      const result = await db.query('DELETE FROM order_service.cart_items WHERE cart_id=$1 AND id=$2', [cart.id,id]);
      if (!result.rowCount) throw new OrderError(404, 'CART_ITEM_NOT_FOUND', 'Không tìm thấy sản phẩm trong giỏ.');
      await db.query('UPDATE order_service.carts SET version=version+1,updated_at=now() WHERE id=$1', [cart.id]);
    });
    return this.cart(userId);
  }
  async merge(userId, input) {
    if (!Array.isArray(input?.items) || input.items.length > 50) throw bad('INVALID_CART', 'Giỏ khách không hợp lệ.');
    for (const item of input.items) await this.add(userId, item);
    return this.cart(userId);
  }
  async calculate(userId, input, bearer, selectedIds) {
    if (input.paymentMethod !== 'COD' && !this.onlineMethods.has(input.paymentMethod))
      throw bad('PAYMENT_UNAVAILABLE', 'Phương thức thanh toán chưa khả dụng.');
    const voucherCode=input.voucherCode==null||input.voucherCode===''?null:
      typeof input.voucherCode==='string'?input.voucherCode.trim().toUpperCase():null;
    const storeVoucherCode=input.storeVoucherCode==null||input.storeVoucherCode===''?null:
      typeof input.storeVoucherCode==='string'?input.storeVoucherCode.trim().toUpperCase():null;
    const platformVoucherCode=input.platformVoucherCode==null||input.platformVoucherCode===''?null:
      typeof input.platformVoucherCode==='string'?input.platformVoucherCode.trim().toUpperCase():null;
    if([voucherCode,storeVoucherCode,platformVoucherCode].some(code=>code!==null&&!/^[A-Z0-9_-]{4,32}$/.test(code))||
      (input.voucherCode&&!voucherCode)||(input.storeVoucherCode&&!storeVoucherCode)||
      (input.platformVoucherCode&&!platformVoucherCode)||
      new Set([voucherCode,storeVoucherCode,platformVoucherCode].filter(Boolean)).size!==
        [voucherCode,storeVoucherCode,platformVoucherCode].filter(Boolean).length||
      [voucherCode,storeVoucherCode,platformVoucherCode].filter(Boolean).length>2)
      throw bad('INVALID_VOUCHER','Mã voucher không hợp lệ.');
    let address = null, addressError = null;
    try { address = await this.address(input.addressId, bearer); }
    catch (error) {
      if (error.status >= 500) throw error;
      addressError = { code: error.code || 'ADDRESS_INVALID', message: error.message };
    }
    const cart = await this.cart(userId,false);
    const chosen = cart.items.filter(item => selectedIds ? selectedIds.includes(item.id) : item.selected);
    if (selectedIds && (selectedIds.length !== chosen.length || new Set(selectedIds).size !== selectedIds.length))
      throw bad('INVALID_SELECTION', 'Sản phẩm được chọn không còn trong giỏ.');
    if (!chosen.length) throw bad('EMPTY_CHECKOUT', 'Vui lòng chọn ít nhất một sản phẩm.');
    if (chosen.length > 100) throw bad('TOO_MANY_ITEMS','Mỗi lần thanh toán tối đa 100 SKU.');
    const errors = chosen.filter(item => item.error).map(item => ({ itemId: item.id, variantId: item.variantId, ...item.error }));
    if (addressError) errors.push(addressError);
    const eligible=chosen.filter(item=>!item.error);
    const firstOrder=(await this.pool.query('SELECT count(*)::int AS count FROM order_service.order_groups WHERE buyer_id=$1',
      [userId])).rows[0].count===0;
    let promotion=null,promotionUnavailable=false;
    try{
      promotion=await this.promotion('/quote','POST',{ userId,firstOrder,code:voucherCode,
        storeCode:storeVoucherCode,platformCode:platformVoucherCode,
        lines:eligible.map(item=>({ id:item.id,variantId:item.variantId,storeId:item.storeId,
          productId:item.productId,categoryId:item.categoryId,quantity:item.quantity,
          priceMinor:item.priceMinor,priceOriginalMinor:item.priceOriginalMinor })) });
    }catch(error){
      if(voucherCode||storeVoucherCode||platformVoucherCode||error.status<500) throw error;
      promotionUnavailable=true;
    }
    const promoLines=new Map((promotion?.lines||[]).map(item=>[item.id,item]));
    const groups = new Map();
    for (const item of eligible) {
      if (!money(item.priceMinor) || !money(item.priceOriginalMinor) ||
        item.priceOriginalMinor < item.priceMinor || !money(item.priceMinor * item.quantity) ||
        !money(item.priceOriginalMinor * item.quantity))
        throw new OrderError(503, 'INVALID_CATALOG_PRICE', 'Giá sản phẩm không hợp lệ.');
      if (!groups.has(item.storeId)) groups.set(item.storeId, { storeId: item.storeId, storeName: item.storeName, lines: [] });
      const promo=promoLines.get(item.id);
      const unitPriceMinor=promo?.unitPriceMinor??item.priceMinor;
      const catalogDiscountMinor=(item.priceOriginalMinor-item.priceMinor)*item.quantity;
      const flashDiscountMinor=promo?.flashDiscountMinor??0;
      const voucherDiscountMinor=promo?.voucherDiscountMinor??0;
      const shopVoucherDiscountMinor=promo?.shopVoucherDiscountMinor??0;
      const platformVoucherDiscountMinor=promo?.platformVoucherDiscountMinor??0;
      if(!money(unitPriceMinor)||unitPriceMinor>item.priceMinor||
        !money(flashDiscountMinor)||!money(voucherDiscountMinor)||
        shopVoucherDiscountMinor+platformVoucherDiscountMinor!==voucherDiscountMinor||
        voucherDiscountMinor>unitPriceMinor*item.quantity)
        throw new OrderError(503,'INVALID_PROMOTION_PRICE','Giá khuyến mãi không hợp lệ.');
      groups.get(item.storeId).lines.push({ ...item,catalogPriceMinor:item.priceMinor,
        unitPriceMinor,listPriceMinor:item.priceOriginalMinor,
        catalogDiscountMinor,flashDiscountMinor,voucherDiscountMinor,
        shopVoucherDiscountMinor,platformVoucherDiscountMinor,
        flashCampaignId:promo?.flashCampaignId||null,flashEndsAt:promo?.flashEndsAt||null,
        discountMinor:catalogDiscountMinor+flashDiscountMinor+voucherDiscountMinor,
        lineTotalMinor:unitPriceMinor*item.quantity-voucherDiscountMinor });
    }
    const stores = [...groups.values()].map(group => {
      const subtotalMinor = sum(group.lines.map(line => line.listPriceMinor*line.quantity));
      const discountMinor = sum(group.lines.map(line => line.discountMinor));
      const shippingEstimateMinor = 30000;
      if (!money(subtotalMinor) || !money(discountMinor) ||
        !money(subtotalMinor-discountMinor+shippingEstimateMinor))
        throw new OrderError(400,'TOTAL_TOO_LARGE','Tổng tiền vượt giới hạn cho phép.');
      return { ...group, subtotalMinor, discountMinor, shippingEstimateMinor,
        payableTotalMinor: subtotalMinor-discountMinor+shippingEstimateMinor };
    });
    if (!money(sum(stores.map(store => store.payableTotalMinor))))
      throw new OrderError(400,'TOTAL_TOO_LARGE','Tổng tiền vượt giới hạn cho phép.');
    return { cartVersion: cart.version, addressId: input.addressId || null, address,
      paymentMethod: input.paymentMethod, currency: 'VND', stores, errors,
      voucherCode,storeVoucherCode,platformVoucherCode,
      voucher:promotion?.voucher||null,vouchers:promotion?.vouchers||[],
      promotionUnavailable,firstOrder,
      serverTime:promotion?.serverTime||new Date().toISOString(),
      subtotalMinor: sum(stores.map(store => store.subtotalMinor)),
      discountMinor: sum(stores.map(store => store.discountMinor)),
      shippingEstimateMinor: sum(stores.map(store => store.shippingEstimateMinor)),
      payableTotalMinor: sum(stores.map(store => store.payableTotalMinor)),
      itemIds: chosen.map(item => item.id), shippingFeeIsEstimate: true };
  }
  async preview(userId, input, bearer) {
    if (input.itemIds !== undefined && (!Array.isArray(input.itemIds) || input.itemIds.some(id => !uuid.test(String(id)))))
      throw bad('INVALID_SELECTION', 'Sản phẩm được chọn không hợp lệ.');
    const quote = await this.calculate(userId, input, bearer, input.itemIds);
    const { rows } = await this.pool.query(`INSERT INTO order_service.checkout_quotes(user_id,cart_version,address_id,quote_json)
      VALUES ($1,$2,$3,$4) RETURNING id,expires_at`, [userId,quote.cartVersion,quote.addressId,quote]);
    return { quoteId: rows[0].id, expiresAt: rows[0].expires_at, ...quote };
  }
  async finalize(userId, key, result) {
    const ids = result.orders.map(order => order.id);
    const paymentMethod = result.paymentMethod || 'COD';
    const { rows } = await this.pool.query(`SELECT oi.reservation_id,o.id AS order_id FROM order_service.order_items oi
      JOIN order_service.orders o ON o.id=oi.order_id WHERE o.user_id=$1 AND o.id=ANY($2::uuid[])`, [userId,ids]);
    if(result.promotionReserved) await this.promotion('/commit','POST',{
      orderRef:result.quoteId,shopOrdersByStore:Object.fromEntries(result.orders.map(order=>[order.storeId,order.id])) });
    await this.inventory('/reservations/commit-batch','POST',{ reservationIds:rows.map(row => row.reservation_id) });
    await this.transaction(async db => {
      const nextStatus = paymentMethod==='COD' ? 'PLACED' : 'PENDING_PAYMENT';
      const confirmed = await db.query(`UPDATE order_service.orders SET status=$3,version=version+1,updated_at=now()
        WHERE id=ANY($1::uuid[]) AND user_id=$2 AND status='PENDING_INVENTORY'
        RETURNING id,user_id,store_id,group_id`, [ids,userId,nextStatus]);
      for (const row of confirmed.rows) await db.query('INSERT INTO order_service.order_outbox(event_type,aggregate_id,payload) VALUES ($1,$2,$3)',
        ['OrderCreated.v1',row.id,{ orderId:row.id,groupId:row.group_id,buyerId:row.user_id,
          storeId:row.store_id,paymentMethod }]);
      for (const row of confirmed.rows) await db.query(`INSERT INTO order_service.order_status_history
        (shop_order_id,from_status,to_status,actor_type,reason,correlation_id)
        VALUES ($1,'PENDING_INVENTORY',$2,'system','inventory_committed',$3)`, [row.id,nextStatus,key]);
      if (confirmed.rows.length) {
        const groupId = confirmed.rows[0].group_id;
        await db.query('UPDATE order_service.order_groups SET status=$2,updated_at=now() WHERE id=$1',[groupId,nextStatus]);
        await db.query('INSERT INTO order_service.order_outbox(event_type,aggregate_id,payload) VALUES ($1,$2,$3)',
          ['OrderGroupPlaced.v1',groupId,{ groupId,buyerId:userId,paymentMethod }]);
      }
    });
    const nextStatus = paymentMethod==='COD' ? 'PLACED' : 'PENDING_PAYMENT';
    const complete = { groupId:result.groupId,paymentMethod,
      quoteId:result.quoteId,promotionReserved:result.promotionReserved,
      orders: result.orders.map(order => ({ ...order, status: nextStatus })) };
    await this.pool.query('UPDATE order_service.checkout_idempotency SET result_ref=$3 WHERE user_id=$1 AND idempotency_key=$2', [userId,key,complete]);
    return complete;
  }
  async place(userId, input, bearer) {
    const { quoteId, idempotencyKey } = input || {};
    if (!uuid.test(String(quoteId)) || typeof idempotencyKey !== 'string' || !/^[\w:-]{8,120}$/.test(idempotencyKey))
      throw bad('INVALID_CHECKOUT', 'Phiên checkout hoặc khóa yêu cầu không hợp lệ.');
    const hashInput={ quoteId, addressId: input.addressId,
      paymentMethod: input.paymentMethod, voucherCode: input.voucherCode || null,
      expectedTotalMinor: input.expectedTotalMinor ?? null };
    if(input.storeVoucherCode)hashInput.storeVoucherCode=input.storeVoucherCode;
    if(input.platformVoucherCode)hashInput.platformVoucherCode=input.platformVoucherCode;
    const hash = createHash('sha256').update(JSON.stringify(hashInput)).digest('hex');
    const db = await this.pool.connect();
    const reservations = [];
    let promotionsReserved = false;
    let persisted = false;
    try {
      await db.query('BEGIN');
      await db.query('SELECT pg_advisory_xact_lock(hashtext($1),hashtext($2))', [userId,idempotencyKey]);
      const existing = (await db.query('SELECT * FROM order_service.checkout_idempotency WHERE user_id=$1 AND idempotency_key=$2',
        [userId,idempotencyKey])).rows[0];
      if (existing) {
        if (existing.request_hash !== hash) throw new OrderError(409, 'IDEMPOTENCY_CONFLICT', 'Khóa này đã dùng với yêu cầu khác.');
        await db.query('COMMIT');
        if (existing.result_ref.orders.some(order => order.status === 'CANCELLED'))
          throw new OrderError(409, 'CHECKOUT_FAILED', 'Phiên đặt hàng đã thất bại; vui lòng tính lại bảng giá.');
        return this.finalize(userId,idempotencyKey,existing.result_ref);
      }
      const stored = (await db.query('SELECT * FROM order_service.checkout_quotes WHERE id=$1 AND user_id=$2 FOR UPDATE', [quoteId,userId])).rows[0];
      if (!stored || stored.status !== 'ACTIVE' || new Date(stored.expires_at) <= new Date())
        throw new OrderError(409, 'QUOTE_EXPIRED', 'Bảng giá đã hết hạn, vui lòng tính lại.');
      const old = stored.quote_json;
      if (old.addressId !== input.addressId || input.paymentMethod !== old.paymentMethod ||
        old.voucherCode!==(input.voucherCode ? String(input.voucherCode).trim().toUpperCase() : null)||
        (old.storeVoucherCode||null)!==(input.storeVoucherCode ? String(input.storeVoucherCode).trim().toUpperCase() : null)||
        (old.platformVoucherCode||null)!==(input.platformVoucherCode ? String(input.platformVoucherCode).trim().toUpperCase() : null))
        throw new OrderError(409, 'QUOTE_CHANGED', 'Thông tin thanh toán đã thay đổi, vui lòng tính lại.');
      const fresh = await this.calculate(userId,input,bearer,old.itemIds);
      if (fresh.errors.length) throw new OrderError(409, 'CHECKOUT_INVALID', 'Một số sản phẩm hoặc địa chỉ không hợp lệ.', fresh.errors);
      const cartLock = (await db.query('SELECT version FROM order_service.carts WHERE user_id=$1 FOR UPDATE', [userId])).rows[0];
      if (fresh.cartVersion !== Number(stored.cart_version) || fresh.payableTotalMinor !== old.payableTotalMinor ||
        Number(cartLock?.version) !== fresh.cartVersion ||
        JSON.stringify(fresh.stores.map(s => s.lines.map(l => [l.variantId,l.unitPriceMinor,l.listPriceMinor,l.discountMinor,l.quantity,l.flashCampaignId,l.voucherDiscountMinor,l.shopVoucherDiscountMinor,l.platformVoucherDiscountMinor]))) !==
        JSON.stringify(old.stores.map(s => s.lines.map(l => [l.variantId,l.unitPriceMinor,l.listPriceMinor,l.discountMinor,l.quantity,l.flashCampaignId,l.voucherDiscountMinor,l.shopVoucherDiscountMinor,l.platformVoucherDiscountMinor]))))
        throw new OrderError(409, 'QUOTE_CHANGED', 'Giá, tồn hoặc giỏ hàng đã thay đổi, vui lòng tính lại.');
      if (input.expectedTotalMinor !== undefined && input.expectedTotalMinor !== fresh.payableTotalMinor)
        throw new OrderError(409, 'TOTAL_MISMATCH', 'Tổng tiền đã thay đổi, vui lòng tính lại.');
      for (const store of fresh.stores) for (const line of store.lines) {
        const reservation = await this.inventory('/reservations', 'POST', { variantId: line.variantId,
          orderRef: quoteId, quantity: line.quantity, idempotencyKey: quoteId + ':' + line.id, ttlSeconds: 1800 });
        reservations.push({ ...reservation.reservation, lineId: line.id });
      }
      for (const store of fresh.stores) for (const line of store.lines) {
        const rechecked = await this.inventory('/variants/' + line.variantId + '/quote?quantity=1');
        if (!rechecked.sellable || rechecked.priceMinor !== line.catalogPriceMinor)
          throw new OrderError(409, 'QUOTE_CHANGED', 'Giá hoặc trạng thái sản phẩm đã thay đổi, vui lòng tính lại.');
      }
      const usesPromotion=Boolean(fresh.vouchers?.length||fresh.stores.some(store=>store.lines.some(line=>line.flashCampaignId)));
      if(usesPromotion){
        const reserved=await this.promotion('/reserve','POST',{ userId,orderRef:quoteId,
          firstOrder:fresh.firstOrder,code:fresh.voucherCode,
          storeCode:fresh.storeVoucherCode,platformCode:fresh.platformVoucherCode,ttlSeconds:1800,
          lines:fresh.stores.flatMap(store=>store.lines.map(line=>({
            id:line.id,variantId:line.variantId,storeId:line.storeId,
            productId:line.productId,categoryId:line.categoryId,quantity:line.quantity,
            priceMinor:line.catalogPriceMinor,priceOriginalMinor:line.priceOriginalMinor
          }))) });
        promotionsReserved=true;
        const expected=fresh.stores.flatMap(store=>store.lines).map(line=>[
          line.id,line.unitPriceMinor,line.flashCampaignId,line.voucherDiscountMinor,
          line.shopVoucherDiscountMinor,line.platformVoucherDiscountMinor]);
        const actual=reserved.lines.map(line=>[
          line.id,line.unitPriceMinor,line.flashCampaignId,line.voucherDiscountMinor,
          line.shopVoucherDiscountMinor,line.platformVoucherDiscountMinor]);
        if(JSON.stringify(expected)!==JSON.stringify(actual))
          throw new OrderError(409,'PROMOTION_CHANGED','Khuyến mãi đã thay đổi, vui lòng tính lại.');
      }
      const group = (await db.query(`INSERT INTO order_service.order_groups(buyer_id,grand_total_minor,current_total_minor,status,payment_method)
        VALUES ($1,$2,$2,'PENDING_INVENTORY',$3) RETURNING id`, [userId,fresh.payableTotalMinor,input.paymentMethod])).rows[0];
      const orders = [];
      for (const store of fresh.stores) {
        const inserted = (await db.query(`INSERT INTO order_service.orders(user_id,store_id,group_id,quote_id,payment_method,
          subtotal_minor,discount_minor,shipping_estimate_minor,payable_total_minor,shipping_address_json,store_snapshot_json)
          VALUES ($1,$2,$3,$4,$11,$5,$6,$7,$8,$9,$10) RETURNING id,status,created_at`,
          [userId,store.storeId,group.id,quoteId,store.subtotalMinor,store.discountMinor,store.shippingEstimateMinor,store.payableTotalMinor,
            fresh.address,{ id:store.storeId,name:store.storeName },input.paymentMethod])).rows[0];
        for (const line of store.lines) {
          const orderItem=(await db.query(`INSERT INTO order_service.order_items(order_id,variant_id,product_id,sku,product_name,quantity,
            unit_price_minor,line_total_minor,reservation_id,product_snapshot_json,discount_minor)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
            [inserted.id,line.variantId,line.productId,line.sku,line.productName,line.quantity,line.unitPriceMinor,
              line.lineTotalMinor,reservations.find(item => item.lineId === line.id).id,
              { productId:line.productId,name:line.productName,categoryId:line.categoryId||null,sku:line.sku,attributes:line.attributes,
                imageKey:line.imageKey,imageUrl:line.imageUrl,currency:'VND',originalPriceMinor:line.priceOriginalMinor,
                catalogPriceMinor:line.catalogPriceMinor,flashCampaignId:line.flashCampaignId,
                voucherCode:fresh.voucherCode,storeVoucherCode:fresh.storeVoucherCode,
                platformVoucherCode:fresh.platformVoucherCode,
                voucherDiscountMinor:line.voucherDiscountMinor,
                shopVoucherDiscountMinor:line.shopVoucherDiscountMinor,
                platformVoucherDiscountMinor:line.platformVoucherDiscountMinor,
                saleStartsAt:line.saleStartsAt,saleEndsAt:line.saleEndsAt },line.discountMinor])).rows[0];
          for(const source of [
            { type:'CATALOG_SALE',amount:line.catalogDiscountMinor,id:line.variantId,funding:'SELLER' },
            { type:'FLASH_SALE',amount:line.flashDiscountMinor,id:line.flashCampaignId,funding:'SELLER' },
            { type:'VOUCHER',amount:line.shopVoucherDiscountMinor,
              id:fresh.vouchers?.find(voucher=>voucher.kind==='store')?.id,funding:'SELLER' },
            { type:'VOUCHER',amount:line.platformVoucherDiscountMinor,
              id:fresh.vouchers?.find(voucher=>voucher.kind==='platform')?.id,funding:'PLATFORM' }
          ]) if(source.amount>0) await db.query(`INSERT INTO order_service.order_discounts
            (shop_order_id,item_id,source_type,source_id,funding_source,discount_minor)
            VALUES ($1,$2,$3,$4,$5,$6)`,
            [inserted.id,orderItem.id,source.type,source.id,source.funding,source.amount]);
        }
        await db.query(`INSERT INTO order_service.order_status_history
          (shop_order_id,from_status,to_status,actor_id,actor_type,reason,correlation_id)
          VALUES ($1,NULL,'PENDING_INVENTORY',$2,'buyer','checkout',$3)`, [inserted.id,userId,quoteId]);
        orders.push({ id: inserted.id, storeId: store.storeId, payableTotalMinor: store.payableTotalMinor, status: inserted.status });
      }
      await db.query('DELETE FROM order_service.cart_items WHERE cart_id=(SELECT id FROM order_service.carts WHERE user_id=$1) AND id=ANY($2::uuid[])',
        [userId,fresh.itemIds]);
      await db.query('UPDATE order_service.carts SET version=version+1,updated_at=now() WHERE user_id=$1', [userId]);
      await db.query("UPDATE order_service.checkout_quotes SET status='PLACED' WHERE id=$1", [quoteId]);
      const result = { groupId:group.id,paymentMethod:input.paymentMethod,
        quoteId,promotionReserved:usesPromotion,orders };
      await db.query('INSERT INTO order_service.checkout_idempotency(user_id,idempotency_key,request_hash,result_ref) VALUES ($1,$2,$3,$4)',
        [userId,idempotencyKey,hash,result]);
      await db.query('COMMIT');
      persisted = true;
      return this.finalize(userId,idempotencyKey,result);
    } catch (error) {
      if (!persisted) {
        await db.query('ROLLBACK').catch(() => {});
        if(promotionsReserved) await this.promotion('/release','POST',{ orderRef:quoteId }).catch(() => {});
        for (const reservation of reservations) await this.inventory('/reservations/' + reservation.id + '/release', 'POST').catch(() => {});
      }
      throw error;
    } finally { db.release(); }
  }
  async reconcilePending() {
    const { rows } = await this.pool.query(`SELECT i.user_id,i.idempotency_key,i.result_ref
      FROM order_service.checkout_idempotency i WHERE EXISTS (
        SELECT 1 FROM order_service.orders o WHERE o.user_id=i.user_id
          AND o.id::text IN (SELECT item->>'id' FROM jsonb_array_elements(i.result_ref->'orders') item)
          AND o.status='PENDING_INVENTORY')
      ORDER BY i.created_at LIMIT 20`);
    for (const row of rows) {
      try { await this.finalize(row.user_id,row.idempotency_key,row.result_ref); }
      catch (error) {
        if (['INVALID_RESERVATION_STATE','RESERVATION_EXPIRED',
          'INVALID_REDEMPTION_STATE','INVALID_FLASH_STATE'].includes(error.code)) {
          try { await this.cancelExpired(row.user_id,row.idempotency_key,row.result_ref,
            error.code!=='INVALID_RESERVATION_STATE'); }
          catch (cause) { console.error('Pending order cancellation failed:',cause.message); }
        } else console.error('Pending inventory reconciliation failed:');
      }
    }
  }
  async cancelExpired(userId, key, result, force=false) {
    const ids = result.orders.map(order => order.id);
    const { rows } = await this.pool.query(`SELECT oi.reservation_id FROM order_service.order_items oi
      JOIN order_service.orders o ON o.id=oi.order_id WHERE o.user_id=$1 AND o.id=ANY($2::uuid[])`,
      [userId,ids]);
    const statuses = await Promise.all(rows.map(async row =>
      (await this.inventory('/reservations/' + row.reservation_id)).reservation));
    if (!force && !statuses.some(item => ['EXPIRED','RELEASED'].includes(item.status))) return;
    for (const item of statuses.filter(item => item.status === 'ACTIVE'))
      await this.inventory('/reservations/' + item.id + '/release','POST');
    const committed=statuses.filter(item=>item.status==='COMMITTED').map(item=>item.id);
    if(committed.length) await this.inventory('/restock-batch','POST',{
      reservationIds:committed,cancellationKey:'pending-abort:'+result.groupId });
    if(result.promotionReserved&&result.quoteId)
      await this.promotion('/release','POST',{ orderRef:result.quoteId }).catch(error=>{
        if(error.code!=='INVALID_REDEMPTION_STATE') throw error;
      });
    await this.transaction(async db => {
      const pending = await db.query(`SELECT id FROM order_service.orders WHERE user_id=$1
        AND id=ANY($2::uuid[]) AND status='PENDING_INVENTORY' FOR UPDATE`, [userId,ids]);
      if (pending.rows.length !== ids.length) return;
      const cart = await this.cartRow(db,userId);
      const lines = await db.query(`SELECT oi.variant_id,oi.quantity FROM order_service.order_items oi
        WHERE oi.order_id=ANY($1::uuid[])`, [ids]);
      for (const line of lines.rows) await db.query(`INSERT INTO order_service.cart_items(cart_id,variant_id,quantity,selected)
        VALUES ($1,$2,$3,true) ON CONFLICT(cart_id,variant_id) DO UPDATE
        SET quantity=LEAST(99,order_service.cart_items.quantity+EXCLUDED.quantity)`,
        [cart.id,line.variant_id,line.quantity]);
      await db.query('UPDATE order_service.carts SET version=version+1,updated_at=now() WHERE id=$1', [cart.id]);
      await db.query("UPDATE order_service.orders SET status='CANCELLED',version=version+1,updated_at=now() WHERE id=ANY($1::uuid[])", [ids]);
      for (const id of ids) await db.query(`INSERT INTO order_service.order_status_history
        (shop_order_id,from_status,to_status,actor_type,reason,correlation_id)
        VALUES ($1,'PENDING_INVENTORY','CANCELLED','system','reservation_expired',$2)`,[id,key]);
      await db.query(`UPDATE order_service.order_groups SET status='CANCELLED',current_total_minor=0,
        cancelled_total_minor=grand_total_minor,updated_at=now()
        WHERE id=ANY(SELECT group_id FROM order_service.orders WHERE id=ANY($1::uuid[]))`, [ids]);
      await db.query("UPDATE order_service.checkout_quotes SET status='EXPIRED' WHERE id IN (SELECT quote_id FROM order_service.orders WHERE id=ANY($1::uuid[]))", [ids]);
      await db.query('UPDATE order_service.checkout_idempotency SET result_ref=$3 WHERE user_id=$1 AND idempotency_key=$2',
        [userId,key,{ groupId:result.groupId, orders:result.orders.map(order => ({ ...order,status:'CANCELLED' })) }]);
    });
    if(result.promotionReserved) for(const id of ids)
      await this.promotion('/release-shop','POST',{ shopOrderId:id }).catch(error=>
        console.error('Pending promotion release failed:'));
  }
  async publishOutbox(webhookUrl, webhookToken) {
    if (!webhookUrl) return false;
    const db = await this.pool.connect();
    try {
      await db.query('BEGIN');
      const { rows } = await db.query(`SELECT id,event_type,aggregate_id,payload,attempts
        FROM order_service.order_outbox WHERE published_at IS NULL AND next_attempt_at<=now()
        ORDER BY id LIMIT 1 FOR UPDATE SKIP LOCKED`);
      const event = rows[0];
      if (!event) { await db.query('COMMIT'); return false; }
      try {
        const response = await fetch(webhookUrl,{
          method:'POST',headers:{ 'Content-Type':'application/json',
            'X-Order-Event-Token':webhookToken,'X-Event-Id':String(event.id) },
          body:JSON.stringify({ id:event.id,type:event.event_type,aggregateId:event.aggregate_id,payload:event.payload }),
          signal:AbortSignal.timeout(5000),
        });
        if (!response.ok) throw new Error('Webhook returned '+response.status);
        await db.query('UPDATE order_service.order_outbox SET published_at=now() WHERE id=$1',[event.id]);
      } catch (error) {
        const attempts = event.attempts+1;
        const delay = Math.min(300,2**Math.min(attempts,8));
        await db.query(`UPDATE order_service.order_outbox SET attempts=$2,
          next_attempt_at=now()+($3 * interval '1 second') WHERE id=$1`,[event.id,attempts,delay]);
        console.error('Order outbox delivery failed:');
      }
      await db.query('COMMIT');
      return true;
    } catch (error) { await db.query('ROLLBACK'); throw error; }
    finally { db.release(); }
  }
  async publishNotificationOutbox(webhookUrl,webhookToken){
    if(!webhookUrl||!webhookToken)return false;
    const db=await this.pool.connect();
    try{await db.query('BEGIN');
      const event=(await db.query(`SELECT id,event_type,aggregate_id,payload,notification_attempts
        FROM order_service.order_outbox
        WHERE notification_sent_at IS NULL AND notification_dead_at IS NULL
          AND next_notification_at<=now() AND event_type IN
          ('OrderCreated.v1','ShopOrderConfirmed.v1','OrderCancelled.v1',
           'ReturnRequested.v1','ReturnApproved.v1','RefundRequested.v1','CaseInformationRequested.v1','CasePublicMessage.v1','CaseDecisionPublished.v1','CaseAppealUpdated.v1')
        ORDER BY id LIMIT 1 FOR UPDATE SKIP LOCKED`)).rows[0];
      if(!event){await db.query('COMMIT');return false;}
      try{const response=await fetch(webhookUrl,{method:'POST',
        headers:{'Content-Type':'application/json','X-Order-Notification-Token':webhookToken,
          'X-Event-Id':String(event.id)},
        body:JSON.stringify({id:event.id,type:event.event_type,aggregateId:event.aggregate_id,
          payload:event.payload}),signal:AbortSignal.timeout(5000)});
        if(!response.ok)throw new Error('Notification returned '+response.status);
        await db.query('UPDATE order_service.order_outbox SET notification_sent_at=now() WHERE id=$1',
          [event.id]);
      }catch(error){const attempts=event.notification_attempts+1,delay=Math.min(300,2**Math.min(attempts,8));
        await db.query(`UPDATE order_service.order_outbox SET notification_attempts=$2,
          next_notification_at=now()+($3 * interval '1 second'),
          notification_dead_at=CASE WHEN $2>=10 THEN now() ELSE notification_dead_at END
          WHERE id=$1`,[event.id,attempts,delay]);
        console.error('Order notification delivery failed:');}
      await db.query('COMMIT');return true;
    }catch(error){await db.query('ROLLBACK');throw error;}finally{db.release();}
  }
  async notificationMetrics(){
    const row=(await this.pool.query(`SELECT
      count(*) FILTER (WHERE notification_sent_at IS NULL AND notification_dead_at IS NULL)::int AS pending,
      count(*) FILTER (WHERE notification_dead_at IS NOT NULL)::int AS dead,
      min(created_at) FILTER (WHERE notification_sent_at IS NULL
        AND notification_dead_at IS NULL) AS oldest_pending_at
      FROM order_service.order_outbox WHERE event_type IN
      ('OrderCreated.v1','ShopOrderConfirmed.v1','OrderCancelled.v1',
       'ReturnRequested.v1','ReturnApproved.v1','RefundRequested.v1','CaseInformationRequested.v1','CasePublicMessage.v1','CaseDecisionPublished.v1','CaseAppealUpdated.v1')`)).rows[0];
    return {pending:row.pending,dead:row.dead,oldestPendingAt:row.oldest_pending_at};
  }
}
