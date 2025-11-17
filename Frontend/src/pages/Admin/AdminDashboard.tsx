import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import UserManagement from '../../components/Admin/UserManagement/UserManagement';
import SellerApproval from '../../components/Admin/SellerRequests/SellerRequests';
import BannerManagement from '../../components/Admin/BannerManagement/BannerManagement';
import StoreManagement from '../../components/Admin/StoreManagement/StoreManagement';
import OrderManagement from '../../components/Admin/OrderManagement/OrderManagement';
import VoucherManagement from '../../components/Admin/VoucherManagement/VoucherManagement';
import PromotionManagement from '../../components/Admin/PromotionManagement/PromotionManagement';
import adminStatisticsApi from '../../api/adminStatisticsApi';
import type { DashboardStats, ChartDataPoint } from '../../api/adminStatisticsApi';
import { Users, ShoppingBag, Store, Package, Ticket } from 'lucide-react';

const AdminDashboard: React.FC = () => {
  const { activeMenu } = useOutletContext<{ activeMenu: string }>();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [usersChartData, setUsersChartData] = useState<ChartDataPoint[]>([]);
  const [ordersChartData, setOrdersChartData] = useState<ChartDataPoint[]>([]);
  const [storesChartData, setStoresChartData] = useState<ChartDataPoint[]>([]);
  const [productsChartData, setProductsChartData] = useState<ChartDataPoint[]>([]);
  const [vouchersChartData, setVouchersChartData] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (activeMenu === 'dashboard') {
      fetchDashboardData();
    }
  }, [activeMenu]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, usersRes, ordersRes, storesRes, productsRes, vouchersRes] = await Promise.all([
        adminStatisticsApi.getDashboardStats(),
        adminStatisticsApi.getUsersChartData(),
        adminStatisticsApi.getOrdersChartData(),
        adminStatisticsApi.getStoresChartData(),
        adminStatisticsApi.getProductsChartData(),
        adminStatisticsApi.getVouchersChartData(),
      ]);

      setStats(statsRes.data);
      setUsersChartData(usersRes.data);
      setOrdersChartData(ordersRes.data);
      setStoresChartData(storesRes.data);
      setProductsChartData(productsRes.data);
      setVouchersChartData(vouchersRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getDate()}/${date.getMonth() + 1}`;
  };

  const statsCards = [
    {
      title: 'Tài khoản',
      value: stats?.totalUsers || 0,
      icon: Users,
      color: 'bg-blue-500',
      strokeColor: '#3b82f6',
      chartData: usersChartData,
    },
    {
      title: 'Đơn hàng',
      value: stats?.totalOrders || 0,
      icon: ShoppingBag,
      color: 'bg-green-500',
      strokeColor: '#10b981',
      chartData: ordersChartData,
    },
    {
      title: 'Cửa hàng',
      value: stats?.totalStores || 0,
      icon: Store,
      color: 'bg-purple-500',
      strokeColor: '#a855f7',
      chartData: storesChartData,
    },
    {
      title: 'Sản phẩm',
      value: stats?.totalProducts || 0,
      icon: Package,
      color: 'bg-orange-500',
      strokeColor: '#f97316',
      chartData: productsChartData,
    },
    {
      title: 'Voucher',
      value: stats?.totalVouchers || 0,
      icon: Ticket,
      color: 'bg-pink-500',
      strokeColor: '#ec4899',
      chartData: vouchersChartData,
    },
  ];

  return (
    <div className="w-full min-h-screen">
      {/* Welcome Section */}
      {activeMenu === 'dashboard' && (
        <div className="p-4 md:p-6">
          <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-xl md:rounded-2xl p-6 md:p-8 text-white shadow-xl md:shadow-2xl">
            <div>
              <h1 className="text-2xl md:text-4xl font-bold mb-2">Welcome back, Admin!</h1>
              <p className="text-blue-100 text-sm md:text-lg">Chào mừng bạn trở lại trang quản trị</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Based on Menu - Full Width */}
      <div className="w-full">
        {activeMenu === 'dashboard' && (
          <div className="p-4 md:p-6 space-y-4 md:space-y-6">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="text-gray-500 text-lg">Đang tải dữ liệu...</div>
              </div>
            ) : (
              <>
                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 md:gap-6">
                  {statsCards.map((card, index) => {
                    const Icon = card.icon;
                    return (
                      <div
                        key={index}
                        className="bg-white rounded-lg md:rounded-xl shadow-md md:shadow-lg border border-gray-200 md:border-2 md:border-gray-100 p-4 md:p-6 hover:shadow-xl transition-all duration-300 hover:scale-105"
                      >
                        <div className="flex items-center justify-between mb-3 md:mb-4">
                          <div className={`${card.color} p-2 md:p-3 rounded-lg`}>
                            <Icon className="text-white w-5 h-5 md:w-6 md:h-6" />
                          </div>
                        </div>
                        <h3 className="text-gray-600 text-xs md:text-sm font-semibold mb-2">{card.title}</h3>
                        <p className="text-2xl md:text-3xl font-bold text-gray-800">{card.value.toLocaleString('vi-VN')}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
                  {statsCards.map((card, index) => {
                    const chartData = card.chartData.map((item) => ({
                      date: formatDate(item.date),
                      count: item.count,
                    }));

                    return (
                      <div
                        key={index}
                        className="bg-white rounded-lg md:rounded-xl shadow-md md:shadow-lg border border-gray-200 md:border-2 md:border-gray-100 p-4 md:p-6"
                      >
                        <h3 className="text-base md:text-lg font-bold text-gray-800 mb-2 md:mb-4">
                          Biểu đồ {card.title}
                        </h3>
                        <p className="text-xs md:text-sm text-gray-500 mb-3 md:mb-4">30 ngày gần nhất</p>
                        <ResponsiveContainer width="100%" height={200}>
                          <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis 
                              dataKey="date" 
                              tick={{ fontSize: 10 }} 
                              stroke="#6b7280"
                            />
                            <YAxis 
                              tick={{ fontSize: 10 }} 
                              stroke="#6b7280"
                            />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: '#fff', 
                                border: '1px solid #e5e7eb',
                                borderRadius: '8px',
                                fontSize: '12px'
                              }} 
                            />
                            <Line
                              type="monotone"
                              dataKey="count"
                              stroke={card.strokeColor}
                              strokeWidth={2}
                              dot={{ fill: card.strokeColor, r: 3 }}
                              activeDot={{ r: 5 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}

        {activeMenu === 'users' && <UserManagement />}
        {activeMenu === 'sellerRequest' && <SellerApproval />}
        {activeMenu === 'banner' && <BannerManagement />}
        {activeMenu === 'stores' && <StoreManagement />}
        {activeMenu === 'orders' && <OrderManagement />}
        {activeMenu === 'vouchers' && <VoucherManagement />}
        {activeMenu === 'promotions' && <PromotionManagement />}
      </div>
    </div>
  );
};

export default AdminDashboard;
