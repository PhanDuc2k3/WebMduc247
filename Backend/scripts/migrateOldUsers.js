/**
 * Script migration: Đánh dấu tất cả tài khoản cũ (không có isVerified) là đã xác thực
 * 
 * Chạy script này một lần để cập nhật các tài khoản cũ trong database
 * 
 * Cách chạy:
 * node Backend/scripts/migrateOldUsers.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/Users');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ Lỗi kết nối MongoDB:', error.message);
    process.exit(1);
  }
};

const migrateOldUsers = async () => {
  try {
    console.log('🔄 Bắt đầu migration...');

    // Tìm tất cả user cũ:
    // 1. Không có isVerified hoặc isVerified = null/undefined
    // 2. Hoặc isVerified = false nhưng không có verificationCode (tài khoản cũ bị set false do default)
    const oldUsers = await User.find({
      $or: [
        { isVerified: { $exists: false } },
        { isVerified: null },
        { isVerified: undefined },
        { 
          isVerified: false,
          $or: [
            { verificationCode: { $exists: false } },
            { verificationCode: null },
            { verificationCode: "" }
          ]
        }
      ]
    });

    console.log(`📊 Tìm thấy ${oldUsers.length} tài khoản cũ cần cập nhật`);

    if (oldUsers.length === 0) {
      console.log('✅ Không có tài khoản nào cần cập nhật');
      return;
    }

    // Cập nhật tất cả tài khoản cũ thành isVerified: true
    const result = await User.updateMany(
      {
        $or: [
          { isVerified: { $exists: false } },
          { isVerified: null },
          { isVerified: undefined },
          { 
            isVerified: false,
            $or: [
              { verificationCode: { $exists: false } },
              { verificationCode: null },
              { verificationCode: "" }
            ]
          }
        ]
      },
      {
        $set: {
          isVerified: true,
          verificationCode: null,
          verificationCodeExpires: null
        }
      }
    );

    console.log(`✅ Đã cập nhật ${result.modifiedCount} tài khoản cũ thành đã xác thực`);
    console.log('🎉 Migration hoàn tất!');

  } catch (error) {
    console.error('❌ Lỗi migration:', error);
    throw error;
  }
};

const main = async () => {
  await connectDB();
  await migrateOldUsers();
  await mongoose.connection.close();
  console.log('✅ Đã đóng kết nối MongoDB');
  process.exit(0);
};

main();

