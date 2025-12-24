import axiosClient from "./axiosClient";

export interface CreateOrderData {
  items: {
    productId: string;
    quantity: number;
    variation?: { color?: string; size?: string; additionalPrice?: number };
  }[];
  shippingAddress: {
    fullName: string;
    phone: string;
    address: string;
  };
  paymentMethod: "cod" | "momo" | "vietqr" | "wallet";
  shippingFee?: number; // Phí vận chuyển
  voucherCode?: string; // Giữ lại cho tương thích ngược
  productVoucherCode?: string; // Voucher giảm giá sản phẩm
  freeshipVoucherCode?: string; // Voucher miễn phí ship
}


interface UpdateStatusData {
  status: string; // ví dụ: "pending", "shipped", "completed"
}

const orderApi = {
  // Tạo đơn hàng
  createOrder: (data: CreateOrderData) => axiosClient.post("/api/orders", data),

  // Lấy đơn hàng của chính user
  getMyOrders: () => axiosClient.get("/api/orders/my"),

  // Lấy đơn hàng theo người bán
  getOrdersBySeller: () => axiosClient.get("/api/orders/seller"),


  // Lấy đơn hàng theo code
  getOrderByCode: (orderCode: string) => axiosClient.get(`/api/orders/by-code/${orderCode}`),

  // Đánh dấu đơn đã thanh toán
  markOrderPaid: (orderId: string) => axiosClient.post(`/api/orders/orders/${orderId}/pay`),

  // Lấy tất cả đơn hàng (admin)
  getAllOrders: () => axiosClient.get("/api/orders"),

  // Cập nhật trạng thái đơn hàng
  updateOrderStatus: (orderId: string, data: UpdateStatusData) =>
    axiosClient.put(`/api/orders/${orderId}/status`, data),

  // Lấy chi tiết đơn hàng theo ID
  getOrderById: (orderId: string) => axiosClient.get(`/api/orders/${orderId}`),

  // Xóa đơn hàng (admin)
  deleteOrder: (orderId: string) => axiosClient.delete(`/api/orders/${orderId}`),

  // Cập nhật đơn hàng (admin)
  updateOrder: (orderId: string, data: any) => axiosClient.put(`/api/orders/${orderId}`, data),

  // Cập nhật phương thức thanh toán
  updatePaymentMethod: (orderId: string, paymentMethod: "COD" | "MOMO" | "VIETQR" | "WALLET") =>
    axiosClient.put(`/api/orders/${orderId}/payment-method`, { paymentMethod }),

  // Buyer xác nhận đã nhận hàng
  confirmDelivery: (orderId: string) => axiosClient.post(`/api/orders/${orderId}/confirm-delivery`),

  // Buyer yêu cầu trả lại hàng
  requestReturn: (orderId: string, reason: string) => 
    axiosClient.post(`/api/orders/${orderId}/request-return`, { reason }),

  // Seller xác nhận đã thu hồi sản phẩm
  confirmReturnReceived: (orderId: string) =>
    axiosClient.post(`/api/orders/${orderId}/confirm-return-received`),

  // Seller từ chối yêu cầu trả lại hàng
  rejectReturn: (orderId: string, reason?: string) =>
    axiosClient.post(`/api/orders/${orderId}/reject-return`, { reason }),

  // Admin/Seller xử lý yêu cầu trả lại hàng
  processReturn: (orderId: string, action: "approved" | "rejected", note?: string) =>
    axiosClient.post(`/api/orders/${orderId}/process-return`, { action, note }),

  // Buyer hủy đơn hàng
  cancelOrder: (orderId: string, reason?: string) =>
    axiosClient.post(`/api/orders/${orderId}/cancel`, { reason }),
};

export default orderApi;
