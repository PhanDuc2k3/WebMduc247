const dotenv = require("dotenv");
const Groq = require("groq-sdk");
const Redis = require("ioredis");

dotenv.config();

// ====== ENV ======
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const REDIS_URL = process.env.REDIS_URL;

if (!GROQ_API_KEY) {
  console.error("⚠️ GROQ_API_KEY chưa thiết lập!");
}

// ====== Groq Client ======
const groq = new Groq({
  apiKey: GROQ_API_KEY,
});

const chatModelName = "llama-3.3-70b-versatile";

// ====== Redis Connection ======
let redis = null;

if (REDIS_URL) {
  redis = new Redis(REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy(times) {
      if (times > 3) return null;
      return Math.min(times * 1000, 3000);
    },
  });

  redis.on("connect", () => {
    console.log("[Redis] connected");
  });

  redis.on("error", (err) => {
    console.warn("[Redis] error:", err.message);
  });
} else {
  console.warn("[Redis] REDIS_URL chưa thiết lập, chạy không cache");
}

// ====== Export ======
module.exports = {
  groq,
  chatModelName,
  redis,
};