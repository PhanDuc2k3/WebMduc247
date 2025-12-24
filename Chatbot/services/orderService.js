// services/orderService.js
const orderRepository = require("../repositories/OrderRepository");

class OrderService {
  /**
   * Lấy đơn hàng của user
   * @param {string} userId - ID của user
   * @returns {Promise<Array>} - Danh sách đơn hàng
   */
  async getUserOrders(userId) {
    return await orderRepository.findByUserId(userId, 5);
  }

  /**
   * Format đơn hàng thành text để đưa vào prompt
   * @param {Array} orders - Danh sách đơn hàng
   * @returns {string} - Text đã format
   */
  formatOrdersToText(orders) {
    if (!orders || orders.length === 0) {
      return "Bạn chưa có đơn hàng nào.";
    }

    const statusMap = {
      pending: "Chờ xác nhận",
      confirmed: "Đã xác nhận",
      packed: "Đã đóng gói",
      shipped: "Đang vận chuyển",
      delivered: "Đã giao hàng",
      received: "Đã nhận hàng",
      cancelled: "Đã hủy",
    };

    const paymentStatusMap = {
      pending: "Chưa thanh toán",
      paid: "Đã thanh toán",
      failed: "Thanh toán thất bại",
    };

    return (
      "Các đơn hàng gần đây của bạn:\n" +
      orders
        .map((o) => {
          const currentStatus =
            o.statusHistory?.[o.statusHistory.length - 1]?.status || "pending";
          const statusText = statusMap[currentStatus] || currentStatus;
          const paymentStatus =
            paymentStatusMap[o.paymentInfo?.status] || "N/A";
          return `• Mã: ${o.orderCode}\n  Trạng thái: ${statusText}\n  Thanh toán: ${paymentStatus}\n  Tổng tiền: ${o.total.toLocaleString("vi-VN")}đ\n  Ngày: ${new Date(o.createdAt).toLocaleString("vi-VN")}`;
        })
        .join("\n\n")
    );
  }
}

module.exports = new OrderService();

