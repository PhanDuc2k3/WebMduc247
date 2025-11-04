const express = require("express");
const https = require("https");
const crypto = require("crypto");
const Order = require("../models/Order");

const router = express.Router();

const now = () => new Date().toISOString();

// ==================== CONFIG ====================
const accessKey = "F8BBA842ECF85";
const secretKey = "K951B6PE1waDMi640xX08PD3vg6EkVlz";
const partnerCode = "MOMO";

const redirectBase = "http://localhost:5173/payment-success";
const ipnUrl = "http://localhost:5000/api/payment/momo/ipn";

const requestType = "payWithMethod";
const lang = "vi";

// ==================== 1. Táº O THANH TOÃN MOMO ====================
router.post("/momo", async (req, res) => {
  console.log(`[${now()}] [POST /api/payment/momo] Request body:`, JSON.stringify(req.body));
  try {
    const { amount, orderInfo, orderCode } = req.body;

    // validate input
    if (!amount || !orderInfo || !orderCode) {
      console.error(
        `[${now()}] [POST /api/payment/momo] Thiáº¿u dá»¯ liá»‡u báº¯t buá»™c. amount=${amount}, orderInfo=${orderInfo}, orderCode=${orderCode}`
      );
      return res.status(400).json({ message: "Thiáº¿u dá»¯ liá»‡u táº¡o thanh toÃ¡n (amount | orderInfo | orderCode)" });
    }

    // MÃ£ dÃ nh cho MoMo (orderId riÃªng cá»§a MoMo)
    const orderId = partnerCode + Date.now();
    const requestId = orderId;
    const extraData = "";

    // Redirect FE kÃ¨m orderCode
    const redirectUrl = `${redirectBase}?orderCode=${encodeURIComponent(orderCode)}`;

    // Táº¡o raw signature (chÃº Ã½ thá»© tá»± trÆ°á»ng)
    const rawSignature =
      `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}` +
      `&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}` +
      `&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}` +
      `&requestId=${requestId}&requestType=${requestType}`;

    console.log(`[${now()}] [POST /api/payment/momo] rawSignature:`, rawSignature);

    const signature = crypto.createHmac("sha256", secretKey).update(rawSignature).digest("hex");
    console.log(`[${now()}] [POST /api/payment/momo] signature:`, signature);

    const requestBody = JSON.stringify({
      partnerCode,
      partnerName: "MoMoTest",
      storeId: "MomoTestStore",
      requestId,
      amount,
      orderId,
      orderInfo,
      redirectUrl,
      ipnUrl,
      lang,
      requestType,
      autoCapture: true,
      extraData,
      signature,
    });

    console.log(`[${now()}] [POST /api/payment/momo] requestBody (truncated):`, `${requestBody.slice(0, 1000)}${requestBody.length > 1000 ? "...(truncated)" : ""}`);

    const options = {
      hostname: "test-payment.momo.vn",
      port: 443,
      path: "/v2/gateway/api/create",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(requestBody),
      },
    };

    console.log(`[${now()}] [POST /api/payment/momo] HTTPS options:`, JSON.stringify({ hostname: options.hostname, path: options.path, method: options.method, headers: options.headers }));

    const momoReq = https.request(options, (momoRes) => {
      let data = "";
      console.log(`[${now()}] [POST /api/payment/momo] MoMo response status: ${momoRes.statusCode}`);
      console.log(`[${now()}] [POST /api/payment/momo] MoMo response headers:`, JSON.stringify(momoRes.headers));

      momoRes.on("data", (chunk) => {
        data += chunk;
        // optional: log chunk size
        console.log(`[${now()}] [POST /api/payment/momo] Received chunk length: ${chunk.length}`);
      });

      momoRes.on("end", () => {
        console.log(`[${now()}] [POST /api/payment/momo] MoMo raw response body (length=${data.length}):`, data.length > 2000 ? `${data.slice(0,2000)}...(truncated)` : data);
        try {
          const json = JSON.parse(data);
          console.log(`[${now()}] [POST /api/payment/momo] MoMo parsed JSON:`, JSON.stringify(json));
          // tráº£ vá» cho FE (FE sáº½ dÃ¹ng payUrl)
          return res.json(json);
        } catch (err) {
          console.error(`[${now()}] [POST /api/payment/momo] âŒ Lá»—i parse JSON tá»« MoMo:`, err);
          console.error(`[${now()}] [POST /api/payment/momo] MoMo raw body:`, data);
          return res.status(500).json({ error: "Invalid JSON from MoMo", details: err.message });
        }
      });
    });

    momoReq.on("error", (e) => {
      console.error(`[${now()}] [POST /api/payment/momo] âŒ Lá»—i request tá»›i MoMo:`, e.message);
      return res.status(500).json({ error: e.message });
    });

    // write & end
    console.log(`[${now()}] [POST /api/payment/momo] Ghi body vÃ  gá»­i request tá»›i MoMo...`);
    momoReq.write(requestBody);
    momoReq.end();
  } catch (err) {
    console.error(`[${now()}] [POST /api/payment/momo] âŒ Lá»—i server:`, err);
    return res.status(500).json({ error: "Server error", details: err.message });
  }
});


