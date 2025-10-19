const express = require("express");
const router = express.Router();
const auth = require("../middlewares/authMiddleware");
const { upload } = require('../middlewares/upload');
const { createReview,getReviewsByProduct } = require("../controllers/ReviewController");



// Tạo review (tối đa 5 ảnh)
router.post("/:orderId/reviews", auth, upload.array("images", 5), createReview);

// Lấy tất cả review của 1 sản phẩm
router.get("/:productId/reviews", getReviewsByProduct);

module.exports = router;
