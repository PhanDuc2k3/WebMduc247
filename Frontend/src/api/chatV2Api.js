import { io } from 'socket.io-client';
import { authorizedRequest, identityApi } from './identityApi';
export const CHAT_BASE = import.meta.env.VITE_CHAT_API_URL || 'http://localhost:5106';
const endpoint = (path) => `${CHAT_BASE}/api/v2${path}`;
const logChatError = (method, path, error) => {
    if (import.meta.env.DEV)
        console.error('[Chat API] Request failed', {
            method, url: endpoint(path), status: error instanceof Error && 'status' in error ? error.status : undefined,
            message: error instanceof Error ? error.message : String(error), error,
        });
};
const req = async (path, method = 'GET', body) => {
    try {
        return await authorizedRequest(endpoint(path), { method, ...(body === undefined ? {} : { body }) });
    }
    catch (error) {
        logChatError(method, path, error);
        if (error instanceof TypeError)
            throw new Error('Không thể kết nối dịch vụ tin nhắn. Vui lòng thử lại.');
        throw error;
    }
};
export const chatV2Api = {
    conversations: () => req('/conversations'),
    create: (storeId) => req('/conversations', 'POST', { storeId }),
    messages: (id, cursor) => req(`/conversations/${id}/messages?limit=30${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`),
    send: (id, input) => req(`/conversations/${id}/messages`, 'POST', input),
    read: (id, messageId) => req(`/conversations/${id}/read`, 'POST', { messageId }),
    report: (id, reason, messageId) => req(`/conversations/${id}/reports`, 'POST', { reason, ...(messageId ? { messageId } : {}) }),
    upload: async (file) => {
        try {
            return await authorizedRequest(endpoint('/attachments'), { method: 'POST', body: file, contentType: file.type });
        }
        catch (error) {
            logChatError('POST', '/attachments', error);
            if (error instanceof TypeError)
                throw new Error('Không thể kết nối dịch vụ tin nhắn. Vui lòng thử lại.');
            throw error;
        }
    },
    attachmentUrl: (id) => req(`/attachments/${id}/url`),
    async socket() {
        await identityApi.me();
        const token = identityApi.getAccessToken();
        if (!token)
            throw new Error('Vui lòng đăng nhập để nhắn tin.');
        return io(CHAT_BASE, { auth: { token }, transports: ['websocket'], autoConnect: true });
    },
};
