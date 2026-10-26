import { io } from 'socket.io-client';
import { authorizedRequest, identityApi } from './identityApi';
const base = import.meta.env.VITE_ENGAGEMENT_API_URL || 'http://localhost:5105';
const req = (path, method = 'GET', body) => authorizedRequest(`${base}/api/v2${path}`, { method, ...(body === undefined ? {} : { body }) });
const notificationApi = {
    list: (filters = {}) => {
        const query = new URLSearchParams();
        for (const [key, value] of Object.entries(filters))
            if (value !== undefined && value !== '')
                query.set(key, String(value));
        return req(`/notifications?${query}`);
    },
    unread: () => req('/notifications/unread-count'),
    read: (id) => req(`/notifications/${id}/read`, 'PATCH', {}),
    readMany: (ids) => req('/notifications/read-many', 'POST', { ids }),
    readAll: () => req('/notifications/mark-all-read', 'POST', {}),
    remove: (id) => req(`/notifications/${id}`, 'DELETE'),
    preferences: () => req('/notifications/preferences'),
    setPreferences: (input) => req('/notifications/preferences', 'PATCH', input),
    async socket() {
        await identityApi.me();
        const token = identityApi.getAccessToken();
        if (!token)
            throw new Error('Vui lòng đăng nhập để xem thông báo.');
        return io(base, { auth: { token }, transports: ['websocket'] });
    },
};
export default notificationApi;
