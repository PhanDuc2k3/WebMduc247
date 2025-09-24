const express = require("express");
const router = express.Router();
const { 
  getAddressById,
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress
} = require("../controllers/AddressController");
const auth = require("../middlewares/authMiddleware");

router.post("/", auth, createAddress);
router.get("/", auth, getAddresses);
router.get("/:id", auth, getAddressById);
router.put("/:id", auth, updateAddress);
router.delete("/:id", auth, deleteAddress);

module.exports = router;
