import axiosClient from "./axiosClient";
import { LoginRequest, LoginResponse } from "../types/user";

const userApi = {
  login: (data: LoginRequest) => axiosClient.post<LoginResponse>("/api/users/login", data),
};

export default userApi;
