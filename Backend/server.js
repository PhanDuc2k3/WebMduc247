const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');

const storeRoutes = require('./routes/StoreRoutes');
const userRoutes = require('./routes/UserRoutes');
const productRoutes = require('./routes/ProductRoutes');
const cartRoutes = require('./routes/CartRoutes');
const voucherRoutes = require('./routes/VoucherRoutes');
const orderRoutes = require('./routes/OrderRoutes');
const addressRoutes = require('./routes/AdressRoutes');
const StatisticsRoutes = require('./routes/StatisticsRoutes');
const PaymentRoutes = require('./routes/Payment');
const ReviewRoutes = require('./routes/ReviewRoutes');
const messageRoutes = require('./routes/MessageRoutes');

dotenv.config();
connectDB();

const app = express();

// ✅ Danh sách origin được phép
const allowedOrigins = [
  'http://localhost:5173',
  'https://webmduc247.onrender.com',  
  'https://web-mduc247.vercel.app', 
];

// ✅ Cấu hình CORS đúng cách
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

app.use(express.json());
app.use('/uploads', express.static('uploads'));

// ✅ Routes
app.get('/', (req, res) => {
  res.send('Backend is running');
});

app.use('/api/stores', storeRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/vouchers', voucherRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/address', addressRoutes);
app.use('/api/statistics', StatisticsRoutes);
app.use('/api/payment', PaymentRoutes);
app.use('/api/review', ReviewRoutes);
app.use('/api/messages', messageRoutes);

const server = http.createServer(app);

// ✅ Socket.io cũng cần CORS tương tự
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

require('./websocket/chatSocket')(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
