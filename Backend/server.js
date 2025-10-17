const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const connectDB = require('./config/db');

// Routes
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

dotenv.config();
connectDB();

const app = express();

// ✅ Danh sách origin được phép
const allowedOrigins = [
  'http://localhost:5173',
  'https://webmduc247.onrender.com',
  'https://web-mduc247.vercel.app',
];

// ✅ CORS
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

// Không cần nữa vì upload lên Cloudinary
// app.use('/uploads', express.static('uploads'));

// ✅ Routes
app.get('/', (req, res) => res.send('Backend is running'));

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



// ✅ Socket.io
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});
require('./websocket/chatSocket')(io);

// ✅ Port
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(` Server running on port ${PORT}`));
