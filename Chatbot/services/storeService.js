// services/storeService.js
const storeRepository = require("../repositories/StoreRepository");

class StoreService {
  /**
   * Lấy tất cả cửa hàng đang hoạt động
   * @returns {Promise<Array>} - Danh sách cửa hàng
   */
  async getActiveStores() {
    return await storeRepository.findActiveStores();
  }

  /**
   * Format cửa hàng thành text để đưa vào prompt
   * @param {Array} stores - Danh sách cửa hàng
   * @returns {string} - Text đã format
   */
  formatStoresToText(stores) {
    if (!stores || stores.length === 0) {
      return "Hiện tại không có cửa hàng nào hoạt động.";
    }

    const categoryMap = {
      electronics: "Điện tử & Công nghệ",
      fashion: "Thời trang",
      home: "Đồ gia dụng",
      books: "Sách & Văn phòng phẩm",
      other: "Khác",
    };

    return stores
      .map((s) => {
        return `• ${s.name}
  - Danh mục: ${categoryMap[s.category] || s.category}${s.customCategory ? ` (${s.customCategory})` : ""}
  - Mô tả: ${s.description}
  - Địa chỉ: ${s.storeAddress}
  - Đánh giá: ⭐ ${s.rating?.toFixed(1) || 0}${s.contactPhone ? `\n  - Liên hệ: ${s.contactPhone}` : ""}`;
      })
      .join("\n\n");
  }
}

module.exports = new StoreService();

