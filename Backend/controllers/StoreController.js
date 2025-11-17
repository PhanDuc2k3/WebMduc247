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

// Admin: Cập nhật cửa hàng theo ID
exports.updateStoreById = async (req, res) => {
  try {
    const storeId = req.params.id;
    const store = await storeService.updateStoreById(storeId, req.body);
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
    console.log('🚀 [StoreController] getAllActiveStores called');
    console.log('👤 [StoreController] req.user:', req.user ? JSON.stringify({ role: req.user.role, userId: req.user.userId, _id: req.user._id }) : 'null');
    console.log('🔍 [StoreController] req.user.role === "admin":', req.user && req.user.role === 'admin');
    
    // Nếu là admin, trả về tất cả stores (bao gồm cả inactive)
    if (req.user && req.user.role === 'admin') {
      console.log(`🔐 [StoreController] Admin request - lấy tất cả stores`);
      console.log(`👤 [StoreController] User role: ${req.user.role}, User ID: ${req.user._id || req.user.userId}`);
      
      const stores = await storeService.getAllStores();
      console.log(`📋 [StoreController] Nhận được ${stores.length} stores từ service`);
      console.log(`📋 [StoreController] Stores IDs:`, stores.map(s => (s._id || s._id?.toString())));
      
      // Đảm bảo trả về đúng format - KHÔNG filter stores
      const storesData = stores.map((store, index) => {
        const storeObj = store.toObject ? store.toObject() : store;
        console.log(`📦 [StoreController] Store ${index + 1}: _id=${storeObj._id}, name=${storeObj.name}, isActive=${storeObj.isActive}`);
        return {
          ...storeObj,
          owner: storeObj.owner || null,
          userInfo: storeObj.owner ? {
            fullName: storeObj.owner.fullName || '',
            email: storeObj.owner.email || '',
            phone: storeObj.owner.phone || ''
          } : null
        };
      });
      
      console.log(`✅ [StoreController] Trả về ${storesData.length} stores cho admin`);
      console.log(`✅ [StoreController] Stores trong response:`, storesData.map(s => ({ _id: s._id, name: s.name, isActive: s.isActive })));
      
      // Trả về cả stores array trực tiếp và trong object
      return res.status(200).json({ 
        message: 'Lấy danh sách cửa hàng thành công', 
        stores: storesData,
        count: storesData.length
      });
    }
    
    // Nếu không phải admin, chỉ trả về active stores
    console.log('👤 [StoreController] Non-admin request - chỉ trả về active stores');
    const stores = await storeService.getAllActiveStores();
    res.status(200).json({ message: 'Lấy danh sách cửa hàng thành công', stores });
  } catch (error) {
    console.error('❌ Error in getAllActiveStores:', error);
    console.error('❌ Error stack:', error.stack);
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
