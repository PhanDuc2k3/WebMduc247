import { authorizedRequest } from './identityApi';
const base = import.meta.env.VITE_CATALOG_API_URL || 'http://localhost:5102';
const admin = (path, options) => authorizedRequest(`${base}/api/v2/admin/storefront${path}`, options);
export const storefrontApi = {
    async publicConfig() { const response = await fetch(`${base}/api/v2/storefront`, { cache: 'no-store' }); if (!response.ok)
        throw Error('Chưa tải được bố cục.'); return response.json(); },
    read: () => admin(''),
    save: (config, version, publish, reason, requestId) => admin(publish ? '/publish' : '/draft', { method: 'POST', body: { config, version, reason, requestId } }),
    preview: () => admin('/preview'),
    choices: (resource, q) => admin(`/choices?${new URLSearchParams({ resource, q })}`),
    createCategory: (body) => admin('/categories', { method: 'POST', body }),
};
export function notifyStorefrontPublished() {
    window.dispatchEvent(new Event('storefrontPublished'));
    try {
        localStorage.setItem('mduc247.storefrontVersion', String(Date.now()));
    }
    catch { /* Publication still succeeds if web storage is unavailable. */ }
}
