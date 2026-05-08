/**
 * Script kiểm tra sản phẩm trong database
 * Chạy: node checkProducts.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Product = require('./models/Product');
const Store = require('./models/Store');

async function checkProducts() {
  console.log('🔄 Kết nối MongoDB...');
  await require('./config/db')();

  console.log('\n📊 Kiểm tra sản phẩm...\n');

  // Đếm tổng sản phẩm
  const totalProducts = await Product.countDocuments();
  console.log(`Tổng sản phẩm: ${totalProducts}`);

  // Đếm sản phẩm active
  const activeProducts = await Product.countDocuments({ isActive: true });
  console.log(`Sản phẩm isActive: true: ${activeProducts}`);

  // Lấy 5 sản phẩm đầu tiên
  const products = await Product.find({}).limit(5).lean();
  console.log('\n📦 5 sản phẩm đầu tiên:');
  products.forEach((p, i) => {
    console.log(`\n${i + 1}. ${p.name}`);
    console.log(`   - _id: ${p._id}`);
    console.log(`   - store: ${p.store}`);
    console.log(`   - isActive: ${p.isActive}`);
    console.log(`   - images: ${p.images?.length || 0} ảnh`);
    console.log(`   - price: ${p.price}`);
  });

  // Kiểm tra store
  console.log('\n🏪 Kiểm tra stores:');
  const stores = await Store.find({}).limit(5).lean();
  stores.forEach((s, i) => {
    console.log(`\n${i + 1}. ${s.name}`);
    console.log(`   - _id: ${s._id}`);
    console.log(`   - isActive: ${s.isActive}`);
  });

  // Đếm sản phẩm không có store
  const productsWithoutStore = await Product.countDocuments({ store: null });
  console.log(`\n⚠️ Sản phẩm không có store: ${productsWithoutStore}`);

  // Thử populate store
  console.log('\n🔍 Thử populate store cho 3 sản phẩm:');
  const productsWithStore = await Product.find({}).limit(3).populate('store').lean();
  productsWithStore.forEach((p, i) => {
    console.log(`\n${i + 1}. ${p.name}`);
    console.log(`   - store: ${p.store?.name || 'NULL'}`);
    console.log(`   - store.isActive: ${p.store?.isActive || 'N/A'}`);
  });

  await mongoose.connection.close();
  console.log('\n✅ Hoàn tất!');
}

checkProducts().catch(err => {
  console.error('❌ Lỗi:', err);
  process.exit(1);
});
