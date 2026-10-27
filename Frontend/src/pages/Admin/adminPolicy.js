export function isPlatformAdmin(user) {
    return Boolean(user?.adminAccess?.permissions?.length);
}
export function hasAdminPermission(user, permission) { return Boolean(user?.adminAccess?.permissions.includes(permission)); }
const routePermissions = {
    '/admin/users': ['users.read'], '/admin/stores': ['stores.read'], '/admin/products': ['products.read'], '/admin/orders': ['orders.read'],
    '/admin/returns': ['returns.read'], '/admin/cases': ['cases.read'], '/admin/return-exceptions': ['refunds.read'],
    '/admin/case-reports': ['reports.read'], '/admin/storefront': ['storefront.read'], '/admin/storefront/preview': ['storefront.read'],
    '/admin/audit': ['audit.read'], '/admin/staff-access': ['staff.read'], '/admin/approvals': ['refunds.read', 'orders.read', 'approval_policy.read'],
};
export function canVisitAdminPath(user, path) {
    if (path === '/admin')
        return isPlatformAdmin(user);
    return (routePermissions[path] || []).some(permission => hasAdminPermission(user, permission));
}
export function adminDestination(value) {
    const paths = ['/admin', ...Object.keys(routePermissions)];
    if (!value || !paths.includes(value.split('?')[0]))
        return '/admin';
    return value;
}
