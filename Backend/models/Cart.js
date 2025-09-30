const mongoose = require("mongoose");
const CartItemSchema = require("./CartItem");

const CartSchema = new mongoose.Schema(
  {
    // 👉 Chủ giỏ hàng
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // 👉 Danh sách sản phẩm
    items: [CartItemSchema],

    // 👉 Tổng giá của tất cả sản phẩm trong giỏ
    subtotal: { 
      type: Number, 
      required: true, 
      default: 0 
    },

    // 👉 Tổng giá (tạm thời = subtotal, FE sẽ cộng thêm shippingFee, trừ discount)
    total: { 
      type: Number, 
      required: true, 
      default: 0 
    },
  },
  { timestamps: true }
);

// 🟢 Tự động tính subtotal & total trước khi lưu
CartSchema.pre("save", function (next) {
  if (this.items && this.items.length > 0) {
    // ✅ Cộng subtotal của những sản phẩm trong giỏ
    this.subtotal = this.items.reduce((sum, item) => sum + item.subtotal, 0);
  } else {
    this.subtotal = 0;
  }

  // ✅ Total mặc định = subtotal
  // (FE sẽ xử lý thêm shippingFee & voucher discount khi thanh toán)
  this.total = this.subtotal;

  next();
});

module.exports = mongoose.model("Cart", CartSchema);
