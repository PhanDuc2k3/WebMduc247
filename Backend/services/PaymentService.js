const crypto = require('crypto');
const axios = require('axios');
const paymentRepository = require('../repositories/PaymentRepository');
require('dotenv').config();

class PaymentService {
  // Tạo MoMo payment
  async createMomoPayment(orderId, totalAmount) {
    const partnerCode = 'MOMO';
    const accessKey = 'F8BBA842ECF85';
    const secretKey = 'K951B6PE1waDMi640xX08PD3vg6EkVlz';
    const redirectUrl = 'http://localhost:3000/payment-success';
    const ipnUrl = 'http://localhost:5000/api/payment/momo-callback';
    const requestType = 'payWithMethod';
    const orderInfo = 'Thanh toán MERN với Momo';
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

    return momoRes.data.payUrl;
  }

  // Xử lý MoMo callback
  async handleMomoCallback(orderId, amount, resultCode, transId, extraData) {
    if (resultCode !== 0) {
      return { success: false };
    }

    let actualOrderCode = orderId;
    if (extraData && extraData.length > 0) {
      actualOrderCode = extraData;
    }

    // Kiểm tra nếu là nạp tiền vào ví
    if (actualOrderCode && actualOrderCode.startsWith('DEP-')) {
      console.log('💰 MoMo callback for wallet deposit:', actualOrderCode);
      return { success: true, isDeposit: true, orderCode: actualOrderCode };
    }

    // Xử lý đơn hàng bình thường
    const order = await paymentRepository.findByOrderCode(actualOrderCode);
    if (order) {
      order.paymentInfo.status = 'paid';
      order.paymentInfo.paymentId = transId;
      await order.save();
      
      // Chuyển tiền vào ví chủ cửa hàng
      const { transferToStoreWallets } = require("../utils/walletService");
      try {
        await transferToStoreWallets(actualOrderCode, 'MOMO', transId);
        console.log(`[PaymentService] ✅ Đã chuyển tiền vào ví chủ cửa hàng cho order ${actualOrderCode}`);
      } catch (walletError) {
        console.error(`[PaymentService] ❌ Lỗi chuyển tiền vào ví:`, walletError);
      }
    }

    return { success: true, isDeposit: false, orderCode: actualOrderCode };
  }

  // Tạo VietQR payment
  async createVietQRPayment(amount, totalAmount, orderCode, orderId, orderInfo) {
    const bankAccount = {
      accountNo: process.env.BANK_ACCOUNT_NO,
      accountName: process.env.BANK_ACCOUNT_NAME,
      bankCode: process.env.BANK_BANK_CODE,
      bin: process.env.BANK_BIN,
    };

    if (!bankAccount.accountNo || !bankAccount.accountName || !bankAccount.bankCode || !bankAccount.bin) {
      throw new Error('Thiếu thông tin cấu hình ngân hàng trong .env');
    }

    const finalAmount = Math.round(amount || totalAmount || 0);
    const finalOrderCode = orderCode || orderId || `ORD-${Date.now()}`;
    const orderInfoText = orderInfo || `Thanh toán đơn hàng ${finalOrderCode}`;

    const provider = process.env.QR_PROVIDER || 'vietqr.io';
    const vietQRUrl = `https://img.${provider}/image/${bankAccount.bankCode}-${bankAccount.accountNo}-compact2.png?amount=${finalAmount}&addInfo=${encodeURIComponent(orderInfoText)}&accountName=${encodeURIComponent(bankAccount.accountName)}`;

    const qrContent = `${bankAccount.accountNo}|${bankAccount.accountName}|${finalAmount}|${orderInfoText}`;

    return {
      qrCodeUrl: vietQRUrl,
      qrContent,
      amount: finalAmount,
      accountNo: bankAccount.accountNo,
      accountName: bankAccount.accountName,
      orderInfo: orderInfoText,
    };
  }
}

module.exports = new PaymentService();

