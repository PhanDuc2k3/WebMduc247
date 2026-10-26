import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState } from "react";
import { RotateCcw, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import orderApi from "../../../api/orderApi";
import { toast } from "react-toastify";
const ReturnRequest = ({ orderId, order, onRequestSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [reason, setReason] = useState("");
    // Kiểm tra xem có thể yêu cầu trả lại không
    const canRequestReturn = () => {
        const currentStatus = order.statusHistory && order.statusHistory.length > 0
            ? order.statusHistory[order.statusHistory.length - 1]?.status
            : null;
        // Chỉ cho phép khi đã nhận hàng và chưa có yêu cầu trả lại
        if (currentStatus !== "received")
            return false;
        if (order.returnRequest && order.returnRequest.status)
            return false;
        // Kiểm tra trong vòng 3 ngày
        const receivedStatus = order.statusHistory?.find(s => s.status === "received");
        if (!receivedStatus)
            return false;
        const receivedDate = new Date(receivedStatus.timestamp);
        const now = new Date();
        const daysDiff = Math.floor((now.getTime() - receivedDate.getTime()) / (1000 * 60 * 60 * 24));
        return daysDiff <= 3;
    };
    // Kiểm tra trạng thái yêu cầu trả lại
    const getReturnStatus = () => {
        if (!order.returnRequest || !order.returnRequest.status)
            return null;
        return order.returnRequest.status;
    };
    const handleRequestReturn = async () => {
        const trimmedReason = reason.trim();
        if (!trimmedReason) {
            toast.error("Vui lòng nhập lý do trả lại hàng", {
                containerId: "general-toast",
            });
            return;
        }
        if (trimmedReason.length < 10) {
            toast.error("Lý do trả lại hàng phải có ít nhất 10 ký tự", {
                containerId: "general-toast",
            });
            return;
        }
        if (trimmedReason.length > 500) {
            toast.error("Lý do trả lại hàng không được vượt quá 500 ký tự", {
                containerId: "general-toast",
            });
            return;
        }
        setLoading(true);
        try {
            await orderApi.requestReturn(orderId, trimmedReason);
            toast.success(_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(CheckCircle, { className: "text-green-500", size: 18 }), _jsx("span", { children: "Y\u00EAu c\u1EA7u tr\u1EA3 l\u1EA1i h\u00E0ng \u0111\u00E3 \u0111\u01B0\u1EE3c g\u1EEDi th\u00E0nh c\u00F4ng!" })] }), {
                containerId: "general-toast",
            });
            setShowModal(false);
            setReason("");
            onRequestSuccess();
        }
        catch (err) {
            console.error("Lỗi yêu cầu trả lại hàng:", err);
            const errorMessage = err.response?.data?.message
                || err.message
                || "Lỗi khi yêu cầu trả lại hàng!";
            toast.error(_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(XCircle, { className: "text-red-500", size: 18 }), _jsx("span", { children: errorMessage })] }), {
                containerId: "general-toast",
            });
        }
        finally {
            setLoading(false);
        }
    };
    const returnStatus = getReturnStatus();
    const canRequest = canRequestReturn();
    // Nếu đã có yêu cầu trả lại, hiển thị trạng thái
    if (returnStatus) {
        const statusMessages = {
            pending: {
                message: "Yêu cầu trả lại hàng đang chờ xử lý",
                icon: AlertCircle,
                color: "text-[#4B5563]",
                bgColor: "from-[#4B5563]/10 to-[#4B5563]/5",
                borderColor: "border-[#4B5563]/40",
            },
            approved: {
                message: "Yêu cầu trả lại hàng đã được phê duyệt. Tiền sẽ được hoàn lại trong vòng 5-7 ngày làm việc.",
                icon: CheckCircle,
                color: "text-green-600",
                bgColor: "from-green-50 to-emerald-50",
                borderColor: "border-green-200",
            },
            rejected: {
                message: "Yêu cầu trả lại hàng đã bị từ chối",
                icon: XCircle,
                color: "text-red-600",
                bgColor: "from-red-50 to-rose-50",
                borderColor: "border-red-200",
            },
            completed: {
                message: "Đơn hàng đã được trả lại thành công",
                icon: CheckCircle,
                color: "text-[#4B5563]",
                bgColor: "from-[#4B5563]/10 to-[#4B5563]/5",
                borderColor: "border-[#4B5563]/40",
            },
        };
        const statusInfo = statusMessages[returnStatus] || statusMessages.pending;
        const StatusIcon = statusInfo.icon;
        return (_jsxs("div", { className: `bg-white rounded-xl sm:rounded-2xl shadow-lg border-2 ${statusInfo.borderColor} overflow-hidden animate-fade-in-up`, children: [_jsx("div", { className: `bg-gradient-to-r ${statusInfo.bgColor} p-4 sm:p-6 border-b-2 ${statusInfo.borderColor}`, children: _jsxs("h2", { className: "text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3", children: [_jsx(StatusIcon, { size: 20, className: `sm:w-6 sm:h-6 ${statusInfo.color}` }), "Tr\u1EA1ng th\u00E1i tr\u1EA3 l\u1EA1i h\u00E0ng"] }) }), _jsxs("div", { className: "p-4 sm:p-6", children: [_jsx("p", { className: `text-sm sm:text-base font-semibold ${statusInfo.color} mb-2`, children: statusInfo.message }), order.returnRequest?.reason && (_jsxs("p", { className: "text-xs sm:text-sm text-gray-600 mt-2", children: [_jsx("span", { className: "font-semibold", children: "L\u00FD do:" }), " ", order.returnRequest.reason] })), order.returnRequest?.requestedAt && (_jsxs("p", { className: "text-xs sm:text-sm text-gray-500 mt-1", children: ["Y\u00EAu c\u1EA7u v\u00E0o: ", new Date(order.returnRequest.requestedAt).toLocaleString("vi-VN")] }))] })] }));
    }
    // Nếu không thể yêu cầu trả lại, không hiển thị gì
    if (!canRequest) {
        return null;
    }
    return (_jsxs(_Fragment, { children: [_jsxs("div", { className: "bg-white rounded-xl sm:rounded-2xl shadow-lg border-2 border-gray-100 overflow-hidden animate-fade-in-up", children: [_jsxs("div", { className: "bg-[#4B5563]/5 p-4 sm:p-6 border-b-2 border-gray-200", children: [_jsxs("h2", { className: "text-xl sm:text-2xl font-bold text-[#4B5563] flex items-center gap-2 sm:gap-3", children: [_jsx(RotateCcw, { size: 20, className: "sm:w-6 sm:h-6 text-[#4B5563]" }), "Tr\u1EA3 l\u1EA1i h\u00E0ng"] }), _jsx("p", { className: "text-gray-600 text-xs sm:text-sm mt-1", children: "B\u1EA1n c\u00F3 th\u1EC3 y\u00EAu c\u1EA7u tr\u1EA3 l\u1EA1i h\u00E0ng trong v\u00F2ng 3 ng\u00E0y k\u1EC3 t\u1EEB ng\u00E0y nh\u1EADn h\u00E0ng" })] }), _jsx("div", { className: "p-4 sm:p-6", children: _jsxs("button", { onClick: () => setShowModal(true), className: "w-full px-4 sm:px-6 py-2.5 sm:py-3 bg-[#4B5563] text-white text-sm sm:text-base font-bold rounded-lg sm:rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 hover:bg-[#374151] flex items-center justify-center gap-2", children: [_jsx(RotateCcw, { size: 18, className: "sm:w-5 sm:h-5" }), _jsx("span", { children: "Y\u00EAu c\u1EA7u tr\u1EA3 l\u1EA1i h\u00E0ng" })] }) })] }), showModal && (_jsx("div", { className: "fixed inset-0 flex items-center justify-center z-50 p-4", style: { backgroundColor: 'rgba(0, 0, 0, 0.5)' }, children: _jsxs("div", { className: "bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-md w-full p-6 animate-fade-in-up", children: [_jsx("h3", { className: "text-xl sm:text-2xl font-bold text-gray-900 mb-4", children: "Y\u00EAu c\u1EA7u tr\u1EA3 l\u1EA1i h\u00E0ng" }), _jsxs("div", { className: "mb-4", children: [_jsxs("label", { className: "block text-sm font-semibold text-gray-700 mb-2", children: ["L\u00FD do tr\u1EA3 l\u1EA1i h\u00E0ng ", _jsx("span", { className: "text-red-500", children: "*" })] }), _jsx("textarea", { value: reason, onChange: (e) => setReason(e.target.value), placeholder: "Vui l\u00F2ng nh\u1EADp l\u00FD do tr\u1EA3 l\u1EA1i h\u00E0ng (v\u00ED d\u1EE5: S\u1EA3n ph\u1EA9m kh\u00F4ng \u0111\u00FAng m\u00F4 t\u1EA3, b\u1ECB l\u1ED7i, kh\u00F4ng v\u1EEBa, v.v.)", className: "w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-[#4B5563] resize-none", rows: 4, maxLength: 500 }), _jsxs("div", { className: "mt-1 flex justify-between items-center", children: [_jsx("p", { className: "text-xs text-gray-500", children: reason.length < 10 ? (_jsxs("span", { className: "text-[#4B5563]", children: ["C\u1EA7n \u00EDt nh\u1EA5t 10 k\u00FD t\u1EF1 (c\u00F2n ", 10 - reason.length, " k\u00FD t\u1EF1)"] })) : (_jsx("span", { className: "text-gray-500", children: "\u0110\u1ED9 d\u00E0i h\u1EE3p l\u1EC7" })) }), _jsxs("p", { className: "text-xs text-gray-500", children: [reason.length, "/500 k\u00FD t\u1EF1"] })] })] }), _jsxs("div", { className: "flex gap-3", children: [_jsx("button", { onClick: () => {
                                        setShowModal(false);
                                        setReason("");
                                    }, disabled: loading, className: "flex-1 px-4 py-2.5 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50", children: "H\u1EE7y" }), _jsx("button", { onClick: handleRequestReturn, disabled: loading || !reason.trim() || reason.trim().length < 10, className: `flex-1 px-4 py-2.5 text-white font-semibold rounded-lg transition-all ${loading || !reason.trim() || reason.trim().length < 10
                                        ? "bg-gray-400 cursor-not-allowed"
                                        : "bg-[#4B5563] hover:bg-[#374151]"}`, children: loading ? (_jsxs("span", { className: "flex items-center justify-center gap-2", children: [_jsx("span", { className: "w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" }), "\u0110ang g\u1EEDi..."] })) : ("Gửi yêu cầu") })] })] }) }))] }));
};
export default ReturnRequest;
