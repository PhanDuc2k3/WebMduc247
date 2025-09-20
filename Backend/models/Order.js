const mongoose = require("mongoose");

const OrderItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Store",
    required: true,
  },
  name: { type: String, required: true }, 
  imageUrl: { type: String },           
  price: { type: Number, required: true }, 
  salePrice: { type: Number },          
  quantity: { type: Number, required: true, min: 1 },
  variation: {
    color: { type: String },
    size: { type: String },
  },
  subtotal: { type: Number, required: true }, // (salePrice || price) * quantity
});

const OrderSchema = new mongoose.Schema(
  {
    orderCode: { type: String, required: true, unique: true }, 
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    items: [OrderItemSchema],

    shippingAddress: {
      fullName: { type: String, required: true },
      phone: { type: String, required: true },
      address: { type: String, required: true },
    },

    shippingInfo: {
      method: { type: String, default: "Giao hàng nhanh" },
      trackingNumber: { type: String },
      estimatedDelivery: { type: Date },
    },

    paymentInfo: {
      method: { type: String, enum: ["COD", "MOMO", "VNPAY"], default: "COD" },
      status: { type: String, enum: ["pending", "paid", "failed"], default: "pending" },
    },

    statusHistory: [
      {
        status: {
          type: String,
          enum: ["pending", "confirmed", "packed", "shipped", "delivered", "cancelled"],
          required: true,
        },
        note: { type: String },
        timestamp: { type: Date, default: Date.now },
      },
    ],

    // tổng tiền
    subtotal: { type: Number, required: true },
    shippingFee: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    total: { type: Number, required: true },

    note: { type: String },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Order", OrderSchema);
