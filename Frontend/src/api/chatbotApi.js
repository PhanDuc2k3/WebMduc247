import { identityApi } from './identityApi';
import { CHAT_BASE } from './chatV2Api';
async function bearer() {
    await identityApi.me().catch(() => null);
    return identityApi.getAccessToken();
}
async function request(method, path, body, sessionToken) {
    const token = await bearer();
    const response = await fetch(`${CHAT_BASE}/api/v2${path}`, { method,
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(sessionToken ? { 'X-Bot-Session-Token': sessionToken } : {}) },
        ...(body ? { body: JSON.stringify(body) } : {}) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok)
        throw new Error(data.message || 'Chatbot tạm thời chưa sẵn sàng.');
    return data;
}
const chatbotApi = {
    startSession: () => request('POST', '/chatbot/sessions', {}),
    history: (session) => request('GET', `/chatbot/sessions/${session.sessionId}/messages?limit=50`, undefined, session.sessionToken),
    deleteSession: (session) => request('DELETE', `/chatbot/sessions/${session.sessionId}`, undefined, session.sessionToken),
    sendMessage: (session, text, clientMessageId, orderGroupId, storeSlug) => request('POST', `/chatbot/sessions/${session.sessionId}/messages`, { text, clientMessageId, ...(orderGroupId ? { orderGroupId } : {}), ...(storeSlug ? { storeSlug } : {}) }, session.sessionToken),
};
export default chatbotApi;
