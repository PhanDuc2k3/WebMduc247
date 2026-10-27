import {requireAdminPermission, adminScopeSql, requireAdminScope} from '../../../packages/contracts/admin-rbac.js';
import {adminId, adminQuery, adminPage, adminMoney, adminAction, checkAdminVersion, PlatformAdminError} from '../../../packages/contracts/platform-admin.js';
import {adminCommand} from '../../../packages/contracts/admin-command.js';
import {maskEmail} from '../../../packages/contracts/admin-privacy.js';

const storeDto = row => ({ id:row.id,name:row.name,slug:row.slug,description:row.description,
  ownerId:row.owner_user_id,category:row.category,status:row.platform_suspended?'suspended':row.status,
  suspended:row.platform_suspended,suspensionReason:row.platform_suspension_reason,
  version:Number(row.admin_version),acceptingOrders:row.accepting_orders,productCount:row.product_count,createdAt:row.created_at });
const productDto = row => ({ id:row.id,name:row.name,slug:row.slug,brand:row.brand,description:row.description,
  storeName:row.store_name,storeSlug:row.store_slug,categoryName:row.category_name,
  status:row.platform_suspended?'suspended':row.status,publicationStatus:row.status,suspended:row.platform_suspended,
  suspensionReason:row.platform_suspension_reason,version:Number(row.admin_version),
  priceMinor:adminMoney(row.display_price ?? row.price_minor),stock:Number(row.available_stock ?? 0),createdAt:row.created_at });
const productFrom = `FROM catalog.products p JOIN catalog.stores s ON s.id=p.store_id
  LEFT JOIN catalog.categories c ON c.id=p.category_id`;
const variantTotals = `LEFT JOIN LATERAL (SELECT min(CASE WHEN v.sale_price_minor IS NOT NULL
  AND (v.sale_starts_at IS NULL OR v.sale_starts_at<=now()) AND (v.sale_ends_at IS NULL OR v.sale_ends_at>now())
  THEN v.sale_price_minor ELSE v.price_minor END) AS display_price,
  coalesce(sum(coalesce(i.on_hand-i.reserved,v.stock)),0) AS available_stock
  FROM catalog.product_variants v LEFT JOIN catalog.inventory i ON i.variant_id=v.id
  WHERE v.product_id=p.id AND v.status='active') vt ON true`;

