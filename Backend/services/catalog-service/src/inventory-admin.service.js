import {adminId,adminPage,PlatformAdminError} from '../../../packages/contracts/platform-admin.js';
import {adminScopeSql} from '../../../packages/contracts/admin-rbac.js';
import {operationsQuery} from '../../../packages/contracts/admin-operations.js';

export class InventoryAdminService {
  constructor(pool){this.pool=pool;}
  async list(actor,query={}){
    const args=[],scope=adminScopeSql(actor,'inventory.read',{storeIds:'v.store_id::text'},args);
    const f=operationsQuery(query,[],['attention']);
    if(query.attention&&!['expired','mismatch'].includes(query.attention))throw new PlatformAdminError(400,'INVALID_ADMIN_FILTER','Bộ lọc không hợp lệ.');
    args.push(f.pattern,query.storeId||null,query.attention||'');const n=args.length;
    const from=`FROM catalog.inventory i JOIN catalog.product_variants v ON v.id=i.variant_id JOIN catalog.products p ON p.id=v.product_id
      JOIN catalog.stores s ON s.id=v.store_id LEFT JOIN LATERAL(SELECT coalesce(sum(quantity) FILTER(WHERE status='ACTIVE'),0)::int AS held,
        count(*) FILTER(WHERE status='ACTIVE' AND expires_at<now())::int AS expired FROM catalog.inventory_reservations WHERE variant_id=v.id) r ON true
      WHERE ${scope} AND ($${n-2}='%%' OR v.sku ILIKE $${n-2} OR p.name ILIKE $${n-2} OR v.id::text ILIKE $${n-2}
        OR EXISTS(SELECT 1 FROM catalog.inventory_reservations x WHERE x.variant_id=v.id AND x.order_ref ILIKE $${n-2}))
      AND ($${n-1}::uuid IS NULL OR v.store_id=$${n-1}) AND ($${n}='' OR ($${n}='expired' AND r.expired>0) OR ($${n}='mismatch' AND i.reserved<>r.held))`;
    const [count,rows]=await Promise.all([this.pool.query(`SELECT count(*)::int n ${from}`,args),this.pool.query(`SELECT v.id,v.product_id,v.store_id,v.sku,p.name,s.name AS store_name,i.on_hand,i.reserved,i.on_hand-i.reserved AS available,i.version,i.updated_at,r.held,r.expired ${from}
      ORDER BY r.expired DESC,v.id LIMIT $${n+1} OFFSET $${n+2}`,[...args,f.limit,f.offset])]);
    return adminPage(rows.rows,count.rows[0].n,f);
  }
  async detail(actor,id){
    adminId(id);const args=[id],scope=adminScopeSql(actor,'inventory.read',{storeIds:'v.store_id::text'},args);
    const record=(await this.pool.query(`SELECT v.id,v.product_id,v.store_id,v.sku,p.name,i.on_hand,i.reserved,i.on_hand-i.reserved AS available,i.version,i.updated_at
      FROM catalog.inventory i JOIN catalog.product_variants v ON v.id=i.variant_id JOIN catalog.products p ON p.id=v.product_id WHERE v.id=$1 AND ${scope}`,args)).rows[0];
    if(!record)throw new PlatformAdminError(404,'INVENTORY_NOT_FOUND','Không tìm thấy SKU trong phạm vi được giao.');
    const [reservations,movements,anomalies]=await Promise.all([
      this.pool.query('SELECT id,order_ref,quantity,status,expires_at,created_at,updated_at FROM catalog.inventory_reservations WHERE variant_id=$1 ORDER BY created_at DESC,id DESC LIMIT 100',[id]),
      this.pool.query('SELECT id,delta,reason,reference,source,occurred_at FROM catalog.inventory_movements WHERE variant_id=$1 ORDER BY occurred_at DESC,id DESC LIMIT 50',[id]),
      this.pool.query('SELECT issue,observed_on_hand,observed_reserved,expected_reserved,detected_at,resolved_at FROM catalog.inventory_anomalies WHERE variant_id=$1',[id]),
    ]);
    return {record,reservations:reservations.rows,movements:movements.rows,anomalies:anomalies.rows,guidance:'Kho ghi nhận, đang giữ và khả dụng lấy từ Catalog. Lượt giữ quá hạn vẫn cần worker xác minh/release; không tự sửa tồn hoặc xóa reservation đang gắn đơn.'};
  }
}
