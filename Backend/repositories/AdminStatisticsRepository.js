const User = require('../models/Users');
const Order = require('../models/Order');
const Store = require('../models/Store');
const Product = require('../models/Product');
const Voucher = require('../models/Voucher');

class AdminStatisticsRepository {
  // Đếm documents
  async countUsers() {
    return await User.countDocuments();
  }

  async countOrders() {
    return await Order.countDocuments();
  }

  async countStores() {
    return await Store.countDocuments();
  }

  async countProducts() {
    return await Product.countDocuments();
  }

  async countVouchers() {
    return await Voucher.countDocuments();
  }

  // Đếm documents theo ngày
  async countUsersByDate(date, nextDate) {
    return await User.countDocuments({
      createdAt: { $gte: date, $lt: nextDate },
    });
  }

  async countOrdersByDate(date, nextDate) {
    return await Order.countDocuments({
      createdAt: { $gte: date, $lt: nextDate },
    });
  }

  async countStoresByDate(date, nextDate) {
    return await Store.countDocuments({
      createdAt: { $gte: date, $lt: nextDate },
    });
  }

  async countProductsByDate(date, nextDate) {
    return await Product.countDocuments({
      createdAt: { $gte: date, $lt: nextDate },
    });
  }

  async countVouchersByDate(date, nextDate) {
    return await Voucher.countDocuments({
      createdAt: { $gte: date, $lt: nextDate },
    });
  }
}

module.exports = new AdminStatisticsRepository();

