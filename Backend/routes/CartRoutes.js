const express = require("express");
const router = express.Router();
const {
  getCart,
  addToCart,
  updateQuantity,
  removeFromCart,
} = require("../controllers/CartController");

const auth = require("../middlewares/authMiddleware");

router.get("/", auth, getCart);
router.post("/add", auth, addToCart);
router.put("/update", auth, updateQuantity);
router.delete("/:itemId", auth, removeFromCart);

module.exports = router;
