import axios from "axios";

interface ChatRequest {
  message: string;
  userId?: string;
}

interface ChatResponse {
  reply: string;
}

const BASE_URL = import.meta.env.VITE_CHATBOT_API_URL;

const chatbotApi = {
  sendMessage: (data: ChatRequest) => axios.post<ChatResponse>(BASE_URL, data),
};

export default chatbotApi;
