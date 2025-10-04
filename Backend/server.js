const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const http = require('http');                // 👈 thêm
const { Server } = require('socket.io');     // 👈 thêm
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

// Kết nối DB
connectDB();

const app = express();

// Middleware
app.use(cors({
    origin: 'http://localhost:5173',  // domain FE
    credentials: true
}));
app.use(express.json());

// Static file
app.use('/uploads', express.static('uploads'));

// API Routes
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
// -------------------------------
// ✅ Setup HTTP server & Socket.IO
// -------------------------------
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: 'http://localhost:5173',     // domain FE
        methods: ['GET', 'POST'],
        credentials: true
    }
});

// ✅ Import file websocket
require('./websocket/chatSocket')(io);

// -------------------------------
// ✅ Start server
// -------------------------------
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
