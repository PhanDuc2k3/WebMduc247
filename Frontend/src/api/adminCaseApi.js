import { authorizedRequest } from './identityApi';
const base = `${import.meta.env.VITE_ORDER_API_URL || 'http://localhost:5103'}/api/v2`;
const request = (path, method = 'GET', body) => authorizedRequest(base + path, { method, ...(body === undefined ? {} : { body }) });
export const adminCaseApi = {
    list: (filters) => request(`/admin/cases?${new URLSearchParams(Object.entries(filters)
        .filter(([, value]) => value !== undefined && value !== '').map(([key, value]) => [key, String(value)]))}`),
    detail: (id) => request(`/admin/cases/${encodeURIComponent(id)}`),
    capabilities: () => request('/admin/cases/capabilities'),
    staff: (q = '') => request(`/admin/cases/staff?${new URLSearchParams({ q })}`),
    assign: (id, body) => request(`/admin/cases/${id}/assignment`, 'PATCH', body),
    create: (body) => request('/admin/cases', 'POST', body),
    status: (id, body) => request(`/admin/cases/${id}/status`, 'POST', body),
    requestInformation: (id, body) => request(`/admin/cases/${id}/information-requests`, 'POST', body),
    orderContext: (id) => request(`/admin/cases/order-context/${encodeURIComponent(id)}`),
    exceptions: () => request('/admin/return-exceptions'),
    requestException: (body) => request('/admin/return-exceptions', 'POST', body),
    decideException: (id, body) => request(`/admin/return-exceptions/${id}/decisions`, 'POST', body),
};
export const participantCaseApi = {
    forOrder: (orderId) => request(`/orders/${orderId}/cases`),
    reply: (id, requestId, body) => request(`/cases/${id}/information-requests/${requestId}/replies`, 'POST', body),
};
