const express = require("express");
const router = express.Router();

const {
  createProduct,
  getFeaturedProducts,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getMyProducts,
  getProductsByStore,
  getViewsStats,
  increaseView// ✅ import controller thống kê views
} = require("../controllers/ProductController");

const upload = require("../middlewares/upload");
const auth = require("../middlewares/authMiddleware");
const authorize = require("../middlewares/roleMiddleware");

// Seller thêm sản phẩm
router.post(
  "/",
  auth,
  authorize("seller", "admin"),
  upload.fields([
    { name: "mainImage", maxCount: 1 },
    { name: "subImages", maxCount: 5 },
  ]),
  createProduct
);

// ✅ Route thống kê view (đặt trước các route có :id)
router.get("/views-stats", getViewsStats);
router.patch("/:id/view", increaseView);
router.get("/featured", getFeaturedProducts);
router.get("/my-products", auth, authorize("seller", "admin"), getMyProducts); // đặt trước /:id
router.get("/store/:storeId/products", getProductsByStore);
router.get("/", getProducts);
router.get("/:id", getProductById); // phải sau /my-products

router.put(
  "/:id",
  auth,
  authorize("seller", "admin"),
  upload.fields([
    { name: "mainImage", maxCount: 1 },
    { name: "subImages", maxCount: 5 },
  ]),
  updateProduct
);

router.delete("/:id", auth, authorize("seller", "admin"), deleteProduct);

module.exports = router;
