require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db'); // file kết nối MongoDB của bạn
const { GoogleGenAI } = require('@google/genai');

const Product = require('../models/Product');
const VectorStore = require('../models/VectorStore');

// --- Khởi tạo Gemini AI ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  console.error('❌ GEMINI_API_KEY chưa thiết lập trong .env');
  process.exit(1);
}

const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
const embeddingModel = 'gemini-embedding-001'; // model embedding

// --- Hàm normalize text ---
function normalizeText(text) {
  if (!text) return '';
  return text.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Tạo embedding cho text
 * @param {string} text
 * @returns {Promise<number[]>}
 */
async function createEmbedding(text) {
  if (!text) return [];
  try {
    const res = await ai.models.embedContent({
      model: embeddingModel,
      contents: [text]
    });
    return res.embeddings?.[0]?.values || [];
  } catch (err) {
    console.error('❌ Embedding failed:', err.message || err);
    return [];
  }
}

async function main() {
  try {
    await connectDB();
    console.log('✅ MongoDB connected');

    const products = await Product.find({ isActive: true });
    console.log(`🔹 Found ${products.length} active products`);

    for (const p of products) {
      // --- Normalize tất cả text trước khi tạo embedding ---
      const text = normalizeText([
        p.name,
        p.description,
        p.category,
        p.brand,
        ...(p.tags || []),
        ...(p.keywords?.flat() || [])
      ].join(' '));

      console.log(`[DEBUG] Creating embedding for product: ${p.name}`);

      const vector = await createEmbedding(text);
      if (!vector || vector.length === 0) {
        console.warn(`⚠️ Không tạo được embedding cho product ${p.name}`);
        continue;
      }

      await VectorStore.findOneAndUpdate(
        { docId: p._id },
        {
          docId: p._id,
          type: 'product',
          vector,
          metadata: {
            name: p.name,
            category: p.category,
            brand: p.brand,
            tags: p.tags,
            keywords: p.keywords
          }
        },
        { upsert: true }
      );

      console.log(`✅ Product "${p.name}" đã tạo embedding`);
    }

    console.log('🎉 Hoàn tất tạo embedding cho tất cả sản phẩm!');
  } catch (err) {
    console.error('❌ Script error:', err);
  } finally {
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed');
  }
}

main();