// ==================== 2. NHáº¬N IPN Tá»ª MOMO ====================
router.post("/momo/ipn", async (req, res) => {
  console.log(`[${now()}] [POST /api/payment/momo/ipn] Received IPN body:`, JSON.stringify(req.body));
  try {
    const {
      orderId,
      requestId,
      amount,
      orderInfo,
      orderType,
      transId,
      resultCode,
      message,
      responseTime,
      payType,
      signature,
      extraData,
    } = req.body;

    console.log(`[${now()}] [POST /api/payment/momo/ipn] Fields: orderId=${orderId}, requestId=${requestId}, amount=${amount}, transId=${transId}, resultCode=${resultCode}, message=${message}, responseTime=${responseTime}, payType=${payType}, extraData=${extraData}`);

    const rawSignature =
      `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}` +
      `&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}` +
      `&orderType=${orderType}&partnerCode=${partnerCode}` +
      `&payType=${payType}&requestId=${requestId}` +
      `&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`;

    console.log(`[${now()}] [POST /api/payment/momo/ipn] rawSignature calculated:`, rawSignature);

    const checkSign = crypto.createHmac("sha256", secretKey).update(rawSignature).digest("hex");
    console.log(`[${now()}] [POST /api/payment/momo/ipn] checkSign: ${checkSign}`);
    console.log(`[${now()}] [POST /api/payment/momo/ipn] signature (from MoMo): ${signature}`);
    console.log(`[${now()}] [POST /api/payment/momo/ipn] signature match: ${checkSign === signature}`);

    if (checkSign !== signature) {
      console.warn(`[${now()}] [POST /api/payment/momo/ipn] âš ï¸ Invalid signature - rejecting IPN`);
      return res.status(400).json({ message: "Invalid signature" });
    }

    // Prefer extraData if you place orderCode there; fallback to parsing orderInfo
    const parsedOrderCodeFromInfo = typeof orderInfo === "string" ? orderInfo.replace("Thanh toÃ¡n Ä‘Æ¡n hÃ ng #", "") : "";
    const orderCode = extraData && extraData.length ? extraData : parsedOrderCodeFromInfo;

    console.log(`[${now()}] [POST /api/payment/momo/ipn] Resolved orderCode:`, orderCode);

    const order = await Order.findOne({ orderCode });
    if (!order) {
      console.error(`[${now()}] [POST /api/payment/momo/ipn] âŒ Order not found for orderCode=${orderCode}`);
      return res.status(404).json({ message: "Order not found" });
    }

    if (Number(resultCode) === 0) {
      order.paymentInfo.status = "paid";
      order.paymentInfo.paymentId = transId || "";
      await order.save();
      console.log(`[${now()}] [POST /api/payment/momo/ipn] âœ… Order ${orderCode} set to PAID (transId=${transId})`);
    } else {
      console.log(`[${now()}] [POST /api/payment/momo/ipn] â„¹ï¸ resultCode != 0 (${resultCode}) => not marking paid. Message: ${message}`);
    }

    return res.status(200).json({ message: "IPN processed" });
  } catch (err) {
    console.error(`[${now()}] [POST /api/payment/momo/ipn] âŒ Lá»—i xá»­ lÃ½ IPN:`, err);
    return res.status(500).json({ error: "Server error", details: err.message });
  }
});


