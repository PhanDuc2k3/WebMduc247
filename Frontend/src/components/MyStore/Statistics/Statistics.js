import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, } from "recharts";
import { DollarSign, Trophy, Star, Eye, BarChart3 } from "lucide-react";
import statisticApi from "../../../api/statisticApi";
const Statistics = ({ storeId }) => {
    const [revenueData, setRevenueData] = useState([]);
    const [viewsData, setViewsData] = useState([]);
    const [topProducts, setTopProducts] = useState([]);
    const [ratingDistribution, setRatingDistribution] = useState([]);
    const [totalReviews, setTotalReviews] = useState(0);
    const [averageRating, setAverageRating] = useState(0);
    useEffect(() => {
        const fetchData = async () => {
            try {
                // Doanh thu 7 ngày
                const revRes = await statisticApi.getRevenueStats({ storeId, range: 7 });
                const revJson = revRes.data;
                const revMap = {};
                revJson.forEach((item) => {
                    const dateStr = item.date || item._id;
                    revMap[dateStr] = Number(item.total) || 0;
                });
                const today = new Date();
                const revFinal = Array.from({ length: 7 }).map((_, i) => {
                    const d = new Date();
                    d.setDate(today.getDate() - (6 - i));
                    const dateStr = d.toISOString().slice(0, 10);
                    return { date: dateStr, total: revMap[dateStr] || 0 };
                });
                setRevenueData(revFinal);
                // Lượt truy cập 7 ngày
                const viewRes = await statisticApi.getViewsStats({ storeId, range: 7 });
                const viewJson = viewRes.data;
                const viewMap = {};
                viewJson.forEach((v) => {
                    const dateStr = v.date || v._id;
                    viewMap[dateStr] = Number(v.views) || Number(v.totalViews) || 0;
                });
                const viewFinal = Array.from({ length: 7 }).map((_, i) => {
                    const d = new Date();
                    d.setDate(today.getDate() - (6 - i));
                    const dateStr = d.toISOString().slice(0, 10);
                    return { date: dateStr, views: viewMap[dateStr] || 0 };
                });
                setViewsData(viewFinal);
                // Top sản phẩm
                const topRes = await statisticApi.getTopProducts({ storeId, range: 7 });
                const topFinal = topRes.data.map((item) => ({
                    name: item.product?.name || "Unknown",
                    sold: Number(item.totalSold) || 0,
                }));
                setTopProducts(topFinal);
                // Đánh giá khách hàng - Lấy phân phối đánh giá từ API
                try {
                    const ratingRes = await statisticApi.getRatingDistribution({ storeId });
                    const ratingData = ratingRes.data;
                    setTotalReviews(ratingData.totalReviews || 0);
                    setAverageRating(ratingData.averageRating || 0);
                    setRatingDistribution(ratingData.distribution || [
                        { stars: 5, count: 0, percent: 0 },
                        { stars: 4, count: 0, percent: 0 },
                        { stars: 3, count: 0, percent: 0 },
                        { stars: 2, count: 0, percent: 0 },
                        { stars: 1, count: 0, percent: 0 },
                    ]);
                }
                catch (err) {
                    console.error("Lỗi khi load đánh giá:", err);
                    // Set default distribution nếu có lỗi
                    setRatingDistribution([
                        { stars: 5, count: 0, percent: 0 },
                        { stars: 4, count: 0, percent: 0 },
                        { stars: 3, count: 0, percent: 0 },
                        { stars: 2, count: 0, percent: 0 },
                        { stars: 1, count: 0, percent: 0 },
                    ]);
                    setTotalReviews(0);
                    setAverageRating(0);
                }
            }
            catch (err) {
                console.error("Lỗi khi load dữ liệu thống kê:", err);
            }
        };
        fetchData();
    }, [storeId]);
    return (_jsxs("div", { className: "space-y-4 sm:space-y-6 animate-fade-in-up", children: [_jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6", children: [_jsxs("div", { className: "bg-white rounded-xl sm:rounded-2xl shadow-lg border-2 border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300", children: [_jsxs("div", { className: "bg-gradient-to-r from-green-50 to-emerald-50 p-4 sm:p-6 border-b-2 border-gray-200", children: [_jsxs("h3", { className: "text-lg sm:text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3", children: [_jsx(DollarSign, { className: "w-5 h-5 sm:w-6 sm:h-6 text-green-600" }), _jsx("span", { children: "Doanh thu 7 ng\u00E0y" })] }), _jsx("p", { className: "text-gray-600 text-xs sm:text-sm mt-1", children: "T\u1ED5ng quan doanh thu trong tu\u1EA7n" })] }), _jsx("div", { className: "p-3 sm:p-4 md:p-6", children: _jsx(ResponsiveContainer, { width: "100%", height: 200, children: _jsxs(LineChart, { data: revenueData, margin: { top: 5, right: 5, left: -20, bottom: 5 }, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#e5e7eb" }), _jsx(XAxis, { dataKey: "date", stroke: "#6b7280", tick: { fontSize: 12 }, tickFormatter: (value) => {
                                                    const date = new Date(value);
                                                    return `${date.getDate()}/${date.getMonth() + 1}`;
                                                } }), _jsx(YAxis, { tickFormatter: (v) => `${(v / 1_000_000).toFixed(0)}tr`, stroke: "#6b7280", tick: { fontSize: 12 }, width: 50 }), _jsx(Tooltip, { formatter: (v) => `${v.toLocaleString("vi-VN")}₫`, contentStyle: { fontSize: '12px', padding: '8px' } }), _jsx(Line, { type: "monotone", dataKey: "total", stroke: "url(#gradient)", strokeWidth: 2, dot: { fill: '#10b981', r: 4 }, activeDot: { r: 6 } }), _jsx("defs", { children: _jsxs("linearGradient", { id: "gradient", x1: "0", y1: "0", x2: "0", y2: "1", children: [_jsx("stop", { offset: "0%", stopColor: "#10b981", stopOpacity: 1 }), _jsx("stop", { offset: "100%", stopColor: "#10b981", stopOpacity: 0.3 })] }) })] }) }) })] }), _jsxs("div", { className: "bg-white rounded-xl sm:rounded-2xl shadow-lg border-2 border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300", children: [_jsxs("div", { className: "bg-gradient-to-r from-purple-50 to-pink-50 p-4 sm:p-6 border-b-2 border-gray-200", children: [_jsxs("h3", { className: "text-lg sm:text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3", children: [_jsx(Trophy, { className: "w-5 h-5 sm:w-6 sm:h-6 text-purple-600" }), _jsx("span", { children: "S\u1EA3n ph\u1EA9m b\u00E1n ch\u1EA1y" })] }), _jsx("p", { className: "text-gray-600 text-xs sm:text-sm mt-1", children: "Top s\u1EA3n ph\u1EA9m \u0111\u01B0\u1EE3c y\u00EAu th\u00EDch nh\u1EA5t" })] }), _jsx("div", { className: "p-4 sm:p-6", children: _jsxs("div", { className: "space-y-2 sm:space-y-3", children: [topProducts.slice(0, 5).map((item, idx) => (_jsxs("div", { className: "flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0 p-2 sm:p-3 rounded-lg sm:rounded-xl hover:bg-purple-50 transition-all duration-200 animate-fade-in-up border border-gray-100", style: { animationDelay: `${idx * 0.1}s` }, children: [_jsxs("div", { className: "flex items-center gap-2 sm:gap-3 flex-1 min-w-0", children: [_jsx("div", { className: `w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-white text-xs sm:text-sm flex-shrink-0 ${idx === 0 ? 'bg-gradient-to-br from-yellow-400 to-orange-500' :
                                                                idx === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400' :
                                                                    idx === 2 ? 'bg-gradient-to-br from-orange-300 to-orange-400' :
                                                                        'bg-gradient-to-br from-blue-400 to-purple-500'}`, children: idx + 1 }), _jsx("span", { className: "font-semibold text-xs sm:text-sm text-gray-900 truncate", children: item.name })] }), _jsxs("span", { className: "font-bold text-xs sm:text-sm text-green-600 bg-green-50 px-2 sm:px-3 py-1 rounded-lg whitespace-nowrap self-start sm:self-auto", children: [item.sold, " b\u00E1n"] })] }, idx))), topProducts.length === 0 && (_jsxs("div", { className: "text-center py-8 text-gray-500", children: [_jsx("div", { className: "flex justify-center mb-2", children: _jsx(BarChart3, { className: "w-10 h-10 sm:w-12 sm:h-12 text-gray-400" }) }), _jsx("p", { className: "text-sm sm:text-base", children: "Kh\u00F4ng c\u00F3 d\u1EEF li\u1EC7u" })] }))] }) })] })] }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6", children: [_jsxs("div", { className: "bg-white rounded-xl sm:rounded-2xl shadow-lg border-2 border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300", children: [_jsx("div", { className: "bg-gradient-to-r from-yellow-50 to-orange-50 p-4 sm:p-6 border-b-2 border-gray-200", children: _jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0", children: [_jsxs("div", { children: [_jsxs("h3", { className: "text-lg sm:text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3", children: [_jsx(Star, { className: "w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" }), _jsx("span", { children: "\u0110\u00E1nh gi\u00E1 kh\u00E1ch h\u00E0ng" })] }), _jsx("p", { className: "text-gray-600 text-xs sm:text-sm mt-1", children: totalReviews > 0 ? (_jsxs(_Fragment, { children: [totalReviews, " \u0111\u00E1nh gi\u00E1 \u2022 Trung b\u00ECnh: ", _jsxs("span", { className: "font-bold text-yellow-600", children: [averageRating, "/5"] })] })) : ("Phân phối điểm đánh giá") })] }), totalReviews > 0 && (_jsx("div", { className: "flex items-center gap-1", children: [1, 2, 3, 4, 5].map((star) => (_jsx(Star, { className: `w-4 h-4 sm:w-5 sm:h-5 ${star <= Math.round(averageRating)
                                                    ? "text-yellow-500 fill-yellow-500"
                                                    : "text-gray-300"}` }, star))) }))] }) }), _jsx("div", { className: "p-4 sm:p-6", children: totalReviews > 0 ? (_jsx("div", { className: "space-y-3 sm:space-y-4", children: ratingDistribution.map((item, idx) => (_jsxs("div", { className: "flex items-center gap-2 sm:gap-3 animate-fade-in-up", style: { animationDelay: `${idx * 0.05}s` }, children: [_jsxs("div", { className: "flex items-center gap-1 sm:gap-2 w-16 sm:w-20 flex-shrink-0", children: [_jsx("span", { className: "font-bold text-xs sm:text-sm text-yellow-600", children: item.stars }), _jsx(Star, { className: "w-3 h-3 sm:w-4 sm:h-4 text-yellow-500 fill-yellow-500" })] }), _jsx("div", { className: "flex-1 bg-gray-200 h-3 sm:h-4 rounded-full overflow-hidden min-w-0 relative", children: _jsx("div", { className: "bg-gradient-to-r from-yellow-400 to-orange-500 h-full rounded-full transition-all duration-500", style: { width: `${item.percent}%` } }) }), _jsxs("div", { className: "flex items-center gap-2 flex-shrink-0", children: [_jsxs("span", { className: "text-gray-700 font-bold text-xs sm:text-sm whitespace-nowrap", children: [item.percent, "%"] }), _jsxs("span", { className: "text-gray-500 text-xs", children: ["(", item.count, ")"] })] })] }, item.stars))) })) : (_jsxs("div", { className: "text-center py-8 text-gray-500", children: [_jsx("div", { className: "flex justify-center mb-2", children: _jsx(Star, { className: "w-10 h-10 sm:w-12 sm:h-12 text-gray-300" }) }), _jsx("p", { className: "text-sm sm:text-base font-medium", children: "Ch\u01B0a c\u00F3 \u0111\u00E1nh gi\u00E1 n\u00E0o" }), _jsx("p", { className: "text-xs sm:text-sm text-gray-400 mt-1", children: "\u0110\u00E1nh gi\u00E1 t\u1EEB kh\u00E1ch h\u00E0ng s\u1EBD hi\u1EC3n th\u1ECB \u1EDF \u0111\u00E2y" })] })) })] }), _jsxs("div", { className: "bg-white rounded-xl sm:rounded-2xl shadow-lg border-2 border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300", children: [_jsxs("div", { className: "bg-gradient-to-r from-blue-50 to-cyan-50 p-4 sm:p-6 border-b-2 border-gray-200", children: [_jsxs("h3", { className: "text-lg sm:text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3", children: [_jsx(Eye, { className: "w-5 h-5 sm:w-6 sm:h-6 text-blue-600" }), _jsx("span", { children: "L\u01B0\u1EE3t truy c\u1EADp 7 ng\u00E0y" })] }), _jsx("p", { className: "text-gray-600 text-xs sm:text-sm mt-1", children: "S\u1ED1 l\u01B0\u1EE3t xem s\u1EA3n ph\u1EA9m" })] }), _jsx("div", { className: "p-3 sm:p-4 md:p-6", children: _jsx(ResponsiveContainer, { width: "100%", height: 200, children: _jsxs(BarChart, { data: viewsData, margin: { top: 5, right: 5, left: -20, bottom: 5 }, children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "#e5e7eb" }), _jsx(XAxis, { dataKey: "date", stroke: "#6b7280", tick: { fontSize: 12 }, tickFormatter: (value) => {
                                                    const date = new Date(value);
                                                    return `${date.getDate()}/${date.getMonth() + 1}`;
                                                } }), _jsx(YAxis, { stroke: "#6b7280", tick: { fontSize: 12 }, width: 50 }), _jsx(Tooltip, { formatter: (v) => v.toLocaleString("vi-VN"), contentStyle: { fontSize: '12px', padding: '8px' } }), _jsx(Bar, { dataKey: "views", fill: "url(#barGradient)", radius: [6, 6, 0, 0] }), _jsx("defs", { children: _jsxs("linearGradient", { id: "barGradient", x1: "0", y1: "0", x2: "0", y2: "1", children: [_jsx("stop", { offset: "0%", stopColor: "#3b82f6", stopOpacity: 1 }), _jsx("stop", { offset: "100%", stopColor: "#06b6d4", stopOpacity: 0.8 })] }) })] }) }) })] })] })] }));
};
export default Statistics;
