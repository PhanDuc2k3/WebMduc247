import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState, useMemo } from "react";
import userApi from "../../../api/userApi";
import { CheckCircle2, XCircle, Calendar, Store, FileText, User, Mail, Loader2 } from "lucide-react";
import Pagination from "../Pagination";
import { toast } from "react-toastify";
// Đồng nhất CSS cho status badges
const getStatusBadgeClass = (status) => {
    const statusMap = {
        pending: "bg-yellow-100 text-yellow-700",
        approved: "bg-green-100 text-green-700",
        rejected: "bg-red-100 text-red-700",
    };
    return `px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full ${statusMap[status] || "bg-gray-100 text-gray-700"}`;
};
const getStatusLabel = (status) => {
    const statusMap = {
        pending: "Chờ duyệt",
        approved: "Đã duyệt",
        rejected: "Đã từ chối",
    };
    return statusMap[status] || status;
};
const SellerApproval = () => {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 20;
    const fetchRequests = async () => {
        try {
            setLoading(true);
            console.log("🔄 [SellerApproval] Gửi yêu cầu lấy danh sách seller requests...");
            const res = await userApi.getAllSellerRequests();
            console.log("✅ [SellerApproval] Dữ liệu trả về từ BE:", res);
            const filtered = (res.data.requests || []).filter((u) => u.sellerRequest && u.sellerRequest.store?.name);
            console.log("📋 [SellerApproval] Danh sách sau khi lọc:", filtered);
            setRequests(filtered);
        }
        catch (error) {
            console.error("❌ [SellerApproval] Lỗi khi lấy danh sách:", error?.response || error);
            toast.error(error?.response?.data?.message || "Không thể tải danh sách yêu cầu");
        }
        finally {
            setLoading(false);
        }
    };
    const handleAction = async (userId, action) => {
        try {
            console.log(`⚙️ [SellerApproval] Gửi hành động ${action} cho userId=${userId}`);
            const res = await userApi.handleSellerRequest({ userId, action });
            console.log("✅ [SellerApproval] Kết quả xử lý:", res);
            toast.success(res.data.message || "Thao tác thành công");
            await fetchRequests();
        }
        catch (error) {
            console.error("❌ [SellerApproval] Lỗi xử lý yêu cầu:", error?.response || error);
            toast.error(error?.response?.data?.message || "Xử lý thất bại");
        }
    };
    useEffect(() => {
        fetchRequests();
    }, []);
    // Sắp xếp và phân trang requests
    const sortedAndPaginatedRequests = useMemo(() => {
        // Sắp xếp theo requestedAt desc (mới nhất lên trước)
        const sorted = [...requests].sort((a, b) => {
            const dateA = new Date(a.sellerRequest?.requestedAt || 0).getTime();
            const dateB = new Date(b.sellerRequest?.requestedAt || 0).getTime();
            return dateB - dateA;
        });
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return sorted.slice(startIndex, endIndex);
    }, [requests, currentPage, itemsPerPage]);
    const totalPages = Math.ceil(requests.length / itemsPerPage);
    return (_jsxs("div", { className: "p-6 lg:p-8", children: [_jsxs("div", { className: "mb-6 animate-fade-in-down", children: [_jsxs("h2", { className: "text-2xl font-bold mb-2 gradient-text flex items-center gap-2", children: [_jsx(FileText, { size: 24, className: "text-blue-600" }), "\u0110\u01A1n \u0111\u0103ng k\u00FD m\u1EDF c\u1EEDa h\u00E0ng"] }), _jsx("p", { className: "text-gray-600 text-sm", children: "Danh s\u00E1ch v\u00E0 duy\u1EC7t \u0111\u01A1n \u0111\u0103ng k\u00FD t\u1EEB ng\u01B0\u1EDDi mu\u1ED1n tr\u1EDF th\u00E0nh seller" })] }), loading ? (_jsxs("div", { className: "flex flex-col items-center justify-center py-20", children: [_jsx(Loader2, { className: "w-16 h-16 text-purple-500 animate-spin mb-4" }), _jsx("p", { className: "text-gray-600 text-lg font-medium", children: "\u0110ang t\u1EA3i y\u00EAu c\u1EA7u..." })] })) : requests.length === 0 ? (_jsxs("div", { className: "text-center py-20 animate-fade-in-up", children: [_jsx(FileText, { size: 64, className: "mx-auto mb-4 text-gray-400" }), _jsx("p", { className: "text-gray-500 text-lg font-medium", children: "Kh\u00F4ng c\u00F3 y\u00EAu c\u1EA7u n\u00E0o" })] })) : (_jsxs(_Fragment, { children: [_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full", children: [_jsx("thead", { children: _jsxs("tr", { className: "bg-gray-100 border-b-2 border-gray-200", children: [_jsx("th", { className: "px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider", children: "Th\u00F4ng tin c\u1EEDa h\u00E0ng" }), _jsx("th", { className: "px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider", children: "Ng\u01B0\u1EDDi \u0111\u0103ng k\u00FD" }), _jsx("th", { className: "px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider", children: "Danh m\u1EE5c" }), _jsx("th", { className: "px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider", children: "Ng\u00E0y \u0111\u0103ng k\u00FD" }), _jsx("th", { className: "px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider", children: "Tr\u1EA1ng th\u00E1i" }), _jsx("th", { className: "px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider", children: "Thao t\u00E1c" })] }) }), _jsx("tbody", { className: "bg-white divide-y divide-gray-200", children: sortedAndPaginatedRequests.map((req, idx) => (_jsxs("tr", { className: "hover:bg-gray-50 transition-all duration-300 animate-fade-in-up", style: { animationDelay: `${idx * 0.05}s` }, children: [_jsx("td", { className: "px-6 py-4", children: _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "w-12 h-12 rounded-xl bg-purple-500 flex items-center justify-center text-white shadow-lg", children: _jsx(Store, { size: 24 }) }), _jsxs("div", { children: [_jsxs("div", { className: "font-bold text-gray-900 flex items-center gap-1", children: [_jsx(Store, { size: 14, className: "text-gray-400" }), req.sellerRequest.store.name] }), _jsx("div", { className: "text-xs text-gray-500 max-w-xs truncate", children: req.sellerRequest.store.description })] })] }) }), _jsxs("td", { className: "px-6 py-4 whitespace-nowrap", children: [_jsxs("div", { className: "font-medium text-gray-900 flex items-center gap-1", children: [_jsx(User, { size: 14, className: "text-gray-400" }), req.fullName] }), _jsxs("div", { className: "text-xs text-gray-500 flex items-center gap-1 mt-1", children: [_jsx(Mail, { size: 12, className: "text-gray-400" }), req.email] })] }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap", children: _jsx("span", { className: "px-3 py-1 inline-flex text-xs leading-5 font-bold rounded-full bg-green-500 text-white shadow-lg", children: req.sellerRequest.store.category }) }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap text-sm text-gray-500", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Calendar, { size: 14, className: "text-gray-400" }), new Date(req.sellerRequest.requestedAt).toLocaleDateString("vi-VN")] }) }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap", children: _jsx("span", { className: getStatusBadgeClass(req.sellerRequest.status), children: getStatusLabel(req.sellerRequest.status) }) }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap text-sm font-medium", children: req.sellerRequest.status === "pending" ? (_jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("button", { onClick: () => handleAction(req._id, "approve"), className: "bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg transition-all duration-300 transform hover:scale-110 flex items-center gap-2 font-bold", title: "Duy\u1EC7t", children: [_jsx(CheckCircle2, { size: 18 }), "Duy\u1EC7t"] }), _jsxs("button", { onClick: () => handleAction(req._id, "reject"), className: "bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg transition-all duration-300 transform hover:scale-110 flex items-center gap-2 font-bold", title: "T\u1EEB ch\u1ED1i", children: [_jsx(XCircle, { size: 18 }), "T\u1EEB ch\u1ED1i"] })] })) : (_jsx("span", { className: "text-gray-400 text-xs", children: "\u0110\u00E3 x\u1EED l\u00FD" })) })] }, idx))) })] }) }), totalPages > 1 && (_jsx(Pagination, { currentPage: currentPage, totalPages: totalPages, onPageChange: setCurrentPage, itemsPerPage: itemsPerPage, totalItems: requests.length }))] }))] }));
};
export default SellerApproval;
