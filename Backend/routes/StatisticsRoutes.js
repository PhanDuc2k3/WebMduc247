const express = require("express");
const router = express.Router();
const { getRevenueStats, getTopProducts,getViewsStats } = require("../controllers/StatisticsController");
const auth = require("../middlewares/authMiddleware");

router.get("/revenue", auth, getRevenueStats);
router.get("/top-products", auth, getTopProducts);
router.get("/views", auth, getViewsStats);

module.exports = router;
