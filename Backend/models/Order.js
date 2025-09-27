const mongoose = require("mongoose");
const CartItemSchema = require("./CartItem");

const OrderSchema = new mongoose.Schema(
  {
    orderCode: { type: String, required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    items: [CartItemSchema],

    userInfo: {
      fullName: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, required: true },
      role: { type: String, enum: ["buyer", "seller", "admin"], required: true },
      avatarUrl: { type: String, default: "/avatar.png" } // giữ nguyên
    },

    shippingAddress: {
      fullName: { type: String, required: true },
      phone: { type: String, required: true },
      address: { type: String, required: true },
    },

    shippingInfo: {
      method: { type: String, default: "Giao hàng nhanh" },
      trackingNumber: { type: String, default: "" },
      estimatedDelivery: { type: Date },
    },

    paymentInfo: {
      method: { type: String, enum: ["COD", "MOMO", "VNPAY"], default: "COD" },
      status: { type: String, enum: ["pending", "paid", "failed"], default: "pending" },
      paymentId: { type: String, default: "" }, // THÊM: lưu paymentId từ MoMo/VNPAY
    },

    statusHistory: [
      {
        status: {
          type: String,
          enum: [
            "pending",
            "confirmed",
            "packed",
            "shipped",
            "delivered",
            "cancelled",
          ],
          required: true,
        },
        note: { type: String },
        timestamp: { type: Date, default: Date.now },
      },
    ],

    // Tổng tiền
    subtotal: { type: Number, required: true, default: 0 },
    shippingFee: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    total: { type: Number, required: true, default: 0 },

    // Voucher
    voucher: { type: mongoose.Schema.Types.ObjectId, ref: "Voucher", default: null },
    voucherCode: { type: String, default: "" },

    note: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", OrderSchema);
