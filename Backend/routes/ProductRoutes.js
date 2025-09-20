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
} = require("../controllers/ProductController");

const upload = require("../middlewares/upload");
const auth = require("../middlewares/authMiddleware");
const authorize = require("../middlewares/roleMiddleware");

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

router.get("/featured", getFeaturedProducts);
router.get("/", getProducts);
router.get("/seller/my-products", auth, authorize("seller", "admin"), getMyProducts);
router.get("/:id", getProductById);

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
