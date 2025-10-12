import axiosClient from "./axiosClient";
import type { LoginRequest, LoginResponse, RegisterRequest, RegisterResponse } from "../types/user";

const userApi = {
  // Đăng nhập
  login: (data: LoginRequest) =>
    axiosClient.post<LoginResponse>("/api/users/login", data),

  // Đăng ký
  register: (data: RegisterRequest) =>
    axiosClient.post<RegisterResponse>("/api/users/register", data),
};

export default userApi;
