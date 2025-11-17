/**
 * Script reset lượt dùng voucher
 * 
 * Reset tất cả voucher về trạng thái chưa dùng:
 * - Xóa tất cả usersUsed (mảng rỗng)
 * - Đặt usedCount về 0
 * 
 * Cách chạy:
 * node Backend/scripts/resetVoucherUsage.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Voucher = require('../models/Voucher');

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://localhost:27017/webmduc247";
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    process.exit(1);
  }
};

const resetVoucherUsage = async () => {
  try {
    console.log("🔄 Bắt đầu reset lượt dùng voucher...\n");

    // Lấy tất cả voucher
    const vouchers = await Voucher.find({});
    console.log(`📊 Tìm thấy ${vouchers.length} voucher\n`);

    let totalReset = 0;

    for (const voucher of vouchers) {
      const hadUsersUsed = voucher.usersUsed && voucher.usersUsed.length > 0;
      const hadUsedCount = voucher.usedCount > 0;
      const usersCountBefore = hadUsersUsed ? voucher.usersUsed.length : 0;
      const usedCountBefore = voucher.usedCount || 0;

      if (hadUsersUsed || hadUsedCount) {
        // Reset usersUsed về mảng rỗng
        voucher.usersUsed = [];
        
        // Reset usedCount về 0
        voucher.usedCount = 0;
        
        await voucher.save();
        
        console.log(`✅ Voucher ${voucher.code}:`);
        if (hadUsersUsed) {
          console.log(`   - Đã xóa ${usersCountBefore} users khỏi usersUsed`);
        }
        if (hadUsedCount) {
          console.log(`   - Đã reset usedCount từ ${usedCountBefore} về 0`);
        }
        console.log(`   - Trạng thái: Chưa có ai sử dụng\n`);
        
        totalReset++;
      }
    }

    console.log("=".repeat(50));
    console.log(`✅ Hoàn tất reset!`);
    console.log(`   - Tổng voucher đã reset: ${totalReset}`);
    console.log(`   - Tổng voucher không cần reset: ${vouchers.length - totalReset}`);
    console.log("=".repeat(50));

  } catch (error) {
    console.error("❌ Lỗi reset:", error);
    throw error;
  }
};

const main = async () => {
  await connectDB();
  await resetVoucherUsage();
  await mongoose.connection.close();
  console.log("\n✅ Đã đóng kết nối database");
  process.exit(0);
};

main().catch((error) => {
  console.error("❌ Lỗi:", error);
  process.exit(1);
});

