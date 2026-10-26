import axiosClient from "./axiosClient";
const voucherApi = {
    // Lấy danh sách voucher khả dụng
    getAvailableVouchers: () => axiosClient.get("/api/vouchers"),
    // Lấy tất cả voucher cho admin (bao gồm cả đã khóa)
    getAllVouchers: () => axiosClient.get("/api/vouchers/all"),
    // Lấy voucher của cửa hàng của seller
    getVouchersBySellerStore: () => axiosClient.get("/api/vouchers/my-store"),
    // Lấy danh sách voucher khả dụng cho checkout (dựa trên selectedItems)
    getAvailableVouchersForCheckout: (data) => axiosClient.post("/api/vouchers/checkout", data),
    // Tạo voucher mới
    createVoucher: (data) => axiosClient.post("/api/vouchers", data),
    // Cập nhật voucher
    updateVoucher: (id, data) => axiosClient.put(`/api/vouchers/${id}`, data),
    // Bật/tắt khóa voucher
    toggleVoucherStatus: (id) => axiosClient.put(`/api/vouchers/${id}/toggle-status`),
    // Xóa voucher
    deleteVoucher: (id) => axiosClient.delete(`/api/vouchers/${id}`),
    // Xem trước voucher: tính discount dựa trên tổng tiền đơn hàng
    previewVoucher: (data) => axiosClient.post("/api/vouchers/preview", data),
    // Áp dụng voucher vào đơn hàng
    applyVoucher: (data) => axiosClient.post("/api/vouchers/apply", data),
};
export default voucherApi;
