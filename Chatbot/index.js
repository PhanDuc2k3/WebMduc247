// backend/server.js
const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const mongoose = require("mongoose");
const Redis = require("ioredis");
// Groq SDK được import trong ChatbotController
const chatbotRoutes = require("./routes/chatbotRoutes.js");

dotenv.config();

const app = express();
app.use(express.json());

app.use(cors({
  origin: [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  ],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
}));

// ===== MongoDB =====
mongoose.connect(process.env.LOCAL_MONGO_URI || process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

// ===== Redis (Upstash) =====
const redis = new Redis(process.env.LOCAL_REDIS_URL || process.env.REDIS_URL, {
  maxRetriesPerRequest: 0,
  retryStrategy() {
    return null;
  },
  lazyConnect: true,
  enableReadyCheck: false,
});
redis.connect().catch(() => {
  // silent fail - service runs without cache
});
redis.on("ready", () => console.log("[Redis] connected"));
redis.on("error", err => {
  if (err.code !== "ECONNREFUSED" && err.code !== "ENOTFOUND") {
    console.error("[Redis] error:", err.message);
  }
});

// ===== Groq API =====
// Groq đã được khởi tạo trong ChatbotController

// ===== Routes =====
app.use("/api/chatbot", chatbotRoutes);

// ===== Health check route =====
app.get("/", (req, res) => {
  res.send(" Chatbot REST API is running and ready!");
});

// ===== Start Server =====
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(` Chatbot REST service running on port ${PORT}`));

// Export removed - Groq được khởi tạo trong ChatbotController
