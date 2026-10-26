import axiosClient from "./axiosClient";
const orderApi = {
    // Tạo đơn hàng
    createOrder: (data) => axiosClient.post("/api/orders", data),
    // Lấy đơn hàng của chính user
    getMyOrders: () => axiosClient.get("/api/orders/my"),
    // Lấy đơn hàng theo người bán
    getOrdersBySeller: () => axiosClient.get("/api/orders/seller"),
    // Lấy đơn hàng theo code
    getOrderByCode: (orderCode) => axiosClient.get(`/api/orders/by-code/${orderCode}`),
    // Đánh dấu đơn đã thanh toán
    markOrderPaid: (orderId) => axiosClient.post(`/api/orders/orders/${orderId}/pay`),
    // Lấy tất cả đơn hàng (admin)
    getAllOrders: () => axiosClient.get("/api/orders"),
    // Cập nhật trạng thái đơn hàng
    updateOrderStatus: (orderId, data) => axiosClient.put(`/api/orders/${orderId}/status`, data),
    // Lấy chi tiết đơn hàng theo ID
    getOrderById: (orderId) => axiosClient.get(`/api/orders/${orderId}`),
    // Xóa đơn hàng (admin)
    deleteOrder: (orderId) => axiosClient.delete(`/api/orders/${orderId}`),
    // Cập nhật đơn hàng (admin)
    updateOrder: (orderId, data) => axiosClient.put(`/api/orders/${orderId}`, data),
    // Cập nhật phương thức thanh toán
    updatePaymentMethod: (orderId, paymentMethod) => axiosClient.put(`/api/orders/${orderId}/payment-method`, { paymentMethod }),
    // Buyer xác nhận đã nhận hàng
    confirmDelivery: (orderId) => axiosClient.post(`/api/orders/${orderId}/confirm-delivery`),
    // Buyer yêu cầu trả lại hàng
    requestReturn: (orderId, reason) => axiosClient.post(`/api/orders/${orderId}/request-return`, { reason }),
    // Seller xác nhận đã thu hồi sản phẩm
    confirmReturnReceived: (orderId) => axiosClient.post(`/api/orders/${orderId}/confirm-return-received`),
    // Seller từ chối yêu cầu trả lại hàng
    rejectReturn: (orderId, reason) => axiosClient.post(`/api/orders/${orderId}/reject-return`, { reason }),
    // Admin/Seller xử lý yêu cầu trả lại hàng
    processReturn: (orderId, action, note) => axiosClient.post(`/api/orders/${orderId}/process-return`, { action, note }),
    // Buyer hủy đơn hàng
    cancelOrder: (orderId, reason) => axiosClient.post(`/api/orders/${orderId}/cancel`, { reason }),
};
export default orderApi;
