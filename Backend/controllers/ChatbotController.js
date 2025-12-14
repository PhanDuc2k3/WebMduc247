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

// Từ điển dịch từ tiếng Việt sang tiếng Anh
const vietnameseToEnglishMap = {
  "máy tính xách tay": "laptop",
  "máy tính": "computer",
  "điện thoại": "phone",
  "điện thoại thông minh": "smartphone",
  "tai nghe": "headphone",
  "tai nghe không dây": "wireless headphone",
  "chuột máy tính": "mouse",
  "bàn phím": "keyboard",
  "màn hình": "monitor",
  "macbook": "macbook",
  "iphone": "iphone",
  "ipad": "ipad",
  "samsung": "samsung",
  "apple": "apple",
};

// Hàm dịch từ tiếng Việt sang tiếng Anh
async function translateVietnameseToEnglish(text) {
  if (!text) return [];
  
  const normalized = normalizeText(text);
  const keywords = [];
  let remainingText = normalized;
  
  // Kiểm tra các cụm từ trong từ điển
  const sortedEntries = Object.entries(vietnameseToEnglishMap).sort((a, b) => b[0].length - a[0].length);
  for (const [vn, en] of sortedEntries) {
    if (remainingText.includes(vn)) {
      keywords.push(en);
      remainingText = remainingText.replace(vn, "").trim();
    }
  }
  
  // Nếu vẫn còn text chưa được dịch, dùng Groq để dịch
  const remainingWords = remainingText.split(/\s+/).filter(w => w.length > 2);
  if (remainingWords.length > 0 && keywords.length === 0) {
    try {
      const translationPrompt = `Translate Vietnamese to English for e-commerce product search: "${text}". Return only keywords, no explanations.`;
      const translation = await groq.chat.completions.create({
        messages: [
          {
            role: 'system',
            content: 'You are a translation tool. Return only keywords separated by space.'
          },
          {
            role: 'user',
            content: translationPrompt
          }
        ],
        model: chatModelName,
        temperature: 0.1,
        max_tokens: 50,
      });
      
      const translated = translation.choices[0]?.message?.content?.trim() || "";
      if (translated) {
        const translatedKeywords = translated
          .toLowerCase()
          .replace(/[.,;:!?\-]/g, " ")
          .split(/\s+/)
          .filter(w => w.length > 2);
        keywords.push(...translatedKeywords);
      }
    } catch (error) {
      console.error('Error translating:', error);
    }
  }
  
  // Loại bỏ trùng lặp
  return [...new Set(keywords)];
}

// --- Tạo embedding bằng text search (Groq không có embedding API) ---
async function createEmbedding(text) {
  if (!text) return [];
  
  // Dịch từ tiếng Việt sang tiếng Anh
  const translatedKeywords = await translateVietnameseToEnglish(text);
  
  // Nếu có keywords đã dịch, dùng chúng
  if (translatedKeywords.length > 0) {
    return translatedKeywords;
  }
  
  // Fallback: dùng từ khóa gốc
  const keywords = normalizeText(text).split(/\s+/).filter(w => w.length > 2);
  return keywords;
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

    // Map products với score - chỉ lấy sản phẩm liên quan
    scoredProducts = products.map(product => {
      const vectorDoc = vectors.find(v => v.docId.toString() === product._id.toString());
      const normalizedName = normalizeText(product.name || "");
      const normalizedBrand = normalizeText(product.brand || "");
      const normalizedCategory = normalizeText(product.category || "");
      
      let score = 0;
      
      // Đếm số từ khóa match
      const nameMatches = queryKeywords.filter(keyword => normalizedName.includes(keyword));
      const brandMatches = queryKeywords.filter(keyword => normalizedBrand.includes(keyword));
      const categoryMatches = queryKeywords.filter(keyword => normalizedCategory.includes(keyword));
      
      // Kiểm tra tags/keywords match
      const hasTagMatch =
        product.tags?.some((tag) =>
          queryKeywords.some(kw => normalizeText(tag).includes(kw))
        ) ||
        product.keywords?.some((kw) =>
          queryKeywords.some(k => normalizeText(kw).includes(k))
        );

      // Tính score với độ ưu tiên: name > brand/category > tags/keywords
      // KHÔNG dùng description matching để tránh sản phẩm không liên quan
      if (nameMatches.length > 0) {
        // Tên sản phẩm match - score cao nhất
        const firstKeywordMatch = normalizedName.includes(queryKeywords[0]);
        score = firstKeywordMatch ? 0.95 : 0.85;
        if (nameMatches.length > 1) {
          score += 0.05;
        }
      } else if (brandMatches.length > 0 || categoryMatches.length > 0) {
        // Brand hoặc category match - phải match ít nhất 1 từ khóa chính
        const firstKeywordMatch = 
          normalizedBrand.includes(queryKeywords[0]) || 
          normalizedCategory.includes(queryKeywords[0]);
        
        if (firstKeywordMatch) {
          score = 0.8;
        } else if (brandMatches.length > 0 || categoryMatches.length > 0) {
          score = 0.75;
        }
      } else if (hasTagMatch) {
        // Tags/keywords match
        score = 0.7;
      }
      // Nếu không match gì cả -> score = 0 (sẽ bị loại bỏ)

      // Tăng điểm nếu có trong vector store (chỉ tăng nếu đã có điểm cơ bản)
      if (vectorDoc && score > 0) {
        score = Math.min(score + 0.05, 1.0);
      }

      return {
        metadata: product,
        vector: vectorDoc?.vector || [],
        score: Math.min(score, 1.0)
      };
    });

    // Sort theo score và ưu tiên match từ khóa đầu tiên
    scoredProducts.sort((a, b) => {
      const aHasFirstKeyword = normalizeText(a.metadata.name || "").includes(queryKeywords[0]);
      const bHasFirstKeyword = normalizeText(b.metadata.name || "").includes(queryKeywords[0]);
      if (aHasFirstKeyword && !bHasFirstKeyword) return -1;
      if (!aHasFirstKeyword && bHasFirstKeyword) return 1;
      return b.score - a.score;
    });
    
    // Lọc sản phẩm có score >= 0.7 để chỉ lấy sản phẩm thực sự liên quan
    // Loại bỏ hoàn toàn sản phẩm chỉ match description
    const relevantProducts = scoredProducts.filter(p => p.score >= 0.7);

    return relevantProducts.slice(0, k);
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
  console.log("🔵🔵🔵 BACKEND SERVICE - Backend/controllers/ChatbotController.js - NEW CODE VERSION! 🔵🔵🔵");
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

        // Trả về full product data - objects, không phải strings
        const productsData = topProducts
          .filter((p) => p && p.metadata && p.metadata._id)
          .map((p) => {
            const product = p.metadata;
            return {
              _id: product._id.toString(),
              name: product.name || "N/A",
              price: product.price || 0,
              salePrice: product.salePrice || null,
              images: Array.isArray(product.images) ? product.images : [],
              rating: product.rating || 0,
              reviewsCount: product.reviewsCount || 0,
              soldCount: product.soldCount || 0,
              brand: product.brand || null,
              category: product.category || null,
              description: product.description || null,
              store: product.store ? {
                name: product.store.name || "N/A",
                logoUrl: product.store.logoUrl || null
              } : null
            };
          })
          .filter((p) => p && p._id);

        console.log("Backend: Returning products as objects:", productsData.length);

        return res.json({
          reply,
          products: productsData || []
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
