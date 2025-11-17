const paymentService = require('../services/PaymentService');

exports.createMomoPayment = async (req, res) => {
  try {
    const { totalAmount, orderId } = req.body;
    const payUrl = await paymentService.createMomoPayment(orderId, totalAmount);
    res.json({ payUrl });
  } catch (err) {
    console.error('Lỗi tạo thanh toán Momo:', err.response?.data || err.message);
    res.status(500).json({ message: 'Không thể tạo thanh toán Momo' });
  }
};

exports.momoCallback = async (req, res) => {
  try {
    const { orderId, amount, resultCode, transId, extraData } = req.body;
    await paymentService.handleMomoCallback(orderId, amount, resultCode, transId, extraData);
    res.status(200).json({ message: 'OK' });
  } catch (err) {
    console.error('Lỗi callback MoMo:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

exports.createVietQRPayment = async (req, res) => {
  try {
    const { amount, totalAmount, orderCode, orderId, orderInfo } = req.body;
    const result = await paymentService.createVietQRPayment(amount, totalAmount, orderCode, orderId, orderInfo);
    res.json(result);
  } catch (err) {
    console.error('Lỗi tạo thanh toán VietQR:', err);
    const statusCode = err.message.includes("Thiếu thông tin") ? 400 : 500;
    res.status(statusCode).json({ message: err.message || 'Không thể tạo thanh toán VietQR' });
  }
};
