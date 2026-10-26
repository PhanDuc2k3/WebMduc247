import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
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
import { Users, ShoppingBag, Store, Package, Ticket } from 'lucide-react';
const AdminDashboard = () => {
    const { activeMenu } = useOutletContext();
    const [stats, setStats] = useState(null);
    const [usersChartData, setUsersChartData] = useState([]);
    const [ordersChartData, setOrdersChartData] = useState([]);
    const [storesChartData, setStoresChartData] = useState([]);
    const [productsChartData, setProductsChartData] = useState([]);
    const [vouchersChartData, setVouchersChartData] = useState([]);
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
        }
        catch (error) {
            console.error('Error fetching dashboard data:', error);
        }
        finally {
            setLoading(false);
        }
    };
    const formatDate = (dateString) => {
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
    return (_jsxs("div", { className: "w-full min-h-screen", children: [activeMenu === 'dashboard' && (_jsx("div", { className: "p-4 md:p-6", children: _jsx("div", { className: "bg-slate-700 rounded-xl md:rounded-2xl p-6 md:p-8 text-white shadow-xl md:shadow-2xl", children: _jsxs("div", { children: [_jsx("h1", { className: "text-2xl md:text-4xl font-bold mb-2", children: "T\u1ED5ng quan qu\u1EA3n tr\u1ECB" }), _jsx("p", { className: "text-slate-300 text-sm md:text-lg", children: "Ch\u00E0o m\u1EEBng b\u1EA1n tr\u1EDF l\u1EA1i trang qu\u1EA3n tr\u1ECB" })] }) }) })), _jsxs("div", { className: "w-full", children: [activeMenu === 'dashboard' && (_jsx("div", { className: "p-4 md:p-6 space-y-4 md:space-y-6", children: loading ? (_jsx("div", { className: "flex justify-center items-center h-64", children: _jsx("div", { className: "text-gray-500 text-lg", children: "\u0110ang t\u1EA3i d\u1EEF li\u1EC7u..." }) })) : (_jsxs(_Fragment, { children: [_jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 md:gap-6", children: statsCards.map((card, index) => {
                                        const Icon = card.icon;
                                        return (_jsxs("div", { className: "bg-white rounded-lg md:rounded-xl shadow-md md:shadow-lg border border-gray-200 md:border-2 md:border-gray-100 p-4 md:p-6 hover:shadow-xl transition-all duration-300 hover:scale-105", children: [_jsx("div", { className: "flex items-center justify-between mb-3 md:mb-4", children: _jsx("div", { className: `${card.color} p-2 md:p-3 rounded-lg`, children: _jsx(Icon, { className: "text-white w-5 h-5 md:w-6 md:h-6" }) }) }), _jsx("h3", { className: "text-gray-600 text-xs md:text-sm font-semibold mb-2", children: card.title }), _jsx("p", { className: "text-2xl md:text-3xl font-bold text-gray-800", children: card.value.toLocaleString('vi-VN') })] }, index));
                                    }) }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6", children: statsCards.map((card, index) => {
                                        const chartData = card.chartData.map((item) => ({
                                            date: formatDate(item.date),
                                            count: item.count,
                                        }));
                                        return (_jsxs("div", { className: "bg-white rounded-lg md:rounded-xl shadow-md md:shadow-lg border border-gray-200 md:border-2 md:border-gray-100 p-4 md:p-6", children: [_jsxs("h3", { className: "text-base md:text-lg font-bold text-gray-800 mb-2 md:mb-4", children: ["Bi\u1EC3u \u0111\u1ED3 ", card.title] }), _jsx("p", { className: "text-xs md:text-sm text-gray-500 mb-3 md:mb-4", children: "30 ng\u00E0y g\u1EA7n nh\u1EA5t" }), _jsx(ResponsiveContainer, { width: "100%", height: 200, children: _jsxs(LineChart, { data: chartData, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#e5e7eb" }), _jsx(XAxis, { dataKey: "date", tick: { fontSize: 10 }, stroke: "#6b7280" }), _jsx(YAxis, { tick: { fontSize: 10 }, stroke: "#6b7280" }), _jsx(Tooltip, { contentStyle: {
                                                                    backgroundColor: '#fff',
                                                                    border: '1px solid #e5e7eb',
                                                                    borderRadius: '8px',
                                                                    fontSize: '12px'
                                                                } }), _jsx(Line, { type: "monotone", dataKey: "count", stroke: card.strokeColor, strokeWidth: 2, dot: { fill: card.strokeColor, r: 3 }, activeDot: { r: 5 } })] }) })] }, index));
                                    }) })] })) })), activeMenu === 'users' && _jsx(UserManagement, {}), activeMenu === 'sellerRequest' && _jsx(SellerApproval, {}), activeMenu === 'banner' && _jsx(BannerManagement, {}), activeMenu === 'stores' && _jsx(StoreManagement, {}), activeMenu === 'orders' && _jsx(OrderManagement, {}), activeMenu === 'vouchers' && _jsx(VoucherManagement, {}), activeMenu === 'promotions' && _jsx(PromotionManagement, {})] })] }));
};
export default AdminDashboard;
