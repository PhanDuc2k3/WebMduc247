// Controllers/ChatbotController.js
const dotenv = require("dotenv");
const Groq = require("groq-sdk");
const VectorStore = require("../models/VectorStore");
const Product = require("../models/Product");
const Order = require("../models/Order");
const Store = require("../models/Store");
const cosineSim = require("../utils/cosineSim");
const Redis = require("ioredis");

dotenv.config();

// ====== ENV ======
const GROQ_API_KEY = process.env.GROQ_API_KEY;
if (!GROQ_API_KEY) console.error("⚠️ GROQ_API_KEY chưa thiết lập!");

const REDIS_URL = process.env.REDIS_URL;
if (!REDIS_URL) console.error("⚠️ REDIS_URL chưa thiết lập!");

// ====== Redis Connection ======
const redis = new Redis(REDIS_URL, { tls: { rejectUnauthorized: false } });
redis.on("connect", () => console.log("✅ Redis connected"));
redis.on("error", (err) => console.error("❌ Redis error:", err));

// ====== Groq Models ======
const groq = new Groq({
  apiKey: GROQ_API_KEY,
});
const chatModelName = "llama-3.3-70b-versatile"; // Model Groq nhanh và tốt

// ====== Helpers ======
function normalizeText(text) {
  if (!text) return "";
  return text.toLowerCase().trim().replace(/\s+/g, " ");
}

// Groq không có embedding API, dùng text search thay thế
async function createEmbedding(text) {
  if (!text) return [];
  
  // Trả về keywords để dùng cho text search
  const keywords = normalizeText(text).split(/\s+/).filter(w => w.length > 2);
  return keywords;
}

