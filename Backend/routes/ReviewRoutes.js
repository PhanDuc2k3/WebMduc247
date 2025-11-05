const express = require("express");
const router = express.Router();
const auth = require("../middlewares/authMiddleware");
const { uploadReview } = require('../middlewares/upload');
const { 
  createReview, 
  getReviewsByProduct, 
  getReviewByUserAndProduct, 
  updateReview 
} = require("../controllers/ReviewController");

// Tạo review (tối đa 5 ảnh) - upload lên Cloudinary folder 'reviews'
router.post("/:orderId/reviews", auth, uploadReview.array("images", 5), createReview);

// Lấy tất cả review của 1 sản phẩm
router.get("/product/:productId/reviews", getReviewsByProduct);

// Lấy review của user cho sản phẩm trong đơn hàng cụ thể (đặt sau để tránh conflict)
router.get("/order/:orderId/product/:productId/user-review", auth, getReviewByUserAndProduct);

// Cập nhật review (tối đa 5 ảnh) - upload lên Cloudinary folder 'reviews'
router.put("/:reviewId", auth, uploadReview.array("images", 5), updateReview);

module.exports = router;
