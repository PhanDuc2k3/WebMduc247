const mongoose = require("mongoose");

const CartItemSchema = new mongoose.Schema({
  productId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Product", 
    required: true 
  },

  storeId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Store", 
    required: true 
  },

  name: { 
    type: String, 
    required: true 
  },

  imageUrl: { 
    type: String 
  },

  price: { 
    type: Number, 
    required: true 
  },

  salePrice: { 
    type: Number 
  },

  quantity: { 
    type: Number, 
    required: true, 
    min: 1 
  },

  // 👉 Tùy chọn sản phẩm
  variation: {
    color: String,
    size: String,
    additionalPrice: { type: Number, default: 0 },
  },

  // 👉 Cờ đánh dấu sản phẩm có được chọn để checkout không
  selected: { 
    type: Boolean, 
    default: true 
  },

  // 👉 Tổng giá của item (price * quantity + additionalPrice)
  subtotal: { 
    type: Number, 
    required: true, 
    default: 0 
  },
});

// 🟢 Hook tính subtotal mỗi khi save
CartItemSchema.pre("save", function (next) {
  const basePrice = this.salePrice ?? this.price;
  const addOn = this.variation?.additionalPrice || 0;

  this.subtotal = (basePrice + addOn) * this.quantity;
  next();
});

module.exports = CartItemSchema;
