// routes/banner.js
const express = require("express");
const router = express.Router();
const bannerController = require("../controllers/BannerController");
const { upload } = require("../middlewares/upload"); // file bạn gửi

// Lấy tất cả banner
router.get("/", bannerController.getAllBanners);

// Lấy banner theo type
router.get("/type/:type", bannerController.getBannersByType);

// Sửa banner (admin) → có thể upload ảnh
router.put("/:id", upload.single("image"), bannerController.updateBanner);

module.exports = router;
