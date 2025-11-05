const mongoose = require("mongoose");

const ReviewSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    userInfo: {
      fullName: { type: String, required: true },
      avatarUrl: { type: String }, 
    },

    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: "" },

    images: [{ type: String }],
    
    editCount: { type: Number, default: 0 }, // Số lần đã chỉnh sửa (tối đa 1) 
  },
  { timestamps: true }
);

module.exports = mongoose.model("Review", ReviewSchema);
