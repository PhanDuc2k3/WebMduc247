const Product = require('../models/Product');
const Store = require('../models/Store');

const generateSKU = (name) => {
  const timestamp = Date.now();
  const shortName = name && name.trim() ? name.toUpperCase().replace(/\s+/g, '-') : 'PROD';
  return `${shortName}-${timestamp}`;
};

// create product
exports.createProduct = async (req, res) => {
  try {
    const userId = req.user.userId;
    console.log("2 [CREATE PRODUCT] UserId từ token:", userId);

    const store = await Store.findOne({ owner: userId });
    console.log("👉 Store tìm theo owner:", store);

    if (!store) {
      return res.status(400).json({
        success: false,
        message: "❌ Không tìm thấy cửa hàng của bạn. Vui lòng tạo cửa hàng trước.",
      });
    }

    const {
      name,
      description,
      price,
      salePrice,
      brand,
      category,
      subCategory,
      model,
      sku,
      variations,
      specifications,
      seoTitle,
      seoDescription,
      keywords,
      tags,
    } = req.body;

    const parsedVariations =
      variations && typeof variations === "string"
        ? JSON.parse(variations)
        : variations || [];

    const parsedSpecifications =
      specifications && typeof specifications === "string"
        ? JSON.parse(specifications)
        : specifications || [];

    const parsedTags =
      tags && typeof tags === "string" ? JSON.parse(tags) : tags || [];

    const parsedKeywords =
      keywords && typeof keywords === "string" ? JSON.parse(keywords) : keywords || [];

    let totalQuantity = 0;
    if (parsedVariations.length > 0) {
      parsedVariations.forEach(v => {
        if (v.options && v.options.length > 0) {
          v.options.forEach(opt => {
            opt.stock = Number(opt.stock) || 0;
            opt.additionalPrice = Number(opt.additionalPrice) || 0;
            totalQuantity += opt.stock;
          });
        }
      });
    }

    // Xử lý ảnh
    let images = [];
    if (req.files) {
      console.log("👉 Toàn bộ req.files:", req.files);

      const main = req.files.mainImage ? req.files.mainImage[0] : null;
      const subs = req.files.subImages || [];

      if (main) images.push(`/uploads/${main.filename}`);
      if (subs.length > 0) images.push(...subs.map(f => `/uploads/${f.filename}`));
    }

    console.log("📌 Mảng images sau xử lý:", images);

    // SKU tự sinh nếu chưa có
    const finalSKU = sku || generateSKU(name);

    // Tạo product
    const product = new Product({
      name,
      description,
      price,
      salePrice,
      brand,
      category,
      subCategory,
      quantity: totalQuantity,
      model,
      sku: finalSKU,
      variations: parsedVariations,
      specifications: parsedSpecifications,
      seoTitle,
      seoDescription,
      keywords: parsedKeywords,
      tags: parsedTags,
      store: store._id,
      images,
    });

    console.log("📌 Product chuẩn bị lưu:", product);

    await product.save();
    console.log("✅ Product đã lưu thành công!");

    return res.status(201).json({ success: true, data: product });
  } catch (err) {
    console.error("❌ Lỗi tạo sản phẩm:", err);
    return res.status(400).json({ success: false, message: err.message });
  }
};






//getall products with pagination, filtering, sorting
exports.getProducts = async (req, res) => {
  try {
    const { category, search, sortBy, limit = 10, page = 1 } = req.query;
    const filter = { isActive: true };

    if (category) filter.category = category;
    if (search) filter.name = { $regex: search, $options: "i" };

    const skip = (page - 1) * limit;

    let query = Product.find(filter)
      .populate("store", "name logoUrl")
      .skip(Number(skip))
      .limit(Number(limit));

    if (sortBy) {
      if (sortBy === "price_asc") query = query.sort({ price: 1 });
      if (sortBy === "price_desc") query = query.sort({ price: -1 });
      if (sortBy === "rating") query = query.sort({ rating: -1 });
      if (sortBy === "newest") query = query.sort({ createdAt: -1 });
    }

    const products = await query;
    const total = await Product.countDocuments(filter);

    res.json({
      success: true,
      data: products,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/products/:id
exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    let product = await Product.findById(id).populate("store", "name logoUrl");

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    product.viewsCount += 1;
    await product.save();

    return res.json({
      success: true,
      data: product,
    });
  } catch (err) {
    console.error("❌ getProductById error:", err.message);
    return res.status(500).json({
      success: false,
      message: err.message || "Server error",
    });
  }
};

// update product của chính seller
exports.updateProduct = async (req, res) => {
  try {
    const store = await Store.findOne({ owner: req.user.userId });
    if (!store) {
      return res.status(400).json({ success: false, message: "Bạn chưa có cửa hàng" });
    }

    let updateData = { ...req.body };

    if (updateData.variations && typeof updateData.variations === "string") {
      updateData.variations = JSON.parse(updateData.variations);
    }
    if (updateData.specifications && typeof updateData.specifications === "string") {
      updateData.specifications = JSON.parse(updateData.specifications);
    }
    if (updateData.tags && typeof updateData.tags === "string") {
      updateData.tags = JSON.parse(updateData.tags);
    }
    if (updateData.keywords && typeof updateData.keywords === "string") {
      updateData.keywords = JSON.parse(updateData.keywords);
    }

    if (req.files && req.files.length > 0) {
      updateData.images = req.files.map((file) => `/uploads/${file.filename}`);
    }

    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, store: store._id }, // check product có thuộc store của seller không
      updateData,
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ success: false, message: "Không tìm thấy sản phẩm của bạn" });
    }

    res.json({ success: true, data: product });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// soft delete product của chính seller
exports.deleteProduct = async (req, res) => {
  try {
    const store = await Store.findOne({ owner: req.user.userId });
    if (!store) {
      return res.status(400).json({ success: false, message: "Bạn chưa có cửa hàng" });
    }

    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, store: store._id }, // check quyền sở hữu
      { isActive: false },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({ success: false, message: "Không tìm thấy sản phẩm của bạn" });
    }

    res.json({ success: true, message: "Product deactivated", data: product });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getFeaturedProducts = async (req, res) => {
  try {
    console.log("🔥 [GET FEATURED PRODUCTS] API được gọi lúc:", new Date().toISOString());

    const products = await Product.find({ isActive: true })
      .sort({ soldCount: -1 }) // sort giảm dần theo soldCount
      .limit(10)
      .populate("store", "name");

    console.log("👉 Số lượng sản phẩm tìm được:", products.length);
    console.log("📌 Danh sách sản phẩm:", products.map(p => ({
      id: p._id,
      name: p.name,
      soldCount: p.soldCount,
      price: p.price,
      store: p.store?.name
    })));

    res.json(products);
  } catch (err) {
    console.error("❌ Error in getFeaturedProducts:", err.message);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

// Lấy danh sách sản phẩm của shop (seller)
exports.getMyProducts = async (req, res) => {
  try {
    console.log("req.user:", req.user);
    const userId = req.user.userId;

    const store = await Store.findOne({ owner: userId });
    console.log("store tìm được:", store);

    if (!store) {
      return res.status(404).json({ message: "Bạn chưa có cửa hàng" });
    }

    const products = await Product.find({ store: store._id });
    console.log("products tìm được:", products.length);

    return res.json({ data: products });
  } catch (err) {
    console.error("❌ Lỗi getMyProducts:", err);
    return res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};
