// repositories/StoreRepository.js
const Store = require("../models/Store");

class StoreRepository {
  /**
   * Lấy tất cả cửa hàng đang hoạt động
   * @returns {Promise<Array>} - Danh sách cửa hàng
   */
  async findActiveStores() {
    return await Store.find({ isActive: true }).lean();
  }
}

module.exports = new StoreRepository();

