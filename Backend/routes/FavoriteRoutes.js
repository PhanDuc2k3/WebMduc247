const express = require("express");
const router = express.Router();
const {
  addFavorite,
  removeFavorite,
  checkFavorite,
  getMyFavorites,
  getFavoriteCount
} = require("../controllers/FavoriteController");
const auth = require("../middlewares/authMiddleware");

// Protected routes - cần đăng nhập
router.post("/", auth, addFavorite);
router.delete("/", auth, removeFavorite);
router.get("/my", auth, getMyFavorites);
router.get("/check/product/:productId", auth, checkFavorite);
router.get("/check/store/:storeId", auth, checkFavorite);

// Public routes - không cần đăng nhập
router.get("/count/product/:productId", getFavoriteCount);
router.get("/count/store/:storeId", getFavoriteCount);

module.exports = router;

