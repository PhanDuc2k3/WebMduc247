const express = require("express");
const router = express.Router();
const {
  getDashboardStats,
  getUsersChartData,
  getOrdersChartData,
  getStoresChartData,
  getProductsChartData,
  getVouchersChartData,
} = require("../controllers/AdminStatisticsController");
const auth = require("../middlewares/authMiddleware");

// Tất cả routes đều yêu cầu đăng nhập (quyền admin sẽ được kiểm tra trong controller nếu cần)
router.get("/stats", auth, getDashboardStats);
router.get("/charts/users", auth, getUsersChartData);
router.get("/charts/orders", auth, getOrdersChartData);
router.get("/charts/stores", auth, getStoresChartData);
router.get("/charts/products", auth, getProductsChartData);
router.get("/charts/vouchers", auth, getVouchersChartData);

module.exports = router;
