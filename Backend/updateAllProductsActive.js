/**
 * Script để cập nhật tất cả sản phẩm thành isActive = true
 * Chạy: node updateAllProductsActive.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Product = require('./models/Product');

async function updateAllProducts() {
  console.log('🔄 Kết nối MongoDB...');
  await require('./config/db')();

  console.log('🔄 Đang cập nhật tất cả sản phẩm thành isActive = true...');
  
  const result = await Product.updateMany(
    {},
    { $set: { isActive: true } }
  );

  console.log(`✅ Đã cập nhật ${result.modifiedCount} sản phẩm`);
  
  // Đếm sản phẩm
  const total = await Product.countDocuments();
  const active = await Product.countDocuments({ isActive: true });
  
  console.log(`📊 Tổng sản phẩm: ${total}`);
  console.log(`📊 Sản phẩm active: ${active}`);
  
  await mongoose.connection.close();
  console.log('✅ Hoàn tất!');
}

updateAllProducts().catch(err => {
  console.error('❌ Lỗi:', err);
  process.exit(1);
});
