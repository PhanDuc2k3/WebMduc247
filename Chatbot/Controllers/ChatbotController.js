// Controllers/ChatbotController.js
const dotenv = require("dotenv");
const { GoogleGenAI } = require("@google/genai");
const VectorStore = require("../models/VectorStore");
const Product = require("../models/Product");
const Order = require("../models/Order");
const Store = require("../models/Store");
const cosineSim = require("../utils/cosineSim");
const Redis = require("ioredis");

dotenv.config();

// ====== ENV ======
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) console.error("⚠️ GEMINI_API_KEY chưa thiết lập!");

const REDIS_URL = process.env.REDIS_URL;
if (!REDIS_URL) console.error("⚠️ REDIS_URL chưa thiết lập!");

// ====== Redis Connection ======
const redis = new Redis(REDIS_URL, { tls: { rejectUnauthorized: false } });
redis.on("connect", () => console.log("✅ Redis connected"));
redis.on("error", (err) => console.error("❌ Redis error:", err));

// ====== Gemini Models ======
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
const chatModelName = "gemini-2.0-flash";
const embeddingModelName = "gemini-embedding-001";

// ====== Helpers ======
function normalizeText(text) {
  if (!text) return "";
  return text.toLowerCase().trim().replace(/\s+/g, " ");
}

async function createEmbedding(text) {
  if (!text) return [];
  try {
    const res = await ai.models.embedContent({
      model: embeddingModelName,
      contents: [text],
    });
    return res.embeddings?.[0]?.values || [];
  } catch (err) {
    console.error("❌ Embedding error:", err);
    return [];
  }
}

// ====== Retrieve top-K Products ======
async function retrieveTopKProducts(queryVector, k = 5) {
  if (!queryVector || queryVector.length === 0) return [];

  let docs = await VectorStore.find({ type: "product" });
  docs = docs.map((d) => ({ ...d._doc, score: cosineSim(queryVector, d.vector || []) }));
  const topK = docs.sort((a, b) => b.score - a.score).slice(0, k);

  // Lấy toàn bộ thông tin sản phẩm từ database dựa vào docId
  const productIds = topK.map((d) => d.docId).filter((id) => id);
  const fullProducts = await Product.find({ _id: { $in: productIds }, isActive: true })
    .populate('store', 'name logoUrl');

  // Map lại để có đầy đủ thông tin
  const enrichedProducts = topK.map((doc) => {
    const fullProduct = fullProducts.find((p) => p._id.toString() === doc.docId.toString());
    return {
      ...doc,
      metadata: fullProduct || doc.metadata, // dùng full product nếu có, nếu không dùng metadata từ vector
    };
  });

  // fallback nếu score quá thấp
  if (topK.every((d) => d.score < 0.2)) {
    const allProducts = await Product.find({ isActive: true }).populate('store', 'name logoUrl');
    const directMatch = allProducts.filter((p) =>
      normalizeText(p.name).includes(normalizeText(queryVector.join(" ")))
    );
    if (directMatch.length > 0) return directMatch.map((p) => ({ metadata: p, vector: [], score: 0.5 }));
  }

  return enrichedProducts;
}

// ====== Detect Intent ======
function isProductIntent(message) {
  const keywords = [
    "tìm", "xem", "mua", "iphone", "điện thoại", "laptop",
    "tai nghe", "macbook", "truyện", "sách", "cửa hàng",
    "store", "sản phẩm", "product",
  ];
  return keywords.some((k) => message.toLowerCase().includes(k));
}

function isStoreIntent(message) {
  const keywords = [
    "cửa hàng", "store", "shop", "nhà sách", "điện tử",
  ];
  return keywords.some((k) => message.toLowerCase().includes(k));
}

// ====== Redis Chat History ======
async function saveChatHistory(userId, role, message) {
  if (!userId) return;
  const key = `chat:${userId}`;
  await redis.rpush(key, JSON.stringify({ role, message }));
  const length = await redis.llen(key);
  if (length > 15) await redis.lpop(key);
}

async function getChatHistory(userId) {
  if (!userId) return [];
  const key = `chat:${userId}`;
  const history = await redis.lrange(key, 0, -1);
  return history.map((msg) => JSON.parse(msg));
}

