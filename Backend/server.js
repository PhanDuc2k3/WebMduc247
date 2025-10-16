const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');

// Import routes
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

//  Danh sách origin được phép
const allowedOrigins = [
  'http://localhost:5173',
  'https://webmduc247.onrender.com',
  'https://web-mduc247.vercel.app',
];

//  Regex cho phép tất cả subdomain của Vercel
const vercelRegex = /^https:\/\/web-mduc247.*\.vercel\.app$/;

//  Middleware CORS với log chi tiết
app.use(
  cors({
    origin: function (origin, callback) {
      console.log(' Request from origin:', origin || '(local)');
      if (!origin || allowedOrigins.includes(origin) || vercelRegex.test(origin)) {
        console.log(' CORS allowed for:', origin || '(local)');
        callback(null, true);
      } else {
        console.log(' CORS blocked for:', origin);
        callback(new Error('CORS not allowed for this origin: ' + origin));
      }
    },
    credentials: true,
  })
);

app.use(express.json());
app.use('/uploads', express.static('uploads'));

//  Routes
app.get('/', (req, res) => {
  res.json({
    message: ' Backend is running',
    origin: req.headers.origin || '(no origin header)',
    allowed: allowedOrigins,
  });
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

//  Socket.io CORS config (đồng nhất với Express)
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      console.log('💬 [Socket.io] Connection from:', origin || '(local)');
      if (!origin || allowedOrigins.includes(origin) || vercelRegex.test(origin)) {
        console.log(' [Socket.io] Allowed:', origin || '(local)');
        callback(null, true);
      } else {
        console.error('[Socket.io] Blocked origin:', origin);
        callback(new Error('Not allowed by Socket.io CORS'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

//  Gọi module chat socket
require('./websocket/chatSocket')(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(` Server running on port ${PORT}`);
});
