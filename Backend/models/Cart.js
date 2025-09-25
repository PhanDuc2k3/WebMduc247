const mongoose = require("mongoose");
const CartItemSchema = require("./CartItem");

const CartSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: [CartItemSchema],

    subtotal: { type: Number, required: true, default: 0 }, // Tổng giá gốc các item
    total: { type: Number, required: true, default: 0 }, // Chỉ lưu subtotal, FE tự tính total khi checkout
  },
  { timestamps: true }
);

// 🟢 Tính subtotal và total trước khi lưu
CartSchema.pre("save", function (next) {
  if (this.items && this.items.length > 0) {
    this.subtotal = this.items.reduce((sum, item) => sum + item.subtotal, 0);
  } else {
    this.subtotal = 0;
  }

  // total = subtotal (FE sẽ cộng shippingFee và trừ discount khi checkout)
  this.total = this.subtotal;

  next();
});

module.exports = mongoose.model("Cart", CartSchema);
