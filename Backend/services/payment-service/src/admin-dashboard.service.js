import {adminId, adminMoney, adminPage, PlatformAdminError} from '../../../packages/contracts/platform-admin.js';
import {requireAdminScope} from '../../../packages/contracts/admin-rbac.js';
import {dashboardRange, dashboardMeta, metricComparison} from '../../../packages/contracts/admin-dashboard.js';

export class PaymentDashboardService {
  constructor(pool) { this.pool=pool; }
  async summary(user, query={}) {
    requireAdminScope(user,'finance.view_sensitive',{});
    const range=dashboardRange(query),args=[range.start,range.end,range.previousStart];
    const [paid,refunded]=await Promise.all([
      this.pool.query(`SELECT coalesce(sum(amount_minor) FILTER(WHERE verified_at>=$1 AND verified_at<$2),0) AS current,
        coalesce(sum(amount_minor) FILTER(WHERE verified_at>=$3 AND verified_at<$1),0) AS previous
        FROM payment_service.payment_transactions WHERE status='SUCCEEDED' AND verified_at>=$3 AND verified_at<$2`,args),
      this.pool.query(`SELECT coalesce(sum(amount_minor) FILTER(WHERE succeeded_at>=$1 AND succeeded_at<$2),0) AS current,
        coalesce(sum(amount_minor) FILTER(WHERE succeeded_at>=$3 AND succeeded_at<$1),0) AS previous
        FROM payment_service.refunds WHERE status='SUCCEEDED' AND succeeded_at>=$3 AND succeeded_at<$2`,args),
    ]);
    return {...dashboardMeta(range),paid:metricComparison(adminMoney(paid.rows[0].current),adminMoney(paid.rows[0].previous)),
      refunded:metricComparison(adminMoney(refunded.rows[0].current),adminMoney(refunded.rows[0].previous)),
      feeRevenue:null,definitions:{paid:'Tổng giao dịch SUCCEEDED theo verified_at, gồm tiền COD đã xác nhận; mỗi giao dịch thu một lần, gồm cả đơn sau đó bị hủy.',
        refunded:'Tổng hoàn tiền SUCCEEDED theo thời điểm hoàn thành, không trừ vào số tiền thu; gồm mọi đơn. Dữ liệu cũ dùng mốc cập nhật cuối khi chuyển đổi.',
        feeRevenue:'Chưa có nghiệp vụ phí sàn; không suy ra doanh thu phí từ giá trị đơn.'}};
  }
  async entries(user, query={}) {
    requireAdminScope(user,'finance.view_sensitive',{});
    if (!['payments','refunds'].includes(query.kind)) throw new PlatformAdminError(400,'INVALID_FINANCE_KIND','Loại giao dịch không hợp lệ.');
    const range=dashboardRange(query), page=Number(query.page||1),limit=20;
    if (!Number.isSafeInteger(page)||page<1||page>10000) throw new PlatformAdminError(400,'INVALID_PAGE','Trang không hợp lệ.');
    const refunds=query.kind==='refunds',table=refunds?'refunds':'payment_transactions',time=refunds?'succeeded_at':'verified_at';
    const where=`FROM payment_service.${table} WHERE status='SUCCEEDED' AND ${time}>=$1 AND ${time}<$2`;
    const [total,items]=await Promise.all([this.pool.query(`SELECT count(*)::int AS n ${where}`,[range.start,range.end]),
      this.pool.query(`SELECT id,${refunds?'shop_order_id':'intent_id'} AS object_id,provider,status,amount_minor,${time} AS occurred_at ${where}
        ORDER BY ${time} DESC,id DESC LIMIT $3 OFFSET $4`,[range.start,range.end,limit,(page-1)*limit])]);
    return {...dashboardMeta(range),...adminPage(items.rows.map(row=>({id:row.id,objectId:row.object_id,provider:row.provider,status:row.status,amountMinor:adminMoney(row.amount_minor),occurredAt:row.occurred_at})),total.rows[0].n,{page,limit})};
  }
  async queueFeed(query={}) {
    const after=query.after||'00000000-0000-0000-0000-000000000000';
    adminId(after);
    const {rows}=await this.pool.query(`SELECT r.id,r.shop_order_id,r.status,r.created_at,r.updated_at,r.idempotency_key,
      EXISTS(SELECT 1 FROM payment_service.refunds newer WHERE r.idempotency_key LIKE 'return:%'
        AND newer.shop_order_id=r.shop_order_id AND newer.id<>r.id
        AND split_part(newer.idempotency_key,':',2)=split_part(r.idempotency_key,':',2)
        AND (newer.status='SUCCEEDED' OR (newer.created_at>=r.created_at AND newer.idempotency_key>r.idempotency_key))) AS superseded
      FROM payment_service.refunds r WHERE r.id>$1 ORDER BY r.id LIMIT 500`,[after]);
    return {items:rows.map(row=>({sourceId:row.id,shopOrderId:row.shop_order_id,active:['INITIATED','PENDING','FAILED'].includes(row.status)&&!row.superseded,
      returnId:/^return:[0-9a-f-]{36}:\d+$/.test(row.idempotency_key)?row.idempotency_key.split(':')[1]:null,
      status:row.status,createdAt:row.created_at,updatedAt:row.updated_at})),next:rows.length===500?rows.at(-1).id:null};
  }
}
