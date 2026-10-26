import { authorizedRequest, authorizedBlobRequest } from './identityApi';
const base = `${import.meta.env.VITE_ORDER_API_URL || 'http://localhost:5103'}/api/v2`;
const req = (path, body) => authorizedRequest(base + path, { ...(body === undefined ? {} : { method: 'POST', body }) });
export const caseResolutionApi = {
    detail: (id) => req(`/admin/cases/${id}/resolution`),
    message: (id, body) => req(`/admin/cases/${id}/messages`, body),
    escalate: (id, body) => req(`/admin/cases/${id}/escalations`, body),
    propose: (id, body) => req(`/admin/cases/${id}/decision-proposals`, body),
    review: (id, decisionId, body) => req(`/admin/cases/${id}/decisions/${decisionId}/review`, body),
    intervention: (id, body) => req(`/admin/cases/${id}/interventions`, body),
    fulfill: (id, body) => req(`/admin/cases/${id}/fulfillment`, body),
    close: (id, body) => req(`/admin/cases/${id}/close`, body),
    appealReview: (id, appealId, body) => req(`/admin/cases/${id}/appeals/${appealId}/review`, body),
    async evidence(id, evidenceId) { const access = await req(`/admin/cases/${id}/evidence/${evidenceId}/access`, { reason: 'Xem chứng cứ để đánh giá quyết định và xử lý hậu mãi.' }); return { blob: await authorizedBlobRequest(new URL(access.url, base).href), expiresAt: access.expiresAt }; },
    report: (filters) => req(`/admin/case-reports?${new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== ''))}`),
};
export const participantResolutionApi = {
    detail: (id) => req(`/cases/${id}/resolution`),
    statement: (id, body) => req(`/cases/${id}/statements`, body),
    appeal: (id, body) => req(`/cases/${id}/appeals`, body),
    upload: (id, file) => authorizedRequest(`${base}/cases/${id}/evidence`, { method: 'POST', body: file, contentType: file.type }),
    evidence: (id, evidenceId) => authorizedBlobRequest(`${base}/cases/${id}/evidence/${evidenceId}`),
};
