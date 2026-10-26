import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState } from "react";
import { DollarSign, ShoppingCart, Package, Eye } from "lucide-react";
import storeApi from "../../../api/storeApi";
import orderApi from "../../../api/orderApi";
import productApi from "../../../api/productApi";
const Overview = () => {
    const [orders, setOrders] = useState([]);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        const fetchData = async () => {
            try {
                console.log("📦 Bắt đầu lấy thông tin cửa hàng...");
                const storeRes = await storeApi.getMyStore();
                console.log("📦 storeRes:", storeRes.data);
                const storeId = storeRes.data.store?._id;
                if (!storeId) {
                    setError("Bạn chưa có cửa hàng.");
                    setLoading(false);
                    return;
                }
                console.log("👉 storeId:", storeId);
                // Lấy đơn hàng
                try {
                    console.log("📦 Bắt đầu lấy đơn hàng...");
                    const ordersRes = await orderApi.getOrdersBySeller();
                    console.log("📦 ordersRes:", ordersRes.data);
                    setOrders(ordersRes.data || []);
                }
                catch (err) {
                    console.error("🔥 Lỗi lấy đơn hàng:", err.response?.data || err.message);
                    setOrders([]);
                }
                // Lấy sản phẩm
                try {
                    console.log("📦 Bắt đầu lấy sản phẩm...");
                    const productsRes = await productApi.getProductsByStore(storeId);
                    console.log("📦 productsRes:", productsRes.data);
                    setProducts(productsRes.data || []);
                }
                catch (err) {
                    console.error("🔥 Lỗi lấy sản phẩm:", err.response?.data || err.message);
                    setProducts([]);
                }
            }
            catch (err) {
                console.error("🔥 Lỗi lấy store:", err.response?.data || err.message || err);
                setError("Bạn chưa có cửa hàng hoặc API lỗi.");
            }
            finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);
    if (loading) {
        return (_jsxs("div", { className: "p-4 sm:p-8 text-center animate-fade-in", children: [_jsx("div", { className: "animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-t-4 border-b-4 border-[#4B5563] mx-auto mb-4" }), _jsx("p", { className: "text-[#4B5563] text-sm sm:text-lg font-medium", children: "\u0110ang t\u1EA3i t\u1ED5ng quan..." })] }));
    }
    if (error) {
        return (_jsxs("div", { className: "p-4 sm:p-8 text-center animate-fade-in", children: [_jsx("div", { className: "bg-[#4B5563]/5 rounded-full w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center mx-auto mb-4", children: _jsx("span", { className: "text-[#4B5563] text-2xl sm:text-3xl", children: "\u2715" }) }), _jsx("p", { className: "text-red-500 text-sm sm:text-lg font-medium", children: error })] }));
    }
    const revenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
    const totalOrders = orders.length;
    const totalProducts = products.length;
    const totalViews = products.reduce((sum, p) => sum + (p.viewsCount || 0), 0);
    const recentOrders = orders.slice(0, 5);
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
    return (_jsxs("div", { className: "space-y-4 sm:space-y-6", children: [_jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6", children: [_jsx(StatBox, { title: "Doanh thu", value: `${revenue.toLocaleString("vi-VN")}₫`, percent: "+12.5%", icon: _jsx(DollarSign, { className: "w-5 h-5 sm:w-6 sm:h-6" }), color: "from-[#4B5563] to-[#374151]" }), _jsx(StatBox, { title: "\u0110\u01A1n h\u00E0ng", value: totalOrders.toString(), percent: "+8.2%", icon: _jsx(ShoppingCart, { className: "w-5 h-5 sm:w-6 sm:h-6" }), color: "from-[#4B5563] to-[#374151]" }), _jsx(StatBox, { title: "S\u1EA3n ph\u1EA9m", value: totalProducts.toString(), percent: "+5.3%", icon: _jsx(Package, { className: "w-5 h-5 sm:w-6 sm:h-6" }), color: "from-[#4B5563] to-[#374151]" }), _jsx(StatBox, { title: "L\u01B0\u1EE3t xem", value: totalViews.toString(), percent: "-2.1%", icon: _jsx(Eye, { className: "w-5 h-5 sm:w-6 sm:h-6" }), color: "from-[#4B5563] to-[#374151]" })] }), _jsxs("div", { className: "bg-white rounded-xl sm:rounded-2xl shadow-lg border-2 border-gray-100 overflow-hidden animate-fade-in-up", children: [_jsxs("div", { className: "bg-[#4B5563]/5 p-4 sm:p-6 border-b-2 border-[#4B5563]/30", children: [_jsxs("h3", { className: "text-lg sm:text-xl md:text-2xl font-bold text-[#4B5563] flex items-center gap-2 sm:gap-3", children: [_jsx(Package, { className: "w-5 h-5 sm:w-6 sm:h-6 text-[#4B5563]" }), _jsx("span", { children: "\u0110\u01A1n h\u00E0ng g\u1EA7n \u0111\u00E2y" })] }), _jsx("p", { className: "text-gray-600 text-xs sm:text-sm mt-1", children: "C\u00E1c \u0111\u01A1n h\u00E0ng m\u1EDBi nh\u1EA5t t\u1EEB c\u1EEDa h\u00E0ng c\u1EE7a b\u1EA1n" })] }), _jsx("div", { className: "overflow-x-auto no-scrollbar", children: _jsxs("table", { className: "w-full min-w-[600px]", children: [_jsx("thead", { children: _jsxs("tr", { className: "text-left text-gray-600 border-b border-gray-200 bg-gray-50", children: [_jsx("th", { className: "px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold", children: "M\u00E3 \u0111\u01A1n h\u00E0ng" }), _jsx("th", { className: "px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold", children: "Gi\u00E1 tr\u1ECB" }), _jsx("th", { className: "px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold", children: "Tr\u1EA1ng th\u00E1i" }), _jsx("th", { className: "px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold", children: "Ng\u00E0y" })] }) }), _jsx("tbody", { children: recentOrders.length > 0 ? recentOrders.map((order, index) => {
                                        const latestStatus = order.statusHistory?.[order.statusHistory.length - 1]?.status || "pending";
                                        const statusLabel = getStatusLabel(latestStatus);
                                        return (_jsxs("tr", { className: "border-b border-gray-100 hover:bg-blue-50 transition-all duration-200 animate-fade-in-up", style: { animationDelay: `${index * 0.05}s` }, children: [_jsx("td", { className: "px-3 sm:px-6 py-3 sm:py-4 font-semibold text-xs sm:text-sm text-gray-900", children: order.orderCode }), _jsxs("td", { className: "px-3 sm:px-6 py-3 sm:py-4 font-bold text-xs sm:text-sm text-red-600", children: [(order.total || 0).toLocaleString("vi-VN"), "\u20AB"] }), _jsx("td", { className: "px-3 sm:px-6 py-3 sm:py-4", children: _jsx("span", { className: `px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${latestStatus === "delivered" || latestStatus === "completed"
                                                            ? "bg-[#4B5563]/10 text-[#4B5563] border-2 border-[#4B5563]/40"
                                                            : latestStatus === "shipped"
                                                                ? "bg-[#4B5563]/10 text-[#4B5563] border-2 border-[#4B5563]/40"
                                                                : latestStatus === "confirmed" || latestStatus === "processing"
                                                                    ? "bg-[#4B5563]/10 text-[#4B5563] border-2 border-[#4B5563]/40"
                                                                    : latestStatus === "cancelled"
                                                                        ? "bg-red-100 text-red-700 border-2 border-red-300"
                                                                        : "bg-gray-100 text-gray-700 border-2 border-gray-300"}`, children: statusLabel }) }), _jsx("td", { className: "px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-600", children: new Date(order.createdAt).toLocaleDateString("vi-VN") })] }, order._id));
                                    }) : (_jsx("tr", { children: _jsxs("td", { colSpan: 4, className: "text-center py-8 sm:py-12", children: [_jsx("div", { className: "flex justify-center mb-4", children: _jsx(Package, { className: "w-12 h-12 sm:w-16 sm:h-16 text-gray-400" }) }), _jsx("p", { className: "text-gray-500 text-sm sm:text-lg font-medium", children: "Ch\u01B0a c\u00F3 \u0111\u01A1n h\u00E0ng n\u00E0o" })] }) })) })] }) })] })] }));
};
const StatBox = ({ title, value, percent, icon, color }) => (_jsx("div", { className: "bg-white rounded-xl sm:rounded-2xl shadow-lg border-2 border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95 sm:active:scale-100 animate-fade-in-up touch-manipulation", children: _jsxs("div", { className: "p-4 sm:p-6", children: [_jsxs("div", { className: "flex items-center justify-between mb-3 sm:mb-4", children: [_jsx("div", { className: `w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-lg sm:rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white shadow-lg`, children: icon }), _jsx("span", { className: `text-xs font-bold px-2 sm:px-3 py-1 rounded-full whitespace-nowrap ${percent.startsWith("-") ? "bg-red-100 text-red-600 border-2 border-red-300" : "bg-green-100 text-green-600 border-2 border-green-300"}`, children: percent })] }), _jsx("div", { className: "text-xl sm:text-2xl lg:text-3xl font-extrabold text-gray-900 mb-1 break-words", children: value }), _jsx("div", { className: "text-xs sm:text-sm font-semibold text-gray-600", children: title })] }) }));
export default Overview;
