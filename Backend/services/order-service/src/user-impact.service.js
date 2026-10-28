import {adminId} from '../../../packages/contracts/platform-admin.js';
import {requireUserImpact} from '../../../packages/contracts/user-impact.js';
export async function userOrderImpact(order,actor,id,bearer){
  requireUserImpact(actor);adminId(id);
  const catalog=await order.remote(new URL(`/api/v2/admin/user-impact/${id}`,order.catalogUrl),{headers:{Authorization:bearer}});
  const {rows}=await order.pool.query(`SELECT count(*)::int AS total,
    count(*) FILTER(WHERE o.status NOT IN ('CANCELLED','DELIVERED','COMPLETED'))::int AS active,
    count(*) FILTER(WHERE o.user_id=$1 AND o.status NOT IN ('CANCELLED','DELIVERED','COMPLETED'))::int AS active_buyer,
    count(*) FILTER(WHERE o.store_id=ANY($2::uuid[]) AND o.status NOT IN ('CANCELLED','DELIVERED','COMPLETED'))::int AS active_seller,
    (SELECT count(*)::int FROM order_service.admin_cases c JOIN order_service.orders co ON co.id=c.shop_order_id WHERE (co.user_id=$1 OR co.store_id=ANY($2::uuid[])) AND c.workflow_status NOT IN ('CLOSED','RESOLVED','DECIDED')) AS open_cases,
    (SELECT count(*)::int FROM order_service.return_requests r JOIN order_service.orders ro ON ro.id=r.shop_order_id WHERE (ro.user_id=$1 OR ro.store_id=ANY($2::uuid[])) AND r.status='REFUND_PENDING') AS pending_refunds
    FROM order_service.orders o WHERE o.user_id=$1 OR o.store_id=ANY($2::uuid[])`,[id,catalog.ownedStoreIds]);
  return {ownedStores:catalog.ownedStoreIds.length,totalOrders:rows[0].total,activeOrders:rows[0].active,activeBuyerOrders:rows[0].active_buyer,activeSellerOrders:rows[0].active_seller,openCases:rows[0].open_cases,pendingRefunds:rows[0].pending_refunds};
}
