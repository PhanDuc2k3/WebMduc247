import { authorizedRequest } from './identityApi';
const base = import.meta.env.VITE_CATALOG_API_URL || 'http://localhost:5102';
const request = (path, options) => authorizedRequest(`${base}/api/v2${path}`, options);
export const productModerationApi = {
    reportReasons: async () => { const response = await fetch(`${base}/api/v2/product-report-reasons`); if (!response.ok)
        throw Error('Chưa tải được lý do báo cáo.'); return response.json(); },
    read: (id) => request(`/admin/products/${id}/moderation`),
    revision: (id, version) => request(`/admin/products/${id}/revisions/${version}`),
    command: (id, body) => request(`/admin/products/${id}/moderation`, { method: 'POST', body }),
    rules: () => request('/admin/product-rules'),
    savePolicy: (body) => request('/admin/product-review-policy', { method: 'POST', body }),
    saveRule: (body) => request('/admin/product-rules', { method: 'POST', body }),
    signals: (id) => request(`/admin/products/${id}/signals`),
    preview: (items, command) => request('/admin/products/bulk/preview', { method: 'POST', body: { items, command } }),
    createJob: (previewId) => request('/admin/products/bulk/jobs', { method: 'POST', body: { previewId } }),
    job: (id, run = false) => request(`/admin/products/bulk/jobs/${id}${run ? '/run' : ''}`, run ? { method: 'POST', body: {} } : undefined),
    sellerRead: (id) => request(`/seller/products/${id}/moderation`),
    sellerCommand: (id, body) => request(`/seller/products/${id}/moderation`, { method: 'POST', body }),
    report: (id, body) => request(`/products/${id}/reports`, { method: 'POST', body }),
};
