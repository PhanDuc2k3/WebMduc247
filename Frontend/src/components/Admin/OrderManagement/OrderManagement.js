import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import orderApi from '../../../api/orderApi';
import { Search, Eye, User, Mail, Phone, ShoppingBag, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Pagination from '../Pagination';
import { toast } from 'react-toastify';
// Đồng nhất CSS cho status badges
const getStatusBadgeClass = (status) => {
    const statusMap = {
        pending: 'bg-yellow-100 text-yellow-700',
        confirmed: 'bg-blue-100 text-blue-700',
        packed: 'bg-purple-100 text-purple-700',
        shipping: 'bg-purple-100 text-purple-700',
        shipped: 'bg-purple-100 text-purple-700',
        delivered: 'bg-green-100 text-green-700',
        received: 'bg-green-100 text-green-700',
        completed: 'bg-green-100 text-green-700',
        cancelled: 'bg-red-100 text-red-700',
    };
    const normalizedStatus = (status || 'pending').toLowerCase();
    return `px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${statusMap[normalizedStatus] || 'bg-gray-100 text-gray-700'}`;
};
const getStatusLabel = (status) => {
    const statusMap = {
        pending: 'Chờ xử lý',
        confirmed: 'Đã xác nhận',
        packed: 'Đã đóng gói',
        shipping: 'Đang giao hàng',
        shipped: 'Đang giao hàng',
        delivered: 'Đã giao hàng',
        received: 'Đã nhận hàng',
        completed: 'Hoàn thành',
        cancelled: 'Đã hủy',
    };
    return statusMap[(status || 'pending').toLowerCase()] || status;
};
const OrderManagement = () => {
    const navigate = useNavigate();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;
    const fetchOrders = useCallback(async (showLoading = true) => {
        try {
            if (showLoading)
                setLoading(true);
            const response = await orderApi.getAllOrders();
            const data = response.data?.orders || response.data || [];
            // Chuẩn hóa status luôn thành lowercase
            const normalizedOrders = Array.isArray(data)
                ? data.map((o) => ({
                    ...o,
                    status: (o.status || 'pending').toLowerCase(),
                }))
                : [];
            setOrders(normalizedOrders);
        }
        catch (error) {
            console.error('Error fetching orders:', error);
            if (showLoading) {
                toast.error(error?.response?.data?.message || 'Lỗi khi tải danh sách đơn hàng');
            }
        }
        finally {
            if (showLoading)
                setLoading(false);
        }
    }, []);
    useEffect(() => {
        // Load lần đầu với loading spinner
        fetchOrders(true);
        // Tự động cập nhật danh sách đơn hàng mỗi 30 giây (không hiển thị loading)
        const interval = setInterval(() => {
            fetchOrders(false);
        }, 30000); // 30 giây = 30000 milliseconds
        // Cleanup interval khi component unmount
        return () => clearInterval(interval);
    }, [fetchOrders]);
    // Sắp xếp và lọc orders
    const filteredAndSortedOrders = useMemo(() => {
        let filtered = orders.filter(order => {
            const customer = order.userInfo || order.customer;
            return (order.orderCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                customer?.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                customer?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (order.userInfo?.phone && order.userInfo.phone.toLowerCase().includes(searchTerm.toLowerCase())));
        });
        // Sắp xếp theo createdAt desc (mới nhất lên trước)
        filtered.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
        });
        return filtered;
    }, [orders, searchTerm]);
    // Pagination
    const totalPages = Math.ceil(filteredAndSortedOrders.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedOrders = filteredAndSortedOrders.slice(startIndex, endIndex);
    const getLatestStatus = (order) => {
        if (order.statusHistory && order.statusHistory.length > 0) {
            // Sắp xếp giảm dần theo timestamp
            const sorted = [...order.statusHistory].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            return sorted[0].status.toLowerCase();
        }
        return (order.status || 'pending').toLowerCase();
    };
    // Reset page khi search thay đổi
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm]);
    if (loading) {
        return (_jsxs("div", { className: "flex flex-col items-center justify-center py-20", children: [_jsx(Loader2, { className: "w-16 h-16 text-purple-500 animate-spin mb-4" }), _jsx("p", { className: "text-gray-600 text-lg font-medium", children: "\u0110ang t\u1EA3i \u0111\u01A1n h\u00E0ng..." })] }));
    }
    return (_jsxs("div", { className: "p-4 md:p-6 lg:p-8", children: [_jsxs("div", { className: "mb-4 md:mb-6 animate-fade-in-down", children: [_jsxs("h2", { className: "text-xl md:text-2xl font-bold mb-1 md:mb-2 gradient-text flex items-center gap-2", children: [_jsx(ShoppingBag, { size: 20, className: "md:w-6 md:h-6 text-blue-600" }), _jsx("span", { className: "text-base md:text-2xl", children: "Qu\u1EA3n l\u00FD \u0111\u01A1n h\u00E0ng" })] }), _jsx("p", { className: "text-gray-600 text-xs md:text-sm", children: "Qu\u1EA3n l\u00FD v\u00E0 c\u1EADp nh\u1EADt tr\u1EA1ng th\u00E1i \u0111\u01A1n h\u00E0ng trong h\u1EC7 th\u1ED1ng" })] }), _jsx("div", { className: "mb-4 md:mb-6 animate-fade-in-up", children: _jsx("div", { className: "bg-blue-600 rounded-lg md:rounded-xl p-4 md:p-6 shadow-lg", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-white text-xs md:text-sm font-medium mb-1", children: "T\u1ED5ng s\u1ED1 \u0111\u01A1n h\u00E0ng" }), _jsx("p", { className: "text-white text-2xl md:text-4xl font-bold", children: filteredAndSortedOrders.length.toLocaleString('vi-VN') })] }), _jsx(ShoppingBag, { className: "w-12 h-12 md:w-16 md:h-16 text-white opacity-80" })] }) }) }), _jsx("div", { className: "mb-4 md:mb-6 animate-fade-in-up", children: _jsxs("div", { className: "relative w-full sm:max-w-md", children: [_jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 md:w-5 md:h-5" }), _jsx("input", { type: "text", placeholder: "T\u00ECm ki\u1EBFm \u0111\u01A1n h\u00E0ng, kh\u00E1ch h\u00E0ng...", value: searchTerm, onChange: (e) => setSearchTerm(e.target.value), className: "w-full pl-9 md:pl-10 pr-3 md:pr-4 py-2 md:py-3 text-sm md:text-base border-2 border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300 font-medium" })] }) }), filteredAndSortedOrders.length > 0 ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "hidden md:block bg-white rounded-lg md:rounded-2xl shadow-xl border-2 border-gray-100 overflow-hidden animate-fade-in-up", children: _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full", children: [_jsx("thead", { className: "bg-gray-100 border-b-2 border-gray-200", children: _jsxs("tr", { children: [_jsx("th", { className: "px-4 md:px-6 py-3 md:py-4 text-left text-xs font-bold text-gray-700 uppercase", children: "M\u00E3 \u0111\u01A1n" }), _jsx("th", { className: "px-4 md:px-6 py-3 md:py-4 text-left text-xs font-bold text-gray-700 uppercase", children: "Kh\u00E1ch h\u00E0ng" }), _jsx("th", { className: "px-4 md:px-6 py-3 md:py-4 text-left text-xs font-bold text-gray-700 uppercase", children: "T\u1ED5ng ti\u1EC1n" }), _jsx("th", { className: "px-4 md:px-6 py-3 md:py-4 text-left text-xs font-bold text-gray-700 uppercase", children: "Tr\u1EA1ng th\u00E1i" }), _jsx("th", { className: "px-4 md:px-6 py-3 md:py-4 text-left text-xs font-bold text-gray-700 uppercase", children: "Ng\u00E0y t\u1EA1o" }), _jsx("th", { className: "px-4 md:px-6 py-3 md:py-4 text-center text-xs font-bold text-gray-700 uppercase", children: "Thao t\u00E1c" })] }) }), _jsx("tbody", { className: "bg-white divide-y divide-gray-200", children: paginatedOrders.map((order) => (_jsxs("tr", { className: "hover:bg-gray-50 transition-all duration-300", children: [_jsx("td", { className: "px-4 md:px-6 py-3 md:py-4 whitespace-nowrap", children: _jsx("span", { className: "text-sm md:text-base font-bold text-gray-900", children: order.orderCode || order._id.slice(-8) }) }), _jsx("td", { className: "px-4 md:px-6 py-3 md:py-4", children: order.userInfo ? (_jsxs("div", { className: "flex items-center gap-2 md:gap-3", children: [_jsxs("div", { className: "relative flex-shrink-0", children: [_jsx("img", { src: order.userInfo.avatarUrl || '/avatar-placeholder.svg', alt: order.userInfo.fullName, className: "w-8 h-8 md:w-10 md:h-10 rounded-full object-cover border-2 border-gray-200 shadow-md" }), _jsx("div", { className: "absolute -bottom-0.5 -right-0.5 w-3 h-3 md:w-3.5 md:h-3.5 bg-green-500 border-2 border-white rounded-full" })] }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsxs("div", { className: "text-xs md:text-sm font-bold text-gray-900 flex items-center gap-1", children: [_jsx(User, { size: 12, className: "md:w-[14px] md:h-[14px] text-gray-400" }), order.userInfo.fullName] }), _jsxs("div", { className: "text-xs text-gray-500 flex items-center gap-1 mt-0.5 md:mt-1", children: [_jsx(Mail, { size: 10, className: "md:w-3 md:h-3 text-gray-400" }), order.userInfo.email] }), order.userInfo.phone && (_jsxs("div", { className: "text-xs text-gray-500 flex items-center gap-1 mt-0.5 md:mt-1", children: [_jsx(Phone, { size: 10, className: "md:w-3 md:h-3 text-gray-400" }), order.userInfo.phone] }))] })] })) : (_jsxs("div", { children: [_jsx("div", { className: "text-xs md:text-sm font-medium text-gray-900", children: order.customer?.fullName || 'N/A' }), _jsx("div", { className: "text-xs text-gray-500", children: order.customer?.email || '' })] })) }), _jsx("td", { className: "px-4 md:px-6 py-3 md:py-4 whitespace-nowrap", children: _jsxs("span", { className: "text-sm md:text-base font-bold text-green-600", children: [order.total?.toLocaleString('vi-VN') || 0, "\u0111"] }) }), _jsx("td", { className: "px-4 md:px-6 py-3 md:py-4 whitespace-nowrap", children: _jsx("span", { className: getStatusBadgeClass(getLatestStatus(order)), children: getStatusLabel(getLatestStatus(order)) }) }), _jsx("td", { className: "px-4 md:px-6 py-3 md:py-4 whitespace-nowrap text-xs md:text-sm text-gray-500", children: order.createdAt
                                                        ? new Date(order.createdAt).toLocaleDateString('vi-VN')
                                                        : 'N/A' }), _jsx("td", { className: "px-4 md:px-6 py-3 md:py-4 whitespace-nowrap", children: _jsx("div", { className: "flex items-center justify-center gap-1 md:gap-2", children: _jsx("button", { onClick: () => navigate(`/order/${order._id}`), className: "p-1.5 md:p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors", title: "Xem chi ti\u1EBFt", children: _jsx(Eye, { size: 16, className: "md:w-[18px] md:h-[18px]" }) }) }) })] }, order._id))) })] }) }) }), _jsx("div", { className: "md:hidden space-y-3 animate-fade-in-up", children: paginatedOrders.map((order) => (_jsxs("div", { className: "bg-white rounded-lg shadow-lg border-2 border-gray-100 p-4", children: [_jsxs("div", { className: "flex items-center justify-between mb-3 border-b pb-3", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(ShoppingBag, { size: 18, className: "text-blue-600" }), _jsx("span", { className: "font-bold text-sm text-gray-900", children: order.orderCode || order._id.slice(-8) })] }), _jsx("span", { className: getStatusBadgeClass(getLatestStatus(order)), children: getStatusLabel(getLatestStatus(order)) })] }), _jsx("div", { className: "mb-3", children: order.userInfo ? (_jsxs("div", { className: "flex items-start gap-2", children: [_jsxs("div", { className: "relative flex-shrink-0", children: [_jsx("img", { src: order.userInfo.avatarUrl || '/avatar-placeholder.svg', alt: order.userInfo.fullName, className: "w-10 h-10 rounded-full object-cover border-2 border-gray-200 shadow-md" }), _jsx("div", { className: "absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full" })] }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "font-bold text-sm text-gray-900 flex items-center gap-1 mb-1", children: [_jsx(User, { size: 12, className: "text-gray-400" }), order.userInfo.fullName] }), _jsxs("div", { className: "text-xs text-gray-500 flex items-center gap-1 mb-0.5", children: [_jsx(Mail, { size: 10, className: "text-gray-400" }), order.userInfo.email] }), order.userInfo.phone && (_jsxs("div", { className: "text-xs text-gray-500 flex items-center gap-1", children: [_jsx(Phone, { size: 10, className: "text-gray-400" }), order.userInfo.phone] }))] })] })) : (_jsxs("div", { children: [_jsx("div", { className: "text-sm font-medium text-gray-900", children: order.customer?.fullName || 'N/A' }), _jsx("div", { className: "text-xs text-gray-500", children: order.customer?.email || '' })] })) }), _jsxs("div", { className: "grid grid-cols-2 gap-2 mb-3 text-xs", children: [_jsx("div", { className: "text-gray-500 font-medium", children: "T\u1ED5ng ti\u1EC1n:" }), _jsxs("div", { className: "text-right font-bold text-green-600", children: [order.total?.toLocaleString('vi-VN') || 0, "\u0111"] }), _jsx("div", { className: "text-gray-500 font-medium", children: "Ng\u00E0y t\u1EA1o:" }), _jsx("div", { className: "text-right text-gray-700", children: order.createdAt
                                                ? new Date(order.createdAt).toLocaleDateString('vi-VN')
                                                : 'N/A' })] }), _jsx("div", { className: "flex items-center justify-end gap-2 pt-3 border-t border-gray-200", children: _jsxs("button", { onClick: () => navigate(`/order/${order._id}`), className: "px-3 py-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors text-xs font-bold flex items-center gap-1", children: [_jsx(Eye, { size: 14 }), "Xem"] }) })] }, order._id))) }), totalPages > 1 && (_jsx(Pagination, { currentPage: currentPage, totalPages: totalPages, onPageChange: setCurrentPage, itemsPerPage: itemsPerPage, totalItems: filteredAndSortedOrders.length }))] })) : (_jsxs("div", { className: "text-center py-20 animate-fade-in-up", children: [_jsx(ShoppingBag, { size: 64, className: "mx-auto mb-4 text-gray-400" }), _jsx("p", { className: "text-gray-500 text-lg font-medium", children: searchTerm ? "Không tìm thấy đơn hàng nào" : "Không có đơn hàng nào" })] }))] }));
};
export default OrderManagement;
