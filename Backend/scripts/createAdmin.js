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

    // Kiểm tra xem đã có admin nào trong hệ thống chưa
    const existingAdminInSystem = await User.findOne({ role: 'admin' });
    
    // Kiểm tra xem email admin đã tồn tại chưa
    const existingAdminByEmail = await User.findOne({ email: adminEmail });
    
    if (existingAdminInSystem) {
      // Nếu đã có admin trong hệ thống
      if (existingAdminInSystem.email === adminEmail) {
        // Nếu admin hiện tại chính là email này, cập nhật mật khẩu
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        existingAdminInSystem.password = hashedPassword;
        existingAdminInSystem.isVerified = true;
        await existingAdminInSystem.save();
        console.log('✅ Đã cập nhật mật khẩu admin');
        console.log(`📧 Email: ${adminEmail}`);
        console.log(`🔑 Password: ${adminPassword}`);
        console.log(`👤 Role: admin`);
        return;
      } else {
        // Nếu đã có admin khác, không cho tạo admin mới
        console.error('❌ Hệ thống chỉ cho phép 1 tài khoản admin duy nhất.');
        console.error(`⚠️ Admin hiện tại: ${existingAdminInSystem.email}`);
        console.error('💡 Nếu muốn thay đổi admin, vui lòng xóa admin cũ trước.');
        return;
      }
    }
    
    if (existingAdminByEmail) {
      // Nếu email đã tồn tại nhưng không phải admin, cập nhật thành admin
      if (existingAdminByEmail.role !== 'admin') {
        existingAdminByEmail.role = 'admin';
        existingAdminByEmail.isVerified = true;
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        existingAdminByEmail.password = hashedPassword;
        await existingAdminByEmail.save();
        console.log('✅ Đã cập nhật tài khoản thành admin');
        console.log(`📧 Email: ${adminEmail}`);
        console.log(`🔑 Password: ${adminPassword}`);
        console.log(`👤 Role: admin`);
        return;
      }
    }

    // Tạo admin mới (chỉ khi chưa có admin nào trong hệ thống)
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

