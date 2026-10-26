import { randomUUID, createHash } from 'node:crypto';

export class PromotionError extends Error {
  constructor(status,code,message,details) { super(message);Object.assign(this,{ status,code,details }); }
}
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const money=value=>Number.isSafeInteger(value)&&value>=0;
const codePattern=/^[A-Z0-9_-]{4,32}$/;
const invalid=(code,message)=>new PromotionError(400,code,message);
const missing=()=>new PromotionError(404,'CAMPAIGN_NOT_FOUND','Không tìm thấy chương trình khuyến mãi.');
const tidyCode=value=>typeof value==='string'?value.trim().toUpperCase():'';
const safeDate=value=>{const date=new Date(value);return Number.isNaN(date.getTime())?null:date;};
const campaignDto=row=>({ id:row.id,storeId:row.store_id,type:row.type,status:row.status,
  fundingSource:row.funding_source,title:row.title,startsAt:row.starts_at,endsAt:row.ends_at,
  createdAt:row.created_at });
const voucherDto=row=>({ id:row.id,code:row.code,discountType:row.discount_type,
  discountValue:row.discount_value,maxDiscountMinor:row.max_discount_minor==null?null:Number(row.max_discount_minor),
  minSpendMinor:Number(row.min_spend_minor),totalLimit:row.total_limit,
  perUserLimit:row.per_user_limit,usedCount:row.used_count,reservedCount:row.reserved_count,
  scopeType:row.scope_type,scopeId:row.scope_id,segment:row.segment,stackable:row.stackable });
const baseOf=line=>line.unitPriceMinor*line.quantity-(line.voucherDiscountMinor||0);
export function allocateDiscount(discount,lines) {
  if (!discount || !lines.length) return new Map();
  const total=lines.reduce((sum,line)=>sum+baseOf(line),0);
  const entries=lines.map(line=>{
    const numerator=BigInt(discount)*BigInt(baseOf(line));
    return { key:line.id,base:Number(numerator/BigInt(total)),
      remainder:numerator%BigInt(total) };
  });
  let left=discount-entries.reduce((sum,item)=>sum+item.base,0);
  entries.sort((a,b)=>a.remainder===b.remainder?
    String(a.key).localeCompare(String(b.key)):(a.remainder>b.remainder?-1:1));
  for(const entry of entries) if(left-->0) entry.base++;
  return new Map(entries.map(item=>[item.key,item.base]));
}

