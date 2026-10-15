import axios, { type AxiosResponse, type InternalAxiosRequestConfig } from "axios";
import { USE_MOCK_DATA } from "../config/runtime";
import { mockChatResponse } from "../mocks/mockApi";

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
  stores?: unknown[];
  orders?: unknown[];
}

const BASE_URL =
  import.meta.env.VITE_CHATBOT_API_URL ||
  "http://localhost:5001/api/chatbot/chat";

const chatbotApi = {
  sendMessage: (data: ChatRequest) => USE_MOCK_DATA
    ? Promise.resolve({
        data: mockChatResponse(data.message),
        status: 200,
        statusText: "OK",
        headers: {},
        config: {} as InternalAxiosRequestConfig,
      } satisfies AxiosResponse<ChatResponse>)
    : axios.post<ChatResponse>(BASE_URL, data),
};

export default chatbotApi;
