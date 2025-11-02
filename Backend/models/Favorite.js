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
favoriteSchema.index({ user: 1, product: 1 }, { unique: true, sparse: true });
favoriteSchema.index({ user: 1, store: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Favorite', favoriteSchema);

