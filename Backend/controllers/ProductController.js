const Product = require('../models/Product');
const Store = require('../models/Store');
const ViewLog = require('../models/ViewLog');
const Fuse = require("fuse.js");

const mongoose = require('mongoose');
  const generateSKU = (name) => {
  const timestamp = Date.now();
  const shortName = name && name.trim() ? name.toUpperCase().replace(/\s+/g, '-') : 'PROD';
  return `${shortName}-${timestamp}`;
};

// Create product
exports.createProduct = async (req, res) => {
  try {
    const userId = req.user.userId;
    const store = await Store.findOne({ owner: userId });
    if (!store) return res.status(400).json({ success: false, message: "Không tìm thấy cửa hàng của bạn." });

    const {
      name, description, price, salePrice, brand, category, subCategory,
      model, sku, variations, specifications, seoTitle, seoDescription,
      keywords, tags,
      existingMainImage, existingSubImages
    } = req.body;

    // Parse JSON fields an toàn
    const parseJSONSafe = (val) => {
      if (!val) return [];
      if (typeof val === "string") {
        try { return JSON.parse(val); } catch { return []; }
      }
      return val;
    };
    const parsedVariations = parseJSONSafe(variations);
    const parsedSpecifications = parseJSONSafe(specifications);
    const parsedTags = parseJSONSafe(tags);
    const parsedKeywords = parseJSONSafe(keywords);

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

    // Main image mới
    if (req.files?.mainImage && req.files.mainImage.length > 0) {
      images.push(req.files.mainImage[0].path);
    } else if (existingMainImage) {
      images.push(existingMainImage);
    }

    // Sub images mới
    if (req.files?.subImages && req.files.subImages.length > 0) {
      images.push(...req.files.subImages.map(f => f.path));
    }

    // Sub images cũ
    if (existingSubImages) {
      if (Array.isArray(existingSubImages)) images.push(...existingSubImages.flat());
      else images.push(existingSubImages);
    }

    const finalSKU = sku || generateSKU(name);

    const product = new Product({
      name, description, price, salePrice, brand, category, subCategory,
      quantity: totalQuantity, model, sku: finalSKU, variations: parsedVariations,
      specifications: parsedSpecifications, seoTitle, seoDescription,
      keywords: parsedKeywords, tags: parsedTags, store: store._id, images
    });

    await product.save();
    return res.status(201).json({ success: true, data: product });
  } catch (err) {
    console.error("Lỗi tạo sản phẩm:", err);
    return res.status(400).json({ success: false, message: err.message });
  }
};


// Get all products with pagination, filtering, sorting
exports.getProducts = async (req, res) => {
  try {
    const { category, search, sortBy, limit = 10, page = 1 } = req.query;
    const filter = { isActive: true };

    // Filter theo category
    if (category) filter.category = category;

    const skip = (page - 1) * limit;

    // Lấy dữ liệu thô theo filter + pagination + sort
    let query = Product.find(filter)
      .populate("store", "name logoUrl storeAddress")
      .skip(Number(skip))
      .limit(Number(limit));

    // Sắp xếp
    if (sortBy) {
      if (sortBy === "price_asc") query = query.sort({ price: 1 });
      if (sortBy === "price_desc") query = query.sort({ price: -1 });
      if (sortBy === "rating") query = query.sort({ rating: -1 });
      if (sortBy === "newest") query = query.sort({ createdAt: -1 });
    }

    let products = await query;

    // Tìm kiếm mở rộng
    if (search && search.trim() !== "") {
      const keyword = search.trim();

      // Dùng Fuse.js để tìm fuzzy search
      const fuse = new Fuse(products, {
        keys: ["name", "tags"],
        threshold: 0.3, // 0.0 = chính xác, 1.0 = gần đúng rất lỏng
        includeScore: true,
      });

      products = fuse.search(keyword).map(r => r.item);
    }

    // Lấy tổng số sản phẩm (không phân trang)
    const totalAll = await Product.countDocuments(filter);

    res.json({
      success: true,
      data: products,
      pagination: {
        total: totalAll,
        page: Number(page),
        pages: Math.ceil(totalAll / limit),
      },
    });
  } catch (err) {
    console.error("getProducts error:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get product by ID
exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) return res.status(400).json({ success: false, message: "Invalid product ID" });

    const product = await Product.findById(id).populate("store", "name logoUrl");
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });

    return res.json({ success: true, data: product });
  } catch (err) {
    console.error("getProductById error:", err.message);
    return res.status(500).json({ success: false, message: err.message || "Server error" });
  }
};

