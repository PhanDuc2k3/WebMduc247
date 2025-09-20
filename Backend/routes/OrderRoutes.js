const express = require("express");
const router = express.Router();
const {
  createOrder,
  getMyOrders,
  getAllOrders,
  updateOrderStatus,
  getOrderById,
} = require("../controllers/OrderController");
const auth = require("../middlewares/authMiddleware");

// Buyer
router.post("/", auth, createOrder);
router.get("/my", auth, getMyOrders);

// Admin
router.get("/", auth, getAllOrders);
router.put("/:id/status", auth, updateOrderStatus);
router.get("/:id", auth, getOrderById);

module.exports = router;
