const mongoose = require('mongoose');

const favoriteSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  },
  store: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store'
  }
}, { timestamps: true });

// Compound unique index: một user chỉ có thể yêu thích một product/store một lần
// Sử dụng partial index thay vì sparse để chỉ index documents có field và không phải null
favoriteSchema.index(
  { user: 1, product: 1 }, 
  { 
    unique: true, 
    partialFilterExpression: { product: { $exists: true, $ne: null } }
  }
);
favoriteSchema.index(
  { user: 1, store: 1 }, 
  { 
    unique: true, 
    partialFilterExpression: { store: { $exists: true, $ne: null } }
  }
);

module.exports = mongoose.model('Favorite', favoriteSchema);

