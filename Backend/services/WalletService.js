const walletRepository = require('../repositories/WalletRepository');
const User = require('../models/Users');
const { sendWithdrawalEmail, sendPaymentEmail } = require('../utils/emailService');

class WalletService {
  // Lấy wallet của user
  async getWallet(userId) {
    let wallet = await walletRepository.findByUserId(userId, true);
    
    if (!wallet) {
      wallet = await walletRepository.create({ userId, balance: 0, transactions: [] });
    }

    return {
      _id: wallet._id,
      userId: wallet.userId,
      balance: wallet.balance,
      transactionCount: wallet.transactions.length
    };
  }

  // Lấy transactions
  async getTransactions(userId, page = 1, limit = 20) {
    const wallet = await walletRepository.findByUserId(userId);
    if (!wallet) {
      return { transactions: [], total: 0, page: 1, totalPages: 0 };
    }

    const skip = (page - 1) * limit;
    const transactions = wallet.transactions
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(skip, skip + parseInt(limit));

    return {
      transactions,
      total: wallet.transactions.length,
      page: parseInt(page),
      totalPages: Math.ceil(wallet.transactions.length / limit)
    };
  }

  // Nạp tiền
  async deposit(userId, amount, method, orderCode, paymentId, description) {
    if (!amount || amount <= 0) {
      throw new Error('Số tiền không hợp lệ');
    }

    let wallet = await walletRepository.findByUserId(userId);
    if (!wallet) {
      wallet = await walletRepository.create({ userId, balance: 0, transactions: [] });
    }

    const transaction = {
      type: 'deposit',
      amount: parseFloat(amount),
      method: method || 'system',
      orderCode: orderCode || '',
      description: description || `Nạp tiền vào ví`,
      status: 'completed',
      paymentId: paymentId || ''
    };

    wallet.transactions.push(transaction);
    wallet.balance += parseFloat(amount);
    await walletRepository.save(wallet);

    return {
      balance: wallet.balance,
      transaction: transaction
    };
  }

  // Gửi mã xác thực rút tiền
  async sendWithdrawalCode(userId, amount, bankName, accountNumber) {
    if (!amount || amount <= 0) {
      throw new Error('Số tiền không hợp lệ');
    }

    if (!bankName || !accountNumber) {
      throw new Error('Vui lòng nhập đầy đủ thông tin ngân hàng');
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new Error('Không tìm thấy người dùng');
    }

    const wallet = await walletRepository.findByUserId(userId);
    if (!wallet) {
      throw new Error('Ví không tồn tại');
    }

    if (wallet.balance < amount) {
      throw new Error('Số dư không đủ');
    }

    const withdrawalCode = Math.floor(100000 + Math.random() * 900000).toString();
    const withdrawalCodeExpires = new Date(Date.now() + 15 * 60 * 1000);

    user.withdrawalCode = withdrawalCode;
    user.withdrawalCodeExpires = withdrawalCodeExpires;
    await user.save();

    await sendWithdrawalEmail(
      user.email,
      withdrawalCode,
      user.fullName,
      amount,
      bankName,
      accountNumber
    );

    return { message: 'Đã gửi mã xác thực đến email của bạn. Vui lòng kiểm tra email và nhập mã để hoàn tất rút tiền.' };
  }

  // Rút tiền
  async withdraw(userId, amount, bankName, accountNumber, emailCode) {
    if (!amount || amount <= 0) {
      throw new Error('Số tiền không hợp lệ');
    }

    if (!bankName || !accountNumber) {
      throw new Error('Vui lòng nhập đầy đủ thông tin ngân hàng');
    }

    if (!emailCode) {
      throw new Error('Vui lòng nhập mã xác thực email');
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new Error('Không tìm thấy người dùng');
    }

    if (!user.withdrawalCode || user.withdrawalCode !== emailCode) {
      throw new Error('Mã xác thực email không đúng');
    }

    if (!user.withdrawalCodeExpires || new Date() > user.withdrawalCodeExpires) {
      throw new Error('Mã xác thực đã hết hạn. Vui lòng yêu cầu mã mới');
    }

    const wallet = await walletRepository.findByUserId(userId);
    if (!wallet) {
      throw new Error('Ví không tồn tại');
    }

    if (wallet.balance < amount) {
      throw new Error('Số dư không đủ');
    }

    const description = `Rút tiền về ${bankName} - ${accountNumber}`;

    const transaction = {
      type: 'withdraw',
      amount: parseFloat(amount),
      method: 'wallet',
      description: description,
      status: 'pending'
    };

    wallet.transactions.push(transaction);
    wallet.balance -= parseFloat(amount);
    await walletRepository.save(wallet);

    user.withdrawalCode = null;
    user.withdrawalCodeExpires = null;
    await user.save();

    return {
      balance: wallet.balance,
      transaction: transaction
    };
  }

