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
    <div className="w-full">
      {/* Welcome Section */}
      {activeMenu === 'dashboard' && (
        <div className="p-6">
          <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-2xl p-8 text-white shadow-2xl animate-fade-in-down">
            <div>
              <h1 className="text-4xl font-bold mb-2">Welcome back, Admin!</h1>
              <p className="text-blue-100 text-lg">Chào mừng bạn trở lại trang quản trị</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Based on Menu - Full Width */}
      <div className="w-full">
        {activeMenu === 'dashboard' && (
          <div className="p-6 space-y-6">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="text-gray-500 text-lg">Đang tải dữ liệu...</div>
              </div>
            ) : (
              <>
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                  {statsCards.map((card, index) => {
                    const Icon = card.icon;
                    return (
                      <div
                        key={index}
                        className="bg-white rounded-xl shadow-lg border-2 border-gray-100 p-6 hover:shadow-xl transition-shadow duration-300"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className={`${card.color} p-3 rounded-lg`}>
                            <Icon className="text-white w-6 h-6" />
                          </div>
                        </div>
                        <h3 className="text-gray-600 text-sm font-semibold mb-2">{card.title}</h3>
                        <p className="text-3xl font-bold text-gray-800">{card.value.toLocaleString('vi-VN')}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {statsCards.map((card, index) => {
                    const chartData = card.chartData.map((item) => ({
                      date: formatDate(item.date),
                      count: item.count,
                    }));

                    return (
                      <div
                        key={index}
                        className="bg-white rounded-xl shadow-lg border-2 border-gray-100 p-6"
                      >
                        <h3 className="text-lg font-bold text-gray-800 mb-4">
                          Biểu đồ {card.title}
                        </h3>
                        <p className="text-sm text-gray-500 mb-4">30 ngày gần nhất</p>
                        <ResponsiveContainer width="100%" height={250}>
                          <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                            <YAxis tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Line
                              type="monotone"
                              dataKey="count"
                              stroke={card.strokeColor}
                              strokeWidth={2}
                              dot={{ fill: card.strokeColor, r: 3 }}
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
