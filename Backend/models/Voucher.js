const mongoose = require("mongoose");

const voucherSchema = new mongoose.Schema(
  {
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
    global: { type: Boolean, default: false },      
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },

    usageLimit: { type: Number, default: 100 },
    usedCount: { type: Number, default: 0 },          
    usersUsed: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // user nào đã dùng

    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Voucher", voucherSchema);
