require('dotenv').config();
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Storage cho messages
const messagesStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'messages',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'jfif'],
    transformation: [{ width: 2000, crop: 'limit' }],
  },
});

// Storage cho reviews
const reviewsStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'reviews',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'jfif'],
    transformation: [{ width: 2000, crop: 'limit' }],
  },
});

// Upload cho messages (mặc định)
const upload = multer({ storage: messagesStorage, limits: { fileSize: 25 * 1024 * 1024 } });

// Upload cho reviews
const uploadReview = multer({ storage: reviewsStorage, limits: { fileSize: 25 * 1024 * 1024 } });

const logUpload = (req, res, next) => {
  next();
};

module.exports = { upload, uploadReview, logUpload };
