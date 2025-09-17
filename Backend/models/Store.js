const mongoose = require('mongoose');

const storeSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    storeAddress: { type: String, required: true }, // địa chỉ cửa hàng
    logoUrl: { type: String, required: true },
    bannerUrl: { type: String }, // thêm banner
    contactPhone: { type: String }, // thêm số điện thoại liên hệ
    contactEmail: { type: String }, // thêm email liên hệ
    category: {
        type: String,
        required: true,
        enum: ['electronics', 'fashion', 'home', 'books', 'other'] // key chuẩn
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
