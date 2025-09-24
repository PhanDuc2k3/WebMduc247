const mongoose = require("mongoose");

const voucherSchema = new mongoose.Schema(
  {
    code: { 
      type: String, 
      required: true, 
      unique: true, // mỗi mã voucher chỉ có 1
      uppercase: true, // lưu thành chữ in hoa để dễ check
      trim: true 
    }, 
    title: { type: String, required: true },           // tiêu đề hiển thị
    description: { type: String, required: true },    // mô tả
    condition: { type: String, required: true },       // ví dụ "Từ 500.000 ₫"
    
    discountType: {
      type: String,
      enum: ["fixed", "percent"],                     
      default: "fixed"
    },
    discountValue: { type: Number, required: true }, 
    minOrderValue: { type: Number, default: 0 },      
    maxDiscount: { type: Number },                    
    store: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Store",                                  
    },
    global: { type: Boolean, default: false },      
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },

    usageLimit: { type: Number, default: 100 },
    usedCount: { type: Number, default: 0 },          
    usersUsed: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Voucher", voucherSchema);
