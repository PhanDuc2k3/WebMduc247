const walletService = require('../services/WalletService');

exports.getWallet = async (req, res) => {
  try {
    const userId = req.user.userId;
    const wallet = await walletService.getWallet(userId);
    res.json({ wallet });
  } catch (err) {
    console.error('Lỗi getWallet:', err);
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

exports.getTransactions = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { page = 1, limit = 20 } = req.query;
    const result = await walletService.getTransactions(userId, page, limit);
    res.json(result);
  } catch (err) {
    console.error('Lỗi getTransactions:', err);
    res.status(500).json({ message: 'Lỗi server', error: err.message });
  }
};

exports.deposit = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { amount, method, orderCode, paymentId, description } = req.body;
    const result = await walletService.deposit(userId, amount, method, orderCode, paymentId, description);
    res.json({
      message: 'Nạp tiền thành công',
      wallet: result
    });
  } catch (err) {
    console.error('Lỗi deposit:', err);
    const statusCode = err.message.includes("không hợp lệ") ? 400 : 500;
    res.status(statusCode).json({ message: err.message || 'Lỗi server' });
  }
};

exports.sendWithdrawalCode = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { amount, bankName, accountNumber } = req.body;
    const result = await walletService.sendWithdrawalCode(userId, amount, bankName, accountNumber);
    res.status(200).json(result);
  } catch (err) {
    console.error('Lỗi sendWithdrawalCode:', err);
    const statusCode = err.message.includes("không hợp lệ") ? 400 : 
                      err.message.includes("không tồn tại") ? 404 :
                      err.message.includes("không đủ") ? 400 : 500;
    res.status(statusCode).json({ message: err.message || 'Lỗi server' });
  }
};

exports.withdraw = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { amount, bankName, accountNumber, emailCode } = req.body;
    const result = await walletService.withdraw(userId, amount, bankName, accountNumber, emailCode);
    res.json({
      message: 'Yêu cầu rút tiền đã được gửi, vui lòng chờ xử lý',
      wallet: result
    });
  } catch (err) {
    console.error('Lỗi withdraw:', err);
    const statusCode = err.message.includes("không hợp lệ") ? 400 : 
                      err.message.includes("không tồn tại") ? 404 :
                      err.message.includes("không đủ") ? 400 :
                      err.message.includes("không đúng") ? 400 :
                      err.message.includes("hết hạn") ? 400 : 500;
    res.status(statusCode).json({ message: err.message || 'Lỗi server' });
  }
};

exports.payWithWallet = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { orderCode, amount } = req.body;
    const result = await walletService.payWithWallet(userId, orderCode, amount);
    res.json({
      message: 'Thanh toán thành công',
      ...result
    });
  } catch (err) {
    console.error('Lỗi payWithWallet:', err);
    const statusCode = err.message.includes("Thiếu thông tin") ? 400 : 
                      err.message.includes("không tồn tại") ? 404 :
                      err.message.includes("đã được thanh toán") ? 400 :
                      err.message.includes("không đủ") ? 400 : 500;
    res.status(statusCode).json({ message: err.message || 'Lỗi server' });
  }
};
