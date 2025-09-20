const mongoose = require("mongoose");

const CartItemSchema = new mongoose.Schema({
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

  subtotal: { type: Number, required: true }, 
});

module.exports = CartItemSchema;
