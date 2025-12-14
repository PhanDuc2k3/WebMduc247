// config/groqConfig.js
const dotenv = require("dotenv");
const Groq = require("groq-sdk");
const Redis = require("ioredis");

dotenv.config();

// ====== ENV ======
const GROQ_API_KEY = process.env.GROQ_API_KEY;
if (!GROQ_API_KEY) console.error("⚠️ GROQ_API_KEY chưa thiết lập!");

const REDIS_URL = process.env.REDIS_URL;
if (!REDIS_URL) console.error("⚠️ REDIS_URL chưa thiết lập!");

// ====== Groq Client ======
const groq = new Groq({
  apiKey: GROQ_API_KEY,
});

const chatModelName = "llama-3.3-70b-versatile"; // Model Groq nhanh và tốt

// ====== Redis Connection ======
const redis = new Redis(REDIS_URL, { tls: { rejectUnauthorized: false } });
redis.on("connect", () => console.log("✅ Redis connected"));
redis.on("error", (err) => console.error("❌ Redis error:", err));

module.exports = {
  groq,
  chatModelName,
  redis,
};

