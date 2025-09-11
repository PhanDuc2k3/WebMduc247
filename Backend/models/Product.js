const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  salePrice: { type: Number },
  brand: { type: String, required: true },
  category: { type: String, required: true },
  subCategory: { type: String, required: true },

  quantity: { type: Number, required: true },
  soldCount: { type: Number, default: 0 },

  variations: [
    {
      color: { type: String, required: true },
      size: { type: String, required: true },
      additionalPrice: { type: Number, default: 0 },
      stock: { type: Number, required: true }
    }
  ],

  images: [{ type: String }],

  rating: { type: Number, default: 0, min: 0, max: 5 },
  reviewsCount: { type: Number, default: 0 },

  tags: [{ type: String }],                      
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
