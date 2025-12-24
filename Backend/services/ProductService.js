const productRepository = require('../repositories/ProductRepository');
const Store = require('../models/Store');
const Product = require('../models/Product');
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
      keywords: parsedKeywords, tags: parsedTags, store: store._id, images,
      isActive: true // ✅ Đảm bảo sản phẩm mới được active để hiển thị trong danh sách công khai
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

    // Kiểm tra sản phẩm có đang active không
    if (!product.isActive) {
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
    try {
      console.log("[updateProduct] 📥 Received updateData:", {
        keys: Object.keys(updateData),
        tags: updateData.tags,
        tagsType: typeof updateData.tags,
        variations: updateData.variations,
        variationsType: typeof updateData.variations,
      });

      const store = await Store.findOne({ owner: userId });
      if (!store) {
        throw new Error("Bạn chưa có cửa hàng");
      }

      if (!require('mongoose').Types.ObjectId.isValid(productId)) {
        throw new Error("Invalid product ID");
      }

      // Xử lý các trường JSON từ form data (bao gồm tags, variations, specifications, features, keywords)
      const jsonFields = ["variations", "specifications", "features", "tags", "keywords"];
      jsonFields.forEach(f => {
        if (updateData[f] !== undefined && updateData[f] !== null) {
          console.log(`[updateProduct] 🔹 Processing ${f}:`, {
            value: updateData[f],
            type: typeof updateData[f],
            isArray: Array.isArray(updateData[f])
          });

          if (typeof updateData[f] === "string") {
            try {
              updateData[f] = JSON.parse(updateData[f]);
              console.log(`[updateProduct] ✅ Parsed ${f} from JSON string:`, updateData[f]);
            } catch (err) {
              console.error(`[updateProduct] ❌ Error parsing ${f} as JSON:`, err);
              // Nếu không parse được JSON và là tags/keywords, coi như single value
              if (f === "tags" || f === "keywords") {
                updateData[f] = updateData[f].trim() ? [updateData[f].trim()] : [];
              } else {
                updateData[f] = [];
              }
            }
          }
          
          // Đảm bảo tags và keywords là array và clean data
          if ((f === "tags" || f === "keywords") && Array.isArray(updateData[f])) {
            updateData[f] = updateData[f]
              .filter(v => v != null && v !== '')
              .map(v => typeof v === 'string' ? v.trim() : v)
              .filter(v => v); // Loại bỏ các giá trị rỗng sau khi trim
          }
          
          console.log(`[updateProduct] ✅ ${f} final value:`, updateData[f]);
        }
        // Nếu không có trong updateData, không set (giữ nguyên giá trị hiện có)
      });

      // ✅ Tính lại số lượng tồn kho từ variations nếu có variations trong update
      if (updateData.variations && Array.isArray(updateData.variations)) {
        let totalQuantity = 0;
        updateData.variations.forEach(v => {
          if (v.options && Array.isArray(v.options)) {
            v.options.forEach(opt => {
              opt.stock = Number(opt.stock) || 0;
              opt.additionalPrice = Number(opt.additionalPrice) || 0;
              totalQuantity += opt.stock;
            });
          }
        });
        updateData.quantity = totalQuantity;
        console.log(`[updateProduct] ✅ Calculated total quantity from variations: ${totalQuantity}`);
      }

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

      // Loại bỏ các field không cần update vào DB
      delete updateData.existingMainImage;
      delete updateData.existingSubImages;

      console.log("[updateProduct] 📤 Final updateData:", {
        keys: Object.keys(updateData),
        tags: updateData.tags,
        variationsCount: updateData.variations?.length,
        imagesCount: updateData.images?.length,
      });

      const product = await productRepository.update(productId, store._id, updateData);
      if (!product) {
        throw new Error("Không tìm thấy sản phẩm của bạn");
      }

      console.log("[updateProduct] ✅ Product updated successfully:", product._id);
      return product;
    } catch (error) {
      console.error("[updateProduct] ❌ Error:", error);
      console.error("[updateProduct] ❌ Error stack:", error.stack);
      throw error;
    }
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

  // Khôi phục sản phẩm (bán trở lại)
  async restoreProduct(userId, productId) {
    const store = await Store.findOne({ owner: userId });
    if (!store) {
      throw new Error("Bạn chưa có cửa hàng");
    }

    const product = await productRepository.restore(productId, store._id);
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

  // Lấy sản phẩm của tôi (lấy tất cả, bao gồm cả isActive = false để seller quản lý)
  async getMyProducts(userId) {
    const store = await Store.findOne({ owner: userId });
    if (!store) {
      throw new Error("Bạn chưa có cửa hàng");
    }

    // ✅ Lấy tất cả sản phẩm của store, không filter isActive để seller có thể quản lý cả sản phẩm đã xóa/ngừng bán
    return await Product.find({ store: store._id }).populate("store", "name logoUrl").sort({ createdAt: -1 });
  }

  // Lấy sản phẩm theo store
  async getProductsByStore(storeId) {
    const products = await productRepository.find(
      { store: storeId, isActive: true },
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

