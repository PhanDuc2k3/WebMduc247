import { authorizedRequest } from './identityApi';
const url = (kind) => kind === 'inventory' ? `${import.meta.env.VITE_CATALOG_API_URL || 'http://localhost:5102'}/api/v2/admin/inventory` :
    kind === 'chat-reports' ? `${import.meta.env.VITE_CHAT_API_URL || 'http://localhost:5106'}/api/v2/admin/chat-reports` :
        `${import.meta.env.VITE_PAYMENT_API_URL || 'http://localhost:5104'}/api/v2/admin/transactions/${kind}`;
export const adminOperationsApi = {
    list: (kind, query) => authorizedRequest(url(kind) + '?' + new URLSearchParams(query)),
    detail: (kind, id) => authorizedRequest(`${url(kind)}/${encodeURIComponent(id)}`),
    viewReport: (id, reason) => authorizedRequest(`${url('chat-reports')}/${encodeURIComponent(id)}/view`, { method: 'POST', body: { reason } }),
    recheck: (kind, id, body) => authorizedRequest(`${url(kind)}/${encodeURIComponent(id)}/recheck`, { method: 'POST', body }),
    decide: (id, body) => authorizedRequest(`${url('chat-reports')}/${encodeURIComponent(id)}/decision`, { method: 'POST', body }),
};
