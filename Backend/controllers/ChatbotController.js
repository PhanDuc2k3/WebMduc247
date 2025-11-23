// controllers/ChatbotController.js
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const Groq = require('groq-sdk');
const VectorStore = require('../models/VectorStore');
const Product = require('../models/Product');
const Order = require('../models/Order');
const cosineSim = require('../utils/cosineSim');

dotenv.config();

const GROQ_API_KEY = process.env.GROQ_API_KEY;
if (!GROQ_API_KEY) {
  console.error('GROQ_API_KEY chưa thiết lập!');
}

// --- Khởi tạo AI ---
const groq = new Groq({
  apiKey: GROQ_API_KEY,
});

const chatModelName = 'llama-3.3-70b-versatile'; // Model Groq nhanh và tốt

// --- Normalize text ---
function normalizeText(text) {
  if (!text) return '';
  return text.toLowerCase().trim().replace(/\s+/g, ' ');
}

// --- Tạo embedding bằng text search (Groq không có embedding API) ---
async function createEmbedding(text) {
  if (!text) return [];
  
  // Groq không có embedding API, sử dụng text search thay thế
  // Trả về keywords để dùng cho text search
  const keywords = normalizeText(text).split(/\s+/).filter(w => w.length > 2);
  return keywords; // Trả về array keywords thay vì vector
}

// --- Tìm top-K sản phẩm bằng text search (thay thế vector search) ---
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
      .limit(k)
      .populate('store', 'name logoUrl');

    // Nếu có vector store, vẫn có thể dùng để rank kết quả
    let scoredProducts = [];
    
    // Lấy products có embedding trong VectorStore
    const productIds = products.map(p => p._id);
    const vectors = await VectorStore.find({
      type: 'product',
      docId: { $in: productIds }
    });

    // Map products với score (nếu có vector)
    scoredProducts = products.map(product => {
      const vectorDoc = vectors.find(v => v.docId.toString() === product._id.toString());
      // Ưu tiên sản phẩm có trong vector store
      const score = vectorDoc ? 0.8 : 0.5;
      return {
        metadata: product,
        vector: vectorDoc?.vector || [],
        score: score
      };
    });

    // Sort theo score và tên match
    scoredProducts.sort((a, b) => {
      const aNameMatch = normalizeText(a.metadata.name).includes(queryKeywords.join(' '));
      const bNameMatch = normalizeText(b.metadata.name).includes(queryKeywords.join(' '));
      if (aNameMatch && !bNameMatch) return -1;
      if (!aNameMatch && bNameMatch) return 1;
      return b.score - a.score;
    });

    return scoredProducts.slice(0, k);
  } catch (error) {
    console.error('Error retrieving products:', error);
    return [];
  }
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
async function chatWithGroq(req, res) {
  const { message, userId } = req.body;
  if (!message) return res.status(400).json({ reply: 'Thiếu message!' });

  let action = 'chat';
  if (isProductIntent(message)) action = 'find_product';
  if (message.toLowerCase().includes('mua')) action = 'create_order';

  try {
    switch (action) {

      case 'find_product': {
        const queryKeywords = await createEmbedding(message);
        if (!queryKeywords.length) {
          return res.json({ 
            reply: 'Vui lòng nhập từ khóa tìm kiếm cụ thể hơn!', 
            products: [] 
          });
        }

        const topProducts = await retrieveTopKProducts(queryKeywords, 5);

        if (topProducts.length === 0) {
          return res.json({ 
            reply: 'Mình không tìm thấy sản phẩm nào phù hợp. Bạn có thể thử tìm kiếm với từ khóa khác!', 
            products: [] 
          });
        }

        const dataText = topProducts.map(p => {
          const product = p.metadata;
          const price = product.salePrice || product.price || 0;
          return `• ${product.name} - Thương hiệu: ${product.brand || 'N/A'}, Danh mục: ${product.category || 'N/A'}, Giá: ${price.toLocaleString('vi-VN')}đ`;
        }).join('\n');

        const prompt = `
Bạn là chatbot e-commerce thân thiện của ShopMduc247.
Dữ liệu sản phẩm tìm được:
${dataText || 'Không có sản phẩm nào liên quan.'}

Người dùng hỏi: "${message}"

Hãy trả lời ngắn gọn, thân thiện, tối đa 100 từ. Tập trung vào danh sách sản phẩm đã tìm được. Nhấn mạnh tên sản phẩm, thương hiệu và giá cả.
        `;

        let reply = 'Mình chưa tìm thấy sản phẩm nào!';
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
            reply = `Tôi tìm thấy ${topProducts.length} sản phẩm cho bạn:\n${topProducts.map((p, i) => `${i + 1}. ${p.metadata.name} - ${(p.metadata.salePrice || p.metadata.price || 0).toLocaleString('vi-VN')}đ`).join('\n')}`;
          }
        }

        return res.json({
          reply,
          products: topProducts.map(p => p.metadata.name)
        });
      }

      case 'create_order': {
        const queryKeywords = await createEmbedding(message);
        const topProducts = await retrieveTopKProducts(queryKeywords, 3);
        if (!userId) return res.json({ reply: 'Bạn cần đăng nhập để mua sản phẩm', orderId: null });

        const order = await createOrder(userId, topProducts);
        return res.json({
          reply: `Đơn hàng của bạn đã được tạo gồm: ${topProducts.map(p => p.metadata.name).join(', ')}`,
          orderId: order ? order._id : null
        });
      }

      case 'chat':
      default: {
        let reply = 'Xin chào! Tôi là chatbot của ShopMduc247. Tôi có thể giúp bạn tìm kiếm sản phẩm. Bạn muốn tìm gì?';
        try {
          const chatCompletion = await groq.chat.completions.create({
            messages: [
              {
                role: 'system',
                content: 'Bạn là chatbot hỗ trợ khách hàng của ShopMduc247, một trang thương mại điện tử. Trả lời thân thiện, ngắn gọn bằng tiếng Việt. Nếu khách hàng hỏi về sản phẩm, hãy hướng dẫn họ cách tìm kiếm.'
              },
              {
                role: 'user',
                content: message
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
        return res.json({ reply });
      }
    }
  } catch (error) {
    console.error('Chatbot error:', error);
    return res.status(500).json({ 
      reply: 'Có lỗi xảy ra, thử lại sau nhé!',
      error: error.message 
    });
  }
}

module.exports = { chatWithGroq };
