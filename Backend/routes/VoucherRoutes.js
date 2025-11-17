const express = require("express");
const router = express.Router();
const {
  getAvailableVouchers,
  getAllVouchers,
  getAvailableVouchersForCheckout,
  createVoucher,
  updateVoucher,
  deleteVoucher,
  toggleVoucherStatus,
  previewVoucher,
  applyVoucher,
  cleanupVoucherUsersUsed,
} = require("../controllers/VoucherController");

const auth = require("../middlewares/authMiddleware");
const optionalAuth = require("../middlewares/optionalAuthMiddleware");

// Tạm thời bỏ auth để ai cũng có thể truy cập
router.get("/", getAvailableVouchers);
router.get("/all", getAllVouchers); // Endpoint lấy tất cả voucher (tạm thời không cần auth)
router.post("/checkout", optionalAuth, getAvailableVouchersForCheckout); // ✅ Dùng optionalAuth để lấy userId nếu có token
router.post("/preview", previewVoucher);
router.post("/apply", applyVoucher);

router.post("/", createVoucher);
router.put("/:id", updateVoucher);
router.put("/:id/toggle-status", toggleVoucherStatus); // Endpoint để bật/tắt khóa voucher
router.delete("/:id", deleteVoucher);
router.post("/cleanup", auth, cleanupVoucherUsersUsed); // Endpoint để cleanup duplicate userId trong usersUsed (cần auth)

module.exports = router;
