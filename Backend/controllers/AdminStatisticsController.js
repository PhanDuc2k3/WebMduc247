const adminStatisticsService = require('../services/AdminStatisticsService');

exports.getDashboardStats = async (req, res) => {
  try {
    const stats = await adminStatisticsService.getDashboardStats();
    res.status(200).json(stats);
  } catch (error) {
    console.error("Get dashboard stats error:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

exports.getUsersChartData = async (req, res) => {
  try {
    const chartData = await adminStatisticsService.getUsersChartData();
    res.status(200).json(chartData);
  } catch (error) {
    console.error("Get users chart data error:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

exports.getOrdersChartData = async (req, res) => {
  try {
    const chartData = await adminStatisticsService.getOrdersChartData();
    res.status(200).json(chartData);
  } catch (error) {
    console.error("Get orders chart data error:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

exports.getStoresChartData = async (req, res) => {
  try {
    const chartData = await adminStatisticsService.getStoresChartData();
    res.status(200).json(chartData);
  } catch (error) {
    console.error("Get stores chart data error:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

exports.getProductsChartData = async (req, res) => {
  try {
    const chartData = await adminStatisticsService.getProductsChartData();
    res.status(200).json(chartData);
  } catch (error) {
    console.error("Get products chart data error:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

exports.getVouchersChartData = async (req, res) => {
  try {
    const chartData = await adminStatisticsService.getVouchersChartData();
    res.status(200).json(chartData);
  } catch (error) {
    console.error("Get vouchers chart data error:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};