// ====== Main Controller ======
async function chatWithGemini(req, res) {
  const { message, userId } = req.body;
  if (!message) return res.status(400).json({ reply: "Thiếu message!" });

  let action = "chat";
  if (isStoreIntent(message)) action = "find_store";
  else if (isProductIntent(message)) action = "find_product";
  if (userId && message.toLowerCase().includes("đơn hàng")) action = "check_order";

  try {
    const history = await getChatHistory(userId);
    const historyText = history.map((h) => `${h.role === "user" ? "👤" : "🤖"} ${h.message}`).join("\n");
    let reply = "Mình chưa hiểu ý bạn!";

    switch (action) {
      // --- FIND PRODUCT ---
      case "find_product": {
        const queryVector = await createEmbedding(message);
        const topProducts = await retrieveTopKProducts(queryVector, 5);

        const dataText = topProducts
          .map((p) => {
            const metadata = p.metadata || {};
            const price = metadata.salePrice || metadata.price || 0;
            const discount = metadata.salePrice ? Math.round((1 - metadata.salePrice / metadata.price) * 100) : 0;
            const storeName = metadata.store?.name || "N/A";
            
            return `• ${metadata.name}
  - Thương hiệu: ${metadata.brand || "N/A"}
  - Danh mục: ${metadata.category || "N/A"}${metadata.subCategory ? ` (${metadata.subCategory})` : ""}
  - Giá: ${price.toLocaleString('vi-VN')}đ${discount > 0 ? ` (Giảm ${discount}%)` : ""}
  - Đánh giá: ⭐ ${metadata.rating?.toFixed(1) || 0} (${metadata.reviewsCount || 0} đánh giá)
  - Đã bán: ${metadata.soldCount || 0}
  - Cửa hàng: ${storeName}
  - Tồn kho: ${metadata.quantity || 0}${metadata.description ? `\n  - Mô tả: ${metadata.description.substring(0, 100)}${metadata.description.length > 100 ? '...' : ''}` : ""}`;
          })
          .join("\n\n");

        const prompt = `
Bạn là chatbot e-commerce. 
Lịch sử trò chuyện:
${historyText || "(Không có tin nhắn trước đó)"}

Dữ liệu sản phẩm:
${dataText || "Không có sản phẩm nào phù hợp."}

Người dùng hỏi: "${message}"
Hãy trả lời ngắn gọn, thân thiện, tập trung vào gợi ý sản phẩm. Nhấn mạnh thông tin giá cả, đánh giá và cửa hàng.
        `;

        const chatRes = await ai.models.generateContent({
          model: chatModelName,
          contents: prompt,
          config: { temperature: 0.2 },
        });

        reply = chatRes.text || reply;

        if (userId) {
          await saveChatHistory(userId, "user", message);
          await saveChatHistory(userId, "bot", reply);
        }

        return res.json({
          reply,
          products: topProducts.map((p) => p.metadata.name),
        });
      }

      // --- CHECK ORDERS ---
      case "check_order": {
        if (!userId) {
          reply = "Bạn cần đăng nhập để xem trạng thái đơn hàng.";
          return res.json({ reply, orders: [] });
        }

        const orders = await Order.find({ userId }).sort({ createdAt: -1 }).limit(5);

        if (!orders.length) {
          reply = "Bạn chưa có đơn hàng nào.";
        } else {
          const statusMap = {
            pending: "Chờ xác nhận",
            confirmed: "Đã xác nhận",
            packed: "Đã đóng gói",
            shipped: "Đang vận chuyển",
            delivered: "Đã giao hàng",
            received: "Đã nhận hàng",
            cancelled: "Đã hủy",
          };
          
          const paymentStatusMap = {
            pending: "Chưa thanh toán",
            paid: "Đã thanh toán",
            failed: "Thanh toán thất bại",
          };

          reply = "Các đơn hàng gần đây của bạn:\n" + orders
            .map((o) => {
              const currentStatus = o.statusHistory[o.statusHistory.length - 1]?.status || "pending";
              const statusText = statusMap[currentStatus] || currentStatus;
              const paymentStatus = paymentStatusMap[o.paymentInfo?.status] || "N/A";
              return `• Mã: ${o.orderCode}\n  Trạng thái: ${statusText}\n  Thanh toán: ${paymentStatus}\n  Tổng tiền: ${o.total.toLocaleString('vi-VN')}đ\n  Ngày: ${o.createdAt.toLocaleString('vi-VN')}`;
            })
            .join("\n\n");
        }

        await saveChatHistory(userId, "user", message);
        await saveChatHistory(userId, "bot", reply);

        return res.json({ reply, orders });
      }

      // --- FIND STORE ---
      case "find_store": {
        const stores = await Store.find({ isActive: true });

        if (!stores.length) {
          reply = "Hiện tại không có cửa hàng nào hoạt động.";
          return res.json({ reply, stores: [] });
        }

        const dataText = stores
          .map((s) => {
            const categoryMap = {
              electronics: "Điện tử & Công nghệ",
              fashion: "Thời trang",
              home: "Đồ gia dụng",
              books: "Sách & Văn phòng phẩm",
              other: "Khác",
            };
            
            return `• ${s.name}
  - Danh mục: ${categoryMap[s.category] || s.category}${s.customCategory ? ` (${s.customCategory})` : ""}
  - Mô tả: ${s.description}
  - Địa chỉ: ${s.storeAddress}
  - Đánh giá: ⭐ ${s.rating?.toFixed(1) || 0}${s.contactPhone ? `\n  - Liên hệ: ${s.contactPhone}` : ""}`;
          })
          .join("\n\n");

        const prompt = `
Bạn là chatbot e-commerce. 
Lịch sử trò chuyện:
${historyText || "(Không có tin nhắn trước đó)"}

Danh sách cửa hàng:
${dataText}

Người dùng hỏi: "${message}"
Hãy giới thiệu các cửa hàng phù hợp một cách ngắn gọn, thân thiện.
        `;

        const chatRes = await ai.models.generateContent({
          model: chatModelName,
          contents: prompt,
          config: { temperature: 0.3 },
        });

        reply = chatRes.text || reply;

        if (userId) {
          await saveChatHistory(userId, "user", message);
          await saveChatHistory(userId, "bot", reply);
        }

        return res.json({
          reply,
          stores: stores.map((s) => ({
            id: s._id,
            name: s.name,
            category: s.category,
            description: s.description,
          })),
        });
      }

      // --- DEFAULT CHAT ---
      default: {
        const prompt = `
Bạn là chatbot e-commerce thân thiện.
Lịch sử trò chuyện:
${historyText || "(Không có lịch sử trước đó)"}

Người dùng vừa nói: "${message}"
Hãy phản hồi tự nhiên, ngắn gọn, thân thiện.
        `;

        const chatRes = await ai.models.generateContent({
          model: chatModelName,
          contents: prompt,
          config: { temperature: 0.3 },
        });

        reply = chatRes.text || reply;

        if (userId) {
          await saveChatHistory(userId, "user", message);
          await saveChatHistory(userId, "bot", reply);
        }

        return res.json({ reply });
      }
    }
  } catch (err) {
    console.error("❌ Chatbot error:", err);
    return res.json({ reply: "Có lỗi xảy ra, thử lại sau nhé!" });
  }
}

module.exports = { chatWithGemini };
