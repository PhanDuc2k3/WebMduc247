// utils/intentDetection.js

// ====== Detect Intent ======
function isProductIntent(message) {
  const keywords = [
    "tìm",
    "xem",
    "mua",
    "iphone",
    "điện thoại",
    "laptop",
    "tai nghe",
    "macbook",
    "truyện",
    "sách",
    "cửa hàng",
    "store",
    "sản phẩm",
    "product",
  ];
  return keywords.some((k) => message.toLowerCase().includes(k));
}

// ====== Detect Count/Quantity Intent ======
function isCountIntent(message) {
  const normalized = message.toLowerCase();
  const countKeywords = [
    "có bao nhiêu",
    "bao nhiêu",
    "số lượng",
    "tổng số",
    "count",
    "how many",
    "how much",
    "tổng cộng",
    "có mấy",
    "mấy cái",
    "có những gì",
    "danh sách",
  ];
  return countKeywords.some((k) => normalized.includes(k));
}

function isStoreIntent(message) {
  const keywords = [
    "cửa hàng",
    "store",
    "shop",
    "nhà sách",
    "điện tử",
  ];
  return keywords.some((k) => message.toLowerCase().includes(k));
}

module.exports = {
  isProductIntent,
  isCountIntent,
  isStoreIntent,
};

