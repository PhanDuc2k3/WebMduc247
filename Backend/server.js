const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');

// Load biến môi trường
dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Import routes
const userRoutes = require('./routes/UserRoutes');

// Routes
app.use('/api/users', userRoutes);

// Kết nối MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ MongoDB connected');
  app.listen(process.env.PORT || 5000, () => {
    console.log(`🚀 Server chạy tại http://localhost:${process.env.PORT || 5000}`);
  });
})
.catch(err => {
  console.error('❌ Lỗi kết nối MongoDB:', err.message);
});
