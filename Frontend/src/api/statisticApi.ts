import axiosClient from "./axiosClient";


const statisticApi = {
  // Lấy thống kê doanh thu
  getRevenueStats: (params?: Record<string, any>) =>
    axiosClient.get("/api/statistics/revenue", { params }),

  // Lấy sản phẩm bán chạy nhất
  getTopProducts: (params?: Record<string, any>) =>
    axiosClient.get("/api/statistics/top-products", { params }),

  // Lấy thống kê lượt xem sản phẩm
  getViewsStats: (params?: Record<string, any>) =>
    axiosClient.get("/api/statistics/views", { params }),
};

export default statisticApi;
