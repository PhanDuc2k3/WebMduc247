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
    discount: { type: Number, default: 0 }, // Số tiền giảm
    shippingFee: { type: Number, default: 0 },
    total: { type: Number, required: true, default: 0 },

    // 🟢 Liên kết voucher
    voucher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Voucher",
      default: null,
    },
    voucherCode: { type: String }, // dễ hiển thị ra UI
  },
  { timestamps: true }
);

// 🟢 Tính toán lại subtotal, total trước khi lưu
CartSchema.pre("save", function (next) {
  if (this.items && this.items.length > 0) {
    this.subtotal = this.items.reduce((sum, item) => sum + item.subtotal, 0);
  } else {
    this.subtotal = 0;
  }

  // đảm bảo discount không vượt quá subtotal
  if (this.discount > this.subtotal) {
    this.discount = this.subtotal;
  }

  this.total = this.subtotal - this.discount + this.shippingFee;
  next();
});

module.exports = mongoose.model("Cart", CartSchema);
