const storeService = require('../services/StoreService');
const mongoose = require('mongoose');

// ========================
// TẠO CỬA HÀNG
// ========================
exports.createStore = async (req, res) => {
  try {
    const userId = req.user._id;
    const store = await storeService.createStore(userId, req.body, req.files);
    res.status(201).json({ message: 'Tạo cửa hàng thành công!', store });
  } catch (error) {
    const statusCode = error.message.includes('Thiếu thông tin') ? 400 : 500;
    res.status(statusCode).json({ message: error.message || 'Lỗi khi tạo cửa hàng' });
  }
};

// ========================
// CẬP NHẬT CỬA HÀNG
// ========================
exports.updateStore = async (req, res) => {
  try {
    const userId = req.user.userId;
    const store = await storeService.updateStore(userId, req.body, req.files);
    res.status(200).json({ message: 'Cập nhật cửa hàng thành công', store });
  } catch (error) {
    const statusCode = error.message.includes('Không tìm thấy') ? 404 : 500;
    res.status(statusCode).json({ message: error.message || 'Lỗi khi cập nhật cửa hàng' });
  }
};

// ========================
// KÍCH HOẠT / VÔ HIỆU HÓA
// ========================
exports.activateStore = async (req, res) => {
  try {
    const userId = req.user.userId;
    const store = await storeService.activateStore(userId);
    res.status(200).json({ message: 'Kích hoạt cửa hàng thành công', store });
  } catch (error) {
    const statusCode = error.message.includes('Không tìm thấy') ? 404 : 500;
    res.status(statusCode).json({ message: error.message || 'Lỗi khi kích hoạt cửa hàng' });
  }
};

exports.deactivateStore = async (req, res) => {
  try {
    const userId = req.user.userId;
    const store = await storeService.deactivateStore(userId);
    res.status(200).json({ message: 'Vô hiệu hóa cửa hàng thành công', store });
  } catch (error) {
    const statusCode = error.message.includes('Không tìm thấy') ? 404 : 500;
    res.status(statusCode).json({ message: error.message || 'Lỗi khi vô hiệu hóa cửa hàng' });
  }
};

// ========================
// LẤY CỬA HÀNG
// ========================
exports.getStoreByOwner = async (req, res) => {
  try {
    const userId = req.user.userId;
    const store = await storeService.getStoreByOwner(userId);
    res.status(200).json({ message: 'Lấy thông tin cửa hàng thành công', store });
  } catch (error) {
    const statusCode = error.message.includes('Không tìm thấy') ? 404 : 500;
    res.status(statusCode).json({ message: error.message || 'Lỗi khi lấy cửa hàng' });
  }
};

exports.getMyStore = async (req, res) => {
  try {
    const userId = req.user.userId;
    const store = await storeService.getStoreByOwner(userId);
    res.status(200).json({ store });
  } catch (error) {
    const statusCode = error.message.includes('Không tìm thấy') ? 404 : 500;
    res.status(statusCode).json({ message: error.message || 'Lỗi server' });
  }
};

exports.getStoreById = async (req, res) => {
  try {
    const storeId = req.params.id;
    const store = await storeService.getStoreById(storeId);
    res.status(200).json({
      message: 'Lấy thông tin cửa hàng thành công',
      store
    });
  } catch (error) {
    const statusCode = error.message.includes('Không tìm thấy') ? 404 : 500;
    res.status(statusCode).json({ message: error.message || 'Lỗi khi lấy cửa hàng' });
  }
};

exports.getAllActiveStores = async (req, res) => {
  try {
    const stores = await storeService.getAllActiveStores();
    res.status(200).json({ message: 'Lấy danh sách cửa hàng thành công', stores });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Lỗi khi lấy danh sách cửa hàng' });
  }
};

