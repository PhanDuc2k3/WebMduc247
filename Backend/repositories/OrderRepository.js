const Order = require('../models/Order');

class OrderRepository {
  // Tạo order
  async create(orderData) {
    const order = new Order(orderData);
    return await order.save();
  }

  // Tìm order theo ID
  async findById(orderId, populate = false) {
    let query = Order.findById(orderId);
    if (populate) {
      query = query.populate("userId", "fullName email phone");
    }
    return await query;
  }

  // Tìm order theo code
  async findByCode(orderCode, populate = false) {
    let query = Order.findOne({ orderCode });
    if (populate) {
      query = query.populate("userId", "fullName email phone");
    }
    return await query;
  }

  // Tìm orders theo userId
  async findByUserId(userId) {
    return await Order.find({ userId }).sort({ createdAt: -1 });
  }

  // Tìm tất cả orders
  async findAll(populate = false) {
    let query = Order.find();
    if (populate) {
      query = query.populate("userId", "fullName email");
    }
    return await query;
  }

  // Tìm orders theo storeId (trong items)
  async findByStoreId(storeId, populate = false) {
    let query = Order.find({ "items.storeId": storeId }).sort({ createdAt: -1 });
    if (populate) {
      query = query.populate("userId", "fullName email phone");
    }
    return await query;
  }

  // Cập nhật order
  async update(orderId, updateData) {
    return await Order.findByIdAndUpdate(orderId, updateData, { new: true });
  }

  // Cập nhật status
  async updateStatus(orderId, statusHistory) {
    return await Order.findByIdAndUpdate(
      orderId,
      { $push: { statusHistory } },
      { new: true }
    );
  }

  // Cập nhật payment info
  async updatePaymentInfo(orderId, paymentInfo) {
    return await Order.findByIdAndUpdate(
      orderId,
      { 
        $set: { "paymentInfo": paymentInfo },
        $push: { statusHistory: { status: "paid", note: "Thanh toán online thành công", timestamp: new Date() } }
      },
      { new: true }
    );
  }
}

module.exports = new OrderRepository();

