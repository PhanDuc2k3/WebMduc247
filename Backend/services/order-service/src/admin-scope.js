import { adminId, PlatformAdminError } from '../../../packages/contracts/platform-admin.js';
import { adminScopeSql, permissionGrants, requireAdminPermission } from '../../../packages/contracts/admin-rbac.js';

export function adminOrderScopeSql(user,permission,args) {
  requireAdminPermission(user,permission);
  return '('+permissionGrants(user,permission).map(grant=>{
    const filter=adminScopeSql({...user,adminAccess:{grants:[grant]}},permission,
      {storeIds:'o.store_id::text',caseKinds:'c.kind',assigneeIds:'c.assignee_id::text'},args);
    return grant.scope?.caseKinds||grant.scope?.assigneeIds
      ?`EXISTS(SELECT 1 FROM order_service.admin_cases c WHERE c.shop_order_id=o.id AND ${filter})`:filter;
  }).join(' OR ')+')';
}

export async function requireCaseAccess(db,user,permission,id) {
  adminId(id);const args=[id];
  const scope=adminScopeSql(user,permission,{storeIds:'o.store_id::text',caseKinds:'c.kind',assigneeIds:'c.assignee_id::text'},args);
  const row=(await db.query(`SELECT c.id FROM order_service.admin_cases c JOIN order_service.orders o ON o.id=c.shop_order_id
    WHERE c.id=$1 AND ${scope}`,args)).rows[0];
  if(!row)throw new PlatformAdminError(404,'CASE_NOT_FOUND','Không tìm thấy hồ sơ trong phạm vi được giao.');
}
export async function requireOrderAccess(db,user,permission,id,{caseKind,assigneeId}={}) {
  adminId(id);const args=[id];const columns={storeIds:'o.store_id::text'};
  const grants=permissionGrants(user,permission);
  if(caseKind&&grants.some(g=>g.scope?.caseKinds)){args.push(caseKind);columns.caseKinds=`$${args.length}::text`;}
  if(assigneeId&&grants.some(g=>g.scope?.assigneeIds)){args.push(assigneeId);columns.assigneeIds=`$${args.length}::text`;}
  const scope=adminScopeSql(user,permission,columns,args);
  const row=(await db.query(`SELECT o.id FROM order_service.orders o WHERE o.id=$1 AND ${scope}`,args)).rows[0];
  if(!row)throw new PlatformAdminError(404,'ORDER_NOT_FOUND','Không tìm thấy đơn trong phạm vi được giao.');
}
