// Controllers/ChatbotController.js
const dotenv = require("dotenv");
const { GoogleGenAI } = require("@google/genai");
const VectorStore = require("../models/VectorStore");
const Product = require("../models/Product");
const Order = require("../models/Order");
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

  // fallback nếu score quá thấp
  if (topK.every((d) => d.score < 0.2)) {
    const allProducts = await Product.find({ isActive: true });
    const directMatch = allProducts.filter((p) =>
      normalizeText(p.name).includes(normalizeText(queryVector.join(" ")))
    );
    if (directMatch.length > 0) return directMatch.map((p) => ({ metadata: p, vector: [] }));
  }

  return topK.map((d) => d);
}

// ====== Detect Intent ======
function isProductIntent(message) {
  const keywords = [
    "tìm", "xem", "mua", "iphone", "điện thoại", "laptop",
    "tai nghe", "macbook", "truyện", "sách",
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
  if (isProductIntent(message)) action = "find_product";
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
          .map((p) => `• ${p.metadata.name} (Brand: ${p.metadata.brand || "N/A"}, Category: ${p.metadata.category || "N/A"})`)
          .join("\n");

        const prompt = `
Bạn là chatbot e-commerce. 
Lịch sử trò chuyện:
${historyText || "(Không có tin nhắn trước đó)"}

Dữ liệu sản phẩm:
${dataText || "Không có sản phẩm nào phù hợp."}

Người dùng hỏi: "${message}"
Hãy trả lời ngắn gọn, thân thiện, tập trung vào gợi ý sản phẩm.
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
          reply = "Các đơn hàng gần đây của bạn:\n" + orders
            .map((o) => `• Mã: ${o._id}, Trạng thái: ${o.status}, Ngày: ${o.createdAt.toLocaleString()}`)
            .join("\n");
        }

        await saveChatHistory(userId, "user", message);
        await saveChatHistory(userId, "bot", reply);

        return res.json({ reply, orders });
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
