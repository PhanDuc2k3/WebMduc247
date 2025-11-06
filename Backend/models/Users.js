const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { 
    type: String, 
    required: [true, 'Email là bắt buộc'], 
    unique: true, 
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Email không hợp lệ']
  },
  password: { 
    type: String, 
    required: [true, 'Mật khẩu là bắt buộc'], 
    minlength: [6, 'Mật khẩu phải có ít nhất 6 ký tự'] 
  },
  fullName: { 
    type: String, 
    required: [true, 'Tên đầy đủ là bắt buộc'], 
    minlength: [2, 'Tên quá ngắn'] 
  },
  phone: { 
    type: String, 
    required: [true, 'Số điện thoại là bắt buộc'], 
    match: [/^[0-9]{9,11}$/, 'Số điện thoại không hợp lệ'] 
  },
  avatarUrl: {
    type: String,
    default: 'https://i.pinimg.com/736x/c6/e5/65/c6e56503cfdd87da299f72dc416023d4.jpg'
  },
  role: {
    type: String,
    enum: ['buyer', 'seller', 'admin'],
    default: 'buyer'
  },

  // Seller request (cửa hàng)
  sellerRequest: {
    status: {
      type: String,
      enum: ['none','pending', 'approved', 'rejected'],
      default: 'none'
    },
    requestedAt: { type: Date, default: Date.now },
    store: {
      name: { type: String },         
      category: { type: String },
      description: { type: String },   
      storeAddress: { type: String },     
      contactPhone: { type: String },  
      contactEmail: { type: String },  
      logoUrl: { type: String },                       
      bannerUrl: { type: String },                     
      isActive: { type: Boolean, default: false }
    }
  },

  store: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store'
  },

  // New fields for online status
  online: {
    type: Boolean,
    default: false
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },

  // Email verification fields
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationCode: {
    type: String,
    default: null
  },
  verificationCodeExpires: {
    type: Date,
    default: null
  }

}, { timestamps: true });

module.exports = mongoose.models.User || mongoose.model("User", userSchema);
