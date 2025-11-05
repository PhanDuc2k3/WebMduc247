const User = require("../models/Users");
const Order = require("../models/Order");
const Store = require("../models/Store");
const Product = require("../models/Product");
const Voucher = require("../models/Voucher");

// Lấy tổng số thống kê
exports.getDashboardStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalOrders = await Order.countDocuments();
    const totalStores = await Store.countDocuments();
    const totalProducts = await Product.countDocuments();
    const totalVouchers = await Voucher.countDocuments();

    res.status(200).json({
      totalUsers,
      totalOrders,
      totalStores,
      totalProducts,
      totalVouchers,
    });
  } catch (error) {
    console.error("Get dashboard stats error:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// Lấy dữ liệu biểu đồ users theo thời gian (30 ngày gần nhất)
exports.getUsersChartData = async (req, res) => {
  try {
    const days = 30;
    const chartData = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const count = await User.countDocuments({
        createdAt: { $gte: date, $lt: nextDate },
      });

      chartData.push({
        date: date.toISOString().split("T")[0],
        count,
      });
    }

    res.status(200).json(chartData);
  } catch (error) {
    console.error("Get users chart data error:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// Lấy dữ liệu biểu đồ orders theo thời gian (30 ngày gần nhất)
exports.getOrdersChartData = async (req, res) => {
  try {
    const days = 30;
    const chartData = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const count = await Order.countDocuments({
        createdAt: { $gte: date, $lt: nextDate },
      });

      chartData.push({
        date: date.toISOString().split("T")[0],
        count,
      });
    }

    res.status(200).json(chartData);
  } catch (error) {
    console.error("Get orders chart data error:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// Lấy dữ liệu biểu đồ stores theo thời gian (30 ngày gần nhất)
exports.getStoresChartData = async (req, res) => {
  try {
    const days = 30;
    const chartData = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const count = await Store.countDocuments({
        createdAt: { $gte: date, $lt: nextDate },
      });

      chartData.push({
        date: date.toISOString().split("T")[0],
        count,
      });
    }

    res.status(200).json(chartData);
  } catch (error) {
    console.error("Get stores chart data error:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// Lấy dữ liệu biểu đồ products theo thời gian (30 ngày gần nhất)
exports.getProductsChartData = async (req, res) => {
  try {
    const days = 30;
    const chartData = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const count = await Product.countDocuments({
        createdAt: { $gte: date, $lt: nextDate },
      });

      chartData.push({
        date: date.toISOString().split("T")[0],
        count,
      });
    }

    res.status(200).json(chartData);
  } catch (error) {
    console.error("Get products chart data error:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};

// Lấy dữ liệu biểu đồ vouchers theo thời gian (30 ngày gần nhất)
exports.getVouchersChartData = async (req, res) => {
  try {
    const days = 30;
    const chartData = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const count = await Voucher.countDocuments({
        createdAt: { $gte: date, $lt: nextDate },
      });

      chartData.push({
        date: date.toISOString().split("T")[0],
        count,
      });
    }

    res.status(200).json(chartData);
  } catch (error) {
    console.error("Get vouchers chart data error:", error);
    res.status(500).json({ message: "Lỗi server", error: error.message });
  }
};
