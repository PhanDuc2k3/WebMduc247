import axiosClient from "./axiosClient";

interface ChatRequest {
  message: string;
}

interface ChatResponse {
  reply: string;
}

const chatbotApi = {
  // Gửi tin nhắn đến chatbot backend
  sendMessage: (data: ChatRequest) =>
    axiosClient.post<ChatResponse>("/api/chatbot", data),
};

export default chatbotApi;
