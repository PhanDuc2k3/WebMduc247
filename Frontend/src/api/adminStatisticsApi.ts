import axiosClient from './axiosClient';

export interface DashboardStats {
  totalUsers: number;
  totalOrders: number;
  totalStores: number;
  totalProducts: number;
  totalVouchers: number;
}

export interface ChartDataPoint {
  date: string;
  count: number;
}

const adminStatisticsApi = {
  getDashboardStats: async (): Promise<{ data: DashboardStats }> => {
    return axiosClient.get('/api/admin/statistics/stats');
  },
  getUsersChartData: async (): Promise<{ data: ChartDataPoint[] }> => {
    return axiosClient.get('/api/admin/statistics/charts/users');
  },
  getOrdersChartData: async (): Promise<{ data: ChartDataPoint[] }> => {
    return axiosClient.get('/api/admin/statistics/charts/orders');
  },
  getStoresChartData: async (): Promise<{ data: ChartDataPoint[] }> => {
    return axiosClient.get('/api/admin/statistics/charts/stores');
  },
  getProductsChartData: async (): Promise<{ data: ChartDataPoint[] }> => {
    return axiosClient.get('/api/admin/statistics/charts/products');
  },
  getVouchersChartData: async (): Promise<{ data: ChartDataPoint[] }> => {
    return axiosClient.get('/api/admin/statistics/charts/vouchers');
  },
};

export default adminStatisticsApi;
