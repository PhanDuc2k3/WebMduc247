type AdminIdentity={adminAccess?:{permissions:readonly string[]};adminSession?:{verifiedAt:string}};
export function isPlatformAdmin(user: AdminIdentity | null | undefined) {
  return Boolean(user?.adminAccess?.permissions?.length&&user?.adminSession?.verifiedAt);
}
export function hasAdminPermission(user:AdminIdentity|null|undefined,permission:string){return Boolean(user?.adminAccess?.permissions.includes(permission));}
const routePermissions:Record<string,string[]>={
  '/admin/user-workflows':['users.appeals.read','privacy.read','users.notes.manage'],
  '/admin/work-queue':['orders.read','cases.read','returns.read','refunds.read','moderation.read'],'/admin/finance':['finance.view_sensitive'],
  '/admin/users':['users.read'],'/admin/stores':['stores.read'],'/admin/products':['products.read'],'/admin/orders':['orders.read'],
  '/admin/returns':['returns.read'],'/admin/cases':['cases.read'],'/admin/return-exceptions':['refunds.read'],
  '/admin/case-reports':['reports.read'],'/admin/storefront':['storefront.read'],'/admin/storefront/preview':['storefront.read'],
  '/admin/audit':['audit.read'],'/admin/staff-access':['staff.read'],'/admin/approvals':['refunds.read','orders.read','approval_policy.read'],
};
export function canVisitAdminPath(user:AdminIdentity|null|undefined,path:string){
  if(!isPlatformAdmin(user))return false;
  if(path==='/admin/security')return isPlatformAdmin(user);
  if(path==='/admin')return isPlatformAdmin(user);
  return (routePermissions[path]||[]).some(permission=>hasAdminPermission(user,permission));
}
export function adminDestination(value: string | null) {
  const paths = ['/admin','/admin/security',...Object.keys(routePermissions)];
  if (!value || !paths.includes(value.split('?')[0])) return '/admin';
  return value;
}
