import { authorizedRequest } from './identityApi';
const base = import.meta.env.VITE_CATALOG_API_URL || 'http://localhost:5102';
const request = (path, options) => authorizedRequest(`${base}/api/v2${path}`, options);
export const taxonomyApi = {
    read: () => request('/admin/taxonomy'),
    preview: (body) => request('/admin/taxonomy/preview', { method: 'POST', body }),
    commit: (previewId) => request('/admin/taxonomy/commit', { method: 'POST', body: { previewId } }),
    imports: () => request('/admin/taxonomy/imports'),
    previewCsv: (body) => request('/admin/taxonomy/imports/preview', { method: 'POST', body }),
    commitCsv: (importId) => request('/admin/taxonomy/imports/commit', { method: 'POST', body: { importId } }),
    seller: (id) => request(`/seller/products/${id}/taxonomy`),
    schema: async (categoryId) => { const response = await fetch(`${base}/api/v2/categories/${categoryId}/attributes`); if (!response.ok)
        throw Error('Không tải được bộ thuộc tính.'); return response.json(); },
    brands: async () => { const response = await fetch(`${base}/api/v2/brands`); if (!response.ok)
        throw Error('Không tải được thương hiệu.'); return response.json(); },
    resolve: async (slug) => { const response = await fetch(`${base}/api/v2/categories/resolve?${new URLSearchParams({ slug })}`); if (!response.ok)
        throw Error('Danh mục không tồn tại hoặc đã ngừng hoạt động.'); return response.json(); },
};
