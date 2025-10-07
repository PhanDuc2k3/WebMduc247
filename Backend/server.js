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


app.use(cors({
    origin: 'http://localhost:5173',  
    credentials: true
}));
app.use(express.json());

app.use('/uploads', express.static('uploads'));


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

const io = new Server(server, {
    cors: {
        origin: 'http://localhost:5173',   
        methods: ['GET', 'POST'],
        credentials: true
    }
});


require('./websocket/chatSocket')(io);


const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
