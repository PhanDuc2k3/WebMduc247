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
  requestReturn,
  confirmReturnReceived,
  processReturn,
  rejectReturn,
  cancelOrder,
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
router.post("/:id/request-return", auth, requestReturn); // Buyer yêu cầu trả lại hàng
router.post("/:id/confirm-return-received", auth, confirmReturnReceived); // Seller xác nhận đã thu hồi sản phẩm
router.post("/:id/reject-return", auth, rejectReturn); // Seller từ chối yêu cầu trả lại hàng
router.post("/:id/process-return", auth, processReturn); // Admin xử lý yêu cầu trả lại (tương thích ngược)
router.post("/:id/cancel", auth, cancelOrder); // Buyer hủy đơn hàng
router.get("/:id", auth, getOrderById);

module.exports = router;
