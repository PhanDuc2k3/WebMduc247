const mongoose = require('mongoose');

const storeSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    storeAddress: { type: String, required: true }, 
    logoUrl: { type: String, required: true },
    bannerUrl: { type: String }, 
    contactPhone: { type: String }, 
    contactEmail: { type: String }, 
    category: {
        type: String,
        required: true,
        enum: ['electronics', 'fashion', 'home', 'books', 'other'] 
    },
    customCategory: { type: String },
    rating: { type: Number, default: 0 },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    isActive: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Store', storeSchema);
