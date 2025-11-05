const express = require("express");
const router = express.Router();
const {
  getAvailableVouchers,
  getAvailableVouchersForCheckout,
  createVoucher,
  updateVoucher,
  deleteVoucher,
  previewVoucher,
  applyVoucher,
} = require("../controllers/VoucherController");

const auth = require("../middlewares/authMiddleware");

router.get("/", auth, getAvailableVouchers);
router.post("/checkout", auth, getAvailableVouchersForCheckout);
router.post("/preview", auth, previewVoucher);
router.post("/apply", auth, applyVoucher);

router.post("/", auth, createVoucher);
router.put("/:id", auth, updateVoucher);
router.delete("/:id", auth, deleteVoucher);

module.exports = router;
