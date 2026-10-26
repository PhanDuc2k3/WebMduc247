import axiosClient from "./axiosClient";
const statisticApi = {
    // Lấy thống kê doanh thu
    getRevenueStats: (params) => axiosClient.get("/api/statistics/revenue", { params }),
    // Lấy sản phẩm bán chạy nhất
    getTopProducts: (params) => axiosClient.get("/api/statistics/top-products", { params }),
    // Lấy thống kê lượt xem sản phẩm
    getViewsStats: (params) => axiosClient.get("/api/statistics/views", { params }),
    // Lấy phân phối đánh giá của store
    getRatingDistribution: (params) => axiosClient.get("/api/statistics/rating-distribution", { params }),
};
export default statisticApi;
