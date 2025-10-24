// controllers/ChatbotController.js
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { GoogleGenAI } from '@google/genai';
import VectorStore from '../models/VectorStore.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import cosineSim from '../utils/cosineSim.js';

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY chưa thiết lập!');
}

// --- Khởi tạo AI ---
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
const chatModelName = 'gemini-2.0-flash';
const embeddingModelName = 'gemini-embedding-001';

// --- Normalize text ---
function normalizeText(text) {
  if (!text) return '';
  return text.toLowerCase().trim().replace(/\s+/g, ' ');
}

// --- Tạo embedding ---
async function createEmbedding(text) {
  if (!text) return [];
  try {
    const res = await ai.models.embedContent({
      model: embeddingModelName,
      contents: [text]
    });
    return res.embeddings?.[0]?.values || [];
  } catch (err) {
    console.error('❌ Embedding failed:', err.message || err);
    return [];
  }
}

// --- Tìm top-K sản phẩm theo vector ---
async function retrieveTopKProducts(queryVector, k = 5) {
  if (!queryVector || queryVector.length === 0) return [];

  let docs = await VectorStore.find({ type: 'product' });

  docs = docs.map(d => ({
    ...d._doc,
    score: cosineSim(queryVector, d.vector || [])
  }));

  const topK = docs.sort((a, b) => b.score - a.score).slice(0, k);

  topK.forEach((d, i) =>
    console.log(`[DEBUG] Top ${i + 1}: ${d.metadata.name}, score=${d.score.toFixed(4)}`)
  );

  // Fallback: nếu tất cả score quá thấp (<0.2), thử match text trực tiếp
  if (topK.every(d => d.score < 0.2)) {
    console.log('[DEBUG] Score thấp, thử tìm trực tiếp bằng text');
    const allProducts = await Product.find({ isActive: true });
    const directMatch = allProducts.filter(p =>
      normalizeText(p.name).includes(normalizeText(queryVector.join(' ')))
    );
    if (directMatch.length > 0) return directMatch.map(p => ({ metadata: p, vector: [] }));
  }

  return topK.map(d => d);
}

// --- Tạo order ---
async function createOrder(userId, products) {
  if (!userId || !products || products.length === 0) return null;

  const order = new Order({
    userId,
    products: products.map(p => p.docId || p._id),
    status: 'pending',
    createdAt: new Date()
  });

  await order.save();
  return order;
}

// --- Kiểm tra intent ---
function isProductIntent(message) {
  const keywords = ['tìm', 'xem', 'muốn mua', 'iphone', 'điện thoại', 'laptop', 'tai nghe', 'macbook', 'doremon', 'truyện'];
  return keywords.some(k => message.toLowerCase().includes(k));
}

// --- Controller chat ---
async function chatWithGemini(req, res) {
  const { message, userId } = req.body;
  if (!message) return res.status(400).json({ reply: 'Thiếu message!' });

  console.log(`\n--- START CHAT: User=${userId || 'GUEST'}, Msg="${message}" ---`);

  let action = 'chat';
  if (isProductIntent(message)) action = 'find_product';
  if (message.toLowerCase().includes('mua')) action = 'create_order';

  try {
    switch (action) {

      // --- Tìm sản phẩm ---
      case 'find_product': {
        const queryVector = await createEmbedding(message);
        if (!queryVector.length) return res.json({ reply: 'Mình không thể tạo embedding, thử lại sau nhé!', products: [] });

        const topProducts = await retrieveTopKProducts(queryVector, 5);

        const dataText = topProducts.map(p =>
          `• ${p.metadata.name} (Brand: ${p.metadata.brand || 'N/A'}, Category: ${p.metadata.category || 'N/A'})`
        ).join('\n');

        const prompt = `
Bạn là chatbot e-commerce , trả lời ngắn gọn tối đa 100 từ.
Dữ liệu sản phẩm tham khảo:
${dataText || 'Không có sản phẩm nào liên quan.'}
Người dùng hỏi: "${message}"
Hãy trả lời tập trung vào danh sách sản phẩm.
Nếu có người dùng nào cần tư vấn thì hãy giới thiệu sản phẩm sẵn có
        `;

        let reply = 'Mình chưa tìm thấy sản phẩm nào!';
        try {
          const chatRes = await ai.models.generateContent({
            model: chatModelName,
            contents: prompt,
            config: { temperature: 0.2 }
          });
          reply = chatRes.text || reply;
        } catch (err) {
          console.warn('⚠️ Chat generation failed:', err.message || err);
        }

        return res.json({
          reply,
          products: topProducts.map(p => p.metadata.name)
        });
      }

      // --- Tạo order ---
      case 'create_order': {
        const queryVector = await createEmbedding(message);
        const topProducts = await retrieveTopKProducts(queryVector, 3);
        if (!userId) return res.json({ reply: 'Bạn cần đăng nhập để mua sản phẩm', orderId: null });

        const order = await createOrder(userId, topProducts);
        return res.json({
          reply: `Đơn hàng của bạn đã được tạo gồm: ${topProducts.map(p => p.metadata.name).join(', ')}`,
          orderId: order ? order._id : null
        });
      }

      // --- Chat bình thường ---
      case 'chat':
      default: {
        let reply = 'Mình chưa hiểu!';
        try {
          const chatRes = await ai.models.generateContent({
            model: chatModelName,
            contents: message,
            config: { temperature: 0.3 }
          });
          reply = chatRes.text || reply;
        } catch (err) {
          console.warn('⚠️ Chat generation failed:', err.message || err);
        }
        return res.json({ reply });
      }
    }
  } catch (err) {
    console.error('❌ Chat controller error:', err);
    return res.json({ reply: 'Có lỗi xảy ra, thử lại sau nhé!' });
  }
}

export { chatWithGemini };
