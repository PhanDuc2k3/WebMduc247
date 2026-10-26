import axiosClient from './axiosClient';
const adminStatisticsApi = {
    getDashboardStats: async () => {
        return axiosClient.get('/api/admin/statistics/stats');
    },
    getUsersChartData: async () => {
        return axiosClient.get('/api/admin/statistics/charts/users');
    },
    getOrdersChartData: async () => {
        return axiosClient.get('/api/admin/statistics/charts/orders');
    },
    getStoresChartData: async () => {
        return axiosClient.get('/api/admin/statistics/charts/stores');
    },
    getProductsChartData: async () => {
        return axiosClient.get('/api/admin/statistics/charts/products');
    },
    getVouchersChartData: async () => {
        return axiosClient.get('/api/admin/statistics/charts/vouchers');
    },
};
export default adminStatisticsApi;
