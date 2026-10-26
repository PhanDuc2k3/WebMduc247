import { authorizedBlobRequest, authorizedRequest } from './identityApi';
const base = `${import.meta.env.VITE_ORDER_API_URL || 'http://localhost:5103'}/api/v2/admin/returns`;
export const adminReturnApi = {
    list(filters) {
        const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== undefined && value !== '')
            .map(([key, value]) => [key, String(value)]));
        return authorizedRequest(`${base}?${query}`);
    },
    detail: (id) => authorizedRequest(`${base}/${encodeURIComponent(id)}`),
    decide: (record, action, reason, basis) => authorizedRequest(`${base}/${encodeURIComponent(record.id)}/decisions`, { method: 'POST', body: { action, version: record.version, reason, ...basis } }),
    async evidence(id, evidenceId) {
        const access = await authorizedRequest(`${base}/${encodeURIComponent(id)}/evidence/${encodeURIComponent(evidenceId)}/access`, { method: 'POST', body: { reason: 'Xem ảnh chứng cứ phục vụ xử lý yêu cầu trả hàng.' } });
        const blob = await authorizedBlobRequest(new URL(access.url, base).href);
        return { blob, expiresAt: access.expiresAt };
    },
};
