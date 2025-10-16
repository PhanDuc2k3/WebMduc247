import axiosClient from "./axiosClient";

const userApi = {
  // Đăng ký
  register: (data: { email: string; password: string; fullName: string; phone?: string }) =>
    axiosClient.post("/api/users/register", data),

  // Đăng nhập
  login: (data: { email: string; password: string }) =>
    axiosClient.post("/api/users/login", data),

  // Lấy thông tin cá nhân
  getProfile: () => axiosClient.get("/api/users/profile"),

  // Cập nhật hồ sơ người dùng (có thể kèm avatar)
  updateProfile: (data: { fullName?: string; phone?: string }, avatarFile?: File) => {
    const formData = new FormData();
    if (data.fullName) formData.append("fullName", data.fullName);
    if (data.phone) formData.append("phone", data.phone);
    if (avatarFile) formData.append("avatar", avatarFile);

    return axiosClient.put("/api/users/profile", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  // Người dùng gửi yêu cầu mở cửa hàng (seller request)
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

  // Admin: lấy danh sách tất cả yêu cầu mở cửa hàng
  getAllSellerRequests: () => axiosClient.get("/api/users/seller-requests"),

  // Admin: phê duyệt hoặc từ chối yêu cầu mở cửa hàng
  handleSellerRequest: (data: { userId: string; action: "approve" | "reject" }) =>
    axiosClient.post("/api/users/seller-requests/handle", data),

  // Admin: lấy danh sách tất cả người dùng
  getAllUsers: () => axiosClient.get("/api/users/all"),

  // Admin: xóa người dùng theo ID
  deleteUser: (userId: string) => axiosClient.delete(`/api/users/${userId}`),

  // Admin: cập nhật thông tin người dùng theo ID
  updateUser: (userId: string, data: Record<string, any>) =>
    axiosClient.put(`/api/users/${userId}`, data),
};

export default userApi;
