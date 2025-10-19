require('dotenv').config();
const cloudinary = require('cloudinary').v2;

// Config Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload 1 ảnh (dạng base64 hoặc URL tạm)
 * @param {string} fileData - base64 string hoặc đường dẫn local
 * @param {string} folder - tên thư mục trên Cloudinary
 * @returns {Promise<{url: string, type: string}>}
 */
const uploadToCloudinary = async (fileData, folder = 'chat_uploads') => {
  try {
    const result = await cloudinary.uploader.upload(fileData, {
      folder,
      resource_type: 'auto',
    });
    return { url: result.secure_url, type: result.resource_type };
  } catch (err) {
    console.error('❌ Upload Cloudinary thất bại:', err.message);
    throw err;
  }
};

module.exports = { uploadToCloudinary };
