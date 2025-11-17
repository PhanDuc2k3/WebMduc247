const express = require('express');
const router = express.Router();

const {
  createStore,
  getStoreByOwner,
  updateStore,
  activateStore,
  deactivateStore,
  getAllActiveStores,
  getStoreById,
  getMyStore,
  addCategory,
  editCategory,
  deleteCategory,
  addProductsToCategory,      // ✅ mới
  removeProductFromCategory,  // ✅ 
  getCategories,
  getProductsByCategory,
  searchStores
} = require('../controllers/StoreController');

const { upload } = require('../middlewares/upload'); // dùng giống product
const auth = require('../middlewares/authMiddleware');
const authorize = require('../middlewares/roleMiddleware');

// ========================
// TẠO CỬA HÀNG
// ========================
router.post(
  '/',
  auth,
  authorize('seller', 'admin'),
  upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'banner', maxCount: 1 },
  ]),
  createStore
);

// ========================
// CẬP NHẬT CỬA HÀNG
// ========================
router.put(
  '/',
  auth,
  authorize('seller', 'admin'),
  upload.fields([
    { name: 'logo', maxCount: 1 },
    { name: 'banner', maxCount: 1 },
  ]),
  (err, req, res, next) => {
    if (err) {
      console.log('❌ Lỗi Multer:', err);
      return res.status(400).json({ message: err.message });
    }
    next();
  },
  updateStore
);

// ========================
// KÍCH HOẠT / VÔ HIỆU HÓA
// ========================
router.patch('/activate', auth, authorize('seller', 'admin'), activateStore);
router.patch('/deactivate', auth, authorize('seller', 'admin'), deactivateStore);

// ========================
// LẤY CỬA HÀNG
// ========================
router.get('/owner', auth, getStoreByOwner);
router.get('/me', auth, getMyStore);
router.get('/search', searchStores);
router.get('/', getAllActiveStores);
router.get('/:id', getStoreById);
router.get('/:id/categories', auth, getCategories);
// Lấy sản phẩm theo category
router.get('/:id/categories/:categoryId/products', auth, getProductsByCategory);
// ========================
// QUẢN LÝ DANH MỤC
// ========================
router.post('/:id/categories', auth, authorize('seller', 'admin'), addCategory);
router.put('/:id/categories/:catId', auth, authorize('seller', 'admin'), editCategory);
router.delete('/:id/categories/:catId', auth, authorize('seller', 'admin'), deleteCategory);

// ========================
// QUẢN LÝ SẢN PHẨM TRONG DANH MỤC
// ========================
router.post('/:id/categories/:categoryId/products', auth, authorize('seller', 'admin'), addProductsToCategory); 
router.delete('/:id/categories/:categoryId/products/:productId', auth, authorize('seller', 'admin'), removeProductFromCategory);


module.exports = router;