export class PromotionService {
  constructor(pool,config){this.pool=pool;this.config=config;}
  async transaction(fn){
    const db=await this.pool.connect();
    try{await db.query('BEGIN');const result=await fn(db);await db.query('COMMIT');return result;}
    catch(error){await db.query('ROLLBACK');throw error;}
    finally{db.release();}
  }
  async remote(url,options={}){
    let response;
    try{response=await fetch(url,{...options,signal:AbortSignal.timeout(5000)});}
    catch{throw new PromotionError(503,'DEPENDENCY_UNAVAILABLE','Dịch vụ liên quan tạm thời không khả dụng.');}
    const data=await response.json().catch(()=>({}));
    if(!response.ok) throw new PromotionError(response.status>=500?503:response.status,
      data.code||'DEPENDENCY_ERROR',data.message||'Dịch vụ liên quan từ chối yêu cầu.');
    return data;
  }
  async identity(bearer){
    if(!/^Bearer\s+\S+$/i.test(bearer||'')) throw new PromotionError(401,'UNAUTHORIZED','Vui lòng đăng nhập.');
    return (await this.remote(new URL('/api/v2/auth/me',this.config.identityUrl),
      {headers:{Authorization:bearer}})).user;
  }
  async member(storeId,userId){
    if(!uuid.test(String(storeId))) throw missing();
    return this.remote(new URL(`/api/v2/inventory/stores/${storeId}/membership?userId=${userId}`,
      this.config.catalogUrl),{headers:{'X-Inventory-Token':this.config.catalogToken}});
  }
  async variant(id){
    if(!uuid.test(String(id))) throw invalid('INVALID_VARIANT','SKU không hợp lệ.');
    return this.remote(new URL('/api/v2/inventory/variants/'+id+'/quote',this.config.catalogUrl),
      {headers:{'X-Inventory-Token':this.config.catalogToken}});
  }
  async buyerContext(userId){
    if(!uuid.test(String(userId))) throw invalid('INVALID_USER','Người mua không hợp lệ.');
    return this.remote(new URL('/api/v2/internal/promotion/buyers/'+userId+'/context',
      this.config.orderUrl),{headers:{'X-Promotion-Token':this.config.internalToken}});
  }
  dates(input){
    const starts=safeDate(input?.startsAt),ends=safeDate(input?.endsAt);
    if(!starts||!ends||ends<=starts||ends.getTime()-starts.getTime()>365*86400_000)
      throw invalid('INVALID_CAMPAIGN_TIME','Thời gian chương trình không hợp lệ.');
    return { starts,ends };
  }
  async createVoucher(storeId,userId,input,internal=false){
    if(internal){
      if(!uuid.test(String(storeId)))throw missing();
      const policy=await this.remote(new URL(`/api/v2/stores/by-id/${storeId}/checkout-policy`,
        this.config.catalogUrl));
      if(!policy.acceptingOrders)throw new PromotionError(409,'STORE_UNAVAILABLE','Cửa hàng chưa nhận đơn.');
    }else await this.member(storeId,userId);
    const code=tidyCode(input?.code),{ starts,ends }=this.dates(input);
    const title=typeof input.title==='string'?input.title.trim():'';
    const discountType=input.discountType,discountValue=input.discountValue;
    const maxDiscount=input.maxDiscountMinor??null,minSpend=input.minSpendMinor??0;
    const scopeType=input.scopeType||'STORE',scopeId=input.scopeId||null;
    const segment=input.segment||'ALL';
    if(!codePattern.test(code)||title.length<3||title.length>120||
      !['FIXED','PERCENT'].includes(discountType)||!Number.isInteger(discountValue)||
      discountValue<1||discountValue>2_000_000_000||
      (discountType==='PERCENT'&&discountValue>10000)||
      (maxDiscount!==null&&!money(maxDiscount))||!money(minSpend)||
      !Number.isInteger(input.totalLimit)||input.totalLimit<1||input.totalLimit>1_000_000||
      !Number.isInteger(input.perUserLimit??1)||(input.perUserLimit??1)<1||
      !['STORE','CATEGORY','SKU'].includes(scopeType)||
      ((scopeType==='STORE'&&scopeId!==null)||(scopeType!=='STORE'&&!uuid.test(String(scopeId))))||
      !['ALL','FIRST_ORDER'].includes(segment)||input.stackable===true)
      throw invalid('INVALID_VOUCHER','Thông tin voucher không hợp lệ.');
    if(scopeType==='SKU'){
      const variant=await this.variant(scopeId);
      if(variant.storeId!==storeId) throw new PromotionError(403,'STORE_FORBIDDEN','SKU không thuộc shop.');
    }
    try{return await this.transaction(async db=>{
      const campaign=(await db.query(`INSERT INTO engagement.promotion_campaigns
        (store_id,type,status,funding_source,title,starts_at,ends_at,created_by)
        VALUES ($1,'VOUCHER','ACTIVE','SELLER',$2,$3,$4,$5) RETURNING *`,
        [storeId,title,starts,ends,userId])).rows[0];
      const voucher=(await db.query(`INSERT INTO engagement.vouchers
        (campaign_id,code,discount_type,discount_value,max_discount_minor,min_spend_minor,
         total_limit,per_user_limit,scope_type,scope_id,segment,stackable)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,false) RETURNING *`,
        [campaign.id,code,discountType,discountValue,maxDiscount,minSpend,input.totalLimit,
          input.perUserLimit??1,scopeType,scopeId,segment])).rows[0];
      await db.query(`INSERT INTO engagement.promotion_audit_logs
        (campaign_id,actor_id,action,changed_fields) VALUES ($1,$2,'VOUCHER_CREATED',$3)`,
        [campaign.id,userId,{ code,scopeType,scopeId }]);
      return { campaign:campaignDto(campaign),voucher:voucherDto(voucher) };
    });}
    catch(error){
      if(error.code==='23505') throw new PromotionError(409,'VOUCHER_CODE_EXISTS','Mã voucher đã tồn tại.');
      throw error;
    }
  }
  async createPlatformVoucher(input){
    const code=tidyCode(input?.code),{ starts,ends }=this.dates(input);
    const title=typeof input.title==='string'?input.title.trim():'';
    const discountType=input.discountType,discountValue=input.discountValue;
    const maxDiscount=input.maxDiscountMinor??null,minSpend=input.minSpendMinor??0;
    const segment=input.segment||'ALL';
    if(!codePattern.test(code)||title.length<3||title.length>120||
      !['FIXED','PERCENT'].includes(discountType)||!Number.isInteger(discountValue)||
      discountValue<1||discountValue>2_000_000_000||
      (discountType==='PERCENT'&&discountValue>10000)||
      (maxDiscount!==null&&!money(maxDiscount))||!money(minSpend)||
      !Number.isInteger(input.totalLimit)||input.totalLimit<1||input.totalLimit>1_000_000||
      !Number.isInteger(input.perUserLimit??1)||(input.perUserLimit??1)<1||
      !['ALL','FIRST_ORDER'].includes(segment))
      throw invalid('INVALID_VOUCHER','Thông tin voucher sàn không hợp lệ.');
    try{return await this.transaction(async db=>{
      const campaign=(await db.query(`INSERT INTO engagement.promotion_campaigns
        (store_id,type,status,funding_source,title,starts_at,ends_at,created_by)
        VALUES (NULL,'VOUCHER','ACTIVE','PLATFORM',$1,$2,$3,NULL) RETURNING *`,
        [title,starts,ends])).rows[0];
      const voucher=(await db.query(`INSERT INTO engagement.vouchers
        (campaign_id,code,discount_type,discount_value,max_discount_minor,min_spend_minor,
         total_limit,per_user_limit,scope_type,scope_id,segment,stackable)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'PLATFORM',NULL,$9,false) RETURNING *`,
        [campaign.id,code,discountType,discountValue,maxDiscount,minSpend,input.totalLimit,
          input.perUserLimit??1,segment])).rows[0];
      await db.query(`INSERT INTO engagement.promotion_audit_logs
        (campaign_id,actor_id,action,changed_fields) VALUES ($1,NULL,'PLATFORM_VOUCHER_CREATED',$2)`,
        [campaign.id,{code}]);
      return {campaign:campaignDto(campaign),voucher:voucherDto(voucher)};
    });}
    catch(error){
      if(error.code==='23505')throw new PromotionError(409,'VOUCHER_CODE_EXISTS','Mã voucher đã tồn tại.');
      throw error;
    }
  }
  async createFlashSale(storeId,userId,input){
    await this.member(storeId,userId);
    const { starts,ends }=this.dates(input);
    const title=typeof input.title==='string'?input.title.trim():'';
    if(title.length<3||title.length>120||!Array.isArray(input.items)||
      input.items.length<1||input.items.length>50||
      new Set(input.items.map(item=>item.variantId)).size!==input.items.length)
      throw invalid('INVALID_FLASH_SALE','Thông tin Flash Sale không hợp lệ.');
    const items=[];
    for(const item of input.items){
      const variant=await this.variant(item.variantId);
      if(variant.storeId!==storeId) throw new PromotionError(403,'STORE_FORBIDDEN','SKU không thuộc shop.');
      if(!variant.sellable||!money(item.salePriceMinor)||item.salePriceMinor<1||
        item.salePriceMinor>=variant.priceMinor||
        !Number.isInteger(item.quota)||item.quota<1||item.quota>1_000_000)
        throw invalid('INVALID_FLASH_ITEM','Giá hoặc quota Flash Sale không hợp lệ.');
      if(item.quota>variant.available)
        throw new PromotionError(409,'FLASH_QUOTA_EXCEEDS_STOCK','Quota Flash Sale vượt tồn khả dụng.');
      items.push({ variantId:item.variantId,salePriceMinor:item.salePriceMinor,quota:item.quota });
    }
    return this.transaction(async db=>{
      for(const item of [...items].sort((a,b)=>a.variantId.localeCompare(b.variantId))){
        await db.query('SELECT pg_advisory_xact_lock(hashtext($1))',[item.variantId]);
        const overlap=await db.query(`SELECT 1 FROM engagement.flash_sale_items i
          JOIN engagement.promotion_campaigns c ON c.id=i.campaign_id
          WHERE i.variant_id=$1 AND c.status='ACTIVE' AND c.starts_at<$3 AND c.ends_at>$2 LIMIT 1`,
          [item.variantId,starts,ends]);
        if(overlap.rowCount) throw new PromotionError(409,'FLASH_SALE_OVERLAP','SKU đã có Flash Sale trùng thời gian.');
      }
      const campaign=(await db.query(`INSERT INTO engagement.promotion_campaigns
        (store_id,type,status,funding_source,title,starts_at,ends_at,created_by)
        VALUES ($1,'FLASH_SALE','ACTIVE','SELLER',$2,$3,$4,$5) RETURNING *`,
        [storeId,title,starts,ends,userId])).rows[0];
      for(const item of items) await db.query(`INSERT INTO engagement.flash_sale_items
        (campaign_id,variant_id,sale_price_minor,quota) VALUES ($1,$2,$3,$4)`,
        [campaign.id,item.variantId,item.salePriceMinor,item.quota]);
      await db.query(`INSERT INTO engagement.promotion_audit_logs
        (campaign_id,actor_id,action,changed_fields) VALUES ($1,$2,'FLASH_SALE_CREATED',$3)`,
        [campaign.id,userId,{ items }]);
      return { campaign:campaignDto(campaign),items };
    });
  }
  async sellerList(storeId,userId){
    await this.member(storeId,userId);
    const { rows }=await this.pool.query(`SELECT c.*,v.id AS voucher_id,v.code,v.discount_type,
      v.discount_value,v.max_discount_minor,v.min_spend_minor,v.total_limit,v.per_user_limit,
      v.used_count,v.reserved_count,v.scope_type,v.scope_id,v.segment,v.stackable
      FROM engagement.promotion_campaigns c LEFT JOIN engagement.vouchers v ON v.campaign_id=c.id
      WHERE c.store_id=$1 ORDER BY c.created_at DESC,c.id`,[storeId]);
    const flash=rows.length?(await this.pool.query(`SELECT campaign_id,variant_id,sale_price_minor,
      quota,sold_count,reserved_count FROM engagement.flash_sale_items WHERE campaign_id=ANY($1::uuid[])`,
      [rows.map(row=>row.id)])).rows:[];
    return { campaigns:rows.map(row=>({ ...campaignDto(row),
      ...(row.voucher_id?{ voucher:voucherDto({ ...row,id:row.voucher_id }) }: {}),
      ...(row.type==='FLASH_SALE'?{ flashItems:flash.filter(item=>item.campaign_id===row.id).map(item=>({
        variantId:item.variant_id,salePriceMinor:Number(item.sale_price_minor),
        quota:item.quota,soldCount:item.sold_count,reservedCount:item.reserved_count })) }: {})
    })) };
  }
  async setStatus(campaignId,userId,status){
    if(!uuid.test(String(campaignId))||!['ACTIVE','PAUSED','ENDED'].includes(status))
      throw invalid('INVALID_STATUS','Trạng thái chương trình không hợp lệ.');
    const store=(await this.pool.query('SELECT store_id FROM engagement.promotion_campaigns WHERE id=$1',
      [campaignId])).rows[0];
    if(!store) throw missing();
    await this.member(store.store_id,userId);
    return this.transaction(async db=>{
      const row=(await db.query('SELECT * FROM engagement.promotion_campaigns WHERE id=$1 FOR UPDATE',
        [campaignId])).rows[0];
      if(!row) throw missing();
      if(row.status==='ENDED'||(status==='ACTIVE'&&new Date(row.ends_at)<=new Date()))
        throw new PromotionError(409,'CAMPAIGN_ENDED','Chương trình đã kết thúc.');
      if(status==='ACTIVE'&&row.type==='FLASH_SALE'){
        const items=(await db.query(`SELECT variant_id FROM engagement.flash_sale_items
          WHERE campaign_id=$1 ORDER BY variant_id`,[campaignId])).rows;
        for(const item of items){
          await db.query('SELECT pg_advisory_xact_lock(hashtext($1))',[item.variant_id]);
          const overlap=await db.query(`SELECT 1 FROM engagement.flash_sale_items i
            JOIN engagement.promotion_campaigns c ON c.id=i.campaign_id
            WHERE i.variant_id=$1 AND c.id<>$2 AND c.status='ACTIVE'
              AND c.starts_at<$4 AND c.ends_at>$3 LIMIT 1`,
            [item.variant_id,campaignId,row.starts_at,row.ends_at]);
          if(overlap.rowCount) throw new PromotionError(409,'FLASH_SALE_OVERLAP','SKU đã có Flash Sale trùng thời gian.');
        }
      }
      const updated=(await db.query(`UPDATE engagement.promotion_campaigns
        SET status=$2,updated_at=now() WHERE id=$1 RETURNING *`,[campaignId,status])).rows[0];
      await db.query(`INSERT INTO engagement.promotion_audit_logs
        (campaign_id,actor_id,action,changed_fields) VALUES ($1,$2,'STATUS_CHANGED',$3)`,
        [campaignId,userId,{ from:row.status,to:status }]);
      return { campaign:campaignDto(updated) };
    });
  }
  async active(){
    const { rows }=await this.pool.query(`SELECT c.*,v.id AS voucher_id,v.code,v.discount_type,
      v.discount_value,v.max_discount_minor,v.min_spend_minor,v.total_limit,v.per_user_limit,
      v.used_count,v.reserved_count,v.scope_type,v.scope_id,v.segment,v.stackable
      FROM engagement.promotion_campaigns c JOIN engagement.vouchers v ON v.campaign_id=c.id
      WHERE c.status='ACTIVE' AND c.starts_at<=now() AND c.ends_at>now()
        AND v.used_count+v.reserved_count<v.total_limit
      ORDER BY c.ends_at,c.id`);
    return { serverTime:new Date().toISOString(),promotions:rows.map(row=>({
      campaign:campaignDto(row),voucher:voucherDto({ ...row,id:row.voucher_id }) })) };
  }
  async flashSales(){
    const { rows }=await this.pool.query(`SELECT c.*,i.variant_id,i.sale_price_minor,i.quota,
      i.sold_count,i.reserved_count FROM engagement.promotion_campaigns c
      JOIN engagement.flash_sale_items i ON i.campaign_id=c.id
      WHERE c.type='FLASH_SALE' AND c.status='ACTIVE' AND c.starts_at<=now() AND c.ends_at>now()
        AND i.sold_count+i.reserved_count<i.quota ORDER BY c.ends_at,i.variant_id`);
    const items=(await Promise.all(rows.map(async row=>{
      const variant=await this.variant(row.variant_id);
      if(!variant.sellable||!variant.available) return null;
      return { campaignId:row.id,title:row.title,storeId:row.store_id,variantId:row.variant_id,
        productId:variant.productId,productName:variant.productName,imageUrl:variant.imageUrl,
        salePriceMinor:Number(row.sale_price_minor),regularPriceMinor:variant.priceMinor,
        quota:row.quota,soldCount:row.sold_count,reservedCount:row.reserved_count,
        availableStock:variant.available,
        startsAt:row.starts_at,endsAt:row.ends_at };
    }))).filter(Boolean);
    return { serverTime:new Date().toISOString(),items };
  }
  async getVoucher(db,code,lock=false){
    const { rows }=await db.query(`SELECT v.*,c.store_id,c.status AS campaign_status,
      c.starts_at,c.ends_at,c.funding_source,c.title
      FROM engagement.vouchers v JOIN engagement.promotion_campaigns c ON c.id=v.campaign_id
      WHERE v.code=$1 ${lock?'FOR UPDATE OF v':''}`,[tidyCode(code)]);
    if(!rows[0]) throw new PromotionError(404,'VOUCHER_NOT_FOUND','Mã voucher không tồn tại.');
    return rows[0];
  }
  checkVoucher(row,userId,firstOrder,lines,userCount){
    const now=Date.now();
    if(new Date(row.ends_at).getTime()<=now) throw new PromotionError(409,'VOUCHER_EXPIRED','Voucher đã hết hạn.');
    if(new Date(row.starts_at).getTime()>now) throw new PromotionError(409,'VOUCHER_NOT_STARTED','Voucher chưa đến thời gian sử dụng.');
    if(row.campaign_status!=='ACTIVE') throw new PromotionError(409,'VOUCHER_INACTIVE','Voucher chưa được bật.');
    if(row.segment==='FIRST_ORDER'&&!firstOrder) throw new PromotionError(409,'USER_SEGMENT_MISMATCH','Voucher chỉ dành cho đơn đầu tiên.');
    if(row.used_count+row.reserved_count>=row.total_limit)
      throw new PromotionError(409,'VOUCHER_QUOTA_EXHAUSTED','Voucher đã hết lượt.');
    if(userCount>=row.per_user_limit) throw new PromotionError(409,'VOUCHER_USER_LIMIT','Bạn đã dùng hết lượt voucher.');
    const eligible=lines.filter(line=>{
      if(row.store_id&&line.storeId!==row.store_id) return false;
      if(row.scope_type==='CATEGORY'&&line.categoryId!==row.scope_id) return false;
      if(row.scope_type==='SKU'&&line.variantId!==row.scope_id) return false;
      return true;
    });
    if(!eligible.length) throw new PromotionError(409,'VOUCHER_SCOPE_MISMATCH','Voucher không áp dụng cho sản phẩm/shop này.');
    const eligibleSubtotal=eligible.reduce((total,line)=>total+baseOf(line),0);
    if(!money(eligibleSubtotal)) throw invalid('TOTAL_TOO_LARGE','Tổng tiền vượt giới hạn.');
    if(eligibleSubtotal<Number(row.min_spend_minor))
      throw new PromotionError(409,'VOUCHER_MIN_SPEND','Đơn chưa đạt mức tối thiểu.');
    const raw=row.discount_type==='FIXED'?row.discount_value:
      Number(BigInt(eligibleSubtotal)*BigInt(row.discount_value)/10000n);
    const discount=Math.min(raw,row.max_discount_minor==null?raw:Number(row.max_discount_minor),eligibleSubtotal);
    return { eligible,eligibleSubtotal,discount };
  }
  async quote(input){
    if(!uuid.test(String(input?.userId))||!Array.isArray(input.lines)||
      input.lines.length>100||typeof input.firstOrder!=='boolean')
      throw invalid('INVALID_PROMOTION_QUOTE','Dữ liệu báo giá không hợp lệ.');
    const requested=[
      { code:tidyCode(input.storeCode),kind:'store' },
      { code:tidyCode(input.platformCode),kind:'platform' },
      { code:tidyCode(input.code),kind:'any' }
    ].filter(item=>item.code);
    if(requested.length>2||new Set(requested.map(item=>item.code)).size!==requested.length||
      requested.some(item=>!codePattern.test(item.code)))
      throw invalid('INVALID_VOUCHER','Mỗi đơn chỉ dùng tối đa một voucher shop và một voucher sàn.');
    const lines=input.lines.map(line=>{
      if(!uuid.test(String(line.id))||!uuid.test(String(line.variantId))||
        !uuid.test(String(line.storeId))||!Number.isInteger(line.quantity)||line.quantity<1||
        !money(line.priceMinor)||!money(line.priceOriginalMinor)||line.priceMinor>line.priceOriginalMinor||
        !money(line.priceMinor*line.quantity)||!money(line.priceOriginalMinor*line.quantity))
        throw invalid('INVALID_PROMOTION_QUOTE','Dữ liệu SKU không hợp lệ.');
      return { ...line,unitPriceMinor:line.priceMinor,flashCampaignId:null,
        catalogDiscountMinor:(line.priceOriginalMinor-line.priceMinor)*line.quantity,
        flashDiscountMinor:0,voucherDiscountMinor:0,shopVoucherDiscountMinor:0,
        platformVoucherDiscountMinor:0 };
    });
    const flashRows=lines.length?(await this.pool.query(`SELECT c.id AS campaign_id,c.store_id,c.ends_at,
      i.variant_id,i.sale_price_minor,i.quota,i.reserved_count,i.sold_count
      FROM engagement.flash_sale_items i JOIN engagement.promotion_campaigns c ON c.id=i.campaign_id
      WHERE i.variant_id=ANY($1::uuid[]) AND c.status='ACTIVE'
        AND c.starts_at<=now() AND c.ends_at>now()
      ORDER BY i.sale_price_minor,c.id`,[lines.map(line=>line.variantId)])).rows:[];
    for(const line of lines){
      const flash=flashRows.find(row=>row.variant_id===line.variantId&&row.store_id===line.storeId&&
        row.sold_count+row.reserved_count+line.quantity<=row.quota&&
        Number(row.sale_price_minor)<line.unitPriceMinor);
      if(flash){
        line.flashCampaignId=flash.campaign_id;
        line.flashDiscountMinor=(line.unitPriceMinor-Number(flash.sale_price_minor))*line.quantity;
        line.unitPriceMinor=Number(flash.sale_price_minor);
        line.flashEndsAt=flash.ends_at;
      }
    }
    const selected=[];
    for(const item of requested){
      const row=await this.getVoucher(this.pool,item.code);
      const kind=row.store_id?'store':'platform';
      if(item.kind!=='any'&&item.kind!==kind)
        throw new PromotionError(409,'VOUCHER_TYPE_MISMATCH','Mã voucher không đúng loại shop hoặc sàn.');
      if(selected.some(other=>other.kind===kind))
        throw invalid('INVALID_VOUCHER','Mỗi đơn chỉ dùng một voucher shop và một voucher sàn.');
      selected.push({row,kind});
    }
    selected.sort((a,b)=>(a.kind==='store'?0:1)-(b.kind==='store'?0:1));
    const vouchers=[];
    for(const {row,kind} of selected){
      const count=(await this.pool.query(`SELECT count(*)::int AS count FROM engagement.voucher_usage
        WHERE voucher_id=$1 AND user_id=$2 AND status IN ('ACTIVE','COMMITTED')`,
        [row.id,input.userId])).rows[0].count;
      const checked=this.checkVoucher(row,input.userId,input.firstOrder,lines,count);
      if(checked.discount<=0)
        throw new PromotionError(409,'VOUCHER_NO_DISCOUNT','Voucher không còn giá trị giảm trên đơn hàng này.');
      const allocations=allocateDiscount(checked.discount,checked.eligible);
      for(const line of lines){
        const amount=allocations.get(line.id)||0;
        line.voucherDiscountMinor+=amount;
        if(kind==='store')line.shopVoucherDiscountMinor+=amount;
        else line.platformVoucherDiscountMinor+=amount;
      }
      vouchers.push({ id:row.id,code:row.code,campaignId:row.campaign_id,storeId:row.store_id,
        fundingSource:row.funding_source,discountMinor:checked.discount,eligibleSubtotalMinor:checked.eligibleSubtotal,
        endsAt:row.ends_at,kind });
    }
    return { serverTime:new Date().toISOString(),lines:lines.map(line=>({
      id:line.id,variantId:line.variantId,storeId:line.storeId,categoryId:line.categoryId||null,
      productId:line.productId,unitPriceMinor:line.unitPriceMinor,
      catalogDiscountMinor:line.catalogDiscountMinor,flashDiscountMinor:line.flashDiscountMinor,
      voucherDiscountMinor:line.voucherDiscountMinor,
      shopVoucherDiscountMinor:line.shopVoucherDiscountMinor,
      platformVoucherDiscountMinor:line.platformVoucherDiscountMinor,
      flashCampaignId:line.flashCampaignId,
      flashEndsAt:line.flashEndsAt||null,quantity:line.quantity })),
      voucher:vouchers[0]||null,vouchers };
  }
  async validateBuyer(userId,code){
    const context=await this.buyerContext(userId);
    return this.quote({ userId,firstOrder:context.firstOrder,
      lines:context.items.filter(item=>!item.error),code });
  }
  async reserve(input){
    const orderRef=input?.orderRef;
    if(typeof orderRef!=='string'||!/^[\w:-]{8,120}$/.test(orderRef)||
      !uuid.test(String(input.userId))||!Array.isArray(input.lines)||
      !Number.isInteger(input.ttlSeconds??1800)||(input.ttlSeconds??1800)<30||
      (input.ttlSeconds??1800)>1800)
      throw invalid('INVALID_RESERVATION','Yêu cầu giữ khuyến mãi không hợp lệ.');
    const hashInput={userId:input.userId,firstOrder:input.firstOrder,code:tidyCode(input.code),
      lines:input.lines.map(line=>[line.id,line.variantId,line.quantity,line.priceMinor])};
    if(input.storeCode)hashInput.storeCode=tidyCode(input.storeCode);
    if(input.platformCode)hashInput.platformCode=tidyCode(input.platformCode);
    const requestHash=createHash('sha256').update(JSON.stringify(hashInput)).digest('hex');
    const current=await this.quote(input);
    return this.transaction(async db=>{
      await db.query('SELECT pg_advisory_xact_lock(hashtext($1))',[orderRef]);
      const previous=(await db.query('SELECT * FROM engagement.promotion_reserve_requests WHERE order_ref=$1 FOR UPDATE',
        [orderRef])).rows[0];
      if(previous){
        if(previous.request_hash!==requestHash)
          throw new PromotionError(409,'IDEMPOTENCY_CONFLICT','Khóa giữ khuyến mãi đã dùng cho dữ liệu khác.');
        return { ...previous.result_json,status:previous.status,idempotent:true };
      }
      const ttl=input.ttlSeconds??1800;
      const flashLines=current.lines.filter(line=>line.flashCampaignId)
        .sort((a,b)=>a.variantId.localeCompare(b.variantId));
      for(const line of flashLines){
        const flash=(await db.query(`SELECT i.*,c.store_id,c.status AS campaign_status,
          c.starts_at,c.ends_at FROM engagement.flash_sale_items i
          JOIN engagement.promotion_campaigns c ON c.id=i.campaign_id
          WHERE i.campaign_id=$1 AND i.variant_id=$2 FOR UPDATE OF i`,
          [line.flashCampaignId,line.variantId])).rows[0];
        if(!flash||flash.campaign_status!=='ACTIVE'||new Date(flash.starts_at)>new Date()||
          new Date(flash.ends_at)<=new Date()||flash.store_id!==line.storeId||
          flash.sold_count+flash.reserved_count+line.quantity>flash.quota||
          Number(flash.sale_price_minor)!==line.unitPriceMinor)
          throw new PromotionError(409,'FLASH_QUOTA_EXHAUSTED','Flash Sale đã hết quota hoặc thay đổi giá.');
        await db.query(`INSERT INTO engagement.flash_sale_reservations
          (campaign_id,variant_id,order_ref,quantity,status,expires_at)
          VALUES ($1,$2,$3,$4,'ACTIVE',now()+($5*interval '1 second'))`,
          [flash.campaign_id,flash.variant_id,orderRef,line.quantity,ttl]);
        await db.query(`UPDATE engagement.flash_sale_items
          SET reserved_count=reserved_count+$3 WHERE campaign_id=$1 AND variant_id=$2`,
          [flash.campaign_id,flash.variant_id,line.quantity]);
      }
      const scoped=current.lines.map(line=>({ ...line,voucherDiscountMinor:0,
        categoryId:input.lines.find(item=>item.id===line.id)?.categoryId||null }));
      for(const selected of current.vouchers||[]){
        const voucher=await this.getVoucher(db,selected.code,true);
        const count=(await db.query(`SELECT count(*)::int AS count FROM engagement.voucher_usage
          WHERE voucher_id=$1 AND user_id=$2 AND status IN ('ACTIVE','COMMITTED')`,
          [voucher.id,input.userId])).rows[0].count;
        const checked=this.checkVoucher(voucher,input.userId,input.firstOrder,scoped,count);
        if(checked.discount!==selected.discountMinor)
          throw new PromotionError(409,'PROMOTION_CHANGED','Giảm giá đã thay đổi, vui lòng tính lại.');
        const allocations=allocateDiscount(checked.discount,checked.eligible);
        for(const line of scoped)line.voucherDiscountMinor+=allocations.get(line.id)||0;
        await db.query(`INSERT INTO engagement.voucher_usage
          (voucher_id,user_id,order_ref,amount_minor,status,expires_at)
          VALUES ($1,$2,$3,$4,'ACTIVE',now()+($5*interval '1 second'))`,
          [voucher.id,input.userId,orderRef,checked.discount,ttl]);
        await db.query('UPDATE engagement.vouchers SET reserved_count=reserved_count+1 WHERE id=$1',[voucher.id]);
      }
      await db.query(`INSERT INTO engagement.promotion_reserve_requests
        (order_ref,user_id,request_hash,result_json,status,expires_at)
        VALUES ($1,$2,$3,$4,'ACTIVE',now()+($5*interval '1 second'))`,
        [orderRef,input.userId,requestHash,current,ttl]);
      return { ...current,status:'ACTIVE',idempotent:false };
    });
  }
  async commit(input){
    const orderRef=input?.orderRef,map=input?.shopOrdersByStore;
    if(typeof orderRef!=='string'||!/^[\w:-]{8,120}$/.test(orderRef)||
      !map||typeof map!=='object'||Array.isArray(map)||
      Object.entries(map).some(([storeId,id])=>!uuid.test(storeId)||!uuid.test(String(id))))
      throw invalid('INVALID_COMMIT','Dữ liệu xác nhận khuyến mãi không hợp lệ.');
    return this.transaction(async db=>{
      const request=(await db.query('SELECT * FROM engagement.promotion_reserve_requests WHERE order_ref=$1 FOR UPDATE',
        [orderRef])).rows[0];
      if(!request) throw new PromotionError(404,'RESERVATION_NOT_FOUND','Không tìm thấy lượt giữ khuyến mãi.');
      if(request.status==='COMMITTED') return { status:'COMMITTED',idempotent:true };
      if(request.status!=='ACTIVE'||new Date(request.expires_at)<=new Date())
        throw new PromotionError(409,'RESERVATION_EXPIRED','Lượt giữ khuyến mãi không còn hợp lệ.');
      const vouchers=(await db.query(`SELECT u.*,c.store_id,v.campaign_id FROM engagement.voucher_usage u
        JOIN engagement.vouchers v ON v.id=u.voucher_id
        JOIN engagement.promotion_campaigns c ON c.id=v.campaign_id
        WHERE u.order_ref=$1 FOR UPDATE OF u`,[orderRef])).rows;
      for(const row of vouchers){
        if(row.status!=='ACTIVE') throw new PromotionError(409,'INVALID_REDEMPTION_STATE','Lượt voucher không hợp lệ.');
        if(row.store_id&&!map[row.store_id]) throw invalid('INVALID_COMMIT','Thiếu shop order cho voucher.');
        await db.query(`UPDATE engagement.vouchers SET reserved_count=reserved_count-1,used_count=used_count+1 WHERE id=$1`,
          [row.voucher_id]);
        await db.query(`UPDATE engagement.voucher_usage SET status='COMMITTED',shop_order_id=$2,updated_at=now()
          WHERE id=$1`,[row.id,map[row.store_id]||null]);
        await db.query('INSERT INTO engagement.promotion_outbox(event_type,aggregate_id,payload) VALUES ($1,$2,$3)',
          ['VoucherRedeemed.v1',row.voucher_id,{ voucherId:row.voucher_id,userId:row.user_id,
            orderRef,shopOrderId:map[row.store_id]||null,discountMinor:Number(row.amount_minor) }]);
      }
      const flash=(await db.query(`SELECT r.*,c.store_id FROM engagement.flash_sale_reservations r
        JOIN engagement.promotion_campaigns c ON c.id=r.campaign_id
        WHERE r.order_ref=$1 FOR UPDATE OF r`,[orderRef])).rows;
      for(const row of flash){
        if(row.status!=='ACTIVE') throw new PromotionError(409,'INVALID_FLASH_STATE','Lượt Flash Sale không hợp lệ.');
        if(row.store_id&&!map[row.store_id]) throw invalid('INVALID_COMMIT','Thiếu shop order cho Flash Sale.');
        await db.query(`UPDATE engagement.flash_sale_items
          SET reserved_count=reserved_count-$3,sold_count=sold_count+$3
          WHERE campaign_id=$1 AND variant_id=$2`,[row.campaign_id,row.variant_id,row.quantity]);
        await db.query(`UPDATE engagement.flash_sale_reservations
          SET status='COMMITTED',shop_order_id=$2,updated_at=now() WHERE id=$1`,
          [row.id,map[row.store_id]||null]);
      }
      await db.query(`UPDATE engagement.promotion_reserve_requests SET status='COMMITTED',updated_at=now()
        WHERE order_ref=$1`,[orderRef]);
      return { status:'COMMITTED',idempotent:false };
    });
  }
  async release(input,expiry=false){
    const orderRef=input?.orderRef;
    if(typeof orderRef!=='string'||!/^[\w:-]{8,120}$/.test(orderRef))
      throw invalid('INVALID_RELEASE','Tham chiếu khuyến mãi không hợp lệ.');
    return this.transaction(async db=>{
      const request=(await db.query('SELECT * FROM engagement.promotion_reserve_requests WHERE order_ref=$1 FOR UPDATE',
        [orderRef])).rows[0];
      if(!request) return { status:'RELEASED',idempotent:true };
      if(['RELEASED','EXPIRED'].includes(request.status))
        return { status:request.status,idempotent:true };
      if(request.status==='COMMITTED')
        throw new PromotionError(409,'INVALID_REDEMPTION_STATE','Lượt đã dùng phải trả theo shop order.');
      const next=expiry?'EXPIRED':'RELEASED';
      const vouchers=(await db.query("SELECT * FROM engagement.voucher_usage WHERE order_ref=$1 AND status='ACTIVE' FOR UPDATE",
        [orderRef])).rows;
      for(const row of vouchers){
        await db.query('UPDATE engagement.vouchers SET reserved_count=reserved_count-1 WHERE id=$1',[row.voucher_id]);
        await db.query('UPDATE engagement.voucher_usage SET status=$2,updated_at=now() WHERE id=$1',[row.id,next]);
      }
      const flash=(await db.query("SELECT * FROM engagement.flash_sale_reservations WHERE order_ref=$1 AND status='ACTIVE' FOR UPDATE",
        [orderRef])).rows;
      for(const row of flash){
        await db.query(`UPDATE engagement.flash_sale_items SET reserved_count=reserved_count-$3
          WHERE campaign_id=$1 AND variant_id=$2`,[row.campaign_id,row.variant_id,row.quantity]);
        await db.query('UPDATE engagement.flash_sale_reservations SET status=$2,updated_at=now() WHERE id=$1',[row.id,next]);
      }
      await db.query('UPDATE engagement.promotion_reserve_requests SET status=$2,updated_at=now() WHERE order_ref=$1',
        [orderRef,next]);
      return { status:next,idempotent:false };
    });
  }
  async releaseShop(shopOrderId){
    if(!uuid.test(String(shopOrderId))) throw invalid('INVALID_SHOP_ORDER','Shop order không hợp lệ.');
    return this.transaction(async db=>{
      const vouchers=(await db.query(`SELECT * FROM engagement.voucher_usage
        WHERE shop_order_id=$1 AND status IN ('ACTIVE','COMMITTED') FOR UPDATE`,[shopOrderId])).rows;
      for(const row of vouchers){
        await db.query(`UPDATE engagement.vouchers SET
          used_count=used_count-$2,reserved_count=reserved_count-$3 WHERE id=$1`,
          [row.voucher_id,row.status==='COMMITTED'?1:0,row.status==='ACTIVE'?1:0]);
        await db.query("UPDATE engagement.voucher_usage SET status='RELEASED',updated_at=now() WHERE id=$1",[row.id]);
      }
      const flash=(await db.query(`SELECT * FROM engagement.flash_sale_reservations
        WHERE shop_order_id=$1 AND status IN ('ACTIVE','COMMITTED') FOR UPDATE`,[shopOrderId])).rows;
      for(const row of flash){
        await db.query(`UPDATE engagement.flash_sale_items
          SET sold_count=sold_count-$3,reserved_count=reserved_count-$4
          WHERE campaign_id=$1 AND variant_id=$2`,
          [row.campaign_id,row.variant_id,row.status==='COMMITTED'?row.quantity:0,
            row.status==='ACTIVE'?row.quantity:0]);
        await db.query("UPDATE engagement.flash_sale_reservations SET status='RELEASED',updated_at=now() WHERE id=$1",[row.id]);
      }
      return { released:vouchers.length+flash.length,idempotent:vouchers.length+flash.length===0 };
    });
  }
  async releasePlatform(orderRef){
    if(!uuid.test(String(orderRef)))throw invalid('INVALID_ORDER_REF','Tham chiếu đơn không hợp lệ.');
    return this.transaction(async db=>{
      const {rows}=await db.query(`SELECT u.* FROM engagement.voucher_usage u
        JOIN engagement.vouchers v ON v.id=u.voucher_id
        JOIN engagement.promotion_campaigns c ON c.id=v.campaign_id
        WHERE u.order_ref=$1 AND c.store_id IS NULL
          AND u.status IN ('ACTIVE','COMMITTED') FOR UPDATE OF u`,[orderRef]);
      for(const row of rows){
        await db.query(`UPDATE engagement.vouchers SET
          used_count=used_count-$2,reserved_count=reserved_count-$3 WHERE id=$1`,
          [row.voucher_id,row.status==='COMMITTED'?1:0,row.status==='ACTIVE'?1:0]);
        await db.query("UPDATE engagement.voucher_usage SET status='RELEASED',updated_at=now() WHERE id=$1",[row.id]);
      }
      return {released:rows.length,idempotent:rows.length===0};
    });
  }
  async reconcileExpired(){
    const { rows }=await this.pool.query(`SELECT order_ref FROM engagement.promotion_reserve_requests
      WHERE status='ACTIVE' AND expires_at<=now() ORDER BY expires_at LIMIT 50`);
    for(const row of rows) try{await this.release({ orderRef:row.order_ref },true);}
    catch(error){console.error('Promotion reservation expiry failed:',error.message);}
    return { expired:rows.length };
  }
  async endCampaigns(){
    const { rows }=await this.pool.query(`UPDATE engagement.promotion_campaigns
      SET status='ENDED',updated_at=now() WHERE ends_at<=now() AND status IN ('ACTIVE','PAUSED')
      RETURNING id,type,store_id`);
    for(const row of rows) await this.pool.query(`INSERT INTO engagement.promotion_outbox
      (event_type,aggregate_id,payload) VALUES ($1,$2,$3)`,
      ['PromotionEnded.v1',row.id,{ campaignId:row.id,type:row.type,storeId:row.store_id }]);
    return { ended:rows.length };
  }
  async reconcileCancelledPlatforms(){
    const rows=await this.transaction(async db=>{
      await db.query(`INSERT INTO engagement.promotion_reconcile_state(key)
        VALUES ('cancelled_platform_quotes') ON CONFLICT(key) DO NOTHING`);
      const state=(await db.query(`SELECT last_shop_order_id FROM engagement.promotion_reconcile_state
        WHERE key='cancelled_platform_quotes' FOR UPDATE`)).rows[0];
      const {rows:page}=await db.query(`WITH active AS (
        SELECT DISTINCT CASE WHEN u.order_ref ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
          THEN u.order_ref::uuid END AS quote_id
        FROM engagement.voucher_usage u
        JOIN engagement.vouchers v ON v.id=u.voucher_id
        JOIN engagement.promotion_campaigns c ON c.id=v.campaign_id
        WHERE u.status='COMMITTED' AND c.store_id IS NULL
      ) SELECT quote_id FROM active WHERE quote_id IS NOT NULL
        AND ($1::uuid IS NULL OR quote_id>$1) ORDER BY quote_id LIMIT 25`,
        [state?.last_shop_order_id||null]);
      await db.query(`UPDATE engagement.promotion_reconcile_state
        SET last_shop_order_id=$1,updated_at=now() WHERE key='cancelled_platform_quotes'`,
        [page.length?page.at(-1).quote_id:null]);
      return page;
    });
    let released=0;
    for(const row of rows)try{
      const result=await this.remote(new URL(
        '/api/v2/internal/promotion/quotes/'+row.quote_id+'/status',this.config.orderUrl),
        {headers:{'X-Promotion-Token':this.config.internalToken}});
      if(result.groupStatus==='CANCELLED')released+=(await this.releasePlatform(row.quote_id)).released;
    }catch(error){console.error('Platform voucher cancellation reconciliation failed:',error.message);}
    return {checked:rows.length,released};
  }
  async reconcileCancelled(){
    const rows=await this.transaction(async db=>{
      const state=(await db.query(`SELECT last_shop_order_id FROM engagement.promotion_reconcile_state
        WHERE key='cancelled_shop_orders' FOR UPDATE`)).rows[0];
      const { rows:page }=await db.query(`SELECT shop_order_id FROM (
        SELECT shop_order_id FROM engagement.voucher_usage
          WHERE status='COMMITTED' AND shop_order_id IS NOT NULL
        UNION
        SELECT shop_order_id FROM engagement.flash_sale_reservations
          WHERE status='COMMITTED' AND shop_order_id IS NOT NULL
      ) active WHERE $1::uuid IS NULL OR shop_order_id>$1
      ORDER BY shop_order_id LIMIT 100`,[state?.last_shop_order_id||null]);
      await db.query(`UPDATE engagement.promotion_reconcile_state
        SET last_shop_order_id=$1,updated_at=now() WHERE key='cancelled_shop_orders'`,
        [page.length?page.at(-1).shop_order_id:null]);
      return page;
    });
    let released=0;
    for(const row of rows) try{
      const result=await this.remote(new URL(
        '/api/v2/internal/promotion/orders/'+row.shop_order_id+'/status',this.config.orderUrl),
        {headers:{'X-Promotion-Token':this.config.internalToken}});
      if(result.status==='CANCELLED'){
        const next=await this.releaseShop(row.shop_order_id);
        released+=next.released;
      }
    }catch(error){console.error('Promotion cancellation reconciliation failed:',error.message);}
    const platform=await this.reconcileCancelledPlatforms();
    return { checked:rows.length,released,platformChecked:platform.checked,
      platformReleased:platform.released };
  }
}
