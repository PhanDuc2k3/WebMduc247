import { PlatformAdminError } from './platform-admin.js';
import {ADMIN_SENSITIVE_PERMISSIONS,requireRecentAdmin} from './admin-auth-policy.js';

// Explicit allowlists: a new resource/action never inherits an existing role.
export const ADMIN_PERMISSIONS = Object.freeze([
  'mfa_recovery.approve',
  'staff.read','staff.update','users.read','users.moderate','users.export','users.view_sensitive',
  'stores.read','stores.moderate','products.read','products.moderate','orders.read','orders.create','orders.approve','orders.execute',
  'cases.read','cases.create','cases.update','cases.approve','cases.execute','cases.view_sensitive',
  'returns.read','returns.moderate','returns.execute','refunds.read','refunds.create','refunds.approve','refunds.execute',
  'payout_accounts.read','payout_accounts.create','payout_accounts.approve','payout_accounts.execute',
  'storefront.read','storefront.create','storefront.update','storefront.approve',
  'promotions.read','promotions.create','promotions.update','reports.read','audit.read',
  'finance.export','finance.view_sensitive','approval_policy.read','approval_policy.update',
]);
export const ADMIN_ROLES = Object.freeze({
  system_admin: { label:'Quản trị hệ thống', permissions:['staff.read','staff.update','approval_policy.read','approval_policy.update','audit.read','mfa_recovery.approve'] },
  operations: { label:'Vận hành sàn', permissions:['stores.read','products.read','orders.read','orders.create','cases.read','cases.create','cases.update','returns.read','reports.read'] },
  customer_support: { label:'Chăm sóc khách hàng', permissions:['orders.read','cases.read','cases.create','cases.update','cases.view_sensitive','returns.read'] },
  moderator: { label:'Kiểm duyệt', permissions:['stores.read','stores.moderate','products.read','products.moderate','cases.read','cases.update','cases.approve','cases.view_sensitive'] },
  finance: { label:'Tài chính', permissions:['orders.read','orders.create','orders.approve','orders.execute','cases.read','cases.execute','returns.read','returns.moderate','returns.execute','refunds.read','refunds.create','refunds.approve','refunds.execute','finance.view_sensitive','approval_policy.read','reports.read'] },
  marketing: { label:'Marketing', permissions:['promotions.read','promotions.create','promotions.update','reports.read'] },
  content_editor: { label:'Biên tập nội dung', permissions:['storefront.read','storefront.create','storefront.update','storefront.approve'] },
  auditor: { label:'Kiểm tra/đọc báo cáo', permissions:['reports.read','audit.read','approval_policy.read'] },
  // One-time migration compatibility. No financial execution, exports or sensitive-data grant.
  legacy_admin: { label:'Quản trị cũ (chuyển đổi)', permissions:['users.read','users.moderate','stores.read','stores.moderate','products.read','products.moderate','orders.read','cases.read','cases.create','cases.update','returns.read','storefront.read','storefront.create','storefront.update','storefront.approve','reports.read','audit.read','staff.read'] },
});
export function normalizeScope(input = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(k=>!['storeIds','caseKinds','assigneeIds'].includes(k)))
    throw new PlatformAdminError(400,'INVALID_ADMIN_SCOPE','Phạm vi không hợp lệ.');
  const scope={};
  for(const [key,values] of Object.entries(input)) {
    if(!Array.isArray(values)||!values.length||values.length>100||values.some(v=>typeof v!=='string'||
      (key==='caseKinds'?!['RETURN','TICKET','DISPUTE'].includes(v):! /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v))))
      throw new PlatformAdminError(400,'INVALID_ADMIN_SCOPE','Phạm vi phải có danh sách hợp lệ, không rỗng.');
    scope[key]=[...new Set(values.map(v=>key==='caseKinds'?v:v.toLowerCase()))].sort();
  }
  return scope;
}
export function effectiveAdminAccess(assignments = [],userId) {
  const roles=assignments.filter(a=>Object.hasOwn(ADMIN_ROLES,a.role));
  const grants=roles.flatMap(a=>ADMIN_ROLES[a.role].permissions.map(permission=>{
    const scope=normalizeScope(a.scope);
    // Support staff may look up orders only through their assigned cases.
    if(a.role==='customer_support'&&permission==='orders.read')scope.assigneeIds=scope.assigneeIds||[userId||'unassigned'];
    return {permission,role:a.role,scope};
  }));
  return { roles:roles.map(a=>({role:a.role,label:ADMIN_ROLES[a.role].label,scope:normalizeScope(a.scope)})),
    permissions:[...new Set(grants.map(g=>g.permission))].sort(),grants,
    restrictions:['Không tự duyệt yêu cầu bằng bất kỳ vai trò nào trong cùng tài khoản.','Xuất dữ liệu và xem dữ liệu nhạy cảm là các quyền riêng.','Quyền và phạm vi được kiểm tra lại ở mỗi bước.'] };
}
export function permissionGrants(user,permission) {
  if(!user?.id)throw new PlatformAdminError(401,'UNAUTHORIZED','Vui lòng đăng nhập.');
  if(!ADMIN_PERMISSIONS.includes(permission))return [];
  return (user.adminAccess?.grants||[]).filter(g=>g.permission===permission);
}
export function requireAdminPermission(user,permission) {
  if(!permissionGrants(user,permission).length)throw new PlatformAdminError(403,'ADMIN_PERMISSION_REQUIRED','Chưa được cấp quyền cho thao tác này.');
  // Internal authorization lookups carry grants without an interactive session; the HTTP actor must step up.
  if(user.adminSession&&(ADMIN_SENSITIVE_PERMISSIONS.has(permission)||permission.endsWith('.view_sensitive')))requireRecentAdmin(user);
  return user;
}
export function requireAdminScope(user,permission,resource) {
  requireAdminPermission(user,permission);
  const fields={storeIds:'storeId',caseKinds:'caseKind',assigneeIds:'assigneeId'};
  if(!permissionGrants(user,permission).some(g=>Object.entries(g.scope||{}).every(([key,values])=>values.includes(resource[fields[key]]))))
    throw new PlatformAdminError(403,'ADMIN_SCOPE_REQUIRED','Đối tượng nằm ngoài phạm vi được giao.');
}
// Values are always bound parameters; unsupported dimensions deny that grant.
// OR between role grants, AND between dimensions within one grant.
export function adminScopeSql(user,permission,columns,args) {
  requireAdminPermission(user,permission);
  const clauses=permissionGrants(user,permission).map(g=>{
    const parts=Object.entries(g.scope||{}).map(([key,values])=>{
      if(!columns[key])return 'FALSE';
      args.push(values);return typeof columns[key]==='object'
        ?`${columns[key].array} && $${args.length}::text[]`
        :`${columns[key]} = ANY($${args.length}::text[])`;
    });
    return parts.length?`(${parts.join(' AND ')})`:'TRUE';
  });
  return `(${clauses.join(' OR ')})`;
}
