const mongoose = require('mongooes');

const storeSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    address: { type: String, required: true },
    logoUrl: { type: String, required: true },
    category: {
        type: String,
        required: true,
        enum: ['Electronics', 'Fashion', 'Home', 'Books', 'Other']
    },
    customCategory: { type: String },
    rating: { type: Number, default: 0 },
    address: { type: String, required: true },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    isActive: { type: Boolean, default: false }
}, { timestamps: true })

module.exports = mongoose.model('Store', storeSchema);