import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState } from "react";
import { Eye, Trash2, ShoppingCart, Package, DollarSign, CheckCircle, Clock, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import orderApi from "../../../api/orderApi";
const OrderManagement = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [search, setSearch] = useState("");
    const navigate = useNavigate();
    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const res = await orderApi.getOrdersBySeller();
                setOrders(res.data || []);
            }
            catch (err) {
                setError(err.response?.data?.message || err.message || "Lỗi khi tải đơn hàng");
            }
            finally {
                setLoading(false);
            }
        };
        fetchOrders();
    }, []);
    const filteredOrders = orders.filter((o) => o.orderCode.toLowerCase().includes(search.toLowerCase()) ||
        o.userId.fullName.toLowerCase().includes(search.toLowerCase()));
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
    const deliveredCount = orders.filter((o) => o.statusHistory[o.statusHistory.length - 1]?.status === "delivered").length;
    const pendingCount = orders.filter((o) => o.statusHistory[o.statusHistory.length - 1]?.status !== "delivered").length;
    // Hàm chuyển đổi trạng thái sang tiếng Việt
    const getStatusLabel = (status) => {
        const statusMap = {
            "pending": "Chờ xử lý",
            "processing": "Đang xử lý",
            "confirmed": "Đã xác nhận",
            "shipped": "Đang giao hàng",
            "delivered": "Đã giao hàng",
            "cancelled": "Đã hủy",
            "completed": "Hoàn thành",
            "return_requested": "Chờ hoàn trả",
            "returned": "Đã hoàn trả",
        };
        return statusMap[status.toLowerCase()] || status;
    };
    if (loading) {
        return (_jsxs("div", { className: "p-4 sm:p-8 text-center animate-fade-in", children: [_jsx("div", { className: "animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-t-4 border-b-4 border-blue-600 mx-auto mb-4" }), _jsx("p", { className: "text-gray-600 text-sm sm:text-lg font-medium", children: "\u0110ang t\u1EA3i \u0111\u01A1n h\u00E0ng..." })] }));
    }
    if (error) {
        return (_jsxs("div", { className: "p-4 sm:p-8 text-center animate-fade-in", children: [_jsx("div", { className: "bg-red-50 rounded-full w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center mx-auto mb-4", children: _jsx("span", { className: "text-red-500 text-2xl sm:text-3xl", children: "\u2715" }) }), _jsx("p", { className: "text-red-500 text-sm sm:text-lg font-medium", children: error })] }));
    }
    return (_jsxs("div", { className: "space-y-4 sm:space-y-6 animate-fade-in-up", children: [_jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6", children: [_jsx(StatBox, { title: "T\u1ED5ng \u0111\u01A1n h\u00E0ng", value: totalOrders.toString(), percent: "+0%", icon: _jsx(Package, { className: "w-5 h-5 sm:w-6 sm:h-6" }), color: "from-blue-500 to-cyan-600" }), _jsx(StatBox, { title: "T\u1ED5ng doanh thu", value: totalRevenue.toLocaleString("vi-VN") + "₫", percent: "+0%", icon: _jsx(DollarSign, { className: "w-5 h-5 sm:w-6 sm:h-6" }), color: "from-green-500 to-emerald-600" }), _jsx(StatBox, { title: "\u0110\u01A1n \u0111\u00E3 giao", value: deliveredCount.toString(), percent: "+0%", icon: _jsx(CheckCircle, { className: "w-5 h-5 sm:w-6 sm:h-6" }), color: "from-purple-500 to-pink-600" }), _jsx(StatBox, { title: "\u0110\u01A1n \u0111ang x\u1EED l\u00FD", value: pendingCount.toString(), percent: "-0%", icon: _jsx(Clock, { className: "w-5 h-5 sm:w-6 sm:h-6" }), color: "from-orange-500 to-red-600" })] }), _jsx("div", { className: "flex justify-between items-center", children: _jsxs("div", { className: "relative w-full sm:max-w-md", children: [_jsx("div", { className: "absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl blur-sm opacity-0 focus-within:opacity-100 transition-opacity duration-300" }), _jsx("input", { type: "text", placeholder: "T\u00ECm ki\u1EBFm \u0111\u01A1n h\u00E0ng...", value: search, onChange: (e) => setSearch(e.target.value), className: "relative w-full px-4 sm:px-5 py-2.5 sm:py-3 pl-10 sm:pl-12 text-sm sm:text-base border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white transition-all duration-300" }), _jsx(Search, { className: "absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" })] }) }), _jsxs("div", { className: "bg-white rounded-xl sm:rounded-2xl shadow-lg border-2 border-gray-100 overflow-hidden animate-fade-in-up", children: [_jsxs("div", { className: "bg-gradient-to-r from-gray-50 to-blue-50 p-4 sm:p-6 border-b-2 border-gray-200", children: [_jsxs("h3", { className: "text-lg sm:text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3", children: [_jsx(ShoppingCart, { className: "w-5 h-5 sm:w-6 sm:h-6 text-blue-600" }), _jsx("span", { children: "Danh s\u00E1ch \u0111\u01A1n h\u00E0ng" })] }), _jsxs("p", { className: "text-gray-600 text-xs sm:text-sm mt-1", children: [filteredOrders.length, " \u0111\u01A1n h\u00E0ng"] })] }), _jsx("div", { className: "overflow-x-auto no-scrollbar", children: _jsxs("table", { className: "w-full min-w-[900px]", children: [_jsx("thead", { children: _jsxs("tr", { className: "text-left text-gray-600 border-b border-gray-200 bg-gray-50", children: [_jsx("th", { className: "px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold", children: "M\u00E3 \u0111\u01A1n h\u00E0ng" }), _jsx("th", { className: "px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold", children: "S\u1EA3n ph\u1EA9m" }), _jsx("th", { className: "px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold", children: "Kh\u00E1ch h\u00E0ng" }), _jsx("th", { className: "px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold", children: "Gi\u00E1 tr\u1ECB" }), _jsx("th", { className: "px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold text-center", children: "Tr\u1EA1ng th\u00E1i" }), _jsx("th", { className: "px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold", children: "Ng\u00E0y \u0111\u1EB7t" }), _jsx("th", { className: "px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold text-center", children: "H\u00E0nh \u0111\u1ED9ng" })] }) }), _jsx("tbody", { children: filteredOrders.length > 0 ? (filteredOrders.map((order, index) => {
                                        const latestStatus = order.statusHistory?.[order.statusHistory.length - 1]?.status || "pending";
                                        const statusLabel = getStatusLabel(latestStatus);
                                        return (_jsxs("tr", { className: "border-b border-gray-100 hover:bg-blue-50 transition-all duration-200 animate-fade-in-up", style: { animationDelay: `${index * 0.05}s` }, children: [_jsx("td", { className: "px-3 sm:px-6 py-3 sm:py-4", children: _jsx("span", { className: "font-bold text-xs sm:text-sm text-gray-900", children: order.orderCode }) }), _jsx("td", { className: "px-3 sm:px-6 py-3 sm:py-4", children: _jsxs("div", { className: "space-y-1", children: [order.items.slice(0, 2).map((i) => (_jsxs("div", { className: "flex items-center gap-2 text-xs sm:text-sm", children: [_jsx("span", { className: "font-medium text-gray-900 truncate max-w-[150px] sm:max-w-none", children: i.name }), _jsxs("span", { className: "text-gray-500 flex-shrink-0", children: ["x", i.quantity] })] }, i.productId))), order.items.length > 2 && (_jsxs("div", { className: "text-xs text-gray-500", children: ["+", order.items.length - 2, " s\u1EA3n ph\u1EA9m kh\u00E1c"] }))] }) }), _jsx("td", { className: "px-3 sm:px-6 py-3 sm:py-4", children: _jsx("span", { className: "font-semibold text-xs sm:text-sm text-gray-900", children: order.userId?.fullName || "Ẩn danh" }) }), _jsx("td", { className: "px-3 sm:px-6 py-3 sm:py-4", children: _jsxs("span", { className: "font-bold text-xs sm:text-sm text-green-600", children: [order.total?.toLocaleString("vi-VN"), "\u20AB"] }) }), _jsx("td", { className: "px-3 sm:px-6 py-3 sm:py-4 text-center", children: _jsx("span", { className: `px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-bold border-2 whitespace-nowrap ${latestStatus === "delivered" || latestStatus === "completed"
                                                            ? "bg-green-100 text-green-700 border-green-300"
                                                            : latestStatus === "shipped"
                                                                ? "bg-blue-100 text-blue-700 border-blue-300"
                                                                : latestStatus === "confirmed" || latestStatus === "processing"
                                                                    ? "bg-yellow-100 text-yellow-700 border-yellow-300"
                                                                    : latestStatus === "cancelled"
                                                                        ? "bg-red-100 text-red-700 border-red-300"
                                                                        : "bg-gray-100 text-gray-700 border-gray-300"}`, children: statusLabel }) }), _jsx("td", { className: "px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-600", children: new Date(order.createdAt).toLocaleDateString("vi-VN") }), _jsx("td", { className: "px-3 sm:px-6 py-3 sm:py-4", children: _jsxs("div", { className: "flex justify-center gap-1 sm:gap-2", children: [_jsx("button", { title: "Xem chi ti\u1EBFt", className: "w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-blue-100 text-blue-600 hover:bg-blue-200 hover:text-blue-700 active:scale-95 sm:hover:scale-110 flex items-center justify-center transition-all duration-300 touch-manipulation", onClick: () => navigate(`/order/${order._id}`), children: _jsx(Eye, { className: "w-4 h-4 sm:w-[18px] sm:h-[18px]" }) }), _jsx("button", { title: "X\u00F3a \u0111\u01A1n h\u00E0ng", className: "w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-red-100 text-red-600 hover:bg-red-200 hover:text-red-700 active:scale-95 sm:hover:scale-110 flex items-center justify-center transition-all duration-300 touch-manipulation", children: _jsx(Trash2, { className: "w-4 h-4 sm:w-[18px] sm:h-[18px]" }) })] }) })] }, order._id));
                                    })) : (_jsx("tr", { children: _jsxs("td", { colSpan: 7, className: "text-center py-8 sm:py-12", children: [_jsx("div", { className: "flex justify-center mb-4", children: _jsx(ShoppingCart, { className: "w-12 h-12 sm:w-16 sm:h-16 text-gray-400" }) }), _jsx("p", { className: "text-gray-500 text-sm sm:text-lg font-medium mb-2", children: "Ch\u01B0a c\u00F3 \u0111\u01A1n h\u00E0ng n\u00E0o" }), _jsx("p", { className: "text-gray-400 text-xs sm:text-sm", children: "\u0110\u01A1n h\u00E0ng c\u1EE7a kh\u00E1ch s\u1EBD hi\u1EC3n th\u1ECB \u1EDF \u0111\u00E2y" })] }) })) })] }) })] })] }));
};
// Component thống kê nhỏ
const StatBox = ({ title, value, percent, icon, color, }) => (_jsx("div", { className: "bg-white rounded-xl sm:rounded-2xl shadow-lg border-2 border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95 sm:active:scale-100 animate-fade-in-up touch-manipulation", children: _jsxs("div", { className: "p-4 sm:p-6", children: [_jsxs("div", { className: "flex items-center justify-between mb-3 sm:mb-4", children: [_jsx("div", { className: `w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-lg sm:rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white shadow-lg`, children: icon }), _jsx("span", { className: `text-xs font-bold px-2 sm:px-3 py-1 rounded-full whitespace-nowrap ${percent.startsWith("-") ? "bg-red-100 text-red-600 border-2 border-red-300" : "bg-green-100 text-green-600 border-2 border-green-300"}`, children: percent })] }), _jsx("div", { className: "text-xl sm:text-2xl lg:text-3xl font-extrabold text-gray-900 mb-1 break-words", children: value }), _jsx("div", { className: "text-xs sm:text-sm font-semibold text-gray-600", children: title })] }) }));
export default OrderManagement;
