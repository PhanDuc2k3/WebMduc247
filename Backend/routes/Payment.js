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

// ==================== 1. TẠO THANH TOÁN MOMO ====================
router.post("/momo", async (req, res) => {
  console.log(`[${now()}] [POST /api/payment/momo] Request body:`, JSON.stringify(req.body));
  try {
    const { amount, orderInfo, orderCode } = req.body;

    // validate input
    if (!amount || !orderInfo || !orderCode) {
      console.error(
        `[${now()}] [POST /api/payment/momo] Thiếu dữ liệu bắt buộc. amount=${amount}, orderInfo=${orderInfo}, orderCode=${orderCode}`
      );
      return res.status(400).json({ message: "Thiếu dữ liệu tạo thanh toán (amount | orderInfo | orderCode)" });
    }

    // Mã dành cho MoMo (orderId riêng của MoMo)
    const orderId = partnerCode + Date.now();
    const requestId = orderId;
    const extraData = "";

    // Redirect FE kèm orderCode
    const redirectUrl = `${redirectBase}?orderCode=${encodeURIComponent(orderCode)}`;

    // Tạo raw signature (chú ý thứ tự trường)
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
          // trả về cho FE (FE sẽ dùng payUrl)
          return res.json(json);
        } catch (err) {
          console.error(`[${now()}] [POST /api/payment/momo] ❌ Lỗi parse JSON từ MoMo:`, err);
          console.error(`[${now()}] [POST /api/payment/momo] MoMo raw body:`, data);
          return res.status(500).json({ error: "Invalid JSON from MoMo", details: err.message });
        }
      });
    });

    momoReq.on("error", (e) => {
      console.error(`[${now()}] [POST /api/payment/momo] ❌ Lỗi request tới MoMo:`, e.message);
      return res.status(500).json({ error: e.message });
    });

    // write & end
    console.log(`[${now()}] [POST /api/payment/momo] Ghi body và gửi request tới MoMo...`);
    momoReq.write(requestBody);
    momoReq.end();
  } catch (err) {
    console.error(`[${now()}] [POST /api/payment/momo] ❌ Lỗi server:`, err);
    return res.status(500).json({ error: "Server error", details: err.message });
  }
});


// ==================== 2. NHẬN IPN TỪ MOMO ====================
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
      console.warn(`[${now()}] [POST /api/payment/momo/ipn] ⚠️ Invalid signature - rejecting IPN`);
      return res.status(400).json({ message: "Invalid signature" });
    }

    // Prefer extraData if you place orderCode there; fallback to parsing orderInfo
    const parsedOrderCodeFromInfo = typeof orderInfo === "string" ? orderInfo.replace("Thanh toán đơn hàng #", "") : "";
    const orderCode = extraData && extraData.length ? extraData : parsedOrderCodeFromInfo;

    console.log(`[${now()}] [POST /api/payment/momo/ipn] Resolved orderCode:`, orderCode);

    const order = await Order.findOne({ orderCode });
    if (!order) {
      console.error(`[${now()}] [POST /api/payment/momo/ipn] ❌ Order not found for orderCode=${orderCode}`);
      return res.status(404).json({ message: "Order not found" });
    }

    if (Number(resultCode) === 0) {
      order.paymentInfo.status = "paid";
      order.paymentInfo.paymentId = transId || "";
      await order.save();
      console.log(`[${now()}] [POST /api/payment/momo/ipn] ✅ Order ${orderCode} set to PAID (transId=${transId})`);
    } else {
      console.log(`[${now()}] [POST /api/payment/momo/ipn] ℹ️ resultCode != 0 (${resultCode}) => not marking paid. Message: ${message}`);
    }

    return res.status(200).json({ message: "IPN processed" });
  } catch (err) {
    console.error(`[${now()}] [POST /api/payment/momo/ipn] ❌ Lỗi xử lý IPN:`, err);
    return res.status(500).json({ error: "Server error", details: err.message });
  }
});


// ==================== 3. FAKE STATUS (TEST) ====================
router.get("/momo-status/:orderCode", async (req, res) => {
  console.log(`[${now()}] [GET /api/payment/momo-status/${req.params.orderCode}] Request received`);
  try {
    const orderCode = req.params.orderCode;
    console.log(`[${now()}] [GET /api/payment/momo-status] tìm order theo orderCode=${orderCode}`);

    const order = await Order.findOne({ orderCode });
    if (!order) {
      console.error(`[${now()}] [GET /api/payment/momo-status] ❌ Order không tìm thấy: ${orderCode}`);
      return res.status(404).json({ message: "Order not found" });
    }

    // TEST: auto set paid
    order.paymentInfo.status = "paid";
    await order.save();
    console.log(`[${now()}] [GET /api/payment/momo-status] ✅ [FAKE] Auto set order PAID: ${order.orderCode} (id=${order._id})`);

    return res.json({
      paymentInfo: order.paymentInfo,
      orderId: order._id,
    });
  } catch (err) {
    console.error(`[${now()}] [GET /api/payment/momo-status] ❌ Lỗi:`, err);
    return res.status(500).json({ error: "Server error", details: err.message });
  }
});

// ==================== 4. MARK PAID QUA FE REDIRECT ====================
router.post("/mark-paid/:orderCode", async (req, res) => {
  try {
    const { orderCode } = req.params;

    const order = await Order.findOne({ orderCode });
    if (!order) return res.status(404).json({ message: "Order not found" });

    // Chỉ mark paid nếu đang pending
    if (order.paymentInfo.status !== "paid") {
      order.paymentInfo.status = "paid";
      await order.save();
      console.log(`[${now()}] ✅ Order ${orderCode} marked as PAID via FE redirect`);
    } else {
      console.log(`[${now()}] ℹ️ Order ${orderCode} was already PAID`);
    }

    res.json({ message: "Order marked as paid", orderId: order._id });
  } catch (err) {
    console.error(`[${now()}] ❌ Error marking order as paid:`, err);
    res.status(500).json({ message: "Server error", details: err.message });
  }
});

module.exports = router;
