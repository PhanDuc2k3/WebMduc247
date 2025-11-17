const Store = require('../models/Store');
const Product = require('../models/Product');
const Review = require('../models/Review');

class StoreRepository {
  // Tạo store
  async create(storeData) {
    const store = new Store(storeData);
    return await store.save();
  }

  // Tìm store theo owner
  async findByOwner(ownerId) {
    return await Store.findOne({ owner: ownerId });
  }

  // Tìm store theo ID
  async findById(storeId, populate = false) {
    let query = Store.findById(storeId);
    if (populate) {
      query = query.populate('owner', 'fullName email phone');
    }
    return await query;
  }

  // Tìm tất cả active stores
  async findActiveStores(populate = false) {
    let query = Store.find({ isActive: true });
    if (populate) {
      query = query.populate('owner', 'fullName email');
    }
    return await query;
  }

  // Cập nhật store
  async update(storeId, updateData) {
    return await Store.findByIdAndUpdate(storeId, updateData, { new: true });
  }

  // Lấy products theo store
  async getProductsByStore(storeId) {
    return await Product.find({ store: storeId });
  }

  // Lấy reviews theo productIds
  async getReviewsByProductIds(productIds) {
    return await Review.find({ productId: { $in: productIds } });
  }
}

module.exports = new StoreRepository();

