const express = require("express");
const router = express.Router();

const {
  getAvailableVouchers,
  createVoucher,
  updateVoucher,
  deleteVoucher,
  applyVoucher,
} = require("../controllers/VoucherController");

const auth = require("../middlewares/authMiddleware");

router.get("/", auth, getAvailableVouchers);
router.post("/apply", auth, applyVoucher);

router.post("/", auth, createVoucher);
router.put("/:id", auth, updateVoucher);
router.delete("/:id", auth, deleteVoucher);

module.exports = router;
