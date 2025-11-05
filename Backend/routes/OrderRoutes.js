const express = require("express");
const router = express.Router();
const {
  createOrder,
  getMyOrders,
  getAllOrders,
  updateOrderStatus,
  getOrderById,
  getOrdersBySeller,
  getOrderByCode,
  markOrderPaid,
  confirmDelivery,
} = require("../controllers/OrderController");
const auth = require("../middlewares/authMiddleware");


router.post("/", auth, createOrder);
router.get("/my", auth, getMyOrders);
router.get("/seller", auth, getOrdersBySeller);
router.get("/by-code/:orderCode", auth, getOrderByCode);
router.post("/orders/:id/pay", markOrderPaid);

router.get("/", auth, getAllOrders);
router.put("/:id/status", auth, updateOrderStatus);
router.post("/:id/confirm-delivery", auth, confirmDelivery); // Buyer xác nhận đã nhận hàng
router.get("/:id", auth, getOrderById);

module.exports = router;
