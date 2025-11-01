// middlewares/cloudinary.js
const fs = require('fs');
const cloudinary = require('cloudinary').v2;
require('dotenv').config();

// cấu hình Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// =========================
// Upload lên Cloudinary
// =========================
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

// =========================
// Parse JSON an toàn
// =========================
const parseJSONField = (field) => {
  if (!field) return [];
  if (typeof field === 'string') {
    try {
      return JSON.parse(field);
    } catch {
      return [];
    }
  }
  return field;
};

// =========================
// Merge images
// =========================
const mergeImages = (files = {}, existingMain = null, existingSubs = null) => {
  const mainImage = files.mainImage?.[0]?.path || null;
  const subImages = Array.isArray(files.subImages)
    ? files.subImages.map((f) => f.path)
    : [];

  let oldMain = null;
  let oldSubs = [];

  if (existingMain) {
    try {
      oldMain = JSON.parse(existingMain);
    } catch {
      oldMain = existingMain;
    }
    if (Array.isArray(oldMain)) oldMain = oldMain[0];
  }

  if (existingSubs) {
    try {
      oldSubs = JSON.parse(existingSubs);
    } catch {
      oldSubs = [existingSubs];
    }
    if (!Array.isArray(oldSubs)) oldSubs = [oldSubs];
  }

  return {
    mainImage: mainImage || oldMain || null,
    subImages: [...subImages, ...oldSubs].filter(Boolean),
  };
};

// =========================
// Export duy nhất
// =========================
module.exports = { parseJSONField, mergeImages, uploadToCloudinary };
