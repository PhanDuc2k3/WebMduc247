import { authorizedRequest } from './identityApi';
const catalog = import.meta.env.VITE_CATALOG_API_URL || 'http://localhost:5102';
const order = import.meta.env.VITE_ORDER_API_URL || 'http://localhost:5103';
const engagement = import.meta.env.VITE_ENGAGEMENT_API_URL || 'http://localhost:5105';
const chat = import.meta.env.VITE_CHAT_API_URL || 'http://localhost:5106';
const route = (id, seller = false) => `${catalog}/api/v2/${seller ? 'seller' : 'admin'}/stores/${encodeURIComponent(id)}/governance`;
export const storeAdminApi = {
    formerDecisions: () => authorizedRequest(`${catalog}/api/v2/seller/former-store-decisions`),
    read: (id) => authorizedRequest(route(id)),
    profileContact: (id, body) => authorizedRequest(`${catalog}/api/v2/admin/stores/${id}/profile-contact`, { method: 'POST', body }),
    command: (id, body) => authorizedRequest(route(id), { method: 'POST', body }),
    queue: (status = 'PENDING', page = 1) => authorizedRequest(`${catalog}/api/v2/admin/store-applications?${new URLSearchParams({ status, page: String(page) })}`),
    impact: (id, range = {}) => authorizedRequest(`${order}/api/v2/admin/stores/${encodeURIComponent(id)}/impact?${new URLSearchParams(range)}`),
    ratings: (id, range = {}) => authorizedRequest(`${engagement}/api/v2/admin/stores/${encodeURIComponent(id)}/rating-summary?${new URLSearchParams(range)}`),
    reports: (id) => authorizedRequest(`${chat}/api/v2/admin/stores/${encodeURIComponent(id)}/report-summary`),
    sellerRead: (id) => authorizedRequest(route(id, true)),
    sellerCommand: (id, body) => authorizedRequest(route(id, true), { method: 'POST', body }),
};