// Increase product view
exports.increaseView = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ success: false, message: "Product not found" });

    product.viewsCount += 1;
    await product.save();

    const today = new Date().toISOString().slice(0, 10);
    await ViewLog.findOneAndUpdate(
      { product: product._id, date: today },
      { $inc: { count: 1 } },
      { upsert: true, new: true }
    );

    return res.json({ success: true, views: product.viewsCount });
  } catch (err) {
    console.error("increaseView error:", err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Update product by seller
exports.updateProduct = async (req, res) => {
  try {
    console.log("[updateProduct] START");
    console.log("[updateProduct] req.user:", req.user);
    console.log("[updateProduct] req.body:", req.body);
    console.log("[updateProduct] req.files:", req.files);

    const store = await Store.findOne({ owner: req.user.userId });
    if (!store)
      return res.status(400).json({ success: false, message: "Bạn chưa có cửa hàng" });

    const productId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(productId))
      return res.status(400).json({ success: false, message: "Invalid product ID" });

    let updateData = { ...req.body };

    // Parse các trường JSON
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

    console.log("[updateProduct] Parsed updateData JSON fields:", updateData);

    // Hình ảnh
    let images = [];
    if (req.files?.mainImage?.length) {
      images.push(req.files.mainImage[0].path);
    } else if (req.body.existingMainImage) {
      images.push(req.body.existingMainImage);
    }
    if (req.files?.subImages?.length) {
      images.push(...req.files.subImages.map(f => f.path));
    }
    if (req.body.existingSubImages) {
      images.push(...(Array.isArray(req.body.existingSubImages)
        ? req.body.existingSubImages
        : [req.body.existingSubImages]));
    }

    if (images.length) updateData.images = images;

    console.log("[updateProduct] Final images array:", images);

    // ✅ Update và trả document mới
    const product = await Product.findOneAndUpdate(
      { _id: productId, store: store._id },
      updateData,
      { new: true, runValidators: true }
    );

    if (!product)
      return res.status(404).json({ success: false, message: "Không tìm thấy sản phẩm của bạn" });

    console.log("[updateProduct] Update successful:", product._id);
    console.log("[updateProduct] Final product tags:", product.tags);
    console.log("[updateProduct] Final product keywords:", product.keywords);

    // ✅ Trả trực tiếp product để FE đọc được newProduct.tags
    return res.json(product);

  } catch (err) {
    console.error("[updateProduct] ERROR:", err);
    return res.status(500).json({ success: false, message: err.message || "Server error" });
  }
};






// Soft delete product
exports.deleteProduct = async (req, res) => {
  try {
    const store = await Store.findOne({ owner: req.user.userId });
    if (!store) return res.status(400).json({ success: false, message: "Bạn chưa có cửa hàng" });

    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, store: store._id },
      { isActive: false },
      { new: true }
    );

    if (!product) return res.status(404).json({ success: false, message: "Không tìm thấy sản phẩm của bạn" });

    res.json({ success: true, message: "Product deactivated", data: product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Featured products
exports.getFeaturedProducts = async (req, res) => {
  try {
    const products = await Product.find({ isActive: true })
      .sort({ soldCount: -1 })
      .limit(10)
      .populate("store", "name");
    res.json(products);
  } catch (err) {
    console.error("Error in getFeaturedProducts:", err.message);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Get my products
exports.getMyProducts = async (req, res) => {
  try {
    const userId = req.user.userId;
    const store = await Store.findOne({ owner: userId });
    if (!store) return res.status(404).json({ message: "Bạn chưa có cửa hàng" });

    const products = await Product.find({ store: store._id });
    return res.json({ data: products });
  } catch (err) {
    console.error("Lỗi getMyProducts:", err);
    return res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};

// Get products by store
exports.getProductsByStore = async (req, res) => {
  try {
    const { storeId } = req.params;
    const products = await Product.find({ store: storeId }).populate('store', 'name logoUrl');
    if (!products || products.length === 0) return res.status(404).json({ message: "Không có sản phẩm nào cho cửa hàng này" });
    res.json(products);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// Get views stats
exports.getViewsStats = async (req, res) => {
  try {
    const { storeId, range } = req.query;
    const days = parseInt(range) || 7;

    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    startDate.setDate(startDate.getDate() - (days - 1));

    const products = await Product.find({ store: storeId }, { _id: 1 });
    const productIds = products.map(p => p._id);

    if (productIds.length === 0) {
      return res.json(Array.from({ length: days }).map((_, i) => {
        const d = new Date(startDate);
        d.setDate(startDate.getDate() + i);
        return { date: d.toISOString().slice(0, 10), views: 0 };
      }));
    }

    const rawViews = await ViewLog.aggregate([
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

    res.json(result);
  } catch (err) {
    console.error("getViewsStats error:", err.message);
    res.status(500).json({ message: "Lỗi server" });
  }
};
// Đếm số lượng sản phẩm theo danh mục
exports.getProductCountByCategory = async (req, res) => {
  try {
    const counts = await Product.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    const result = counts.map(c => ({
      category: c._id || "Khác",
      count: c.count,
    }));

    res.json(result);
  } catch (err) {
    console.error("getProductCountByCategory error:", err.message);
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};
