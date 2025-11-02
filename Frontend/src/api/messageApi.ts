import axiosClient from "./axiosClient";

interface MessagePayload {
  conversationId: string;
  senderId: string;
  text?: string;
}

const messageApi = {
  sendMessage: (payload: MessagePayload | FormData) => {
    if (payload instanceof FormData) {
      // FormData → upload file + text, override Content-Type
      return axiosClient.post("/api/messages/send", payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    }
    // JSON → chỉ gửi text
    return axiosClient.post("/api/messages/send", payload);
  },

  getMessages: (conversationId: string) =>
    axiosClient.get(`/api/messages/${conversationId}`),

  getUserConversations: (userId: string) =>
    axiosClient.get(`/api/messages/conversations/${userId}`),

  getOrCreateConversation: (payload: { senderId: string; receiverId: string }) =>
    axiosClient.post("/api/messages/conversation", payload),

  markAsRead: (conversationId: string, userId: string) =>
    axiosClient.post(`/api/messages/mark-read/${conversationId}`, { userId }),
};

export default messageApi;
