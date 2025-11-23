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
  'https://shopmduc247.online',
  'http://localhost:5173',
  'https://webmduc247.onrender.com',
  'https://web-mduc247.vercel.app',
  'https://webmduc247-websocket.onrender.com',
  ],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
}));

// ===== MongoDB =====
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

// ===== Redis (Upstash) =====
const redis = new Redis(process.env.REDIS_URL, {
  password: process.env.UPSTASH_REDIS_REST_TOKEN,
  tls: { rejectUnauthorized: false },
});
redis.on("connect", () => console.log("Redis connected"));
redis.on("error", err => console.error(" Redis error:", err));

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
