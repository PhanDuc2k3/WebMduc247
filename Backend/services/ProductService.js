const productRepository = require('../repositories/ProductRepository');
const Store = require('../models/Store');
const Fuse = require("fuse.js");

class ProductService {
  // Tạo SKU
  generateSKU(name) {
    const timestamp = Date.now();
    const shortName = name && name.trim() ? name.toUpperCase().replace(/\s+/g, '-') : 'PROD';
    return `${shortName}-${timestamp}`;
  }

  // Parse JSON an toàn
  parseJSONSafe(val) {
    if (!val) return [];
    if (typeof val === "string") {
      try { return JSON.parse(val); } catch { return []; }
    }
    return val;
  }

  // Tạo sản phẩm
  async createProduct(userId, productData, files) {
    const store = await Store.findOne({ owner: userId });
    if (!store) {
      throw new Error("Không tìm thấy cửa hàng của bạn.");
    }

    const {
      name, description, price, salePrice, brand, category, subCategory,
      model, sku, variations, specifications, seoTitle, seoDescription,
      keywords, tags,
      existingMainImage, existingSubImages
    } = productData;

    const parsedVariations = this.parseJSONSafe(variations);
    const parsedSpecifications = this.parseJSONSafe(specifications);
    const parsedTags = this.parseJSONSafe(tags);
    const parsedKeywords = this.parseJSONSafe(keywords);

    let totalQuantity = 0;
    parsedVariations.forEach(v => {
      if (v.options && v.options.length) {
        v.options.forEach(opt => {
          opt.stock = Number(opt.stock) || 0;
          opt.additionalPrice = Number(opt.additionalPrice) || 0;
          totalQuantity += opt.stock;
        });
      }
    });

    // Xử lý hình ảnh
    let images = [];
    if (files?.mainImage && files.mainImage.length > 0) {
      images.push(files.mainImage[0].path);
    } else if (existingMainImage) {
      images.push(existingMainImage);
    }

    if (files?.subImages && files.subImages.length > 0) {
      images.push(...files.subImages.map(f => f.path));
    }

    if (existingSubImages) {
      if (Array.isArray(existingSubImages)) images.push(...existingSubImages.flat());
      else images.push(existingSubImages);
    }

    const finalSKU = sku || this.generateSKU(name);

    const product = await productRepository.create({
      name, description, price, salePrice, brand, category, subCategory,
      quantity: totalQuantity, model, sku: finalSKU, variations: parsedVariations,
      specifications: parsedSpecifications, seoTitle, seoDescription,
      keywords: parsedKeywords, tags: parsedTags, store: store._id, images
    });

    return product;
  }

  // Lấy danh sách sản phẩm
  async getProducts(query) {
    const { category, search, sortBy, limit = 10, page = 1 } = query;
    const filter = { isActive: true };

    if (category) {
      // Filter theo category (case-insensitive, trim, escape special regex chars)
      const escapedCategory = category.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const categoryRegex = new RegExp(`^${escapedCategory}$`, 'i');
      filter.category = categoryRegex;
    }

    const skip = (page - 1) * limit;

    let sortOptions = {};
    if (sortBy) {
      if (sortBy === "price_asc") sortOptions = { price: 1 };
      if (sortBy === "price_desc") sortOptions = { price: -1 };
      if (sortBy === "rating") sortOptions = { rating: -1 };
      if (sortBy === "newest") sortOptions = { createdAt: -1 };
    }

    let products = await productRepository.find(filter, {
      populate: "store",
      skip: Number(skip),
      limit: Number(limit),
      sort: sortOptions
    });

    // Tìm kiếm mở rộng
    if (search && search.trim() !== "") {
      const keyword = search.trim();
      const fuse = new Fuse(products, {
        keys: ["name", "tags"],
        threshold: 0.3,
        includeScore: true,
      });
      products = fuse.search(keyword).map(r => r.item);
    }

    const totalAll = await productRepository.count(filter);

    return {
      products,
      pagination: {
        total: totalAll,
        page: Number(page),
        pages: Math.ceil(totalAll / limit),
      },
    };
  }

  // Lấy sản phẩm theo ID
  async getProductById(productId) {
    if (!productId || !productId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new Error("Invalid product ID");
    }

    const product = await productRepository.findById(productId);
    if (!product) {
      throw new Error("Product not found");
    }

    return product;
  }

  // Tăng view
  async increaseView(productId) {
    const product = await productRepository.incrementViews(productId);
    if (!product) {
      throw new Error("Product not found");
    }

    const today = new Date().toISOString().slice(0, 10);
    await productRepository.updateViewLog(product._id, today);

    return { views: product.viewsCount };
  }

