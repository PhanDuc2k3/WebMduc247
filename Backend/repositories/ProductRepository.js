const Product = require('../models/Product');
const ViewLog = require('../models/ViewLog');

class ProductRepository {
  // Tạo sản phẩm
  async create(productData) {
    const product = new Product(productData);
    return await product.save();
  }

  // Tìm sản phẩm theo ID
  async findById(productId) {
    return await Product.findById(productId).populate("store", "name logoUrl");
  }

  // Tìm sản phẩm với filter
  async find(filter = {}, options = {}) {
    let query = Product.find(filter);
    
    if (options.populate) {
      query = query.populate(options.populate);
    }
    
    if (options.skip) {
      query = query.skip(options.skip);
    }
    
    if (options.limit) {
      query = query.limit(options.limit);
    }
    
    if (options.sort) {
      query = query.sort(options.sort);
    }
    
    return await query;
  }

  // Đếm số lượng sản phẩm
  async count(filter = {}) {
    return await Product.countDocuments(filter);
  }

  // Cập nhật sản phẩm
  async update(productId, storeId, updateData) {
    return await Product.findOneAndUpdate(
      { _id: productId, store: storeId },
      updateData,
      { new: true, runValidators: true }
    );
  }

  // Soft delete sản phẩm
  async softDelete(productId, storeId) {
    return await Product.findOneAndUpdate(
      { _id: productId, store: storeId },
      { isActive: false },
      { new: true }
    );
  }

  // Tăng view count
  async incrementViews(productId) {
    const product = await Product.findById(productId);
    if (!product) return null;
    
    product.viewsCount += 1;
    await product.save();
    return product;
  }

  // Tạo hoặc cập nhật ViewLog
  async updateViewLog(productId, date) {
    return await ViewLog.findOneAndUpdate(
      { product: productId, date },
      { $inc: { count: 1 } },
      { upsert: true, new: true }
    );
  }

  // Tìm sản phẩm theo store
  async findByStore(storeId) {
    return await Product.find({ store: storeId });
  }

  // Tìm sản phẩm theo nhiều IDs
  async findByIds(productIds) {
    return await Product.find({ _id: { $in: productIds } }).populate('store');
  }

  // Bulk update
  async bulkWrite(operations) {
    return await Product.bulkWrite(operations);
  }

  // Aggregate
  async aggregate(pipeline) {
    return await Product.aggregate(pipeline);
  }

  // ViewLog aggregate
  async aggregateViewLogs(pipeline) {
    return await ViewLog.aggregate(pipeline);
  }

  // Tìm kiếm sản phẩm theo keyword
  async searchProducts(keyword, limit = 10) {
    const searchRegex = new RegExp(keyword, 'i');
    return await Product.find({
      isActive: true,
      $or: [
        { name: searchRegex },
        { description: searchRegex },
        { brand: searchRegex },
        { category: searchRegex },
        { tags: { $in: [searchRegex] } },
        { keywords: { $in: [searchRegex] } }
      ]
    })
    .populate('store', 'name logoUrl')
    .limit(limit)
    .select('name description price salePrice brand category images rating reviewsCount soldCount store _id')
    .lean();
  }
}

module.exports = new ProductRepository();

