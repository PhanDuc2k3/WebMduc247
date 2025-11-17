const Wallet = require('../models/Wallet');
const Order = require('../models/Order');

class WalletRepository {
  // Tìm wallet theo userId
  async findByUserId(userId, populate = false) {
    let query = Wallet.findOne({ userId });
    if (populate) {
      query = query.populate('transactions');
    }
    return await query;
  }

  // Tạo wallet
  async create(walletData) {
    const wallet = new Wallet(walletData);
    return await wallet.save();
  }

  // Cập nhật wallet
  async update(walletId, updateData) {
    return await Wallet.findByIdAndUpdate(walletId, updateData, { new: true });
  }

  // Lưu wallet (nếu đã có)
  async save(wallet) {
    return await wallet.save();
  }

  // Tìm order theo orderCode và userId
  async findOrderByCodeAndUser(orderCode, userId) {
    return await Order.findOne({ orderCode, userId });
  }
}

module.exports = new WalletRepository();

