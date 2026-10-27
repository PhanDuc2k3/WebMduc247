import { authorizedRequest, identityAuthorizedRequest } from './identityApi';
const catalog = import.meta.env.VITE_CATALOG_API_URL || 'http://localhost:5102';
const order = import.meta.env.VITE_ORDER_API_URL || 'http://localhost:5103';
function entityRequest(resource, path, options) {
    const route = `/admin/${resource}${path}`;
    return resource === 'users' ? identityAuthorizedRequest(route, options) :
        authorizedRequest(`${resource === 'orders' ? order : catalog}/api/v2${route}`, options);
}
const queryString = (filters) => new URLSearchParams(Object.entries(filters).filter(([, v]) => v !== '' && v !== undefined)
    .map(([key, value]) => [key, String(value)])).toString();
export const platformAdminApi = {
    identitySummary: () => identityAuthorizedRequest('/admin/identity/summary'),
    catalogSummary: () => authorizedRequest(`${catalog}/api/v2/admin/catalog/summary`),
    orderSummary: () => authorizedRequest(`${order}/api/v2/admin/orders/summary`),
    recentOrders: () => authorizedRequest(`${order}/api/v2/admin/orders/recent`),
    list: (resource, filters) => entityRequest(resource, `?${queryString(filters)}`),
    detail: (resource, id) => entityRequest(resource, `/${encodeURIComponent(id)}`),
    cancelBlockedSeller: (record, reason, requestId, approvalId) => entityRequest('orders', `/${record.id}/cancel-blocked-seller`, { method: 'POST', body: { version: record.version, reason, requestId, ...(approvalId ? { approvalId } : {}) } }),
    moderate: (resource, record, action, reason, requestId) => entityRequest(resource, `/${record.id}/status`, { method: 'PATCH', body: { action, reason, version: record.version, requestId } }),
    audit: (source, filters) => source === 'identity' ?
        identityAuthorizedRequest(`/admin/audit?${queryString(filters)}`) :
        authorizedRequest(`${catalog}/api/v2/admin/catalog/audit?${queryString(filters)}`),
};
