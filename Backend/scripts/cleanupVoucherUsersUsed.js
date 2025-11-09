const mongoose = require("mongoose");
require("dotenv").config();
const Voucher = require("../models/Voucher");

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

const cleanupVoucherUsersUsed = async () => {
  try {
    console.log("🧹 Bắt đầu cleanup duplicate userId trong usersUsed array...\n");

    // Lấy tất cả voucher có usersUsed
    const vouchers = await Voucher.find({ usersUsed: { $exists: true, $ne: [] } });
    console.log(`📊 Tìm thấy ${vouchers.length} voucher có usersUsed\n`);

    let totalCleaned = 0;
    let totalRemoved = 0;

    for (const voucher of vouchers) {
      const originalLength = voucher.usersUsed ? voucher.usersUsed.length : 0;
      
      if (!voucher.usersUsed || voucher.usersUsed.length === 0) {
        continue;
      }

      // Loại bỏ duplicate bằng cách chuyển về string và dùng Set
      const uniqueUserIds = [];
      const seen = new Set();

      for (const userId of voucher.usersUsed) {
        const userIdString = userId.toString();
        if (!seen.has(userIdString)) {
          seen.add(userIdString);
          // Giữ lại ObjectId nếu có thể, nếu không thì tạo mới
          if (mongoose.Types.ObjectId.isValid(userIdString)) {
            uniqueUserIds.push(new mongoose.Types.ObjectId(userIdString));
          } else {
            uniqueUserIds.push(userIdString);
          }
        }
      }

      const newLength = uniqueUserIds.length;
      const removed = originalLength - newLength;

      if (removed > 0) {
        // Cập nhật usersUsed với unique values
        voucher.usersUsed = uniqueUserIds;
        
        // Cập nhật usedCount để phản ánh số lượng unique users
        // Nếu usedCount lớn hơn số unique users, cập nhật lại
        if (voucher.usedCount > newLength) {
          voucher.usedCount = newLength;
        }
        
        await voucher.save();
        
        console.log(`✅ Voucher ${voucher.code}:`);
        console.log(`   - Trước: ${originalLength} users`);
        console.log(`   - Sau: ${newLength} unique users`);
        console.log(`   - Đã xóa: ${removed} duplicate entries`);
        console.log(`   - usedCount: ${voucher.usedCount}\n`);
        
        totalCleaned++;
        totalRemoved += removed;
      }
    }

    console.log("=".repeat(50));
    console.log(`✅ Hoàn tất cleanup!`);
    console.log(`   - Tổng voucher đã cleanup: ${totalCleaned}`);
    console.log(`   - Tổng duplicate đã xóa: ${totalRemoved}`);
    console.log("=".repeat(50));

  } catch (error) {
    console.error("❌ Lỗi cleanup:", error);
    throw error;
  }
};

const main = async () => {
  await connectDB();
  await cleanupVoucherUsersUsed();
  await mongoose.connection.close();
  console.log("\n✅ Đã đóng kết nối database");
  process.exit(0);
};

main().catch((error) => {
  console.error("❌ Lỗi:", error);
  process.exit(1);
});

