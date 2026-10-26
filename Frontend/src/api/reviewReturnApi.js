import { authorizedRequest, authorizedBlobRequest } from './identityApi';
const engagement = import.meta.env.VITE_ENGAGEMENT_API_URL || 'http://localhost:5105';
const order = import.meta.env.VITE_ORDER_API_URL || 'http://localhost:5103';
const url = (base, path) => `${base}/api/v2${path}`;
const req = (base, path, method = 'GET', body) => authorizedRequest(url(base, path), { method, ...(body === undefined ? {} : { body }) });
export const reviewApi = {
    list: async (productId, filters = {}) => {
        const query = new URLSearchParams(Object.entries(filters).map(([k, v]) => [k, String(v)]));
        const response = await fetch(url(engagement, `/products/${productId}/reviews?${query}`));
        const data = await response.json();
        if (!response.ok)
            throw new Error(data.message || 'Không thể tải đánh giá.');
        return data;
    },
    create: (input) => req(engagement, '/reviews', 'POST', input),
    mine: (productId) => req(engagement, `/reviews/mine?productId=${encodeURIComponent(productId)}`),
    sellerList: (storeId) => req(engagement, `/seller/stores/${storeId}/reviews`),
    edit: (id, input) => req(engagement, `/reviews/${id}`, 'PATCH', input),
    helpful: (id) => req(engagement, `/reviews/${id}/helpful`, 'POST', {}),
    reply: (id, content) => req(engagement, `/seller/reviews/${id}/reply`, 'POST', { content }),
    upload: (id, file) => authorizedRequest(url(engagement, `/reviews/${id}/images`), { method: 'POST', body: file, contentType: file.type }),
    imageUrl: (path) => url(engagement, path.replace(/^\/api\/v2/, '')),
};
export const returnApi = {
    buyerList: (shopOrderId) => req(order, `/returns${shopOrderId ? `?shopOrderId=${encodeURIComponent(shopOrderId)}` : ''}`),
    sellerList: (storeId, shopOrderId) => req(order, `/seller/stores/${storeId}/returns${shopOrderId ? `?shopOrderId=${encodeURIComponent(shopOrderId)}` : ''}`),
    detail: (id) => req(order, `/returns/${id}`),
    create: (shopOrderId, input) => req(order, `/orders/${shopOrderId}/returns`, 'POST', input),
    command: (id, action, expectedVersion, response, inspection) => req(order, `${['review', 'approve', 'reject', 'receive'].includes(action) ? '/seller' : ''}/returns/${id}/${action}`, 'POST', { expectedVersion, ...(response ? { response } : {}), ...inspection }),
    upload: (id, file) => authorizedRequest(url(order, `/returns/${id}/evidence`), { method: 'POST', body: file, contentType: file.type }),
    evidence: (id, imageId) => authorizedBlobRequest(url(order, `/returns/${id}/evidence/${imageId}`)),
};
