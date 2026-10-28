import { identityAuthorizedRequest } from './identityApi';
const request = (path, method = 'GET', body) => identityAuthorizedRequest(path, { method, ...(body === undefined ? {} : { body }) });
export const userAdminApi = {
    workspace: (id) => request(`/admin/users/${id}/workspace`),
    impact: (id) => request(`/admin/users/${id}/impact`),
    contact: (id, body) => request(`/admin/users/${id}/contact`, 'POST', body),
    searchContact: (body) => request('/admin/users/contact-search', 'POST', body),
    moderate: (id, body) => request(`/admin/users/${id}/status`, 'PATCH', body),
    sessions: (id) => request(`/admin/users/${id}/sessions`),
    events: (id) => request(`/admin/users/${id}/events`),
    revoke: (id, body) => request(`/admin/users/${id}/revoke-sessions`, 'POST', body),
    resetPassword: (id, body) => request(`/admin/users/${id}/password-reset`, 'POST', body),
    teams: () => request('/admin/user-teams'),
    updateTeam: (team, body) => request(`/admin/user-teams/${team}`, 'PUT', body),
    assignTeam: (id, body) => request(`/admin/users/${id}/team`, 'PUT', body),
    notes: (id) => request(`/admin/users/${id}/notes`),
    addNote: (id, body) => request(`/admin/users/${id}/notes`, 'POST', body),
    signals: (id) => request(`/admin/users/${id}/signals`),
    workflows: (filters) => request(`/admin/user-workflows?${new URLSearchParams(filters)}`),
    workflow: (id) => request(`/admin/user-workflows/${id}`),
    workflowAction: (id, body) => request(`/admin/user-workflows/${id}/actions`, 'POST', body),
    artifact: (id, body) => request(`/admin/user-workflows/${id}/artifact`, 'POST', body),
};
const base = import.meta.env.VITE_IDENTITY_API_URL || 'http://localhost:5101';
async function supportRequest(path, method = 'GET', body, token) {
    const response = await fetch(`${base}/api/v2/account-support${path}`, { method, headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { 'X-Account-Support-Token': token } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok)
        throw new Error(data.message || 'Chưa thể xử lý yêu cầu hỗ trợ.');
    return data;
}
export const accountSupportApi = {
    challenge: (email, password) => supportRequest('/challenge', 'POST', { email, password }),
    verify: (challengeId, code) => supportRequest('/verify', 'POST', { challengeId, code }),
    state: (token) => supportRequest('/state', 'GET', undefined, token),
    create: (token, body) => supportRequest('/cases', 'POST', body, token),
    artifact: (token, id) => supportRequest(`/cases/${id}/artifact`, 'GET', undefined, token),
};
