// helpers/productHelper.js

/**
 * Parse JSON an toàn
 * @param {string|array} field
 * @returns {array}
 */
const parseJSONField = (field) => {
  if (!field) return [];
  if (typeof field === "string") {
    try {
      return JSON.parse(field);
    } catch {
      return [];
    }
  }
  return field;
};

/**
 * Merge ảnh từ Cloudinary + ảnh cũ
 * @param {object} files - req.files
 * @param {string} existingMain - ảnh chính cũ
 * @param {array|string} existingSubs - ảnh phụ cũ
 * @returns {object} { mainImage, subImages }
 */
// utils/mergeImages.js
// Merge ảnh cho cả create/update
const mergeImages = (files = {}, existingMain = null, existingSubs = null) => {
  const mainImage = files.mainImage?.[0]?.path || null;
  const subImages = files.subImages?.map(f => f.path) || [];

  let oldMain = null;
  let oldSubs = [];

  if (existingMain) {
    try { oldMain = JSON.parse(existingMain); } catch { oldMain = existingMain; }
    if (Array.isArray(oldMain)) oldMain = oldMain[0]; // giữ ảnh chính cũ
  }

  if (existingSubs) {
    try { oldSubs = JSON.parse(existingSubs); } catch { oldSubs = [existingSubs]; }
    if (!Array.isArray(oldSubs)) oldSubs = [oldSubs];
  }

  return {
    mainImage: mainImage || oldMain || null,
    subImages: [...subImages, ...oldSubs]
  };
};



module.exports = { parseJSONField, mergeImages };
