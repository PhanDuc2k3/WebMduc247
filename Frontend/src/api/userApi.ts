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
// Người dùng gửi yêu cầu mở cửa hàng (seller request)
requestSeller: (formData: FormData) => {
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

  // Xác thực email
  verifyEmail: (data: { email: string; verificationCode: string }) =>
    axiosClient.post("/api/users/verify-email", data),

  // Gửi lại mã xác thực
  resendVerificationCode: (data: { email: string }) =>
    axiosClient.post("/api/users/resend-verification", data),

  // Quên mật khẩu - gửi mã
  forgotPassword: (data: { email: string }) =>
    axiosClient.post("/api/users/forgot-password", data),

  // Xác thực mã reset
  verifyResetCode: (data: { email: string; resetCode: string }) =>
    axiosClient.post("/api/users/verify-reset-code", data),

  // Đặt lại mật khẩu
  resetPassword: (data: { email: string; resetCode: string; newPassword: string }) =>
    axiosClient.post("/api/users/reset-password", data),

  // Đổi mật khẩu
  changePassword: (data: { oldPassword: string; newPassword: string }) =>
    axiosClient.post("/api/users/change-password", data),
};

export default userApi;
