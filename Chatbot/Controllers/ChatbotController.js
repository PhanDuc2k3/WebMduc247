// Controllers/ChatbotController.js
const {
  isProductIntent,
  isStoreIntent,
} = require("../utils/intentDetection");
const {
  getChatHistory,
  saveChatHistory,
} = require("../services/chatHistoryService");
const orderService = require("../services/orderService");
const storeService = require("../services/storeService");
const aiService = require("../services/aiService");
const productService = require("../services/productService");

// ====== Helper Functions ======

/**
 * Format lịch sử chat thành text
 */
function formatHistory(history) {
  return history
    .map((h) => `${h.role === "user" ? "👤" : "🤖"} ${h.message}`)
    .join("\n");
}

/**
 * Detect action từ message
 */
function detectAction(message, userId) {
  if (userId && message.toLowerCase().includes("đơn hàng")) {
    return "check_order";
  }
  if (isStoreIntent(message)) return "find_store";
  if (isProductIntent(message)) return "find_product";
  return "chat";
}

// ====== Handler Functions ======

/**
 * Xử lý tìm sản phẩm
 */
async function handleFindProduct(message, userId, historyText) {
  return await productService.handleFindProduct(message, userId, historyText);
}

/**
 * Xử lý kiểm tra đơn hàng
 */
async function handleCheckOrder(message, userId, historyText) {
  if (!userId) {
    return {
      reply: "Bạn cần đăng nhập để xem trạng thái đơn hàng.",
      orders: [],
    };
  }

  const orders = await orderService.getUserOrders(userId);
  const reply =
    orders.length === 0
      ? "Bạn chưa có đơn hàng nào."
      : orderService.formatOrdersToText(orders);

  if (userId) {
    await saveChatHistory(userId, "user", message);
    await saveChatHistory(userId, "bot", reply);
  }

  return { reply, orders };
}

/**
 * Xử lý tìm cửa hàng
 */
async function handleFindStore(message, userId, historyText) {
  const stores = await storeService.getActiveStores();

  if (!stores.length) {
    const reply = "Hiện tại không có cửa hàng nào hoạt động.";
    if (userId) {
      await saveChatHistory(userId, "user", message);
      await saveChatHistory(userId, "bot", reply);
    }
    return { reply, stores: [] };
  }

  const storesText = storeService.formatStoresToText(stores);

  let reply;
  try {
    reply = await aiService.generateStoreReply(historyText, storesText, message);
  } catch (error) {
    console.error("Error calling Groq API:", error);
    reply = `Tôi tìm thấy ${stores.length} cửa hàng:\n${stores
      .map((s, i) => `${i + 1}. ${s.name} - ${s.category}`)
      .join("\n")}`;
  }

  if (userId) {
    await saveChatHistory(userId, "user", message);
    await saveChatHistory(userId, "bot", reply);
  }

  return {
    reply,
    stores: stores.map((s) => ({
      id: s._id,
      name: s.name,
      category: s.category,
      description: s.description,
    })),
  };
}

/**
 * Xử lý chat thông thường
 */
async function handleDefaultChat(message, userId, historyText) {
  let reply;
  try {
    reply = await aiService.generateChatReply(historyText, message);
  } catch (error) {
    console.error("Error calling Groq API:", error);
    reply =
      "Xin lỗi, tôi đang gặp sự cố kỹ thuật. Vui lòng thử lại sau hoặc liên hệ bộ phận hỗ trợ.";
  }

  if (userId) {
    await saveChatHistory(userId, "user", message);
    await saveChatHistory(userId, "bot", reply);
  }

  return { reply };
}

// ====== Main Controller ======
async function chatWithGroq(req, res) {
  console.log(
    "🚀🚀🚀 CHATBOT SERVICE - Chatbot/Controllers/ChatbotController.js - REFACTORED VERSION! 🚀🚀🚀"
  );
  const { message, userId } = req.body;
  if (!message) return res.status(400).json({ reply: "Thiếu message!" });

  try {
    // Detect action
    const action = detectAction(message, userId);
    console.log("Action detected:", action);

    // Lấy lịch sử chat
    const history = await getChatHistory(userId);
    const historyText = formatHistory(history);

    // Xử lý theo action
    let result;
    switch (action) {
      case "find_product":
        result = await handleFindProduct(message, userId, historyText);
        break;
      case "check_order":
        result = await handleCheckOrder(message, userId, historyText);
        break;
      case "find_store":
        result = await handleFindStore(message, userId, historyText);
        break;
      default:
        result = await handleDefaultChat(message, userId, historyText);
    }

    return res.json(result);
  } catch (err) {
    console.error("❌ Chatbot error:", err);
    return res.json({ reply: "Có lỗi xảy ra, thử lại sau nhé!" });
  }
}

module.exports = { chatWithGroq };
