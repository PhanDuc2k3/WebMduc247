const Wallet = require('../models/Wallet');
const Order = require('../models/Order');
const User = require('../models/Users');

// Lấy thông tin ví của user
exports.getWallet = async (req, res) => {
  try {
    const userId = req.user.userId;

    let wallet = await Wallet.findOne({ userId }).populate('transactions');
    
    if (!wallet) {
      // Tạo ví mới nếu chưa có
      wallet = new Wallet({ userId, balance: 0, transactions: [] });
      await wallet.save();
    }

    res.json({
      wallet: {
        _id: wallet._id,
        userId: wallet.userId,
        balance: wallet.balance,
        transactionCount: wallet.transactions.length
      }
    });
  } catch (err) {
    console.error('Lỗi getWallet:', err);
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

// Lấy lịch sử giao dịch
exports.getTransactions = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 20 } = req.query;

    const wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      return res.json({ transactions: [], total: 0, page: 1, totalPages: 0 });
    }

    const skip = (page - 1) * limit;
    const transactions = wallet.transactions
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(skip, skip + parseInt(limit));

    res.json({
      transactions,
      total: wallet.transactions.length,
      page: parseInt(page),
      totalPages: Math.ceil(wallet.transactions.length / limit)
    });
  } catch (err) {
    console.error('Lỗi getTransactions:', err);
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

// Nạp tiền vào ví
exports.deposit = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { amount, method, orderCode, paymentId, description } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Số tiền không hợp lệ' });
    }

    let wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      wallet = new Wallet({ userId, balance: 0, transactions: [] });
    }

    // Thêm transaction deposit
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
    await wallet.save();

    res.json({
      message: 'Nạp tiền thành công',
      wallet: {
        balance: wallet.balance,
        transaction: transaction
      }
    });
  } catch (err) {
    console.error('Lỗi deposit:', err);
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

// Gửi mã xác thực email cho rút tiền
exports.sendWithdrawalCode = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { amount, bankName, accountNumber } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Số tiền không hợp lệ' });
    }

    if (!bankName || !accountNumber) {
      return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin ngân hàng' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    const wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      return res.status(404).json({ message: 'Ví không tồn tại' });
    }

    if (wallet.balance < amount) {
      return res.status(400).json({ message: 'Số dư không đủ' });
    }

    // Tạo mã xác thực 6 chữ số
    const withdrawalCode = Math.floor(100000 + Math.random() * 900000).toString();
    const withdrawalCodeExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 phút

    // Lưu mã vào user
    user.withdrawalCode = withdrawalCode;
    user.withdrawalCodeExpires = withdrawalCodeExpires;
    await user.save();

    // Gửi email
    const { sendWithdrawalEmail } = require('../utils/emailService');
    await sendWithdrawalEmail(
      user.email,
      withdrawalCode,
      user.fullName,
      amount,
      bankName,
      accountNumber
    );

    res.status(200).json({
      message: 'Đã gửi mã xác thực đến email của bạn. Vui lòng kiểm tra email và nhập mã để hoàn tất rút tiền.'
    });
  } catch (err) {
    console.error('Lỗi sendWithdrawalCode:', err);
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

// Rút tiền từ ví
exports.withdraw = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { amount, bankName, accountNumber, emailCode } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Số tiền không hợp lệ' });
    }

    if (!bankName || !accountNumber) {
      return res.status(400).json({ message: 'Vui lòng nhập đầy đủ thông tin ngân hàng' });
    }

    if (!emailCode) {
      return res.status(400).json({ 
        message: 'Vui lòng nhập mã xác thực email' 
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    // Verify email code
    if (!user.withdrawalCode || user.withdrawalCode !== emailCode) {
      return res.status(400).json({ 
        message: 'Mã xác thực email không đúng' 
      });
    }

    // Kiểm tra mã còn hiệu lực không
    if (!user.withdrawalCodeExpires || new Date() > user.withdrawalCodeExpires) {
      return res.status(400).json({ 
        message: 'Mã xác thực đã hết hạn. Vui lòng yêu cầu mã mới' 
      });
    }

    const wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      return res.status(404).json({ message: 'Ví không tồn tại' });
    }

    if (wallet.balance < amount) {
      return res.status(400).json({ message: 'Số dư không đủ' });
    }

    const description = `Rút tiền về ${bankName} - ${accountNumber}`;

    const transaction = {
      type: 'withdraw',
      amount: parseFloat(amount),
      method: 'wallet',
      description: description,
      status: 'pending' // Chuyển sang pending để admin xử lý
    };

    wallet.transactions.push(transaction);
    wallet.balance -= parseFloat(amount);
    await wallet.save();

    // Xóa mã xác thực sau khi sử dụng
    user.withdrawalCode = null;
    user.withdrawalCodeExpires = null;
    await user.save();

    res.json({
      message: 'Yêu cầu rút tiền đã được gửi, vui lòng chờ xử lý',
      wallet: {
        balance: wallet.balance,
        transaction: transaction
      }
    });
  } catch (err) {
    console.error('Lỗi withdraw:', err);
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

// Thanh toán bằng ví
exports.payWithWallet = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { orderCode, amount } = req.body;

    if (!orderCode || !amount) {
      return res.status(400).json({ message: 'Thiếu thông tin đơn hàng' });
    }

    const order = await Order.findOne({ orderCode, userId });
    if (!order) {
      return res.status(404).json({ message: 'Đơn hàng không tồn tại' });
    }

    if (order.paymentInfo.status === 'paid') {
      return res.status(400).json({ message: 'Đơn hàng đã được thanh toán' });
    }

    const wallet = await Wallet.findOne({ userId });
    if (!wallet || wallet.balance < amount) {
      return res.status(400).json({ message: 'Số dư ví không đủ' });
    }

          // Trừ tiền từ ví
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
      await wallet.save();

      // Lấy transaction vừa thêm (sau khi save MongoDB tự động tạo _id cho subdocument)
      // Lấy transaction cuối cùng trong mảng (vừa push vào)
      const lastTransaction = wallet.transactions[wallet.transactions.length - 1];
      const transactionId = lastTransaction._id ? lastTransaction._id.toString() : `WALLET-${Date.now()}`;

      // Cập nhật đơn hàng
      order.paymentInfo.status = 'paid';
      order.paymentInfo.method = 'WALLET';
      order.paymentInfo.paymentId = transactionId;
      await order.save();

      // Chuyển tiền vào ví chủ cửa hàng
      const { transferToStoreWallets } = require("../utils/walletService");
      try {
        await transferToStoreWallets(order.orderCode, 'WALLET', transactionId);
        console.log(`[WalletController] ✅ Đã chuyển tiền vào ví chủ cửa hàng cho order ${order.orderCode}`);
      } catch (walletError) {
        console.error(`[WalletController] ❌ Lỗi chuyển tiền vào ví:`, walletError);
        // Không throw error để không ảnh hưởng đến response
      }

    res.json({
      message: 'Thanh toán thành công',
      wallet: {
        balance: wallet.balance
      },
      order: {
        orderCode: order.orderCode,
        paymentStatus: order.paymentInfo.status
      }
    });
  } catch (err) {
    console.error('Lỗi payWithWallet:', err);
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};
