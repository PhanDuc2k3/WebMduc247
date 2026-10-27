import { identityAuthorizedRequest, authorizedRequest } from './identityApi';
const order = import.meta.env.VITE_ORDER_API_URL || 'http://localhost:5103';
export const adminAccessApi = {
    staff: () => identityAuthorizedRequest('/admin/staff'),
    preview: (id) => identityAuthorizedRequest(`/admin/staff/${encodeURIComponent(id)}/access`),
    replace: (id, assignments, version, reason, requestId) => identityAuthorizedRequest(`/admin/staff/${encodeURIComponent(id)}/access`, { method: 'PUT', body: { assignments, version, reason, requestId } }),
};
export const adminApprovalApi = {
    list: (operation) => authorizedRequest(`${order}/api/v2/admin/approvals?operation=${encodeURIComponent(operation)}`),
    create: (body) => authorizedRequest(`${order}/api/v2/admin/approvals`, { method: 'POST', body }),
    review: (id, version, action, reason) => authorizedRequest(`${order}/api/v2/admin/approvals/${id}/review`, { method: 'POST', body: { version, action, reason } }),
    policies: () => authorizedRequest(`${order}/api/v2/admin/approval-policies`),
    updatePolicy: (operation, version, thresholdMinor, reason) => authorizedRequest(`${order}/api/v2/admin/approval-policies/${operation}`, { method: 'PUT', body: { version, thresholdMinor, reason } }),
};
