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
  paymentMethod: "cod" | "momo" | "vnpay";
  voucherCode?: string;
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
getOrdersBySeller: () => {
  const sellerId = localStorage.getItem("userId"); // hoặc key bạn lưu
  return axiosClient.get("/api/orders/seller", { params: { sellerId } });
},

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
};

export default orderApi;
