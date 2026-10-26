import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Package, Star, Eye, ShoppingBag, Calendar, CheckCircle, RotateCcw, XCircle } from "lucide-react";
import ConfirmDialog from "../../ui/ConfirmDialog";
import reviewApi from "../../../api/apiReview";
import orderApi from "../../../api/orderApi";
import { toast } from "react-toastify";
const ProfileOrders = ({ orders, loading, onReview, }) => {
    const navigate = useNavigate();
    // LOG debug props nhận được (chỉ trong dev mode)
    if (import.meta.env.DEV) {
        console.group("[ProfileOrders] Render Component");
        console.log("Props.orders:", orders);
        console.log("Props.loading:", loading);
        console.log("Số lượng orders:", orders?.length || 0);
        console.groupEnd();
    }
    // state chứa reviews theo productId
    const [reviews, setReviews] = useState({});
    // Track các productId đã fetch để tránh fetch trùng lặp
    const fetchedProductIdsRef = useRef(new Set());
    // State cho modal trả lại hàng
    const [showReturnModal, setShowReturnModal] = useState(null);
    const [returnReason, setReturnReason] = useState("");
    const [processingReturn, setProcessingReturn] = useState(null);
    // State cho confirm dialogs
    const [cancelConfirm, setCancelConfirm] = useState({ open: false, orderId: null });
    const [receiveConfirm, setReceiveConfirm] = useState({ open: false, orderId: null });
    // fetch reviews theo productId
    const fetchReviews = async (productId) => {
        if (!productId || fetchedProductIdsRef.current.has(productId))
            return;
        // Đánh dấu đã fetch
        fetchedProductIdsRef.current.add(productId);
        try {
            if (import.meta.env.DEV) {
                console.log("Gọi API review cho productId:", productId);
            }
            const res = await reviewApi.getReviewsByProduct(productId);
            if (import.meta.env.DEV) {
                console.log("Review data:", res.data);
            }
            setReviews((prev) => ({ ...prev, [productId]: res.data }));
        }
        catch (err) {
            // Chỉ log lỗi thực sự, không log 404 hoặc lỗi không quan trọng
            if (err.response?.status !== 404) {
                console.error("Lỗi fetch reviews:", err);
            }
            // Nếu lỗi, remove khỏi set để có thể retry sau
            fetchedProductIdsRef.current.delete(productId);
        }
    };
    // khi có orders thì fetch review cho từng product
    useEffect(() => {
        // Chỉ xử lý khi không đang loading và có orders
        if (loading || !orders || orders.length === 0) {
            return;
        }
        if (import.meta.env.DEV) {
            console.log("useEffect chạy — orders thay đổi:", orders);
        }
        // Collect unique product IDs để tránh fetch trùng lặp
        const productIds = new Set();
        orders.forEach((order) => {
            if (order.items && order.items.length > 0) {
                order.items.forEach((item) => {
                    if (item.productId) {
                        productIds.add(item.productId);
                    }
                });
            }
        });
        // Fetch reviews cho các product chưa fetch
        productIds.forEach((productId) => {
            fetchReviews(productId);
        });
    }, [orders, loading]); // eslint-disable-line react-hooks/exhaustive-deps
    const getShippingStatus = (history) => {
        if (!history || history.length === 0)
            return "Chờ xác nhận";
        const latest = history[history.length - 1].status;
        const map = {
            pending: "Chờ xác nhận",
            confirmed: "Đã xác nhận",
            packed: "Đã đóng gói",
            shipped: "Đang giao hàng",
            delivered: "Đã giao hàng",
            received: "Đã nhận hàng",
            cancelled: "Đã hủy đơn",
            return_requested: "Đã yêu cầu trả lại",
            returned: "Đã trả lại",
        };
        return map[latest] || latest;
    };
    // Kiểm tra xem có thể yêu cầu trả lại không
    const canRequestReturn = (order) => {
        const currentStatus = order.statusHistory && order.statusHistory.length > 0
            ? order.statusHistory[order.statusHistory.length - 1]?.status
            : null;
        // Chỉ cho phép khi đã nhận hàng và chưa có yêu cầu trả lại
        if (currentStatus !== "received")
            return false;
        if (order.returnRequest && order.returnRequest.status)
            return false;
        // Kiểm tra trong vòng 3 ngày
        const receivedStatus = order.statusHistory.find(s => s.status === "received");
        if (!receivedStatus)
            return false;
        const receivedDate = new Date(receivedStatus.timestamp);
        const now = new Date();
        const daysDiff = Math.floor((now.getTime() - receivedDate.getTime()) / (1000 * 60 * 60 * 24));
        return daysDiff <= 3;
    };
    // Kiểm tra xem có thể hủy đơn không
    const canCancelOrder = (order) => {
        const currentStatus = order.statusHistory && order.statusHistory.length > 0
            ? order.statusHistory[order.statusHistory.length - 1]?.status
            : null;
        // Chỉ cho phép hủy khi status là pending, confirmed, packed
        return ["pending", "confirmed", "packed"].includes(currentStatus || "");
    };
    // Xử lý hủy đơn hàng
    const handleCancelOrderClick = (orderId) => {
        setCancelConfirm({ open: true, orderId });
    };
    const handleCancelOrder = async () => {
        if (!cancelConfirm.orderId)
            return;
        const orderId = cancelConfirm.orderId;
        setCancelConfirm({ open: false, orderId: null });
        try {
            await orderApi.cancelOrder(orderId, "Khách hàng yêu cầu hủy đơn hàng");
            toast.success(_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(CheckCircle, { className: "text-green-500", size: 18 }), _jsx("span", { children: "\u0110\u01A1n h\u00E0ng \u0111\u00E3 \u0111\u01B0\u1EE3c h\u1EE7y th\u00E0nh c\u00F4ng!" })] }));
            window.location.reload(); // Reload để cập nhật trạng thái
        }
        catch (err) {
            console.error("Lỗi hủy đơn hàng:", err);
            const errorMessage = err.response?.data?.message
                || err.message
                || "Lỗi khi hủy đơn hàng!";
            toast.error(_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(CheckCircle, { className: "text-red-500", size: 18 }), _jsx("span", { children: errorMessage })] }));
        }
    };
    // Xử lý yêu cầu trả lại hàng
    const handleRequestReturn = async (orderId) => {
        const trimmedReason = returnReason.trim();
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
        setProcessingReturn(orderId);
        try {
            await orderApi.requestReturn(orderId, trimmedReason);
            toast.success(_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(CheckCircle, { className: "text-green-500", size: 18 }), _jsx("span", { children: "Y\u00EAu c\u1EA7u tr\u1EA3 l\u1EA1i h\u00E0ng \u0111\u00E3 \u0111\u01B0\u1EE3c g\u1EEDi th\u00E0nh c\u00F4ng!" })] }), {
                containerId: "general-toast",
            });
            setShowReturnModal(null);
            setReturnReason("");
            window.location.reload(); // Reload để cập nhật trạng thái
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
            setProcessingReturn(null);
        }
    };
    // LOG logic hiển thị
    if (loading) {
        return (_jsxs("div", { className: "p-6 md:p-8 text-center animate-fade-in", children: [_jsx(Package, { size: 40, className: "mx-auto mb-3 md:mb-4 animate-pulse text-[#4B5563]" }), _jsx("p", { className: "text-gray-600 text-sm md:text-base lg:text-lg font-medium", children: "\u0110ang t\u1EA3i \u0111\u01A1n h\u00E0ng..." })] }));
    }
    if (!orders || orders.length === 0) {
        return (_jsxs("div", { className: "bg-white rounded-xl md:rounded-2xl shadow-lg border-2 border-gray-200 p-6 md:p-8 lg:p-12 text-center animate-fade-in", children: [_jsx(Package, { size: 48, className: "mx-auto mb-3 md:mb-4 text-[#4B5563]" }), _jsx("h3", { className: "text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-2", children: "Ch\u01B0a c\u00F3 \u0111\u01A1n h\u00E0ng n\u00E0o" }), _jsx("p", { className: "text-gray-500 text-sm md:text-base mb-4 md:mb-6", children: "B\u1EAFt \u0111\u1EA7u mua s\u1EAFm ngay h\u00F4m nay!" }), _jsxs("button", { onClick: () => navigate("/products"), className: "px-6 md:px-8 py-2.5 md:py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg md:rounded-xl font-bold text-xs sm:text-sm md:text-base hover:from-blue-600 hover:to-purple-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center gap-2 mx-auto", children: [_jsx(ShoppingBag, { size: 16, className: "md:w-[18px] md:h-[18px]" }), " Mua s\u1EAFm ngay"] })] }));
    }
    return (_jsxs("div", { className: "space-y-4 md:space-y-6", children: [_jsxs("div", { className: "bg-white rounded-xl md:rounded-2xl shadow-lg border-2 border-gray-200 p-4 md:p-6 lg:p-8 animate-fade-in-up", children: [_jsxs("h3", { className: "text-lg sm:text-xl md:text-2xl font-bold text-[#4B5563] flex items-center gap-2 md:gap-3 mb-4 md:mb-6", children: [_jsx(Package, { size: 20, className: "text-[#4B5563]" }), " L\u1ECBch s\u1EED \u0111\u01A1n h\u00E0ng"] }), orders.map((order, index) => (_jsx("div", { className: "border-2 border-gray-200 rounded-lg md:rounded-xl p-4 md:p-6 mb-4 md:mb-6 bg-gradient-to-br from-white to-gray-50 hover:shadow-lg transition-all duration-300 animate-fade-in-up last:mb-0", style: { animationDelay: `${index * 0.1}s` }, children: _jsxs("div", { className: "flex flex-col md:flex-row justify-between gap-4 md:gap-6", children: [_jsxs("div", { className: "flex-1 min-w-0", children: [_jsxs("div", { className: "flex flex-col sm:flex-row items-start sm:items-center gap-2 md:gap-3 mb-3 md:mb-4", children: [_jsxs("span", { className: "text-sm sm:text-base md:text-lg font-bold text-gray-900 truncate", children: ["\u0110\u01A1n h\u00E0ng #", order._id.slice(-8).toUpperCase()] }), _jsxs("span", { className: "text-xs md:text-sm text-gray-500 bg-gray-100 px-2 md:px-3 py-1 rounded-full flex items-center gap-1.5 md:gap-2 flex-shrink-0", children: [_jsx(Calendar, { size: 12, className: "md:w-3.5 md:h-3.5" }), " ", order.date] })] }), _jsx("div", { className: "space-y-2 md:space-y-4", children: order.items.map((item, idx) => (_jsxs("div", { className: "flex items-center gap-2 md:gap-4 p-3 md:p-4 bg-white rounded-lg md:rounded-xl border border-gray-200 hover:border-[#4B5563] transition-all duration-300", children: [_jsx("div", { className: "relative flex-shrink-0", children: _jsx("img", { src: item.imgUrl || "/visual-placeholder.svg", alt: item.name, className: "w-16 h-16 md:w-20 md:h-20 rounded-lg md:rounded-xl object-cover border-2 border-gray-200", loading: "lazy" }) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("div", { className: "text-xs sm:text-sm md:text-base font-bold text-gray-900 mb-1 line-clamp-2", children: item.name }), _jsxs("div", { className: "text-[10px] sm:text-xs md:text-sm text-gray-600", children: ["S\u1ED1 l\u01B0\u1EE3ng: ", _jsx("span", { className: "font-bold text-[#4B5563]", children: item.qty }), " x ", _jsx("span", { className: "font-bold", children: item.price })] })] })] }, `${item.productId}-${idx}`))) })] }), _jsxs("div", { className: "flex flex-col sm:flex-row md:flex-col items-start sm:items-end md:items-end gap-3 md:gap-4 sm:min-w-[200px] md:min-w-[250px]", children: [_jsx("div", { className: "text-xl sm:text-2xl font-extrabold text-[#4B5563] mb-1 md:mb-2", children: order.total }), _jsxs("span", { className: "px-3 md:px-4 py-1.5 md:py-2 bg-[#4B5563]/10 text-[#4B5563] rounded-full text-xs md:text-sm font-bold border-2 border-[#4B5563]/40 whitespace-nowrap", children: ["\u2713 ", getShippingStatus(order.statusHistory)] }), _jsxs("div", { className: "flex flex-col gap-2 w-full sm:w-auto md:w-full", children: [getShippingStatus(order.statusHistory) === "Đã nhận hàng" ? (_jsxs(_Fragment, { children: [order.items.map((item) => (_jsxs("button", { onClick: () => onReview(item.productId, order._id), className: "w-full px-3 md:px-4 py-1.5 md:py-2 bg-[#4B5563] text-white rounded-lg md:rounded-xl text-xs md:text-sm font-bold hover:bg-[#374151] transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-1.5 md:gap-2", children: [_jsx(Star, { size: 14, className: "md:w-4 md:h-4" }), " \u0110\u00E1nh gi\u00E1"] }, item.productId))), canRequestReturn(order) && (_jsxs("button", { onClick: () => setShowReturnModal(order._id), className: "w-full px-3 md:px-4 py-1.5 md:py-2 bg-[#4B5563] text-white rounded-lg md:rounded-xl text-xs md:text-sm font-bold hover:bg-[#374151] transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-1.5 md:gap-2", children: [_jsx(RotateCcw, { size: 14, className: "md:w-4 md:h-4" }), " Y\u00EAu c\u1EA7u tr\u1EA3 l\u1EA1i h\u00E0ng"] })), order.returnRequest && order.returnRequest.status && (_jsxs("div", { className: "w-full px-3 md:px-4 py-1.5 md:py-2 bg-gray-100 border-2 border-gray-300 rounded-lg md:rounded-xl text-xs md:text-sm font-semibold text-gray-700 text-center", children: [order.returnRequest.status === "pending" && "⏳ Đang chờ xử lý", order.returnRequest.status === "approved" && "✅ Đã được phê duyệt", order.returnRequest.status === "rejected" && "❌ Đã bị từ chối", order.returnRequest.status === "completed" && "✅ Đã hoàn tất"] }))] })) : getShippingStatus(order.statusHistory) === "Đã giao hàng" ? (_jsxs("button", { onClick: () => setReceiveConfirm({ open: true, orderId: order._id }), className: "w-full px-3 md:px-4 py-1.5 md:py-2 bg-[#4B5563] text-white rounded-lg md:rounded-xl text-xs md:text-sm font-bold hover:bg-[#374151] transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-1.5 md:gap-2", children: [_jsx(CheckCircle, { size: 14, className: "md:w-4 md:h-4" }), " \u0110\u00E3 nh\u1EADn h\u00E0ng"] })) : canCancelOrder(order) ? (_jsxs(_Fragment, { children: [_jsxs("button", { onClick: () => handleCancelOrderClick(order._id), className: "w-full px-3 md:px-4 py-1.5 md:py-2 bg-[#4B5563] text-white rounded-lg md:rounded-xl text-xs md:text-sm font-bold hover:bg-[#374151] transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-1.5 md:gap-2", children: [_jsx(XCircle, { size: 14, className: "md:w-4 md:h-4" }), " H\u1EE7y \u0111\u01A1n h\u00E0ng"] }), _jsxs("button", { onClick: () => navigate(`/order/${order._id}`), className: "w-full px-3 md:px-4 py-1.5 md:py-2 border-2 border-gray-300 text-gray-700 rounded-lg md:rounded-xl text-xs md:text-sm font-bold hover:bg-gray-50 hover:border-gray-400 transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-1.5 md:gap-2", children: [_jsx(Eye, { size: 14, className: "md:w-4 md:h-4" }), " Xem chi ti\u1EBFt"] })] })) : (_jsxs("button", { onClick: () => navigate(`/order/${order._id}`), className: "w-full px-3 md:px-4 py-1.5 md:py-2 border-2 border-gray-300 text-gray-700 rounded-lg md:rounded-xl text-xs md:text-sm font-bold hover:bg-gray-50 hover:border-gray-400 transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-1.5 md:gap-2", children: [_jsx(Eye, { size: 14, className: "md:w-4 md:h-4" }), " Xem chi ti\u1EBFt"] })), order.items[0]?.productId && (_jsx("button", { onClick: () => navigate(`/products/${order.items[0].productId}`), className: "w-full px-3 md:px-4 py-1.5 md:py-2 bg-white border-2 border-[#4B5563]/60 text-[#4B5563] rounded-lg md:rounded-xl text-xs md:text-sm font-bold hover:bg-[#4B5563]/5 transition-all duration-300 transform hover:scale-105", children: "\uD83D\uDED2 Mua l\u1EA1i" }))] })] })] }) }, order._id || index)))] }), showReturnModal && (_jsx("div", { className: "fixed inset-0 flex items-center justify-center z-50 p-4", style: { backgroundColor: 'rgba(0, 0, 0, 0.5)' }, children: _jsxs("div", { className: "bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-md w-full p-6 animate-fade-in-up", children: [_jsx("h3", { className: "text-xl sm:text-2xl font-bold text-gray-900 mb-4", children: "Y\u00EAu c\u1EA7u tr\u1EA3 l\u1EA1i h\u00E0ng" }), _jsxs("div", { className: "mb-4", children: [_jsxs("label", { className: "block text-sm font-semibold text-gray-700 mb-2", children: ["L\u00FD do tr\u1EA3 l\u1EA1i h\u00E0ng ", _jsx("span", { className: "text-red-500", children: "*" })] }), _jsx("textarea", { value: returnReason, onChange: (e) => setReturnReason(e.target.value), placeholder: "Vui l\u00F2ng nh\u1EADp l\u00FD do tr\u1EA3 l\u1EA1i h\u00E0ng (v\u00ED d\u1EE5: S\u1EA3n ph\u1EA9m kh\u00F4ng \u0111\u00FAng m\u00F4 t\u1EA3, b\u1ECB l\u1ED7i, kh\u00F4ng v\u1EEBa, v.v.)", className: "w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 resize-none", rows: 4, maxLength: 500 }), _jsxs("div", { className: "mt-1 flex justify-between items-center", children: [_jsx("p", { className: "text-xs text-gray-500", children: returnReason.length < 10 ? (_jsxs("span", { className: "text-orange-600", children: ["C\u1EA7n \u00EDt nh\u1EA5t 10 k\u00FD t\u1EF1 (c\u00F2n ", 10 - returnReason.length, " k\u00FD t\u1EF1)"] })) : (_jsx("span", { className: "text-gray-500", children: "\u0110\u1ED9 d\u00E0i h\u1EE3p l\u1EC7" })) }), _jsxs("p", { className: "text-xs text-gray-500", children: [returnReason.length, "/500 k\u00FD t\u1EF1"] })] }), _jsx("p", { className: "text-xs text-gray-500 mt-2", children: "\u26A0\uFE0F B\u1EA1n ch\u1EC9 c\u00F3 th\u1EC3 y\u00EAu c\u1EA7u tr\u1EA3 l\u1EA1i h\u00E0ng trong v\u00F2ng 3 ng\u00E0y k\u1EC3 t\u1EEB ng\u00E0y nh\u1EADn h\u00E0ng" })] }), _jsxs("div", { className: "flex gap-3", children: [_jsx("button", { onClick: () => {
                                        setShowReturnModal(null);
                                        setReturnReason("");
                                    }, disabled: processingReturn === showReturnModal, className: "flex-1 px-4 py-2.5 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50", children: "H\u1EE7y" }), _jsx("button", { onClick: () => handleRequestReturn(showReturnModal), disabled: processingReturn === showReturnModal || !returnReason.trim() || returnReason.trim().length < 10, className: `flex-1 px-4 py-2.5 text-white font-semibold rounded-lg transition-all ${processingReturn === showReturnModal || !returnReason.trim() || returnReason.trim().length < 10
                                        ? "bg-gray-400 cursor-not-allowed"
                                        : "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"}`, children: processingReturn === showReturnModal ? (_jsxs("span", { className: "flex items-center justify-center gap-2", children: [_jsx("span", { className: "w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" }), "\u0110ang g\u1EEDi..."] })) : ("Gửi yêu cầu") })] })] }) })), _jsx(ConfirmDialog, { open: cancelConfirm.open, onClose: () => setCancelConfirm({ open: false, orderId: null }), onConfirm: handleCancelOrder, title: "X\u00E1c nh\u1EADn h\u1EE7y \u0111\u01A1n h\u00E0ng", message: "B\u1EA1n c\u00F3 ch\u1EAFc ch\u1EAFn mu\u1ED1n h\u1EE7y \u0111\u01A1n h\u00E0ng n\u00E0y? H\u00E0nh \u0111\u1ED9ng n\u00E0y kh\u00F4ng th\u1EC3 ho\u00E0n t\u00E1c.", type: "danger", confirmText: "H\u1EE7y \u0111\u01A1n h\u00E0ng" }), _jsx(ConfirmDialog, { open: receiveConfirm.open, onClose: () => setReceiveConfirm({ open: false, orderId: null }), onConfirm: async () => {
                    if (!receiveConfirm.orderId)
                        return;
                    const orderId = receiveConfirm.orderId;
                    setReceiveConfirm({ open: false, orderId: null });
                    try {
                        const response = await orderApi.confirmDelivery(orderId);
                        toast.success("Xác nhận nhận hàng thành công!");
                        window.location.reload();
                    }
                    catch (err) {
                        console.error("Lỗi xác nhận nhận hàng:", err);
                        const errorMessage = err.response?.data?.message
                            || err.message
                            || "Lỗi khi xác nhận nhận hàng!";
                        toast.error(`Lỗi: ${errorMessage}`);
                    }
                }, title: "X\u00E1c nh\u1EADn nh\u1EADn h\u00E0ng", message: "B\u1EA1n \u0111\u00E3 nh\u1EADn \u0111\u01B0\u1EE3c h\u00E0ng? X\u00E1c nh\u1EADn s\u1EBD chuy\u1EC3n \u0111\u01A1n h\u00E0ng sang tr\u1EA1ng th\u00E1i '\u0110\u00E3 nh\u1EADn h\u00E0ng' v\u00E0 b\u1EA1n c\u00F3 th\u1EC3 \u0111\u00E1nh gi\u00E1 s\u1EA3n ph\u1EA9m.", type: "info", confirmText: "X\u00E1c nh\u1EADn" })] }));
};
export default ProfileOrders;
