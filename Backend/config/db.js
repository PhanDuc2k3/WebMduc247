const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const mongoUri = process.env.LOCAL_MONGO_URI || process.env.MONGO_URI;
        if (!mongoUri) throw new Error('LOCAL_MONGO_URI hoặc MONGO_URI chưa được cấu hình');
        const conn = await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 5000 });
        console.log(`MongoDB connected: ${conn.connection.host}`);
    } catch (error) {
        throw new Error(`Không thể kết nối MongoDB: ${error.message}`);
    }
};

module.exports = connectDB;