  // Cập nhật sản phẩm
  async updateProduct(userId, productId, updateData, files) {
    const store = await Store.findOne({ owner: userId });
    if (!store) {
      throw new Error("Bạn chưa có cửa hàng");
    }

    if (!require('mongoose').Types.ObjectId.isValid(productId)) {
      throw new Error("Invalid product ID");
    }

    const jsonFields = ["variations", "specifications", "tags", "features", "keywords"];
    jsonFields.forEach(f => {
      if (updateData[f]) {
        if (typeof updateData[f] === "string") {
          try {
            updateData[f] = JSON.parse(updateData[f]);
          } catch {
            updateData[f] = [];
          }
        }
      } else {
        updateData[f] = [];
      }
    });

    // Xử lý hình ảnh
    let images = [];
    if (files?.mainImage?.length) {
      images.push(files.mainImage[0].path);
    } else if (updateData.existingMainImage) {
      images.push(updateData.existingMainImage);
    }
    
    if (files?.subImages?.length) {
      images.push(...files.subImages.map(f => f.path));
    }
    
    if (updateData.existingSubImages) {
      images.push(...(Array.isArray(updateData.existingSubImages)
        ? updateData.existingSubImages
        : [updateData.existingSubImages]));
    }

    if (images.length) updateData.images = images;

    const product = await productRepository.update(productId, store._id, updateData);
    if (!product) {
      throw new Error("Không tìm thấy sản phẩm của bạn");
    }

    return product;
  }

  // Xóa sản phẩm
  async deleteProduct(userId, productId) {
    const store = await Store.findOne({ owner: userId });
    if (!store) {
      throw new Error("Bạn chưa có cửa hàng");
    }

    const product = await productRepository.softDelete(productId, store._id);
    if (!product) {
      throw new Error("Không tìm thấy sản phẩm của bạn");
    }

    return product;
  }

  // Lấy featured products
  async getFeaturedProducts() {
    return await productRepository.find(
      { isActive: true },
      {
        populate: "store",
        sort: { soldCount: -1 },
        limit: 10
      }
    );
  }

  // Lấy sản phẩm của tôi
  async getMyProducts(userId) {
    const store = await Store.findOne({ owner: userId });
    if (!store) {
      throw new Error("Bạn chưa có cửa hàng");
    }

    return await productRepository.findByStore(store._id);
  }

  // Lấy sản phẩm theo store
  async getProductsByStore(storeId) {
    const products = await productRepository.find(
      { store: storeId },
      { populate: "store" }
    );
    
    if (!products || products.length === 0) {
      throw new Error("Không có sản phẩm nào cho cửa hàng này");
    }

    return products;
  }

  // Lấy thống kê views
  async getViewsStats(storeId, range = 7) {
    const days = parseInt(range) || 7;
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    startDate.setDate(startDate.getDate() - (days - 1));

    const products = await productRepository.find({ store: storeId }, { select: "_id" });
    const productIds = products.map(p => p._id);

    if (productIds.length === 0) {
      return Array.from({ length: days }).map((_, i) => {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);
        return { date: d.toISOString().slice(0, 10), views: 0 };
      });
    }

    const rawViews = await productRepository.aggregateViewLogs([
      { $match: { product: { $in: productIds }, date: { $gte: startDate.toISOString().slice(0, 10) } } },
      { $group: { _id: "$date", totalViews: { $sum: "$count" } } },
      { $sort: { _id: 1 } }
    ]);

    const viewMap = new Map();
    rawViews.forEach(v => viewMap.set(v._id, v.totalViews));

    const result = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(startDate.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      result.push({ date: key, views: viewMap.get(key) || 0 });
    }

    return result;
  }

  // Đếm sản phẩm theo category
  async getProductCountByCategory() {
    const counts = await productRepository.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    return counts.map(c => ({
      category: c._id || "Khác",
      count: c.count,
    }));
  }

  // Tìm kiếm sản phẩm
  async searchProducts(keyword, limit = 10) {
    if (!keyword || !keyword.trim()) {
      return [];
    }

    const products = await productRepository.searchProducts(keyword.trim(), limit);
    
    // Format lại dữ liệu để đảm bảo consistency
    return products.map((product) => ({
      ...product,
      rating: product.rating || 0,
      reviewsCount: product.reviewsCount || 0,
      soldCount: product.soldCount || 0,
      images: product.images || [],
    }));
  }
}

module.exports = new ProductService();

