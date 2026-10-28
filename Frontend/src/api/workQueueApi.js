import { authorizedRequest } from './identityApi';
const base = `${import.meta.env.VITE_ORDER_API_URL || 'http://localhost:5103'}/api/v2/admin/work-queue`;
const payment = `${import.meta.env.VITE_PAYMENT_API_URL || 'http://localhost:5104'}/api/v2/admin/finance`;
const request = (path, method = 'GET', body) => authorizedRequest(base + path, { method, ...(body === undefined ? {} : { body }) });
export const workQueueApi = {
    list: (filters) => request(`?${new URLSearchParams(filters)}`),
    attention: () => request('/attention'),
    detail: (id) => request(`/${id}`),
    action: (id, body) => request(`/${id}/actions`, 'POST', body),
    settings: () => request('/settings'),
    updateSettings: (kind, body) => request(`/settings/${kind}`, 'PUT', body),
    notifications: () => request('/notifications'),
    read: (id) => request(`/notifications/${id}/read`, 'POST', {}),
    retry: (source) => request(`/retry/${source}`, 'POST', {}),
};
export const dashboardFinanceApi = {
    summary: (range) => authorizedRequest(`${payment}/summary?${new URLSearchParams(range)}`),
    entries: (filters) => authorizedRequest(`${payment}/entries?${new URLSearchParams(filters)}`),
};
