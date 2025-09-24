const mongoose = require("mongoose");

const voucherSchema = new mongoose.Schema(
  {
    code: { 
      type: String, 
      required: true, 
      unique: true, 
      uppercase: true, 
      trim: true 
    }, 
    title: { type: String, required: true },
    description: { type: String, required: true },
    condition: { type: String, required: true },
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
    categories: [{ type: String }],
    global: { type: Boolean, default: false },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    usageLimit: { type: Number, default: 100 },
    usedCount: { type: Number, default: 0 },
    usersUsed: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    isActive: { type: Boolean, default: true },
    price: { type: String },
    date: { type: String },
    usagePercent: { type: Number },
    used: { type: Boolean, default: false }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Voucher", voucherSchema);