  // Gửi mã xác thực thanh toán bằng ví
  async sendPaymentCode(userId, orderCode, amount) {
    if (!orderCode || !amount) {
      throw new Error('Thiếu thông tin đơn hàng');
    }

    const order = await walletRepository.findOrderByCodeAndUser(orderCode, userId);
    if (!order) {
      throw new Error('Đơn hàng không tồn tại');
    }

    if (order.paymentInfo.status === 'paid') {
      throw new Error('Đơn hàng đã được thanh toán');
    }

    const wallet = await walletRepository.findByUserId(userId);
    if (!wallet || wallet.balance < amount) {
      throw new Error('Số dư ví không đủ');
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new Error('Không tìm thấy người dùng');
    }

    const paymentCode = Math.floor(100000 + Math.random() * 900000).toString();
    const paymentCodeExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 phút

    user.paymentCode = paymentCode;
    user.paymentCodeExpires = paymentCodeExpires;
    await user.save();

    await sendPaymentEmail(
      user.email,
      paymentCode,
      user.fullName,
      orderCode,
      amount
    );

    return { message: 'Đã gửi mã xác thực đến email của bạn. Vui lòng kiểm tra email và nhập mã để hoàn tất thanh toán.' };
  }

  // Thanh toán bằng ví
  async payWithWallet(userId, orderCode, amount, emailCode) {
    if (!orderCode || !amount) {
      throw new Error('Thiếu thông tin đơn hàng');
    }

    if (!emailCode) {
      throw new Error('Vui lòng nhập mã xác thực từ email');
    }

    const order = await walletRepository.findOrderByCodeAndUser(orderCode, userId);
    if (!order) {
      throw new Error('Đơn hàng không tồn tại');
    }

    if (order.paymentInfo.status === 'paid') {
      throw new Error('Đơn hàng đã được thanh toán');
    }

    const wallet = await walletRepository.findByUserId(userId);
    if (!wallet || wallet.balance < amount) {
      throw new Error('Số dư ví không đủ');
    }

    // Xác thực mã email
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('Không tìm thấy người dùng');
    }

    if (!user.paymentCode || user.paymentCode !== emailCode) {
      throw new Error('Mã xác thực không đúng');
    }

    if (!user.paymentCodeExpires || new Date() > user.paymentCodeExpires) {
      throw new Error('Mã xác thực đã hết hạn. Vui lòng yêu cầu mã mới');
    }

    // Xóa mã sau khi xác thực thành công
    user.paymentCode = null;
    user.paymentCodeExpires = null;
    await user.save();

    const transaction = {
      type: 'payment',
      amount: parseFloat(amount),
      method: 'wallet',
      orderCode: orderCode,
      description: `Thanh toán đơn hàng ${orderCode}`,
      status: 'completed'
    };

    wallet.transactions.push(transaction);
    wallet.balance -= parseFloat(amount);
    await walletRepository.save(wallet);

    const lastTransaction = wallet.transactions[wallet.transactions.length - 1];
    const transactionId = lastTransaction._id ? lastTransaction._id.toString() : `WALLET-${Date.now()}`;

    order.paymentInfo.status = 'paid';
    order.paymentInfo.method = 'WALLET';
    order.paymentInfo.paymentId = transactionId;
    await order.save();

    // Trừ stock khi thanh toán thành công
    const orderService = require('./OrderService');
    try {
      await orderService.deductStockOnPayment(order.orderCode);
    } catch (stockError) {
      console.error(`[WalletService] ❌ Lỗi khi trừ stock:`, stockError);
      // Rollback payment nếu không đủ stock
      order.paymentInfo.status = 'pending';
      await order.save();
      // Hoàn lại tiền cho người dùng
      wallet.balance += parseFloat(amount);
      wallet.transactions.pop(); // Xóa transaction vừa thêm
      await walletRepository.save(wallet);
      throw new Error(stockError.message || "Không đủ số lượng sản phẩm trong kho. Đã hoàn lại tiền vào ví.");
    }

    // Chuyển tiền vào ví chủ cửa hàng
    const { transferToStoreWallets } = require("../utils/walletService");
    try {
      await transferToStoreWallets(order.orderCode, 'WALLET', transactionId);
      console.log(`[WalletService] ✅ Đã chuyển tiền vào ví chủ cửa hàng cho order ${order.orderCode}`);
    } catch (walletError) {
      console.error(`[WalletService] ❌ Lỗi chuyển tiền vào ví:`, walletError);
    }

    return {
      balance: wallet.balance,
      order: {
        orderCode: order.orderCode,
        paymentStatus: order.paymentInfo.status
      }
    };
  }
}

module.exports = new WalletService();

