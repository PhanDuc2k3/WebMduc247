const crypto = require('crypto');
const axios = require('axios');
const Order = require('../models/Order');
const User = require('../models/Users');

// Tạo payment MoMo
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

    // Tạo signature
    const rawSignature = `accessKey=${accessKey}&amount=${totalAmount}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;
    const signature = crypto.createHmac('sha256', secretKey)
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
      signature
    };

    const momoRes = await axios.post('https://test-payment.momo.vn/v2/gateway/api/create', requestBody);

    res.json({ payUrl: momoRes.data.payUrl });
  } catch (err) {
    console.error('Lỗi tạo thanh toán Momo:', err.response?.data || err.message);
    res.status(500).json({ message: 'Không thể tạo thanh toán Momo' });
  }
};

// Callback MoMo: khi user thanh toán thành công, MoMo gọi IPN
exports.momoCallback = async (req, res) => {
  try {
    const { orderId, amount, resultCode, transId } = req.body;

    if (resultCode === 0) { // thanh toán thành công
      const order = await Order.findOne({ orderCode: orderId });
      if (order) {
        order.paymentInfo.status = 'paid';
        order.paymentInfo.paymentId = transId;
        await order.save();
      }
    }

    res.status(200).json({ message: 'OK' });
  } catch (err) {
    console.error(' Lỗi callback MoMo:', err);
    res.status(500).json({ message: 'Lỗi server' });
  }
};

// Tạo payment VNPAY
exports.createVNPayPayment = async (req, res) => {
  try {
    const { totalAmount, orderId } = req.body;
    const vnp_TmnCode = 'YOUR_VNPAY_TMN_CODE';
    const vnp_HashSecret = 'YOUR_VNPAY_HASH_SECRET';
    const vnp_Url = 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
    const vnp_ReturnUrl = 'http://localhost:3000/payment-success';

    const date = new Date();
    const vnp_CreateDate = date.toISOString().replace(/[-:T]/g,'').slice(0,14);

    const vnp_Params = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode,
      vnp_Amount: totalAmount * 100,
      vnp_CurrCode: 'VND',
      vnp_TxnRef: orderId,
      vnp_OrderInfo: 'Thanh toán MERN với VNPAY',
      vnp_OrderType: 'other',
      vnp_Locale: 'vn',
      vnp_ReturnUrl,
      vnp_CreateDate
    };

    const signData = Object.keys(vnp_Params).sort().map(key => `${key}=${vnp_Params[key]}`).join('&');
    const vnp_SecureHash = crypto.createHmac('sha512', vnp_HashSecret)
                                .update(signData)
                                .digest('hex');

    const paymentUrl = `${vnp_Url}?${signData}&vnp_SecureHash=${vnp_SecureHash}`;
    res.json({ payUrl: paymentUrl });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Không thể tạo thanh toán VNPAY' });
  }
};