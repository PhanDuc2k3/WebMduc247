import axios, { type AxiosInstance } from "axios";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL;
  // "http://localhost:5000";

const axiosClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Log URL chỉ trong môi trường dev
  if (import.meta.env.DEV) {
    console.log(" API base URL:", API_BASE_URL);
  }

  return config;
});

export default axiosClient;
