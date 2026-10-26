import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useEffect } from "react";
import { AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { toast } from "react-toastify";
import axiosClient from "../../../api/axiosClient";
const OrderUpdate = ({ orderId, currentStatus }) => {
    const [status, setStatus] = useState(currentStatus);
    const [note, setNote] = useState("Khách hàng yêu cầu gọi trước khi giao hàng");
    const [loading, setLoading] = useState(false);
    const token = localStorage.getItem("token");
    // Danh sách trạng thái có thể cập nhật
    const statusOptions = [
        { label: "Đã đặt hàng", value: "pending" },
        { label: "Đã xác nhận", value: "confirmed" },
        { label: "Đã đóng gói", value: "packed" },
        { label: "Đang vận chuyển", value: "shipped" },
        { label: "Đã giao hàng", value: "delivered" },
        { label: "Đã hủy", value: "cancelled" },
    ];
    // Đồng bộ trạng thái khi currentStatus từ props thay đổi
    useEffect(() => {
        setStatus(currentStatus);
    }, [currentStatus]);
    const handleUpdate = async () => {
        if (!token) {
            toast.warning(_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(AlertTriangle, { className: "text-yellow-500", size: 18 }), _jsx("span", { children: "Vui l\u00F2ng \u0111\u0103ng nh\u1EADp \u0111\u1EC3 c\u1EADp nh\u1EADt \u0111\u01A1n h\u00E0ng!" })] }));
            return;
        }
        setLoading(true);
        try {
            await axiosClient.put(`/api/orders/${orderId}/status`, { status, note }, {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });
            toast.success(_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(CheckCircle, { className: "text-green-500", size: 18 }), _jsx("span", { children: "C\u1EADp nh\u1EADt tr\u1EA1ng th\u00E1i \u0111\u01A1n h\u00E0ng th\u00E0nh c\u00F4ng!" })] }));
        }
        catch (err) {
            console.error("Lỗi cập nhật đơn hàng:", err);
            const message = err instanceof Error ? err.message : "Cập nhật thất bại";
            toast.error(_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(XCircle, { className: "text-red-500", size: 18 }), _jsxs("span", { children: ["L\u1ED7i: ", message] })] }));
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsxs("div", { className: "bg-white rounded-xl sm:rounded-2xl shadow-lg border-2 border-gray-100 overflow-hidden animate-fade-in-up", children: [_jsxs("div", { className: "bg-[#4B5563]/5 p-4 sm:p-6 border-b-2 border-gray-200", children: [_jsx("h2", { className: "text-xl sm:text-2xl font-bold text-[#4B5563] flex items-center gap-2 sm:gap-3", children: "C\u1EADp nh\u1EADt \u0111\u01A1n h\u00E0ng" }), _jsx("p", { className: "text-gray-600 text-xs sm:text-sm mt-1", children: "Ch\u1EC9nh s\u1EEDa tr\u1EA1ng th\u00E1i \u0111\u01A1n h\u00E0ng" })] }), _jsxs("div", { className: "p-4 sm:p-6 space-y-4 sm:space-y-5", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-xs sm:text-sm font-bold text-gray-700 mb-2", children: "Tr\u1EA1ng th\u00E1i \u0111\u01A1n h\u00E0ng" }), _jsx("select", { value: status, onChange: (e) => setStatus(e.target.value), className: "w-full border-2 border-gray-200 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#4B5563] focus:border-[#4B5563] transition-all duration-300", children: statusOptions.map((s) => (_jsx("option", { value: s.value, children: s.label }, s.value))) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs sm:text-sm font-bold text-gray-700 mb-2", children: "Ghi ch\u00FA" }), _jsx("textarea", { value: note, onChange: (e) => setNote(e.target.value), rows: 4, placeholder: "Nh\u1EADp ghi ch\u00FA cho kh\u00E1ch h\u00E0ng...", className: "w-full border-2 border-gray-200 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#4B5563] focus:border-[#4B5563] transition-all duration-300 resize-none" })] }), _jsxs("div", { className: "flex flex-col gap-2 sm:gap-3 pt-2", children: [_jsx("button", { onClick: handleUpdate, disabled: loading, className: `w-full px-4 sm:px-6 py-2.5 sm:py-3 text-white text-xs sm:text-sm font-bold rounded-lg sm:rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-2 ${loading
                                    ? "bg-gray-400 cursor-not-allowed"
                                    : "bg-[#4B5563] hover:bg-[#374151]"}`, children: loading ? (_jsx(_Fragment, { children: _jsx("span", { children: "\u0110ang c\u1EADp nh\u1EADt..." }) })) : (_jsx(_Fragment, { children: _jsx("span", { children: "C\u1EADp nh\u1EADt \u0111\u01A1n h\u00E0ng" }) })) }), _jsx("button", { onClick: () => window.print(), className: "w-full px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-gray-400 to-gray-600 text-white text-xs sm:text-sm font-bold rounded-lg sm:rounded-xl hover:from-gray-500 hover:to-gray-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-2", children: _jsx("span", { children: "In h\u00F3a \u0111\u01A1n" }) })] })] })] }));
};
export default OrderUpdate;
