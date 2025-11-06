const crypto = require('crypto');
const axios = require('axios');
const Order = require('../models/Order');
const User = require('../models/Users');
const Wallet = require('../models/Wallet');
require('dotenv').config(); // ✅ đảm bảo đọc .env

// ----------------------
// Tạo payment MoMo (giữ nguyên)
// ----------------------
exports.createMomoPayment = async (req, res) => {
  try {
    const partnerCode = 'MOMO';
    const accessKey = 'F8BBA842ECF85';
    const secretKey = 'K951B6PE1waDMi640xX08PD3vg6EkVlz';
    const redirectUrl = 'http://localhost:3000/payment-success';
    const ipnUrl = 'http://localhost:5000/api/payment/momo-callback';
    const requestType = 'payWithMethod';
    const orderInfo = 'Thanh toán MERN với Momo';

    const { totalAmount, orderId } = req.body;
    const requestId = orderId;
    const extraData = '';
    const autoCapture = true;
    const lang = 'vi';

    const rawSignature = `accessKey=${accessKey}&amount=${totalAmount}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;
    const signature = crypto
      .createHmac('sha256', secretKey)
      .update(rawSignature)
      .digest('hex');

    const requestBody = {
      partnerCode,
      partnerName: 'Momo Test',
      storeId: 'MomoTestStore',
      requestId,
      amount: totalAmount.toString(),
      orderId,
      orderInfo,
      redirectUrl,
      ipnUrl,
      lang,
      requestType,
      autoCapture,
      extraData,
      signature,
    };

    const momoRes = await axios.post(
      'https://test-payment.momo.vn/v2/gateway/api/create',
      requestBody
    );

    res.json({ payUrl: momoRes.data.payUrl });
  } catch (err) {
    console.error('Lỗi tạo thanh toán Momo:', err.response?.data || err.message);
    res.status(500).json({ message: 'Không thể tạo thanh toán Momo' });
  }
};

// ----------------------
// Callback MoMo
// ----------------------
exports.momoCallback = async (req, res) => {
  try {
    const { orderId, amount, resultCode, transId, extraData } = req.body;

    if (resultCode === 0) {
      // Kiểm tra nếu là nạp tiền vào ví (orderCode bắt đầu bằng "DEP-")
      // Hoặc có thể dùng extraData để chứa orderCode thực tế
      let actualOrderCode = orderId;
      if (extraData && extraData.length > 0) {
        // Nếu extraData có chứa orderCode
        actualOrderCode = extraData;
      }

      // Kiểm tra nếu là nạp tiền vào ví
      if (actualOrderCode && actualOrderCode.startsWith('DEP-')) {
        // Tìm user từ extraData hoặc từ orderId pattern
        // Vì nạp tiền không có order thật, cần lấy userId từ request hoặc một cách khác
        // Tạm thời, để frontend xử lý việc nạp tiền khi callback về
        console.log('💰 MoMo callback for wallet deposit:', actualOrderCode);
        // Frontend sẽ xử lý việc nạp tiền trong PaymentSuccess page
      } else {
        // Xử lý đơn hàng bình thường
        const order = await Order.findOne({ orderCode: actualOrderCode });
        if (order) {
          order.paymentInfo.status = 'paid';
          order.paymentInfo.paymentId = transId;
          await order.save();
          
          // Chuyển tiền vào ví chủ cửa hàng
          const { transferToStoreWallets } = require("../utils/walletService");
          try {
            await transferToStoreWallets(actualOrderCode, 'MOMO', transId);
            console.log(`[PaymentController] ✅ Đã chuyển tiền vào ví chủ cửa hàng cho order ${actualOrderCode}`);
          } catch (walletError) {
            console.error(`[PaymentController] ❌ Lỗi chuyển tiền vào ví:`, walletError);
            // Không throw error để không ảnh hưởng đến response
          }
        }
      }
    }

    res.status(200).json({ message: 'OK' });
  } catch (err) {
    console.error('Lỗi callback MoMo:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

// ----------------------
// Tạo payment VietQR (sử dụng .env)
// ----------------------
exports.createVietQRPayment = async (req, res) => {
  try {
    const { amount, totalAmount, orderCode, orderId, orderInfo } = req.body;

    // ✅ Lấy thông tin ngân hàng từ biến môi trường (.env)
    const bankAccount = {
      accountNo: process.env.BANK_ACCOUNT_NO,
      accountName: process.env.BANK_ACCOUNT_NAME,
      bankCode: process.env.BANK_BANK_CODE,
      bin: process.env.BANK_BIN,
    };

    // Kiểm tra nếu thiếu thông tin .env
    if (!bankAccount.accountNo || !bankAccount.accountName || !bankAccount.bankCode || !bankAccount.bin) {
      return res.status(400).json({
        message: 'Thiếu thông tin cấu hình ngân hàng trong .env',
      });
    }

    const finalAmount = Math.round(amount || totalAmount || 0);
    const finalOrderCode = orderCode || orderId || `ORD-${Date.now()}`;
    const orderInfoText = orderInfo || `Thanh toán đơn hàng ${finalOrderCode}`;

    // ✅ Tạo URL QR VietQR dựa theo cấu hình .env
    const provider = process.env.QR_PROVIDER || 'vietqr.io';
    const vietQRUrl = `https://img.${provider}/image/${bankAccount.bankCode}-${bankAccount.accountNo}-compact2.png?amount=${finalAmount}&addInfo=${encodeURIComponent(orderInfoText)}&accountName=${encodeURIComponent(bankAccount.accountName)}`;

    // ✅ Tạo nội dung QR text đơn giản (dành cho debug hoặc log)
    const qrContent = `${bankAccount.accountNo}|${bankAccount.accountName}|${finalAmount}|${orderInfoText}`;

    res.json({
      qrCodeUrl: vietQRUrl,
      qrContent,
      amount: finalAmount,
      accountNo: bankAccount.accountNo,
      accountName: bankAccount.accountName,
      orderInfo: orderInfoText,
    });
  } catch (err) {
    console.error('Lỗi tạo thanh toán VietQR:', err);
    res.status(500).json({ message: 'Không thể tạo thanh toán VietQR' });
  }
};
