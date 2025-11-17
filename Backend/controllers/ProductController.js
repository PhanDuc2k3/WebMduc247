const productService = require('../services/ProductService');

// Create product
exports.createProduct = async (req, res) => {
  try {
    const userId = req.user.userId;
    const product = await productService.createProduct(userId, req.body, req.files);
    return res.status(201).json({ success: true, data: product });
  } catch (err) {
    console.error("Lỗi tạo sản phẩm:", err);
    return res.status(400).json({ success: false, message: err.message });
  }
};

// Get all products with pagination, filtering, sorting
exports.getProducts = async (req, res) => {
  try {
    const result = await productService.getProducts(req.query);
    res.json({
      success: true,
      data: result.products,
      pagination: result.pagination,
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
    const product = await productService.getProductById(id);
    return res.json({ success: true, data: product });
  } catch (err) {
    console.error("getProductById error:", err.message);
    const statusCode = err.message.includes("not found") ? 404 : 400;
    return res.status(statusCode).json({ success: false, message: err.message || "Server error" });
  }
};

// Tìm kiếm sản phẩm
exports.searchProducts = async (req, res) => {
  try {
    const { keyword, limit = 10 } = req.query;
    if (!keyword || !keyword.trim()) {
      return res.status(200).json({ products: [] });
    }
    const products = await productService.searchProducts(keyword, parseInt(limit));
    res.status(200).json({ products });
  } catch (err) {
    console.error("Search products error:", err);
    res.status(500).json({ message: err.message || "Lỗi khi tìm kiếm sản phẩm" });
  }
};

// Increase product view
exports.increaseView = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await productService.increaseView(id);
    return res.json({ success: true, views: result.views });
  } catch (err) {
    console.error("increaseView error:", err.message);
    const statusCode = err.message.includes("not found") ? 404 : 500;
    return res.status(statusCode).json({ success: false, message: err.message });
  }
};

// Update product by seller
exports.updateProduct = async (req, res) => {
  try {
    const userId = req.user.userId;
    const productId = req.params.id;
    const product = await productService.updateProduct(userId, productId, req.body, req.files);
    return res.json(product);
  } catch (err) {
    console.error("[updateProduct] ERROR:", err);
    const statusCode = err.message.includes("Không tìm thấy") ? 404 : 
                      err.message.includes("Invalid") ? 400 : 500;
    return res.status(statusCode).json({ success: false, message: err.message || "Server error" });
  }
};

// Soft delete product
exports.deleteProduct = async (req, res) => {
  try {
    const userId = req.user.userId;
    const productId = req.params.id;
    const product = await productService.deleteProduct(userId, productId);
    res.json({ success: true, message: "Product deactivated", data: product });
  } catch (err) {
    const statusCode = err.message.includes("Không tìm thấy") ? 404 : 500;
    res.status(statusCode).json({ success: false, message: err.message });
  }
};

// Featured products
exports.getFeaturedProducts = async (req, res) => {
  try {
    const products = await productService.getFeaturedProducts();
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
    const products = await productService.getMyProducts(userId);
    return res.json({ data: products });
  } catch (err) {
    console.error("Lỗi getMyProducts:", err);
    const statusCode = err.message.includes("chưa có cửa hàng") ? 404 : 500;
    return res.status(statusCode).json({ message: err.message || "Lỗi server" });
  }
};

// Get products by store
exports.getProductsByStore = async (req, res) => {
  try {
    const { storeId } = req.params;
    const products = await productService.getProductsByStore(storeId);
    res.json(products);
  } catch (err) {
    console.error(err);
    const statusCode = err.message.includes("Không có sản phẩm") ? 404 : 500;
    res.status(statusCode).json({ message: err.message || "Lỗi server" });
  }
};

// Get views stats
exports.getViewsStats = async (req, res) => {
  try {
    const { storeId, range } = req.query;
    const result = await productService.getViewsStats(storeId, range);
    res.json(result);
  } catch (err) {
    console.error("getViewsStats error:", err.message);
    res.status(500).json({ message: "Lỗi server" });
  }
};

// Đếm số lượng sản phẩm theo danh mục
exports.getProductCountByCategory = async (req, res) => {
  try {
    const result = await productService.getProductCountByCategory();
    res.json(result);
  } catch (err) {
    console.error("getProductCountByCategory error:", err.message);
    res.status(500).json({ message: "Lỗi server", error: err.message });
  }
};
