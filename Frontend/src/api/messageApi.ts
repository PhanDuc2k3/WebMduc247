import axiosClient from "./axiosClient";

interface MessagePayload {
  conversationId: string;
  senderId: string;
  text: string;
}

interface ConversationPayload {
  senderId: string;
  receiverId: string;
}

const messageApi = {
  // Lấy danh sách conversation của 1 user
  getUserConversations: (userId: string) =>
    axiosClient.get(`/api/messages/conversations/${userId}`),

  // Tạo hoặc lấy conversation giữa 2 user
  getOrCreateConversation: (payload: ConversationPayload) =>
    axiosClient.post("/api/messages/conversation", payload),

  // Gửi tin nhắn
  sendMessage: (payload: MessagePayload) =>
    axiosClient.post("/api/messages/send", payload),

  // Lấy tất cả tin nhắn trong 1 conversation
  getMessages: (conversationId: string) =>
    axiosClient.get(`/api/messages/${conversationId}`),
};

export default messageApi;
