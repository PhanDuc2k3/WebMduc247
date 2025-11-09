/**
 * Script tạo tài khoản admin
 * 
 * Tạo tài khoản admin với:
 * - Email: admin@gmail.com
 * - Password: 123123
 * - Role: admin
 * 
 * Cách chạy:
 * node Backend/scripts/createAdmin.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/Users');
const bcrypt = require('bcryptjs');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ Lỗi kết nối MongoDB:', error.message);
    process.exit(1);
  }
};

const createAdmin = async () => {
  try {
    console.log('🔄 Bắt đầu tạo tài khoản admin...');

    const adminEmail = 'admin@gmail.com';
    const adminPassword = '123123';
    const adminFullName = 'Administrator';
    const adminPhone = '0123456789';

    // Kiểm tra xem admin đã tồn tại chưa
    const existingAdmin = await User.findOne({ email: adminEmail });
    
    if (existingAdmin) {
      // Nếu đã tồn tại, cập nhật thành admin
      if (existingAdmin.role !== 'admin') {
        existingAdmin.role = 'admin';
        existingAdmin.isVerified = true;
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        existingAdmin.password = hashedPassword;
        await existingAdmin.save();
        console.log('✅ Đã cập nhật tài khoản thành admin');
      } else {
        // Cập nhật mật khẩu nếu cần
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        existingAdmin.password = hashedPassword;
        existingAdmin.isVerified = true;
        await existingAdmin.save();
        console.log('✅ Đã cập nhật mật khẩu admin');
      }
      console.log(`📧 Email: ${adminEmail}`);
      console.log(`🔑 Password: ${adminPassword}`);
      console.log(`👤 Role: admin`);
      return;
    }

    // Tạo admin mới
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    const newAdmin = new User({
      email: adminEmail,
      password: hashedPassword,
      fullName: adminFullName,
      phone: adminPhone,
      role: 'admin',
      isVerified: true,
      verificationCode: null,
      verificationCodeExpires: null
    });

    await newAdmin.save();
    console.log('✅ Đã tạo tài khoản admin thành công!');
    console.log(`📧 Email: ${adminEmail}`);
    console.log(`🔑 Password: ${adminPassword}`);
    console.log(`👤 Role: admin`);
    console.log(`📱 Phone: ${adminPhone}`);

  } catch (error) {
    console.error('❌ Lỗi khi tạo admin:', error);
    throw error;
  }
};

const main = async () => {
  await connectDB();
  await createAdmin();
  console.log('🎉 Hoàn tất!');
  process.exit(0);
};

main();

