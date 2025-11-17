const Order = require('../models/Order');

class PaymentRepository {
  // Tìm order theo orderCode
  async findByOrderCode(orderCode) {
    return await Order.findOne({ orderCode });
  }

  // Cập nhật payment info của order
  async updatePaymentInfo(orderCode, paymentInfo) {
    return await Order.findOneAndUpdate(
      { orderCode },
      { $set: { "paymentInfo": paymentInfo } },
      { new: true }
    );
  }
}

module.exports = new PaymentRepository();

