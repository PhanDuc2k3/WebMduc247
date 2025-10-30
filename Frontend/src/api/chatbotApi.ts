import axios from "axios";

interface ChatRequest {
  message: string;
  userId?: string; // thêm nếu có login
}

interface ChatResponse {
  reply: string;
}

const chatbotApi = {
  sendMessage: (data: ChatRequest) =>
    axios.post<ChatResponse>("http://localhost:5001/api/chatbot/chat", data),
};


export default chatbotApi;