// ====== Retrieve top-K Products ======
async function retrieveTopKProducts(queryKeywords, k = 5) {
  if (!queryKeywords || queryKeywords.length === 0) return [];

  try {
    // Tìm kiếm bằng text search
    const searchRegex = new RegExp(queryKeywords.join('|'), 'i');
    const products = await Product.find({
      isActive: true,
      $or: [
        { name: searchRegex },
        { description: searchRegex },
        { brand: searchRegex },
        { category: searchRegex },
        { tags: { $in: queryKeywords } },
        { keywords: { $in: queryKeywords } }
      ]
    })
      .limit(k * 2) // Lấy nhiều hơn để có thể rank
      .populate('store', 'name logoUrl');

    if (products.length === 0) return [];

    // Nếu có vector store, ưu tiên products có embedding
    const productIds = products.map(p => p._id);
    const vectors = await VectorStore.find({
      type: 'product',
      docId: { $in: productIds }
    });

    // Map products với score
    let scoredProducts = products.map(product => {
      const vectorDoc = vectors.find(v => v.docId.toString() === product._id.toString());
      // Ưu tiên sản phẩm có trong vector store và match tên tốt hơn
      const nameMatch = normalizeText(product.name).includes(queryKeywords.join(' '));
      const score = vectorDoc ? (nameMatch ? 0.9 : 0.8) : (nameMatch ? 0.7 : 0.5);
      return {
        metadata: product,
        vector: vectorDoc?.vector || [],
        score: score
      };
    });

    // Sort theo score
    scoredProducts.sort((a, b) => b.score - a.score);

    return scoredProducts.slice(0, k);
  } catch (error) {
    console.error('Error retrieving products:', error);
    return [];
  }
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
async function chatWithGroq(req, res) {
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
        const queryKeywords = await createEmbedding(message);
        
        if (!queryKeywords.length) {
          return res.json({ 
            reply: "Vui lòng nhập từ khóa tìm kiếm cụ thể hơn!", 
            products: [] 
          });
        }

        const topProducts = await retrieveTopKProducts(queryKeywords, 5);

        if (topProducts.length === 0) {
          reply = "Mình không tìm thấy sản phẩm nào phù hợp. Bạn có thể thử tìm kiếm với từ khóa khác!";
          
          if (userId) {
            await saveChatHistory(userId, "user", message);
            await saveChatHistory(userId, "bot", reply);
          }
          
          return res.json({ 
            reply, 
            products: [] 
          });
        }

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
Bạn là chatbot e-commerce thân thiện của ShopMduc247. 
Lịch sử trò chuyện:
${historyText || "(Không có tin nhắn trước đó)"}

Dữ liệu sản phẩm:
${dataText || "Không có sản phẩm nào phù hợp."}

Người dùng hỏi: "${message}"
Hãy trả lời ngắn gọn, thân thiện, tối đa 100 từ. Tập trung vào gợi ý sản phẩm. Nhấn mạnh thông tin giá cả, đánh giá và cửa hàng.
        `;

        try {
          const chatCompletion = await groq.chat.completions.create({
            messages: [
              {
                role: 'system',
                content: 'Bạn là chatbot hỗ trợ khách hàng của ShopMduc247. Trả lời ngắn gọn, thân thiện bằng tiếng Việt.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            model: chatModelName,
            temperature: 0.2,
            max_tokens: 200,
          });

          reply = chatCompletion.choices[0]?.message?.content || reply;
        } catch (error) {
          console.error('Error calling Groq API:', error);
          // Fallback: tạo reply từ dữ liệu sản phẩm
          if (topProducts.length > 0) {
            reply = `Tôi tìm thấy ${topProducts.length} sản phẩm cho bạn:\n${topProducts.map((p, i) => {
              const metadata = p.metadata || {};
              const price = metadata.salePrice || metadata.price || 0;
              return `${i + 1}. ${metadata.name} - ${price.toLocaleString('vi-VN')}đ`;
            }).join('\n')}`;
          }
        }

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
Bạn là chatbot e-commerce thân thiện của ShopMduc247. 
Lịch sử trò chuyện:
${historyText || "(Không có tin nhắn trước đó)"}

Danh sách cửa hàng:
${dataText}

Người dùng hỏi: "${message}"
Hãy giới thiệu các cửa hàng phù hợp một cách ngắn gọn, thân thiện.
        `;

        try {
          const chatCompletion = await groq.chat.completions.create({
            messages: [
              {
                role: 'system',
                content: 'Bạn là chatbot hỗ trợ khách hàng của ShopMduc247. Trả lời ngắn gọn, thân thiện bằng tiếng Việt.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            model: chatModelName,
            temperature: 0.3,
            max_tokens: 300,
          });

          reply = chatCompletion.choices[0]?.message?.content || reply;
        } catch (error) {
          console.error('Error calling Groq API:', error);
          reply = `Tôi tìm thấy ${stores.length} cửa hàng:\n${stores.map((s, i) => `${i + 1}. ${s.name} - ${s.category}`).join('\n')}`;
        }

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
Bạn là chatbot e-commerce thân thiện của ShopMduc247.
Lịch sử trò chuyện:
${historyText || "(Không có lịch sử trước đó)"}

Người dùng vừa nói: "${message}"
Hãy phản hồi tự nhiên, ngắn gọn, thân thiện bằng tiếng Việt.
        `;

        try {
          const chatCompletion = await groq.chat.completions.create({
            messages: [
              {
                role: 'system',
                content: 'Bạn là chatbot hỗ trợ khách hàng của ShopMduc247, một trang thương mại điện tử. Trả lời thân thiện, ngắn gọn bằng tiếng Việt. Nếu khách hàng hỏi về sản phẩm, hãy hướng dẫn họ cách tìm kiếm.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            model: chatModelName,
            temperature: 0.3,
            max_tokens: 300,
          });

          reply = chatCompletion.choices[0]?.message?.content || reply;
        } catch (error) {
          console.error('Error calling Groq API:', error);
          reply = 'Xin lỗi, tôi đang gặp sự cố kỹ thuật. Vui lòng thử lại sau hoặc liên hệ bộ phận hỗ trợ.';
        }

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

module.exports = { chatWithGroq };
