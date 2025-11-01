import React, { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { 
  Users, 
  Store, 
  ShoppingCart, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Package,
  Target,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import UserManagement from '../../components/Admin/UserManagement/UserManagement';
import SellerApproval from '../../components/Admin/SellerRequests/SellerRequests';
import BannerManagement from '../../components/Admin/BannerManagement/BannerManagement';
import StoreManagement from '../../components/Admin/StoreManagement/StoreManagement';
import OrderManagement from '../../components/Admin/OrderManagement/OrderManagement';
import VoucherManagement from '../../components/Admin/VoucherManagement/VoucherManagement';

const AdminDashboard: React.FC = () => {
  const { activeMenu } = useOutletContext<{ activeMenu: string }>();
  const [stats, setStats] = useState({
    totalUsers: 125400,
    activeStores: 8650,
    totalProducts: 456000,
    totalOrders: 89300,
    revenue: 2450000000,
    monthlyGoal: 75
  });

  const statsData = [
    {
      title: 'Total Users',
      value: '125,400',
      change: '+2.5%',
      trend: 'up',
      icon: Users,
      color: 'from-blue-500 to-cyan-600',
      bgColor: 'bg-blue-500'
    },
    {
      title: 'Active Stores',
      value: '8,650',
      change: '+2.8%',
      trend: 'up',
      icon: Store,
      color: 'from-purple-500 to-pink-600',
      bgColor: 'bg-purple-500'
    },
    {
      title: 'Total Products',
      value: '456,000',
      change: '+1.5%',
      trend: 'up',
      icon: Package,
      color: 'from-green-500 to-emerald-600',
      bgColor: 'bg-green-500'
    },
    {
      title: 'Total Orders',
      value: '89,300',
      change: '-5.1%',
      trend: 'down',
      icon: ShoppingCart,
      color: 'from-orange-500 to-red-600',
      bgColor: 'bg-orange-500'
    },
    {
      title: 'Revenue',
      value: '2.45B đ',
      change: '+12.5%',
      trend: 'up',
      icon: DollarSign,
      color: 'from-yellow-500 to-orange-500',
      bgColor: 'bg-yellow-500'
    },
    {
      title: 'Monthly Goal',
      value: '75%',
      change: '81.7%',
      trend: 'up',
      icon: Target,
      color: 'from-indigo-500 to-purple-600',
      bgColor: 'bg-indigo-500'
    },
  ];

  const recentOrders = [
    { id: '#ORD-001', customer: 'John Doe', product: 'iPhone 15 Pro', amount: '2,500,000', status: 'completed' },
    { id: '#ORD-002', customer: 'Jane Smith', product: 'MacBook Air', amount: '25,000,000', status: 'pending' },
    { id: '#ORD-003', customer: 'Bob Wilson', product: 'iPad Pro', amount: '15,000,000', status: 'shipping' },
    { id: '#ORD-004', customer: 'Alice Brown', product: 'AirPods Pro', amount: '5,000,000', status: 'completed' },
  ];

  const statusColors = {
    completed: 'bg-green-100 text-green-700',
    pending: 'bg-yellow-100 text-yellow-700',
    shipping: 'bg-blue-100 text-blue-700',
  };

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 rounded-2xl p-8 text-white shadow-2xl animate-fade-in-down">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-4xl font-bold mb-2">Welcome back, Admin! 👋</h1>
            <p className="text-blue-100 text-lg">Here's what's happening with your store today</p>
          </div>
          <div className="flex gap-4">
            <button className="px-6 py-3 bg-white/20 backdrop-blur-md rounded-xl font-bold hover:bg-white/30 transition-all duration-300 transform hover:scale-105">
              📊 View Reports
            </button>
            <button className="px-6 py-3 bg-white text-purple-600 rounded-xl font-bold hover:bg-blue-50 transition-all duration-300 transform hover:scale-105">
              ➕ Add Product
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 animate-fade-in-up">
        {statsData.map((stat, index) => (
          <div
            key={index}
            className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 overflow-hidden group"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className={`bg-gradient-to-br ${stat.color} p-6 text-white`}>
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl bg-white/20 backdrop-blur-md`}>
                  <stat.icon className="w-6 h-6" />
                </div>
                <div className={`px-3 py-1 rounded-full flex items-center gap-1 ${
                  stat.trend === 'up' ? 'bg-green-500' : 'bg-red-500'
                }`}>
                  {stat.trend === 'up' ? (
                    <ArrowUpRight className="w-4 h-4" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4" />
                  )}
                  <span className="text-xs font-bold">{stat.change}</span>
                </div>
              </div>
              <h3 className="text-2xl font-bold mb-1">{stat.value}</h3>
              <p className="text-sm text-white/80">{stat.title}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Based on Menu */}
      <div className="bg-white rounded-2xl shadow-xl border-2 border-gray-100 overflow-hidden animate-fade-in-up">
        {activeMenu === 'dashboard' && (
          <div className="p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                <span>📊</span> Overview
              </h2>
              <select className="px-4 py-2 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent">
                <option>Last 7 days</option>
                <option>Last 30 days</option>
                <option>Last 90 days</option>
              </select>
            </div>

            {/* Recent Orders */}
            <div className="mb-8">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-purple-600" />
                Recent Orders
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-gray-50 to-blue-50 border-b-2 border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Order ID</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Customer</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Product</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Amount</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {recentOrders.map((order, index) => (
                      <tr key={index} className="hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 transition-all duration-300">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-bold text-gray-900">{order.id}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-medium text-gray-900">{order.customer}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-gray-700">{order.product}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-bold text-green-600">{order.amount}đ</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusColors[order.status as keyof typeof statusColors]}`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button className="text-blue-600 hover:text-blue-800 font-bold hover:underline">
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeMenu === 'users' && <UserManagement />}
        {activeMenu === 'sellerRequest' && <SellerApproval />}
        {activeMenu === 'banner' && <BannerManagement />}
        {activeMenu === 'stores' && <StoreManagement />}
        {activeMenu === 'orders' && <OrderManagement />}
        {activeMenu === 'vouchers' && <VoucherManagement />}
      </div>
    </div>
  );
};

export default AdminDashboard;
