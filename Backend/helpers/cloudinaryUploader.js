require('dotenv').config();
const cloudinary = require('cloudinary').v2;
const fs = require('fs');

// cấu hình Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload file lên Cloudinary
 * @param {string} filePath - đường dẫn file tạm
 * @param {string} folder - tên thư mục (ví dụ: 'messages')
 * @returns {Promise<object>} thông tin file upload
 */
const uploadToCloudinary = async (filePath, folder = 'uploads') => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: 'auto',
      transformation: [{ width: 2000, crop: 'limit' }],
    });

    // xóa file tạm sau khi upload xong
    fs.unlinkSync(filePath);
    return result;
  } catch (error) {
    console.error('Lỗi upload Cloudinary:', error.message);
    return null;
  }
};

module.exports = { uploadToCloudinary };
