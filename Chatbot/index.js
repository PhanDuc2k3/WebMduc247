// server.js
const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const mongoose = require("mongoose");
const Redis = require("ioredis");
const { GoogleGenAI } = require("@google/genai");
const chatbotRoutes = require("./routes/chatbotRoutes.js");

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors({ origin: "http://localhost:5173" }));

// ===== MongoDB =====
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

// ===== Redis =====
const redis = new Redis(process.env.REDIS_URL, {
  password: process.env.UPSTASH_REDIS_REST_TOKEN,
  tls: { rejectUnauthorized: false },
});
redis.on("connect", () => console.log("✅ Redis connected"));
redis.on("error", err => console.error("❌ Redis error:", err));

// ===== Gemini =====
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const chatModelName = "gemini-2.0-flash";
const embeddingModelName = "gemini-embedding-001";

// ===== Routes =====
app.use("/api/chatbot", chatbotRoutes);

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`🤖 Chatbot service running on port ${PORT}`));

module.exports = { redis, ai, chatModelName, embeddingModelName };
