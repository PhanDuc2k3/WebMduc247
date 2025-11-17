// routes/banner.js
const express = require("express");
const router = express.Router();
const bannerController = require("../controllers/BannerController");
const { upload } = require("../middlewares/upload"); // multer hoặc Cloudinary

// Lấy tất cả banner
router.get("/", bannerController.getAllBanners);

// Lấy banner theo type
router.get("/type/:type", bannerController.getBannersByType);

// Tạo banner mới
router.post("/", upload.single("image"), bannerController.createBanner);

// Sửa banner (admin) → có thể upload ảnh
router.put("/:id", upload.single("image"), bannerController.updateBanner);

// Xóa banner
router.delete("/:id", bannerController.deleteBanner);

module.exports = router;
