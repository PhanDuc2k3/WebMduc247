import axios from "axios";

interface ChatRequest {
  message: string;
  userId?: string;
}

interface Product {
  _id: string;
  name: string;
  price?: number;
  salePrice?: number;
  images?: string[];
  rating?: number;
  reviewsCount?: number;
  soldCount?: number;
  brand?: string;
  category?: string;
  description?: string;
  store?: {
    name: string;
    logoUrl?: string;
  } | null;
}

interface ChatResponse {
  reply: string;
  products?: Product[];
  stores?: any[];
  orders?: any[];
}

const BASE_URL =
  // import.meta.env.VITE_CHATBOT_API_URL
  "http://localhost:5001/api/chatbot/chat"
  ;

const chatbotApi = {
  sendMessage: (data: ChatRequest) => axios.post<ChatResponse>(BASE_URL, data),
};

export default chatbotApi;