export class CatalogAdminService {
  constructor(pool, catalog = null) { this.pool = pool; this.catalog = catalog; }
  async transaction(fn) {
    const db = await this.pool.connect();
    try { await db.query('BEGIN'); const result = await fn(db); await db.query('COMMIT'); return result; }
    catch (error) { await db.query('ROLLBACK'); throw error; }
    finally { db.release(); }
  }
  async summary(user) {
    requireAdminScope(user,'stores.read',{});
    requireAdminScope(user,'products.read',{});
    const [stores, products] = await Promise.all([
      this.pool.query(`SELECT count(*)::int AS total,count(*) FILTER(WHERE status='active' AND NOT platform_suspended)::int AS active,
        count(*) FILTER(WHERE status='paused' OR platform_suspended)::int AS paused FROM catalog.stores`),
      this.pool.query(`SELECT count(*)::int AS total,
        count(*) FILTER(WHERE status IN ('active','published') AND NOT platform_suspended)::int AS active,
        count(*) FILTER(WHERE status='draft')::int AS draft,
        count(*) FILTER(WHERE status='hidden')::int AS hidden FROM catalog.products`),
    ]);
    return { stores: stores.rows[0], products: products.rows[0] };
  }
  async stores(user, query) {
    requireAdminPermission(user,'stores.read'); const options = adminQuery(query,{statuses:['active','paused','suspended']});
    const args = [options.pattern,options.status];
    const scope = adminScopeSql(user,'stores.read',{storeIds:'s.id::text'},args);
    const where = `WHERE (s.name ILIKE $1 OR s.slug ILIKE $1) AND ${scope} AND ($2='' OR
      ($2='suspended' AND s.platform_suspended) OR ($2<>'suspended' AND NOT s.platform_suspended AND s.status=$2))`;
    const [count,list] = await Promise.all([
      this.pool.query(`SELECT count(*)::int AS total FROM catalog.stores s ${where}`,args),
      this.pool.query(`SELECT s.*,st.accepting_orders,(SELECT count(*)::int FROM catalog.products p WHERE p.store_id=s.id) AS product_count
        FROM catalog.stores s LEFT JOIN catalog.store_settings st ON st.store_id=s.id ${where}
        ORDER BY s.created_at DESC,s.id DESC LIMIT $${args.length+1} OFFSET $${args.length+2}`,[...args,options.limit,options.offset]),
    ]);
    return adminPage(list.rows.map(storeDto),count.rows[0].total,options);
  }
  async products(user, query) {
    requireAdminPermission(user,'products.read'); const options = adminQuery(query,{statuses:['active','published','draft','hidden','discontinued','suspended']});
    const args = [options.pattern,options.status];
    const scope = adminScopeSql(user,'products.read',{storeIds:'p.store_id::text'},args);
    const where = `WHERE (p.name ILIKE $1 OR coalesce(p.brand,'') ILIKE $1 OR s.name ILIKE $1) AND ${scope} AND ($2='' OR
      ($2='suspended' AND p.platform_suspended) OR ($2<>'suspended' AND NOT p.platform_suspended AND p.status=$2))`;
    const [count,list] = await Promise.all([
      this.pool.query(`SELECT count(*)::int AS total ${productFrom} ${where}`,args),
      this.pool.query(`SELECT p.*,s.name AS store_name,s.slug AS store_slug,c.name AS category_name,vt.display_price,vt.available_stock
        ${productFrom} ${variantTotals} ${where} ORDER BY p.created_at DESC,p.id DESC LIMIT $${args.length+1} OFFSET $${args.length+2}`,
        [...args,options.limit,options.offset]),
    ]);
    return adminPage(list.rows.map(productDto),count.rows[0].total,options);
  }
  async detail(user, kind, id) {
    requireAdminPermission(user,`${kind}.read`); adminId(id);
    if (!['stores','products'].includes(kind)) throw new PlatformAdminError(404,'NOT_FOUND','Không tìm thấy đối tượng.');
    const args=[id], scope=adminScopeSql(user,`${kind}.read`,{storeIds:kind==='stores'?'s.id::text':'p.store_id::text'},args);
    const { rows } = kind === 'stores' ? await this.pool.query(`SELECT s.*,st.accepting_orders,st.contact_info,
      (SELECT count(*)::int FROM catalog.products p WHERE p.store_id=s.id) AS product_count
      FROM catalog.stores s LEFT JOIN catalog.store_settings st ON st.store_id=s.id WHERE s.id=$1 AND ${scope}`,args) :
      await this.pool.query(`SELECT p.*,s.name AS store_name,s.slug AS store_slug,c.name AS category_name,vt.display_price,vt.available_stock
        ${productFrom} ${variantTotals} WHERE p.id=$1 AND ${scope}`,args);
    const row = rows[0];
    if (!row) throw new PlatformAdminError(404,'NOT_FOUND','Không tìm thấy đối tượng.');
    let record = kind === 'stores' ? {...storeDto(row),contactEmail:maskEmail(row.contact_info?.email)} : productDto(row);
    if (kind === 'products' && this.catalog) {
      const full = await this.catalog.detail(row);
      record = {...record,priceMinor:adminMoney(full.priceMinor),stock:full.stock,imageUrl:full.imageUrl,variants:full.variants,attributes:full.attributes};
    }
    const history = await this.pool.query(`SELECT id,actor_id,action,previous_status,next_status,reason,created_at,read_version,result_version,correlation_id
      FROM catalog.platform_admin_actions WHERE target_id=$1 AND target_type=$2 ORDER BY created_at DESC,id DESC LIMIT 30`,
      [id,kind==='stores'?'store':'product']);
    return { record, history:history.rows };
  }
  async moderate(actor, kind, id, input) {
    requireAdminPermission(actor,`${kind}.moderate`); adminId(id); const action = adminAction(input);
    if (!['stores','products'].includes(kind)) throw new PlatformAdminError(404,'NOT_FOUND','Không tìm thấy đối tượng.');
    return this.transaction(async db => {
      const args=[id],scope=adminScopeSql(actor,`${kind}.moderate`,{storeIds:kind==='stores'?'id::text':'store_id::text'},args);
      const permitted=await db.query(`SELECT id FROM catalog.${kind} WHERE id=$1 AND ${scope} FOR UPDATE`,args);
      if(!permitted.rowCount)throw new PlatformAdminError(404,'NOT_FOUND','Không tìm thấy đối tượng trong phạm vi được giao.');
      return adminCommand(db, 'catalog', actor, `${kind}:${id}:status`, action, async () => {
        const { rows } = await db.query(`SELECT * FROM catalog.${kind} WHERE id=$1 FOR UPDATE`,[id]);
        const row = rows[0];
        if (!row) throw new PlatformAdminError(404,'NOT_FOUND','Không tìm thấy đối tượng.');
        requireAdminScope(actor,`${kind}.moderate`,{storeId:kind==='stores'?row.id:row.store_id});
        checkAdminVersion(row,action);
        const suspended = action.action === 'suspend';
        if (Boolean(row.platform_suspended) === suspended) throw new PlatformAdminError(409,'INVALID_TRANSITION','Thao tác không phù hợp với trạng thái hiện tại.');
        let status;
        if (kind === 'stores') {
          const settings = await db.query('SELECT accepting_orders FROM catalog.store_settings WHERE store_id=$1 FOR UPDATE',[id]);
          status = suspended || !settings.rows[0]?.accepting_orders ? 'paused' : 'active';
        } else {
          status = suspended ? 'hidden' : row.platform_previous_status || 'hidden';
          if (!suspended && ['active','published'].includes(status)) {
            const active = await db.query("SELECT 1 FROM catalog.product_variants WHERE product_id=$1 AND status='active' LIMIT 1",[id]);
            if (!active.rowCount) throw new PlatformAdminError(409,'VARIANT_REQUIRED','Sản phẩm cần ít nhất một biến thể đang hoạt động trước khi khôi phục.');
          }
        }
        const previous = row.platform_suspended ? 'suspended' : row.status;
        if (kind === 'stores') await db.query(`UPDATE catalog.stores SET platform_suspended=$2,platform_suspension_reason=$3,
          status=$4,admin_version=admin_version+1,updated_at=now() WHERE id=$1`,[id,suspended,suspended?action.reason:null,status]);
        else await db.query(`UPDATE catalog.products SET platform_suspended=$2,platform_suspension_reason=$3,status=$4,
          platform_previous_status=$5,admin_version=admin_version+1,updated_at=now() WHERE id=$1`,
          [id,suspended,suspended?action.reason:null,status,suspended?row.status:null]);
        await db.query(`INSERT INTO catalog.platform_admin_actions(actor_id,target_id,target_type,action,previous_status,next_status,reason,read_version,result_version,correlation_id)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,[actor.id,id,kind==='stores'?'store':'product',action.action,previous,suspended?'suspended':status,action.reason,action.version,action.version+1,action.requestId]);
        await db.query('INSERT INTO catalog.store_outbox(event_type,payload) VALUES ($1,$2)',[
          kind==='stores'?'StoreStatusChanged.v1':'ProductUpdated.v1',
          kind==='stores'?{storeId:id,status,platformSuspended:suspended,correlationId:action.requestId}:{productId:id,storeId:row.store_id,status,platformSuspended:suspended,correlationId:action.requestId},
        ]);
        return {id,status:suspended?'suspended':status,version:Number(row.admin_version)+1};
      });
    });
  }
  async audit(user, query) {
    requireAdminScope(user,'audit.read',{}); const options = adminQuery(query,{kinds:['store','product']});
    const args = [options.pattern,options.kind];
    const from = `FROM catalog.platform_admin_actions a LEFT JOIN catalog.stores s ON a.target_type='store' AND s.id=a.target_id
      LEFT JOIN catalog.products p ON a.target_type='product' AND p.id=a.target_id
      WHERE (coalesce(s.name,p.name,'') ILIKE $1 OR a.reason ILIKE $1 OR a.target_id::text ILIKE $1) AND ($2='' OR a.target_type=$2)`;
    const [count,list] = await Promise.all([
      this.pool.query(`SELECT count(*)::int AS total ${from}`,args),
      this.pool.query(`SELECT a.*,coalesce(s.name,p.name,a.target_id::text) AS target_name ${from}
        ORDER BY a.created_at DESC,a.id DESC LIMIT $3 OFFSET $4`,[...args,options.limit,options.offset]),
    ]);
    return adminPage(list.rows,count.rows[0].total,options);
  }
}
