const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  salePrice: { type: Number },
  brand: { type: String, required: true },
  category: { type: String, required: true }, // category chính
  subCategory: { type: String },
  categories: { type: [String], default: [] }, // ← các category bổ sung
  quantity: { type: Number, required: true },
  soldCount: { type: Number, default: 0 },
  model: { type: String },
  sku: { type: String, unique: true },

  variations: [
    {
      color: { type: String },
      options: [
        {
          name: { type: String },
          stock: { type: Number, default: 0 },
          additionalPrice: { type: Number, default: 0 }
        }
      ]
    }
  ],

  images: [{ type: String }],
  specifications: [
    {
      key: { type: String, required: true },
      value: { type: String, required: true }
    }
  ],

  rating: { type: Number, default: 0, min: 0, max: 5 },
  reviewsCount: { type: Number, default: 0 },
  tags: { type: [String], default: [] },
  seoTitle: { type: String },
  seoDescription: { type: String },
  keywords: { type: [String], default: [] },
  isFeatured: { type: Boolean, default: false },

  viewsCount: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true },

  store: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
