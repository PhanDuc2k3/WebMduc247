export function isPlatformAdmin(user: { roles?: readonly string[] } | null | undefined) {
  return Boolean(user?.roles?.includes('platform_admin'));
}
export function adminDestination(value: string | null) {
  const paths = ['/admin','/admin/users','/admin/stores','/admin/products','/admin/orders','/admin/audit','/admin/storefront','/admin/storefront/preview'];
  if (!value || !paths.includes(value.split('?')[0])) return '/admin';
  return value;
}
