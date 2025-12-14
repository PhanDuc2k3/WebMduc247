// Script để cập nhật lại reviewsCount cho tất cả sản phẩm
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Product = require('../models/Product');
const Review = require('../models/Review');

dotenv.config();

async function updateAllReviewsCount() {
  try {
    // Kết nối database - sử dụng MONGO_URI như các script khác
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/shopmduc247';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Lấy tất cả sản phẩm
    const products = await Product.find({});
    console.log(`📦 Found ${products.length} products`);

    let updated = 0;
    let errors = 0;

    // Cập nhật reviewsCount cho từng sản phẩm
    for (const product of products) {
      try {
        // Tính rating trung bình và đếm số lượng reviews
        const stats = await Review.aggregate([
          { $match: { productId: product._id } },
          { 
            $group: { 
              _id: "$productId", 
              avgRating: { $avg: "$rating" },
              reviewsCount: { $sum: 1 }
            } 
          },
        ]);

        const avgRating = stats.length > 0 ? (stats[0].avgRating || 0) : 0;
        const actualReviewsCount = stats.length > 0 ? (stats[0].reviewsCount || 0) : 0;

        // Cập nhật product
        await Product.findByIdAndUpdate(product._id, {
          rating: avgRating,
          reviewsCount: actualReviewsCount
        });

        if (actualReviewsCount > 0 || product.rating > 0) {
          console.log(`✅ Updated product "${product.name}": rating=${avgRating.toFixed(1)}, reviewsCount=${actualReviewsCount}`);
        }
        updated++;
      } catch (error) {
        console.error(`❌ Error updating product ${product._id}:`, error.message);
        errors++;
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Updated: ${updated} products`);
    console.log(`   ❌ Errors: ${errors} products`);
    console.log('✅ Done!');

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Chạy script
updateAllReviewsCount();

