import axiosClient from "./axiosClient";

const userApi = {
  login: (data: { email: string; password: string }) =>
    axiosClient.post("/api/users/login", data),

  register: (data: { email: string; password: string; fullName: string; phone?: string }) =>
    axiosClient.post("/api/users/register", data),

  getProfile: () => axiosClient.get("/api/users/profile"),

  updateProfile: (data: { fullName?: string; phone?: string }, avatarFile?: File) => {
    const formData = new FormData();
    if (data.fullName) formData.append("fullName", data.fullName);
    if (data.phone) formData.append("phone", data.phone);
    if (avatarFile) formData.append("avatar", avatarFile);
    return axiosClient.put("/api/users/profile", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  requestSeller: (
    data: Record<string, string>,
    files?: { logo?: File; banner?: File }
  ) => {
    const formData = new FormData();
    for (const key in data) {
      const value = data[key];
      if (value !== undefined && value !== null) formData.append(key, value);
    }
    if (files?.logo) formData.append("logo", files.logo);
    if (files?.banner) formData.append("banner", files.banner);
    return axiosClient.post("/api/users/seller-request", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  getMyOrders: () => axiosClient.get("/api/orders/my"),

  getAllSellerRequests: () => axiosClient.get("/api/users/seller-requests"),

  handleSellerRequest: (actionData: { userId: string; action: "approve" | "reject" }) =>
    axiosClient.post("/api/users/handle-seller-request", actionData),

  getAllUsers: () => axiosClient.get("/api/users"),

  deleteUser: (userId: string) => axiosClient.delete(`/api/users/${userId}`),

  updateUser: (userId: string, data: Record<string, any>) =>
    axiosClient.put(`/api/users/${userId}`, data),
};

export default userApi;
