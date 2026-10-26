import axiosClient from "./axiosClient";
const paymentApi = {
    // Tạo thanh toán MoMo
    createMoMoPayment: (data) => axiosClient.post("/api/payment/momo", data),
    // Tạo thanh toán VietQR
    createVietQRPayment: (data) => axiosClient.post("/api/payment/vietqr", data),
    // Đánh dấu đơn hàng đã thanh toán (từ redirect)
    markOrderPaid: (orderCode) => axiosClient.post(`/api/payment/mark-paid/${orderCode}`),
};
export default paymentApi;
