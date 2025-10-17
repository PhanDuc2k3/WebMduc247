const Product = require('../models/Product');
const Store = require('../models/Store');
const ViewLog = require('../models/ViewLog');

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
      keywords, tags
    } = req.body;

    const parsedVariations = variations && typeof variations === "string" ? JSON.parse(variations) : variations || [];
    const parsedSpecifications = specifications && typeof specifications === "string" ? JSON.parse(specifications) : specifications || [];
    const parsedTags = tags && typeof tags === "string" ? JSON.parse(tags) : tags || [];
    const parsedKeywords = keywords && typeof keywords === "string" ? JSON.parse(keywords) : keywords || [];

    let totalQuantity = 0;
    parsedVariations.forEach(v => {
      if (v.options && v.options.length > 0) {
        v.options.forEach(opt => {
          opt.stock = Number(opt.stock) || 0;
          opt.additionalPrice = Number(opt.additionalPrice) || 0;
          totalQuantity += opt.stock;
        });
      }
    });

    // ✅ Dùng Cloudinary URL
    let images = [];
    if (req.files) {
      const main = req.files.mainImage ? req.files.mainImage[0] : null;
      const subs = req.files.subImages || [];
      if (main) images.push(main.path);
      if (subs.length > 0) images.push(...subs.map(f => f.path));
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
    if (category) filter.category = category;
    if (search) filter.name = { $regex: search, $options: "i" };

    const skip = (page - 1) * limit;
    let query = Product.find(filter).populate("store", "name logoUrl").skip(Number(skip)).limit(Number(limit));

    if (sortBy) {
      if (sortBy === "price_asc") query = query.sort({ price: 1 });
      if (sortBy === "price_desc") query = query.sort({ price: -1 });
      if (sortBy === "rating") query = query.sort({ rating: -1 });
      if (sortBy === "newest") query = query.sort({ createdAt: -1 });
    }

    const products = await query;
    const total = await Product.countDocuments(filter);

    res.json({ success: true, data: products, pagination: { total, page: Number(page), pages: Math.ceil(total / limit) } });
  } catch (err) {
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
    const store = await Store.findOne({ owner: req.user.userId });
    if (!store) return res.status(400).json({ success: false, message: "Bạn chưa có cửa hàng" });

    let updateData = { ...req.body };

    // 🔹 JSON fields parse
    ["variations", "specifications", "tags", "features"].forEach((field) => {
      if (updateData[field]) {
        try {
          updateData[field] = JSON.parse(updateData[field]);
        } catch {
          updateData[field] = [];
        }
      }
    });

    // 🔹 Xử lý ảnh
    let images = [];

    // Ảnh mới upload
    if (req.files?.mainImage) images.push(`/uploads/${req.files.mainImage[0].filename}`);
    if (req.files?.subImages) images.push(...req.files.subImages.map(f => `/uploads/${f.filename}`));

    // Ảnh cũ giữ lại
    if (req.body.existingMainImage) images.push(req.body.existingMainImage);
    if (req.body.existingSubImages) {
      if (Array.isArray(req.body.existingSubImages)) images.push(...req.body.existingSubImages);
      else images.push(req.body.existingSubImages);
    }

    if (images.length > 0) updateData.images = images;

    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, store: store._id },
      updateData,
      { new: true, runValidators: true }
    );

    if (!product) return res.status(404).json({ success: false, message: "Không tìm thấy sản phẩm của bạn" });

    res.json({ success: true, data: product });
  } catch (err) {
    console.error("updateProduct error:", err);
    res.status(500).json({ success: false, message: err.message || "Server error" });
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
