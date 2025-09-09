const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    avatarUrl: {
        type: String,
        default: 'https://i.pinimg.com/736x/c6/e5/65/c6e56503cfdd87da299f72dc416023d4.jpg'
    },
    role: {
        type: String,
        enum: ['buyer', 'seller', 'admin'],
        default: 'buyer'
    },



    // Seller request
    sellerRequest: {
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending'
        },
        requestedAt: { type: Date },
        store: {
            name: { type: String, required: true },
            description: { type: String, required: true },
            address: { type: String, required: true },
            logoUrl: { type: String, required: true },
            category: { type: String, required: true },
            isActive: { type: Boolean, default: false }
        }
    }
}, { timestamps: true })

module.exports = mongoose.model('User', userSchema);