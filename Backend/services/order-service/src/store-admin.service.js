import {requireAdminScope} from '../../../packages/contracts/admin-rbac.js';
import {adminId} from '../../../packages/contracts/platform-admin.js';
import {dashboardRange} from '../../../packages/contracts/admin-dashboard.js';

// Only aggregates are exposed by stores.read, never buyer contacts or financial details.
export async function storeOrderImpact(pool,actor,id,query={}){
  adminId(id);requireAdminScope(actor,'stores.read',{storeId:id});const range=dashboardRange(query);
  const {rows}=await pool.query(`SELECT count(*)::int AS total_orders,
    count(*) FILTER(WHERE o.status NOT IN ('CANCELLED','DELIVERED','COMPLETED'))::int AS open_orders,
    count(*) FILTER(WHERE o.status IN ('PLACED','CONFIRMED','PREPARING') AND o.created_at<now()-interval '48 hours')::int AS overdue_orders,
    count(*) FILTER(WHERE o.created_at>=$2 AND o.created_at<$3)::int AS period_orders,
    count(*) FILTER(WHERE o.created_at>=$2 AND o.created_at<$3 AND o.status IN ('DELIVERED','COMPLETED'))::int AS completed_orders,
    count(*) FILTER(WHERE o.created_at>=$2 AND o.created_at<$3 AND o.status='CANCELLED' AND EXISTS(
      SELECT 1 FROM order_service.order_status_history h WHERE h.shop_order_id=o.id AND h.actor_type='seller' AND h.to_status='CANCEL_PENDING'))::int AS seller_cancelled,
    count(*) FILTER(WHERE o.created_at>=$2 AND o.created_at<$3 AND (
      (o.status IN ('PLACED','CONFIRMED','PREPARING') AND o.created_at<now()-interval '48 hours') OR EXISTS(
      SELECT 1 FROM order_service.order_status_history h WHERE h.shop_order_id=o.id AND h.to_status='READY_TO_SHIP' AND h.occurred_at>o.created_at+interval '48 hours')))::int AS delayed_orders
    FROM order_service.orders o WHERE o.store_id=$1`,[id,range.start,range.end]);
  const returns=(await pool.query(`SELECT count(*) FILTER(WHERE status NOT IN ('REFUNDED','REJECTED','CLOSED'))::int AS open_returns,
    count(*) FILTER(WHERE requested_at>=$2 AND requested_at<$3)::int AS period_returns,
    count(DISTINCT shop_order_id) FILTER(WHERE requested_at>=$2 AND requested_at<$3)::int AS returned_orders
    FROM order_service.return_requests WHERE store_id=$1`,[id,range.start,range.end])).rows[0];
  const cases=(await pool.query(`SELECT count(*) FILTER(WHERE c.workflow_status NOT IN ('CLOSED','RESOLVED','DECIDED'))::int AS open_cases,
    count(*) FILTER(WHERE c.kind IN ('TICKET','DISPUTE') AND EXISTS(SELECT 1 FROM order_service.case_decisions d
      WHERE d.case_id=c.id AND d.status='PUBLISHED' AND d.published_at>=$2 AND d.published_at<$3))::int AS concluded_complaints
    FROM order_service.admin_cases c JOIN order_service.orders o ON o.id=c.shop_order_id WHERE o.store_id=$1`,[id,range.start,range.end])).rows[0];
  const row=rows[0];
  return {storeId:id,updatedAt:new Date().toISOString(),range:{from:range.from,to:range.to},timeZone:'Asia/Ho_Chi_Minh',
    ...row,...returns,...cases,sellerCancellationRate:row.period_orders?row.seller_cancelled/row.period_orders:null,
    definition:'Đơn là đơn của từng shop. Đơn mở loại đã hủy/đã giao/hoàn tất. Chậm xử lý: quá 48 giờ từ ngày tạo đến sẵn sàng giao, hoặc hiện còn chờ shop sau 48 giờ. Tỷ lệ hủy do shop = đơn tạo trong kỳ đã hủy bởi seller / đơn tạo trong kỳ. Trả hàng và khiếu nại theo ngày phát sinh hoặc công bố kết luận trong kỳ; không suy diễn thành vi phạm.',
    supportPath:'/admin/cases',reports:{source:'order_service.admin_cases',definition:'Hồ sơ hậu mãi và khiếu nại liên quan; báo cáo hội thoại thuộc nguồn Chat riêng.'}};
}
