// repositories/OrderRepository.js
const Order = require("../models/Order");

class OrderRepository {
  /**
   * Lấy danh sách đơn hàng của user, sắp xếp theo ngày tạo mới nhất
   * @param {string} userId - ID của user
   * @param {number} limit - Số lượng đơn hàng tối đa
   * @returns {Promise<Array>} - Danh sách đơn hàng
   */
  async findByUserId(userId, limit = 5) {
    return await Order.find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
  }
}

module.exports = new OrderRepository();

