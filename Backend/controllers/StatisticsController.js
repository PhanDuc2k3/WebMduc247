const statisticsService = require('../services/StatisticsService');

exports.getRevenueStats = async (req, res) => {
  try {
    const { storeId, range } = req.query;
    const result = await statisticsService.getRevenueStats(storeId, range);
    res.json(result);
  } catch (err) {
    console.error("Revenue error:", err);
    res.status(500).json({ message: "Lỗi khi thống kê doanh thu" });
  }
};

exports.getViewsStats = async (req, res) => {
  try {
    const { storeId, range } = req.query;
    const result = await statisticsService.getViewsStats(storeId, range);
    res.json(result);
  } catch (error) {
    console.error("Views error:", error);
    res.status(500).json({ message: "Lỗi khi thống kê lượt truy cập" });
  }
};

exports.getTopProducts = async (req, res) => {
  try {
    const { storeId, limit } = req.query;
    const products = await statisticsService.getTopProducts(storeId, limit);
    res.json(products);
  } catch (err) {
    console.error("Top products error:", err);
    res.status(500).json({ message: "Lỗi khi lấy top sản phẩm" });
  }
};

exports.getRatingDistribution = async (req, res) => {
  try {
    const { storeId } = req.query;
    const result = await statisticsService.getRatingDistribution(storeId);
    res.json(result);
  } catch (err) {
    console.error("Rating distribution error:", err);
    const statusCode = err.message.includes("bắt buộc") ? 400 : 500;
    res.status(statusCode).json({ message: err.message || "Lỗi khi lấy phân phối đánh giá" });
  }
};
