import axiosClient from "./axiosClient";
const userApi = {
    // Đăng ký
    register: (data) => axiosClient.post("/api/users/register", data),
    // Đăng nhập
    login: (data) => axiosClient.post("/api/users/login", data),
    // Refresh access token
    refreshToken: (data) => axiosClient.post("/api/users/refresh-token", data),
    // Lấy thông tin cá nhân
    getProfile: () => axiosClient.get("/api/users/profile"),
    // Cập nhật hồ sơ người dùng (có thể kèm avatar)
    updateProfile: (data, avatarFile) => {
        const formData = new FormData();
        if (data.fullName)
            formData.append("fullName", data.fullName);
        if (data.phone)
            formData.append("phone", data.phone);
        if (avatarFile)
            formData.append("avatar", avatarFile);
        return axiosClient.put("/api/users/profile", formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });
    },
    // Người dùng gửi yêu cầu mở cửa hàng (seller request)
    // Người dùng gửi yêu cầu mở cửa hàng (seller request)
    requestSeller: (formData) => {
        return axiosClient.post("/api/users/seller-request", formData, {
            headers: { "Content-Type": "multipart/form-data" },
        });
    },
    // Admin: lấy danh sách tất cả yêu cầu mở cửa hàng
    getAllSellerRequests: () => axiosClient.get("/api/users/seller-requests"),
    // Admin: phê duyệt hoặc từ chối yêu cầu mở cửa hàng
    handleSellerRequest: (data) => axiosClient.post("/api/users/seller-requests/handle", data),
    // Admin: lấy danh sách tất cả người dùng
    getAllUsers: () => axiosClient.get("/api/users/all"),
    // Admin: xóa người dùng theo ID
    deleteUser: (userId) => axiosClient.delete(`/api/users/${userId}`),
    // Admin: cập nhật thông tin người dùng theo ID
    updateUser: (userId, data) => axiosClient.put(`/api/users/${userId}`, data),
    // Admin: khóa tài khoản người dùng
    banUser: (userId) => axiosClient.put(`/api/users/${userId}`, { status: "banned" }),
    // Admin: gỡ khóa tài khoản người dùng
    unbanUser: (userId) => axiosClient.put(`/api/users/${userId}`, { status: "active" }),
    // Xác thực email
    verifyEmail: (data) => axiosClient.post("/api/users/verify-email", data),
    // Gửi lại mã xác thực
    resendVerificationCode: (data) => axiosClient.post("/api/users/resend-verification", data),
    // Quên mật khẩu - gửi mã
    forgotPassword: (data) => axiosClient.post("/api/users/forgot-password", data),
    // Xác thực mã reset
    verifyResetCode: (data) => axiosClient.post("/api/users/verify-reset-code", data),
    // Đặt lại mật khẩu
    resetPassword: (data) => axiosClient.post("/api/users/reset-password", data),
    // Đổi mật khẩu
    changePassword: (data) => axiosClient.post("/api/users/change-password", data),
    // Cập nhật email notifications
    updateEmailNotifications: (data) => axiosClient.put("/api/users/email-notifications", data),
};
export default userApi;
