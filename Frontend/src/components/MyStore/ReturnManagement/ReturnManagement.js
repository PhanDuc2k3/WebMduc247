import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { RotateCcw, CheckCircle, XCircle, Package, Clock, User } from "lucide-react";
import ConfirmDialog from "../../ui/ConfirmDialog";
import orderApi from "../../../api/orderApi";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
const ReturnManagement = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);
    const [confirmReturn, setConfirmReturn] = useState({ open: false, orderId: null });
    const [rejectReturn, setRejectReturn] = useState({ open: false, orderId: null, reason: "" });
    const navigate = useNavigate();
    useEffect(() => {
        fetchReturnOrders();
    }, []);
    const fetchReturnOrders = async () => {
        try {
            setLoading(true);
            const res = await orderApi.getOrdersBySeller();
            const allOrders = res.data || [];
            // Lọc các đơn hàng có yêu cầu trả lại
            const returnOrders = allOrders.filter((order) => {
                const currentStatus = order.statusHistory && order.statusHistory.length > 0
                    ? order.statusHistory[order.statusHistory.length - 1]?.status
                    : null;
                return (order.returnRequest &&
                    order.returnRequest.status === "pending" &&
                    (currentStatus === "return_requested" || currentStatus === "returned"));
            });
            setOrders(returnOrders);
        }
        catch (err) {
            console.error("Lỗi khi tải đơn hàng trả lại:", err);
            toast.error(err.response?.data?.message || "Lỗi khi tải danh sách đơn hàng trả lại");
        }
        finally {
            setLoading(false);
        }
    };
    const handleConfirmReturnClick = (orderId) => {
        setConfirmReturn({ open: true, orderId });
    };
    const handleConfirmReturn = async () => {
        if (!confirmReturn.orderId)
            return;
        const orderId = confirmReturn.orderId;
        setConfirmReturn({ open: false, orderId: null });
        setProcessingId(orderId);
        try {
            await orderApi.confirmReturnReceived(orderId);
            toast.success(_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(CheckCircle, { className: "text-green-500", size: 18 }), _jsx("span", { children: "\u0110\u00E3 x\u00E1c nh\u1EADn thu h\u1ED3i s\u1EA3n ph\u1EA9m. Ti\u1EC1n \u0111\u00E3 \u0111\u01B0\u1EE3c ho\u00E0n l\u1EA1i cho ng\u01B0\u1EDDi mua." })] }), {
                containerId: "general-toast",
            });
            fetchReturnOrders(); // Reload danh sách
        }
        catch (err) {
            console.error("Lỗi xác nhận thu hồi:", err);
            const errorMessage = err.response?.data?.message
                || err.message
                || "Lỗi khi xác nhận thu hồi sản phẩm!";
            toast.error(_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(XCircle, { className: "text-red-500", size: 18 }), _jsx("span", { children: errorMessage })] }), {
                containerId: "general-toast",
            });
        }
        finally {
            setProcessingId(null);
        }
    };
    const handleRejectReturnClick = (orderId) => {
        setRejectReturn({ open: true, orderId, reason: "" });
    };
    const handleRejectReturn = async () => {
        if (!rejectReturn.orderId)
            return;
        const orderId = rejectReturn.orderId;
        const reason = rejectReturn.reason.trim();
        setRejectReturn({ open: false, orderId: null, reason: "" });
        setProcessingId(orderId);
        try {
            await orderApi.rejectReturn(orderId, reason || undefined);
            toast.success(_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(CheckCircle, { className: "text-green-500", size: 18 }), _jsx("span", { children: "\u0110\u00E3 t\u1EEB ch\u1ED1i y\u00EAu c\u1EA7u tr\u1EA3 l\u1EA1i h\u00E0ng" })] }), {
                containerId: "general-toast",
            });
            fetchReturnOrders(); // Reload danh sách
        }
        catch (err) {
            console.error("Lỗi từ chối yêu cầu:", err);
            const errorMessage = err.response?.data?.message
                || err.message
                || "Lỗi khi từ chối yêu cầu trả lại hàng!";
            toast.error(_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(XCircle, { className: "text-red-500", size: 18 }), _jsx("span", { children: errorMessage })] }), {
                containerId: "general-toast",
            });
        }
        finally {
            setProcessingId(null);
        }
    };
    const getStatusLabel = (status) => {
        const statusMap = {
            "return_requested": "Chờ thu hồi",
            "returned": "Đã thu hồi",
            "pending": "Chờ xử lý",
        };
        return statusMap[status] || status;
    };
    if (loading) {
        return (_jsxs("div", { className: "bg-white rounded-xl sm:rounded-2xl shadow-lg border-2 border-gray-100 p-8 sm:p-12 text-center", children: [_jsx("div", { className: "animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" }), _jsx("p", { className: "text-gray-600", children: "\u0110ang t\u1EA3i danh s\u00E1ch s\u1EA3n ph\u1EA9m thu h\u1ED3i..." })] }));
    }
    if (orders.length === 0) {
        return (_jsxs("div", { className: "bg-white rounded-xl sm:rounded-2xl shadow-lg border-2 border-gray-100 p-8 sm:p-12 text-center", children: [_jsx(RotateCcw, { className: "w-16 h-16 sm:w-24 sm:h-24 mx-auto mb-4 text-gray-400" }), _jsx("h3", { className: "text-xl sm:text-2xl font-bold text-gray-900 mb-2", children: "Ch\u01B0a c\u00F3 s\u1EA3n ph\u1EA9m thu h\u1ED3i" }), _jsx("p", { className: "text-gray-600", children: "Hi\u1EC7n t\u1EA1i kh\u00F4ng c\u00F3 \u0111\u01A1n h\u00E0ng n\u00E0o c\u1EA7n x\u1EED l\u00FD tr\u1EA3 l\u1EA1i" })] }));
    }
    return (_jsxs("div", { className: "space-y-4 sm:space-y-6", children: [_jsxs("div", { className: "bg-white rounded-xl sm:rounded-2xl shadow-lg border-2 border-gray-100 p-4 sm:p-6", children: [_jsxs("h2", { className: "text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3 mb-2", children: [_jsx(RotateCcw, { className: "w-5 h-5 sm:w-6 sm:h-6 text-orange-600" }), "Qu\u1EA3n l\u00FD s\u1EA3n ph\u1EA9m thu h\u1ED3i"] }), _jsx("p", { className: "text-gray-600 text-sm sm:text-base", children: "Danh s\u00E1ch c\u00E1c \u0111\u01A1n h\u00E0ng c\u00F3 y\u00EAu c\u1EA7u tr\u1EA3 l\u1EA1i. Vui l\u00F2ng x\u00E1c nh\u1EADn khi \u0111\u00E3 nh\u1EADn \u0111\u01B0\u1EE3c s\u1EA3n ph\u1EA9m." })] }), orders.map((order) => {
                const currentStatus = order.statusHistory && order.statusHistory.length > 0
                    ? order.statusHistory[order.statusHistory.length - 1]?.status
                    : null;
                return (_jsxs("div", { className: "bg-white rounded-xl sm:rounded-2xl shadow-lg border-2 border-orange-200 overflow-hidden animate-fade-in-up", children: [_jsx("div", { className: "bg-gradient-to-r from-orange-50 to-red-50 p-4 sm:p-6 border-b-2 border-orange-200", children: _jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0", children: [_jsxs("div", { children: [_jsxs("h3", { className: "text-lg sm:text-xl font-bold text-gray-900 mb-1", children: ["\u0110\u01A1n h\u00E0ng: ", order.orderCode] }), _jsxs("div", { className: "flex flex-wrap items-center gap-2 sm:gap-3 text-sm sm:text-base", children: [_jsx("span", { className: "px-2 sm:px-3 py-1 bg-orange-100 text-orange-700 rounded-lg font-semibold border border-orange-300", children: getStatusLabel(currentStatus || "pending") }), _jsxs("span", { className: "text-gray-600", children: ["T\u1ED5ng ti\u1EC1n: ", _jsxs("span", { className: "font-bold text-gray-900", children: [order.total.toLocaleString("vi-VN"), "\u20AB"] })] })] })] }), _jsx("button", { onClick: () => navigate(`/order/${order._id}`), className: "px-3 sm:px-4 py-2 text-sm sm:text-base font-semibold text-blue-600 hover:text-blue-700 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors", children: "Xem chi ti\u1EBFt" })] }) }), _jsxs("div", { className: "p-4 sm:p-6 space-y-4 sm:space-y-6", children: [_jsxs("div", { className: "bg-gray-50 rounded-lg p-3 sm:p-4", children: [_jsxs("h4", { className: "text-sm sm:text-base font-bold text-gray-900 mb-2 sm:mb-3 flex items-center gap-2", children: [_jsx(User, { className: "w-4 h-4 sm:w-5 sm:h-5" }), "Th\u00F4ng tin kh\u00E1ch h\u00E0ng"] }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-sm", children: [_jsxs("div", { children: [_jsx("span", { className: "text-gray-600", children: "T\u00EAn:" }), " ", _jsx("span", { className: "font-semibold text-gray-900", children: order.userId.fullName })] }), _jsxs("div", { children: [_jsx("span", { className: "text-gray-600", children: "Email:" }), " ", _jsx("span", { className: "font-semibold text-gray-900", children: order.userId.email })] }), _jsxs("div", { children: [_jsx("span", { className: "text-gray-600", children: "S\u0110T:" }), " ", _jsx("span", { className: "font-semibold text-gray-900", children: order.userId.phone })] }), _jsxs("div", { children: [_jsx("span", { className: "text-gray-600", children: "\u0110\u1ECBa ch\u1EC9:" }), " ", _jsx("span", { className: "font-semibold text-gray-900", children: order.shippingAddress.address })] })] })] }), order.returnRequest?.reason && (_jsxs("div", { className: "bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4", children: [_jsxs("h4", { className: "text-sm sm:text-base font-bold text-yellow-900 mb-2 flex items-center gap-2", children: [_jsx(Package, { className: "w-4 h-4 sm:w-5 sm:h-5" }), "L\u00FD do tr\u1EA3 l\u1EA1i"] }), _jsx("p", { className: "text-sm sm:text-base text-yellow-800", children: order.returnRequest.reason }), order.returnRequest.requestedAt && (_jsxs("p", { className: "text-xs sm:text-sm text-yellow-700 mt-2", children: ["Y\u00EAu c\u1EA7u v\u00E0o: ", new Date(order.returnRequest.requestedAt).toLocaleString("vi-VN")] }))] })), _jsxs("div", { children: [_jsxs("h4", { className: "text-sm sm:text-base font-bold text-gray-900 mb-3 flex items-center gap-2", children: [_jsx(Package, { className: "w-4 h-4 sm:w-5 sm:h-5" }), "S\u1EA3n ph\u1EA9m c\u1EA7n thu h\u1ED3i"] }), _jsx("div", { className: "space-y-2 sm:space-y-3", children: order.items.map((item) => (_jsxs("div", { className: "flex items-start gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 rounded-lg border border-gray-200", children: [item.imageUrl && (_jsx("img", { src: item.imageUrl.startsWith("/uploads") ? `http://localhost:5000${item.imageUrl}` : item.imageUrl, alt: item.name, className: "w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg border border-gray-300 flex-shrink-0" })), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: "font-semibold text-gray-900 text-sm sm:text-base mb-1", children: item.name }), item.variation && (_jsxs("div", { className: "flex flex-wrap gap-2 mb-1", children: [item.variation.color && (_jsxs("span", { className: "px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded border border-blue-300", children: ["M\u00E0u: ", item.variation.color] })), item.variation.size && (_jsxs("span", { className: "px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded border border-purple-300", children: ["Size: ", item.variation.size] }))] })), _jsxs("p", { className: "text-xs sm:text-sm text-gray-600", children: ["S\u1ED1 l\u01B0\u1EE3ng: ", _jsx("span", { className: "font-semibold", children: item.quantity }), " | Gi\u00E1:", " ", _jsxs("span", { className: "font-semibold", children: [(item.salePrice || item.price).toLocaleString("vi-VN"), "\u20AB"] })] })] })] }, item._id))) })] }), _jsxs("div", { className: "pt-3 sm:pt-4 border-t border-gray-200 space-y-3", children: [_jsxs("div", { className: "flex flex-col sm:flex-row gap-2 sm:gap-3", children: [_jsx("button", { onClick: () => handleConfirmReturnClick(order._id), disabled: processingId === order._id || order.returnRequest?.status !== "pending", className: `flex-1 px-4 sm:px-6 py-2.5 sm:py-3 text-white text-sm sm:text-base font-bold rounded-lg sm:rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-2 ${processingId === order._id || order.returnRequest?.status !== "pending"
                                                        ? "bg-gray-400 cursor-not-allowed"
                                                        : "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"}`, children: processingId === order._id ? (_jsxs(_Fragment, { children: [_jsx("span", { className: "w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin" }), _jsx("span", { children: "\u0110ang x\u1EED l\u00FD..." })] })) : (_jsxs(_Fragment, { children: [_jsx(CheckCircle, { size: 18, className: "sm:w-5 sm:h-5" }), _jsx("span", { children: "X\u00E1c nh\u1EADn \u0111\u00E3 thu h\u1ED3i" })] })) }), _jsxs("button", { onClick: () => handleRejectReturnClick(order._id), disabled: processingId === order._id || order.returnRequest?.status !== "pending", className: `flex-1 px-4 sm:px-6 py-2.5 sm:py-3 text-white text-sm sm:text-base font-bold rounded-lg sm:rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-2 ${processingId === order._id || order.returnRequest?.status !== "pending"
                                                        ? "bg-gray-400 cursor-not-allowed"
                                                        : "bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700"}`, children: [_jsx(XCircle, { size: 18, className: "sm:w-5 sm:h-5" }), _jsx("span", { children: "T\u1EEB ch\u1ED1i" })] })] }), _jsx("p", { className: "text-xs sm:text-sm text-gray-500 text-center", children: "X\u00E1c nh\u1EADn: Ti\u1EC1n s\u1EBD \u0111\u01B0\u1EE3c ho\u00E0n l\u1EA1i cho ng\u01B0\u1EDDi mua | T\u1EEB ch\u1ED1i: Y\u00EAu c\u1EA7u s\u1EBD b\u1ECB h\u1EE7y" })] })] })] }, order._id));
            }), _jsx(ConfirmDialog, { open: confirmReturn.open, onClose: () => setConfirmReturn({ open: false, orderId: null }), onConfirm: handleConfirmReturn, title: "X\u00E1c nh\u1EADn thu h\u1ED3i s\u1EA3n ph\u1EA9m", message: "B\u1EA1n \u0111\u00E3 nh\u1EADn \u0111\u01B0\u1EE3c s\u1EA3n ph\u1EA9m tr\u1EA3 l\u1EA1i? X\u00E1c nh\u1EADn s\u1EBD ho\u00E0n ti\u1EC1n cho ng\u01B0\u1EDDi mua.", type: "info", loading: processingId !== null, confirmText: "X\u00E1c nh\u1EADn" }), rejectReturn.open && createPortal(_jsx("div", { className: "fixed inset-0 z-[99999] flex items-center justify-center bg-black/70 backdrop-blur-md p-4", style: {
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    width: '100vw',
                    height: '100vh',
                }, onClick: (e) => {
                    if (e.target === e.currentTarget && processingId === null) {
                        setRejectReturn({ open: false, orderId: null, reason: "" });
                    }
                }, children: _jsxs("div", { className: "bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-md animate-scale-in", onClick: (e) => e.stopPropagation(), children: [_jsx("div", { className: "p-4 sm:p-6 border-b-2 border-gray-200", children: _jsxs("h3", { className: "text-lg sm:text-xl font-bold text-gray-900 flex items-center gap-2", children: [_jsx(XCircle, { className: "w-5 h-5 sm:w-6 sm:h-6 text-red-500" }), "T\u1EEB ch\u1ED1i y\u00EAu c\u1EA7u tr\u1EA3 l\u1EA1i h\u00E0ng"] }) }), _jsxs("div", { className: "p-4 sm:p-6", children: [_jsxs("label", { className: "block text-sm font-semibold text-gray-700 mb-2", children: ["L\u00FD do t\u1EEB ch\u1ED1i ", _jsx("span", { className: "text-gray-500", children: "(t\u00F9y ch\u1ECDn)" })] }), _jsx("textarea", { value: rejectReturn.reason, onChange: (e) => setRejectReturn({ ...rejectReturn, reason: e.target.value }), placeholder: "Nh\u1EADp l\u00FD do t\u1EEB ch\u1ED1i y\u00EAu c\u1EA7u tr\u1EA3 l\u1EA1i h\u00E0ng (v\u00ED d\u1EE5: S\u1EA3n ph\u1EA9m kh\u00F4ng \u0111\u00FAng v\u1EDBi m\u00F4 t\u1EA3 ban \u0111\u1EA7u, \u0111\u00E3 qua th\u1EDDi h\u1EA1n \u0111\u1ED5i tr\u1EA3, v.v.)", className: "w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-red-500 resize-none", rows: 4, maxLength: 500 }), _jsxs("p", { className: "text-xs text-gray-500 mt-1 text-right", children: [rejectReturn.reason.length, "/500 k\u00FD t\u1EF1"] })] }), _jsxs("div", { className: "p-4 sm:p-6 border-t-2 border-gray-200 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3", children: [_jsx("button", { onClick: () => setRejectReturn({ open: false, orderId: null, reason: "" }), disabled: processingId !== null, className: "w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-gray-200 text-gray-700 rounded-lg sm:rounded-xl font-semibold hover:bg-gray-300 transition-colors text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed", children: "H\u1EE7y" }), _jsxs("button", { onClick: handleRejectReturn, disabled: processingId !== null, className: "w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-lg sm:rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2", children: [processingId !== null && (_jsx("div", { className: "w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" })), "T\u1EEB ch\u1ED1i"] })] })] }) }), document.body)] }));
};
export default ReturnManagement;
