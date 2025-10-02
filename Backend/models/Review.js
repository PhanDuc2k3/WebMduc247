const mongoose = require("mongoose");

const ReviewSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    userInfo: {
      fullName: { type: String, required: true },
      avatarUrl: { type: String }, // ❌ bỏ default "/avatar.png" → luôn lấy từ User
    },

    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, default: "" },

    images: [{ type: String }], // danh sách đường dẫn ảnh upload
  },
  { timestamps: true }
);

module.exports = mongoose.model("Review", ReviewSchema);
