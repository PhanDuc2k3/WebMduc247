// server.js
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');

// 🧩 Import các route
const storeRoutes = require('./routes/StoreRoutes');
const userRoutes = require('./routes/UserRoutes');
const productRoutes = require('./routes/ProductRoutes');
const cartRoutes = require('./routes/CartRoutes');
const voucherRoutes = require('./routes/VoucherRoutes');
const orderRoutes = require('./routes/OrderRoutes');
const addressRoutes = require('./routes/AdressRoutes');
const statisticsRoutes = require('./routes/StatisticsRoutes');
const paymentRoutes = require('./routes/Payment');
const reviewRoutes = require('./routes/ReviewRoutes');
const messageRoutes = require('./routes/MessageRoutes');
const bannerRoutes = require("./routes/BannerRoutes");
// const chatbotRoutes = require("./routes/ChatbotRoutes"); // 👈 chatbot

dotenv.config();
connectDB();

const app = express();

// 🛡️ CORS
const allowedOrigins = [
  'http://localhost:5173',
  'https://webmduc247.onrender.com',
  'https://web-mduc247.vercel.app',
  'https://webmduc247-websocket.onrender.com',
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('CORS not allowed for this origin: ' + origin));
      }
    },
    credentials: true,
  })
);

// 📦 Parse JSON & URL-encoded body
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 🏠 Test route
app.get('/', (req, res) => res.send('Backend is running'));

// 🔗 Routes chính
app.use('/api/stores', storeRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/vouchers', voucherRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/address', addressRoutes);
app.use('/api/statistics', statisticsRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/review', reviewRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/banner', bannerRoutes);
// app.use('/api/chatbot', chatbotRoutes); // 👈 chatbot route

// 🧩 Middleware xử lý lỗi route không tồn tại
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// 🧩 Middleware xử lý lỗi server
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || "Internal Server Error" });
});

// 🚀 Khởi động server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(` Backend running on port ${PORT}`));