exports.addCategory = async (req, res) => {
  try {
    const storeId = req.params.id;
    const { name } = req.body;
    const category = await storeService.addCategory(storeId, name);
    res.status(201).json({ message: 'Thêm danh mục thành công', category });
  } catch (err) {
    console.error(err);
    const statusCode = err.message.includes('Không tìm thấy') ? 404 : 
                      err.message.includes('bắt buộc') ? 400 : 500;
    res.status(statusCode).json({ message: err.message || 'Lỗi server' });
  }
};

exports.editCategory = async (req, res) => {
  try {
    const { id: storeId, categoryId } = req.params;
    const { name } = req.body;
    const category = await storeService.editCategory(storeId, categoryId, name);
    res.status(200).json({ message: 'Cập nhật danh mục thành công', category });
  } catch (err) {
    console.error(err);
    const statusCode = err.message.includes('Không tìm thấy') ? 404 : 
                      err.message.includes('bắt buộc') ? 400 : 500;
    res.status(statusCode).json({ message: err.message || 'Lỗi server' });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const storeId = req.params.id;
    const categoryId = req.params.catId;
    
    if (!mongoose.Types.ObjectId.isValid(storeId) || !mongoose.Types.ObjectId.isValid(categoryId)) {
      return res.status(400).json({ message: "Invalid storeId or categoryId" });
    }

    const store = await storeService.deleteCategory(storeId, categoryId);
    res.status(200).json({ message: "Category deleted successfully", store });
  } catch (err) {
    console.error("Delete category error:", err);
    const statusCode = err.message.includes('Không tìm thấy') ? 404 : 500;
    res.status(statusCode).json({ message: err.message || "Server error" });
  }
};

exports.addProductsToCategory = async (req, res) => {
  try {
    const { id: storeId, categoryId } = req.params;
    const { productIds } = req.body;
    const category = await storeService.addProductsToCategory(storeId, categoryId, productIds);
    res.status(200).json({ message: "Thêm sản phẩm vào danh mục thành công", category });
  } catch (err) {
    console.error(err);
    const statusCode = err.message.includes('Không tìm thấy') ? 404 : 
                      err.message.includes('bắt buộc') ? 400 : 500;
    res.status(statusCode).json({ message: err.message || "Server error" });
  }
};

exports.removeProductFromCategory = async (req, res) => {
  try {
    const { id: storeId, categoryId, productId } = req.params;
    const category = await storeService.removeProductFromCategory(storeId, categoryId, productId);
    res.status(200).json({ message: "Xóa sản phẩm khỏi danh mục thành công", category });
  } catch (err) {
    console.error(err);
    const statusCode = err.message.includes('Không tìm thấy') ? 404 : 500;
    res.status(statusCode).json({ message: err.message || "Server error" });
  }
};

exports.getCategories = async (req, res) => {
  try {
    const storeId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(storeId)) {
      return res.status(400).json({ message: "StoreId không hợp lệ" });
    }

    const categories = await storeService.getCategories(storeId);
    res.status(200).json({ categories });
  } catch (err) {
    console.error("Get categories error:", err);
    const statusCode = err.message.includes('Không tìm thấy') ? 404 : 500;
    res.status(statusCode).json({ message: err.message || "Lỗi server" });
  }
};

exports.getProductsByCategory = async (req, res) => {
  try {
    const { id: storeId, categoryId } = req.params;
    const products = await storeService.getProductsByCategory(storeId, categoryId);
    res.status(200).json({ products });
  } catch (err) {
    console.error("Get products by category error:", err);
    const statusCode = err.message.includes('Không tìm thấy') ? 404 : 500;
    res.status(statusCode).json({ message: err.message || "Server error" });
  }
};

// Tìm kiếm stores
exports.searchStores = async (req, res) => {
  try {
    const { keyword, limit = 10 } = req.query;
    if (!keyword || !keyword.trim()) {
      return res.status(200).json({ stores: [] });
    }
    const stores = await storeService.searchStores(keyword, parseInt(limit));
    res.status(200).json({ stores });
  } catch (err) {
    console.error("Search stores error:", err);
    res.status(500).json({ message: err.message || "Lỗi khi tìm kiếm cửa hàng" });
  }
};
