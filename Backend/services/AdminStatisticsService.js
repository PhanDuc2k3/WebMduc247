const adminStatisticsRepository = require('../repositories/AdminStatisticsRepository');

class AdminStatisticsService {
  // Lấy dashboard stats
  async getDashboardStats() {
    const totalUsers = await adminStatisticsRepository.countUsers();
    const totalOrders = await adminStatisticsRepository.countOrders();
    const totalStores = await adminStatisticsRepository.countStores();
    const totalProducts = await adminStatisticsRepository.countProducts();
    const totalVouchers = await adminStatisticsRepository.countVouchers();

    return {
      totalUsers,
      totalOrders,
      totalStores,
      totalProducts,
      totalVouchers,
    };
  }

  // Lấy chart data cho users
  async getUsersChartData(days = 30) {
    const chartData = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const count = await adminStatisticsRepository.countUsersByDate(date, nextDate);

      chartData.push({
        date: date.toISOString().split("T")[0],
        count,
      });
    }

    return chartData;
  }

  // Lấy chart data cho orders
  async getOrdersChartData(days = 30) {
    const chartData = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const count = await adminStatisticsRepository.countOrdersByDate(date, nextDate);

      chartData.push({
        date: date.toISOString().split("T")[0],
        count,
      });
    }

    return chartData;
  }

  // Lấy chart data cho stores
  async getStoresChartData(days = 30) {
    const chartData = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const count = await adminStatisticsRepository.countStoresByDate(date, nextDate);

      chartData.push({
        date: date.toISOString().split("T")[0],
        count,
      });
    }

    return chartData;
  }

  // Lấy chart data cho products
  async getProductsChartData(days = 30) {
    const chartData = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const count = await adminStatisticsRepository.countProductsByDate(date, nextDate);

      chartData.push({
        date: date.toISOString().split("T")[0],
        count,
      });
    }

    return chartData;
  }

  // Lấy chart data cho vouchers
  async getVouchersChartData(days = 30) {
    const chartData = [];
    const now = new Date();

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const count = await adminStatisticsRepository.countVouchersByDate(date, nextDate);

      chartData.push({
        date: date.toISOString().split("T")[0],
        count,
      });
    }

    return chartData;
  }
}

module.exports = new AdminStatisticsService();

