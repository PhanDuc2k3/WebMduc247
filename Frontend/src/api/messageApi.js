import axiosClient from "./axiosClient";
const messageApi = {
    sendMessage: (payload) => {
        if (payload instanceof FormData) {
            // FormData → upload file + text, override Content-Type
            return axiosClient.post("/api/messages/send", payload, {
                headers: { "Content-Type": "multipart/form-data" },
            });
        }
        // JSON → chỉ gửi text
        return axiosClient.post("/api/messages/send", payload);
    },
    getMessages: (conversationId) => axiosClient.get(`/api/messages/${conversationId}`),
    getUserConversations: (userId) => axiosClient.get(`/api/messages/conversations/${userId}`),
    getOrCreateConversation: (payload) => axiosClient.post("/api/messages/conversation", payload),
    markAsRead: (conversationId, userId) => axiosClient.post(`/api/messages/mark-read/${conversationId}`, { userId }),
};
export default messageApi;