// ==================== 3. FAKE STATUS (TEST) ====================
router.get("/momo-status/:orderCode", async (req, res) => {
  console.log(`[${now()}] [GET /api/payment/momo-status/${req.params.orderCode}] Request received`);
  try {
    const orderCode = req.params.orderCode;
    console.log(`[${now()}] [GET /api/payment/momo-status] tÃ¬m order theo orderCode=${orderCode}`);

    const order = await Order.findOne({ orderCode });
    if (!order) {
      console.error(`[${now()}] [GET /api/payment/momo-status] âŒ Order khÃ´ng tÃ¬m tháº¥y: ${orderCode}`);
      return res.status(404).json({ message: "Order not found" });
    }

    // TEST: auto set paid
    order.paymentInfo.status = "paid";
    await order.save();
    console.log(`[${now()}] [GET /api/payment/momo-status] âœ… [FAKE] Auto set order PAID: ${order.orderCode} (id=${order._id})`);

    return res.json({
      paymentInfo: order.paymentInfo,
      orderId: order._id,
    });
  } catch (err) {
    console.error(`[${now()}] [GET /api/payment/momo-status] âŒ Lá»—i:`, err);
    return res.status(500).json({ error: "Server error", details: err.message });
  }
});

// ==================== 4. MARK PAID QUA FE REDIRECT ====================
router.post("/mark-paid/:orderCode", async (req, res) => {
  try {
    const { orderCode } = req.params;

    const order = await Order.findOne({ orderCode });
    if (!order) return res.status(404).json({ message: "Order not found" });

    // Chá»‰ mark paid náº¿u Ä‘ang pending
    if (order.paymentInfo.status !== "paid") {
      order.paymentInfo.status = "paid";
      await order.save();
      console.log(`[${now()}] âœ… Order ${orderCode} marked as PAID via FE redirect`);
    } else {
      console.log(`[${now()}] â„¹ï¸ Order ${orderCode} was already PAID`);
    }

    res.json({ message: "Order marked as paid", orderId: order._id });
  } catch (err) {
    console.error(`[${now()}] âŒ Error marking order as paid:`, err);
    res.status(500).json({ message: "Server error", details: err.message });
  }
});

// ==================== 5. VIETQR PAYMENT ====================
const PaymentController = require("../controllers/PaymentController");

router.post("/vietqr", PaymentController.createVietQRPayment);

// Tạo thanh toán VietQR
router.post("/vietqr", async (req, res) => {
  console.log(`[${now()}] [POST /api/payment/vietqr] Request body:`, JSON.stringify(req.body));
  try {
    const { amount, orderInfo, orderCode } = req.body;

    // Validate input
    if (!amount || !orderInfo || !orderCode) {
      console.error(`[${now()}] [POST /api/payment/vietqr] Thiếu dữ liệu bắt buộc`);
      return res.status(400).json({ message: "Thiếu dữ liệu tạo thanh toán (amount | orderInfo | orderCode)" });
    }

    // Gọi controller để tạo QR code
    await PaymentController.createVietQRPayment(req, res);
  } catch (err) {
    console.error(`[${now()}] [POST /api/payment/vietqr] ❌ Lỗi server:`, err);
    return res.status(500).json({ error: "Server error", details: err.message });
  }
});

module.exports = router;

