import axios, { type AxiosInstance } from "axios";

const axiosClient: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true, // ⚠️ thêm dòng này nếu dùng credentials
});

axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
    }
    console.log("🌍 API base URL:", import.meta.env.VITE_API_URL);

  return config;
});

export default axiosClient;
