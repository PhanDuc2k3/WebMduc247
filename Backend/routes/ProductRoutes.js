const express = require("express");
const router = express.Router();

const {
  createProduct,
  getFeaturedProducts,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  restoreProduct,
  getMyProducts,
  getProductsByStore,
  getViewsStats,
  increaseView,
  getProductCountByCategory,
  searchProducts
} = require("../controllers/ProductController");

const { upload } = require('../middlewares/upload');
const auth = require("../middlewares/authMiddleware");
const optionalAuth = require("../middlewares/optionalAuthMiddleware");
const authorize = require("../middlewares/roleMiddleware");

router.post(
  "/",
  auth,
  authorize("seller"), // ✅ Chỉ seller mới có thể tạo sản phẩm
  upload.fields([
    { name: "mainImage", maxCount: 1 },
    { name: "subImages", maxCount: 5 },
  ]),
  createProduct
);

// Các route GET public: cho phép khách truy cập,
// nếu có token thì dùng optionalAuth để có req.user (phục vụ cá nhân hóa sau này)
router.get("/count-by-category", optionalAuth, getProductCountByCategory);

router.get("/views-stats", auth, authorize("admin"), getViewsStats);
router.patch("/:id/view", increaseView);
router.get("/featured", optionalAuth, getFeaturedProducts);
router.get("/search", optionalAuth, searchProducts);
router.get("/my-products", auth, authorize("seller", "admin"), getMyProducts); 
router.get("/store/:storeId/products", optionalAuth, getProductsByStore);
router.get("/", optionalAuth, getProducts);
router.get("/:id", optionalAuth, getProductById); 

router.put(
  "/:id",
  auth,
  authorize("seller"), // ✅ Chỉ seller mới có thể cập nhật sản phẩm
  upload.fields([
    { name: "mainImage", maxCount: 1 },
    { name: "subImages", maxCount: 5 },
  ]),
  (err, req, res, next) => {
    if (err) {
      console.log("❌ Lỗi Multer:", err);
      return res.status(400).json({ message: err.message });
    }
    next();
  },
  updateProduct
);

router.delete("/:id", auth, authorize("seller"), deleteProduct); // ✅ Chỉ seller mới có thể xóa sản phẩm
router.patch("/:id/restore", auth, authorize("seller"), restoreProduct); // ✅ Chỉ seller mới có thể khôi phục sản phẩm

module.exports = router;
