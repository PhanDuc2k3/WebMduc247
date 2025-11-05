const express = require("express");
const router = express.Router();
const {
  getAllPromotions,
  getPromotionById,
  createPromotion,
  updatePromotion,
  deletePromotion,
  increaseViews,
} = require("../controllers/PromotionController");
const auth = require("../middlewares/authMiddleware");
const authorize = require("../middlewares/roleMiddleware");
const { upload } = require("../middlewares/upload");

// Public routes - specific routes before parameterized routes
router.get("/", getAllPromotions);
router.get("/:id", getPromotionById);
router.post("/:id/views", increaseViews);

// Admin routes
router.post(
  "/",
  auth,
  // authorize("admin"),
  upload.single("image"),
  createPromotion
);

router.put(
  "/:id",
  auth,
  // authorize("admin"),
  upload.single("image"),
  updatePromotion
);

router.delete("/:id", auth, authorize("admin"), deletePromotion);

module.exports = router;
