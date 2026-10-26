import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useParams } from "react-router-dom";
import { Star, Package, X, XCircle, CheckCircle, ArrowRight } from "lucide-react";
import { toast } from "react-toastify";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import OrderStatus from "../../components/Order/OrderStatus/OrderStatus";
import OrderProduct from "../../components/Order/OrderProduct/OrderProduct";
import PaymentInfo from "../../components/Order/PaymentInfo/PaymentInfo";
import CustomerInfo from "../../components/Order/CustomerInfo/CustomerInfo";
import ShippingInfo from "../../components/Order/ShippingInfo/ShippingInfo";
import OrderUpdate from "../../components/Order/OrderUpdate/OrderUpdate";
import BuyerConfirmDelivery from "../../components/Order/BuyerConfirmDelivery/BuyerConfirmDelivery";
import ReturnRequest from "../../components/Order/ReturnRequest/ReturnRequest";
import ProductReview from "../Review/Review";
import orderApi from "../../api/orderApi";
import axiosClient from "../../api/axiosClient";
export default function OrderPage() {
    const { orderId } = useParams();
    const [order, setOrder] = useState(null);
    const [storeInfo, setStoreInfo] = useState(null);
    const [myStoreId, setMyStoreId] = useState(null);
    const [isSeller, setIsSeller] = useState(false);
    const [loading, setLoading] = useState(true);
    const [reviewProductId, setReviewProductId] = useState(null);
    const [reviewOrderId, setReviewOrderId] = useState(null);
    const [showCancelConfirm, setShowCancelConfirm] = useState(false);
    const [showPaymentSuccess, setShowPaymentSuccess] = useState(false); // ✅ Popup thông tin thanh toán
    const [paymentInfo, setPaymentInfo] = useState(null); // ✅ Thông tin thanh toán
    // Fetch user profile từ API để lấy role và store info chính xác
    useEffect(() => {
        const fetchUserProfile = async () => {
            try {
                const res = await axiosClient.get("/api/users/profile");
                const profile = res.data.user || res.data;
                // Kiểm tra role
                const userRole = profile.role || "buyer";
                setIsSeller(userRole === "seller");
                // Nếu là seller, fetch store info
                if (userRole === "seller") {
                    try {
                        const storeRes = await axiosClient.get("/api/stores/me");
                        setMyStoreId(storeRes.data.store?._id || null);
                    }
                    catch (storeErr) {
                        console.error("Lỗi fetch store:", storeErr);
                        setMyStoreId(null);
                    }
                }
            }
            catch (err) {
                console.error("Lỗi fetch user profile:", err);
                setIsSeller(false);
            }
        };
        fetchUserProfile();
    }, []);
    useEffect(() => {
        if (!orderId)
            return;
        const fetchOrder = async () => {
            setLoading(true);
            try {
                const { data } = await orderApi.getOrderById(orderId);
                const estimatedDelivery = typeof data.shippingInfo?.estimatedDelivery === "number"
                    ? data.shippingInfo.estimatedDelivery
                    : data.shippingInfo?.estimatedDelivery?.$date?.$numberLong
                        ? parseInt(data.shippingInfo.estimatedDelivery.$date.$numberLong)
                        : Date.now();
                const mappedOrder = {
                    ...data,
                    shippingInfo: {
                        method: data.shippingInfo?.method || "Chưa xác định",
                        estimatedDelivery,
                        trackingNumber: data.shippingInfo?.trackingNumber || "",
                    },
                };
                setOrder(mappedOrder);
                // Lấy thông tin store
                if (mappedOrder.items.length > 0) {
                    const storeId = mappedOrder.items[0].storeId;
                    // storeId có thể là string hoặc object có _id
                    const storeIdString = typeof storeId === 'string'
                        ? storeId
                        : (storeId?._id || storeId);
                    // Nếu là người mua → luôn lấy thông tin store để hiển thị
                    // Nếu là seller → cũng cần để so sánh xem có phải chủ hàng không
                    if (storeIdString) {
                        try {
                            const storeRes = await axiosClient.get(`/api/stores/${storeIdString}`);
                            const owner = storeRes.data.store.owner;
                            setStoreInfo({
                                name: storeRes.data.store.name,
                                email: owner?.email || storeRes.data.store.contactEmail || "",
                                phone: owner?.phone || storeRes.data.store.contactPhone || "",
                                logoUrl: storeRes.data.store.logoUrl || "/visual-placeholder.svg",
                                ownerId: owner?._id || owner?.id || null, // Lưu ownerId để nhắn tin
                            });
                        }
                        catch (err) {
                            console.error("Lỗi fetch store info:", err);
                        }
                    }
                }
            }
            catch (err) {
                console.error("Lỗi fetch order:", err);
            }
            finally {
                setLoading(false);
            }
        };
        fetchOrder();
    }, [orderId, isSeller, myStoreId]);
    // ✅ Kiểm tra và hiển thị popup thông tin thanh toán tự động
    useEffect(() => {
        if (!orderId || loading || !order)
            return;
        const paymentSuccessData = localStorage.getItem("walletPaymentSuccess");
        if (paymentSuccessData) {
            try {
                const paymentData = JSON.parse(paymentSuccessData);
                // Kiểm tra xem có phải đơn hàng này không và thời gian không quá 5 phút
                const timeDiff = Date.now() - (paymentData.timestamp || 0);
                if (paymentData.orderCode === order.orderCode && timeDiff < 5 * 60 * 1000) {
                    setPaymentInfo(paymentData);
                    setShowPaymentSuccess(true);
                    // Xóa localStorage sau khi hiển thị
                    localStorage.removeItem("walletPaymentSuccess");
                }
                else {
                    // Xóa nếu không khớp hoặc quá cũ
                    localStorage.removeItem("walletPaymentSuccess");
                }
            }
            catch (err) {
                console.error("Lỗi parse payment success data:", err);
                localStorage.removeItem("walletPaymentSuccess");
            }
        }
    }, [orderId, order, loading]);
    if (loading) {
        return (_jsx("div", { className: "w-full py-12 sm:py-16 flex items-center justify-center animate-fade-in px-4", children: _jsxs("div", { className: "text-center", children: [_jsx(Package, { className: "w-16 h-16 sm:w-24 sm:h-24 mx-auto mb-3 sm:mb-4 animate-pulse text-gray-400" }), _jsx("p", { className: "text-gray-600 text-base sm:text-lg font-medium", children: "\u0110ang t\u1EA3i th\u00F4ng tin \u0111\u01A1n h\u00E0ng..." })] }) }));
    }
    if (!order) {
        return (_jsx("div", { className: "w-full py-12 sm:py-16 flex items-center justify-center animate-fade-in px-4", children: _jsxs("div", { className: "text-center bg-white rounded-xl sm:rounded-2xl shadow-lg border-2 border-gray-200 p-8 sm:p-12 max-w-md w-full", children: [_jsx(X, { className: "w-16 h-16 sm:w-24 sm:h-24 mx-auto mb-3 sm:mb-4 text-red-500" }), _jsx("p", { className: "text-red-500 text-base sm:text-lg font-medium", children: "Kh\u00F4ng l\u1EA5y \u0111\u01B0\u1EE3c th\u00F4ng tin \u0111\u01A1n h\u00E0ng" })] }) }));
    }
    const currentStatus = order.statusHistory.at(-1)?.status || "pending";
    // Kiểm tra xem có phải là chủ hàng của order này không
    const orderStoreIdRaw = order.items[0]?.storeId;
    // storeId có thể là string hoặc object có _id
    const orderStoreId = typeof orderStoreIdRaw === 'string'
        ? orderStoreIdRaw
        : (orderStoreIdRaw?._id || orderStoreIdRaw);
    const isOwnerSeller = isSeller &&
        myStoreId &&
        orderStoreId &&
        String(orderStoreId) === String(myStoreId);
    // Kiểm tra xem có thể hủy đơn không (chỉ khi status là pending, confirmed, packed)
    const canCancelOrder = !isOwnerSeller && ["pending", "confirmed", "packed"].includes(currentStatus);
    // Xử lý hủy đơn hàng
    const handleCancelOrderClick = () => {
        setShowCancelConfirm(true);
    };
    const handleCancelOrder = async () => {
        setShowCancelConfirm(false);
        try {
            await orderApi.cancelOrder(order._id, "Khách hàng yêu cầu hủy đơn hàng");
            toast.success(_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(XCircle, { className: "text-green-500", size: 18 }), _jsx("span", { children: "\u0110\u01A1n h\u00E0ng \u0111\u00E3 \u0111\u01B0\u1EE3c h\u1EE7y th\u00E0nh c\u00F4ng!" })] }));
            // Reload order sau khi hủy
            const res = await orderApi.getOrderById(order._id);
            const data = res.data;
            const estimatedDelivery = typeof data.shippingInfo?.estimatedDelivery === "number"
                ? data.shippingInfo.estimatedDelivery
                : data.shippingInfo?.estimatedDelivery?.$date?.$numberLong
                    ? parseInt(data.shippingInfo.estimatedDelivery.$date.$numberLong)
                    : Date.now();
            const mappedOrder = {
                ...data,
                shippingInfo: {
                    method: data.shippingInfo?.method || "Chưa xác định",
                    estimatedDelivery,
                    trackingNumber: data.shippingInfo?.trackingNumber || "",
                },
            };
            setOrder(mappedOrder);
        }
        catch (err) {
            console.error("Lỗi hủy đơn hàng:", err);
            const errorMessage = err.response?.data?.message
                || err.message
                || "Lỗi khi hủy đơn hàng!";
            toast.error(_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(XCircle, { className: "text-red-500", size: 18 }), _jsx("span", { children: errorMessage })] }));
        }
    };
    // Debug log để kiểm tra
    console.log("🔍 Debug Order Info:", {
        isSeller,
        myStoreId,
        orderStoreId,
        orderStoreIdRaw,
        isOwnerSeller,
        hasStoreInfo: !!storeInfo,
        hasUserInfo: !!order.userInfo,
        comparison: orderStoreId && myStoreId ? String(orderStoreId) === String(myStoreId) : false,
        userInfo: order.userInfo,
    });
    // Logic hiển thị thông tin:
    // - Nếu là chủ hàng (isOwnerSeller) → hiển thị thông tin người mua (order.userInfo)
    // - Nếu là người mua (không phải seller) → hiển thị thông tin người bán (storeInfo)
    const displayedUser = isOwnerSeller
        ? {
            // Chủ hàng xem thông tin người mua
            fullName: order.userInfo?.fullName || "Khách hàng",
            email: order.userInfo?.email || "",
            phone: order.userInfo?.phone || "",
            role: "Khách hàng",
            avatarUrl: order.userInfo?.avatarUrl || "/avatar-placeholder.svg",
            userId: order.userInfo?._id || order.userId || "", // ID người mua để nhắn tin
        }
        : {
            // Người mua xem thông tin người bán (store)
            fullName: storeInfo?.name || "Cửa hàng",
            email: storeInfo?.email || "",
            phone: storeInfo?.phone || "",
            role: "Chủ cửa hàng",
            avatarUrl: storeInfo?.logoUrl || "/visual-placeholder.svg",
            userId: storeInfo?.ownerId || "", // ID chủ cửa hàng để nhắn tin
        };
    return (_jsxs("div", { className: "order-live-page w-full py-4 sm:py-6 md:py-8 lg:py-12 px-4 sm:px-6 bg-gray-50 min-h-screen", children: [_jsxs("nav", { className: "order-live-breadcrumb", "aria-label": "\u0110\u01B0\u1EDDng d\u1EABn trang", children: [_jsx(Link, { to: "/", children: "Trang ch\u1EE7" }), _jsx("span", { children: "/" }), _jsx(Link, { to: "/profile", children: "\u0110\u01A1n h\u00E0ng c\u1EE7a t\u00F4i" }), _jsx("span", { children: "/" }), _jsx("strong", { children: "Chi ti\u1EBFt \u0111\u01A1n h\u00E0ng" })] }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-[minmax(0,2.55fr)_minmax(260px,1fr)] gap-4 sm:gap-6 animate-fade-in-up", children: [_jsxs("div", { className: "space-y-4 sm:space-y-6", children: [_jsx(OrderStatus, { statusHistory: order.statusHistory, orderCode: order.orderCode, orderDate: order.statusHistory[0]?.timestamp }), _jsx(OrderProduct, { items: order.items }), _jsx(PaymentInfo, { order: order, onPaymentSuccess: async () => {
                                    // Reload order sau khi thanh toán thành công
                                    const res = await orderApi.getOrderById(order._id);
                                    const data = res.data;
                                    const estimatedDelivery = typeof data.shippingInfo?.estimatedDelivery === "number"
                                        ? data.shippingInfo.estimatedDelivery
                                        : data.shippingInfo?.estimatedDelivery?.$date?.$numberLong
                                            ? parseInt(data.shippingInfo.estimatedDelivery.$date.$numberLong)
                                            : Date.now();
                                    const mappedOrder = {
                                        ...data,
                                        shippingInfo: {
                                            method: data.shippingInfo?.method || "Chưa xác định",
                                            estimatedDelivery,
                                            trackingNumber: data.shippingInfo?.trackingNumber || "",
                                        },
                                    };
                                    setOrder(mappedOrder);
                                } })] }), _jsxs("div", { className: "space-y-4 sm:space-y-6", children: [_jsx(CustomerInfo, { customer: displayedUser }), _jsx(ShippingInfo, { shippingAddress: order.shippingAddress, shippingInfo: order.shippingInfo, orderCode: order.orderCode, ownerId: !isOwnerSeller ? storeInfo?.ownerId : undefined, order: !isOwnerSeller ? order : undefined, storeName: storeInfo?.name }), isOwnerSeller && (_jsx(OrderUpdate, { orderId: order._id, currentStatus: currentStatus })), canCancelOrder && (_jsxs("div", { className: "bg-white rounded-xl sm:rounded-2xl shadow-lg border-2 border-red-100 overflow-hidden animate-fade-in-up", children: [_jsxs("div", { className: "bg-gradient-to-r from-red-50 to-orange-50 p-4 sm:p-6 border-b-2 border-red-200", children: [_jsxs("h2", { className: "text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3", children: [_jsx(XCircle, { size: 20, className: "sm:w-6 sm:h-6 text-red-600" }), "H\u1EE7y \u0111\u01A1n h\u00E0ng"] }), _jsx("p", { className: "text-gray-600 text-xs sm:text-sm mt-1", children: "B\u1EA1n c\u00F3 th\u1EC3 h\u1EE7y \u0111\u01A1n h\u00E0ng khi \u0111\u01A1n h\u00E0ng ch\u01B0a \u0111\u01B0\u1EE3c v\u1EADn chuy\u1EC3n" })] }), _jsx("div", { className: "p-4 sm:p-6", children: _jsxs("button", { onClick: handleCancelOrder, className: "w-full px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-red-500 to-orange-500 text-white text-sm sm:text-base font-bold rounded-lg sm:rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-2", children: [_jsx(XCircle, { size: 18, className: "sm:w-5 sm:h-5" }), _jsx("span", { children: "H\u1EE7y \u0111\u01A1n h\u00E0ng" })] }) })] })), !isOwnerSeller && currentStatus === "delivered" && (_jsx(BuyerConfirmDelivery, { orderId: order._id, onConfirm: async () => {
                                    // Reload order sau khi confirm
                                    const res = await orderApi.getOrderById(order._id);
                                    const data = res.data;
                                    const estimatedDelivery = typeof data.shippingInfo?.estimatedDelivery === "number"
                                        ? data.shippingInfo.estimatedDelivery
                                        : data.shippingInfo?.estimatedDelivery?.$date?.$numberLong
                                            ? parseInt(data.shippingInfo.estimatedDelivery.$date.$numberLong)
                                            : Date.now();
                                    const mappedOrder = {
                                        ...data,
                                        shippingInfo: {
                                            method: data.shippingInfo?.method || "Chưa xác định",
                                            estimatedDelivery,
                                            trackingNumber: data.shippingInfo?.trackingNumber || "",
                                        },
                                    };
                                    setOrder(mappedOrder);
                                } })), !isOwnerSeller && currentStatus === "received" && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "bg-white rounded-xl sm:rounded-2xl shadow-lg border-2 border-gray-100 overflow-hidden animate-fade-in-up", children: [_jsxs("div", { className: "bg-gradient-to-r from-purple-50 to-pink-50 p-4 sm:p-6 border-b-2 border-gray-200", children: [_jsxs("h2", { className: "text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3", children: [_jsx(Star, { size: 20, className: "sm:w-6 sm:h-6 text-purple-600" }), "\u0110\u00E1nh gi\u00E1 s\u1EA3n ph\u1EA9m"] }), _jsx("p", { className: "text-gray-600 text-xs sm:text-sm mt-1", children: "B\u1EA1n \u0111\u00E3 nh\u1EADn \u0111\u01B0\u1EE3c h\u00E0ng. H\u00E3y chia s\u1EBB \u0111\u00E1nh gi\u00E1 c\u1EE7a b\u1EA1n!" })] }), _jsx("div", { className: "p-4 sm:p-6 space-y-2 sm:space-y-3", children: order.items.map((item, idx) => {
                                                    // Get productId from item - could be string or object with _id
                                                    let actualProductId = '';
                                                    if (item.productId) {
                                                        if (typeof item.productId === 'string') {
                                                            actualProductId = item.productId;
                                                        }
                                                        else if (typeof item.productId === 'object' && item.productId._id) {
                                                            actualProductId = item.productId._id;
                                                        }
                                                        else {
                                                            actualProductId = String(item.productId);
                                                        }
                                                    }
                                                    if (!actualProductId)
                                                        return null;
                                                    return (_jsxs("button", { onClick: () => {
                                                            setReviewProductId(actualProductId);
                                                            setReviewOrderId(order._id);
                                                        }, className: "w-full px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm sm:text-base font-bold rounded-lg sm:rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-2", children: [_jsx(Star, { size: 18, className: "sm:w-5 sm:h-5" }), _jsxs("span", { className: "break-words", children: ["\u0110\u00E1nh gi\u00E1 ", item.name] })] }, idx));
                                                }) })] }), _jsx(ReturnRequest, { orderId: order._id, order: order, onRequestSuccess: async () => {
                                            // Reload order sau khi yêu cầu trả lại thành công
                                            const res = await orderApi.getOrderById(order._id);
                                            const data = res.data;
                                            const estimatedDelivery = typeof data.shippingInfo?.estimatedDelivery === "number"
                                                ? data.shippingInfo.estimatedDelivery
                                                : data.shippingInfo?.estimatedDelivery?.$date?.$numberLong
                                                    ? parseInt(data.shippingInfo.estimatedDelivery.$date.$numberLong)
                                                    : Date.now();
                                            const mappedOrder = {
                                                ...data,
                                                shippingInfo: {
                                                    method: data.shippingInfo?.method || "Chưa xác định",
                                                    estimatedDelivery,
                                                    trackingNumber: data.shippingInfo?.trackingNumber || "",
                                                },
                                            };
                                            setOrder(mappedOrder);
                                        } })] }))] })] }), reviewProductId && reviewOrderId && (_jsx("div", { className: "fixed inset-0 flex items-center justify-center z-50 p-0 sm:p-4", style: { backgroundColor: 'rgba(0, 0, 0, 0.5)' }, children: _jsx(ProductReview, { productId: reviewProductId, orderId: reviewOrderId, onClose: () => {
                        setReviewProductId(null);
                        setReviewOrderId(null);
                    } }) })), _jsx(ConfirmDialog, { open: showCancelConfirm, onClose: () => setShowCancelConfirm(false), onConfirm: handleCancelOrder, title: "X\u00E1c nh\u1EADn h\u1EE7y \u0111\u01A1n h\u00E0ng", message: "B\u1EA1n c\u00F3 ch\u1EAFc ch\u1EAFn mu\u1ED1n h\u1EE7y \u0111\u01A1n h\u00E0ng n\u00E0y? H\u00E0nh \u0111\u1ED9ng n\u00E0y kh\u00F4ng th\u1EC3 ho\u00E0n t\u00E1c.", type: "danger", confirmText: "H\u1EE7y \u0111\u01A1n h\u00E0ng" }), showPaymentSuccess && paymentInfo && createPortal(_jsx("div", { className: "fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-[10000] p-4 animate-fade-in", onClick: () => {
                    setShowPaymentSuccess(false);
                    setPaymentInfo(null);
                }, children: _jsxs("div", { className: "bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-md animate-scale-in", onClick: (e) => e.stopPropagation(), children: [_jsxs("div", { className: "bg-gradient-to-r from-green-500 to-emerald-600 p-6 rounded-t-xl sm:rounded-t-2xl", children: [_jsx("div", { className: "flex items-center justify-center mb-4", children: _jsx("div", { className: "w-16 h-16 bg-white rounded-full flex items-center justify-center", children: _jsx(CheckCircle, { className: "w-10 h-10 text-green-500" }) }) }), _jsx("h2", { className: "text-2xl font-bold text-white text-center", children: "Thanh to\u00E1n th\u00E0nh c\u00F4ng!" })] }), _jsxs("div", { className: "p-6 space-y-4", children: [_jsxs("div", { className: "bg-gray-50 rounded-lg p-4 space-y-3", children: [_jsxs("div", { className: "flex justify-between items-center", children: [_jsx("span", { className: "text-gray-600", children: "M\u00E3 \u0111\u01A1n h\u00E0ng:" }), _jsx("span", { className: "font-bold text-gray-900", children: paymentInfo.orderCode })] }), _jsxs("div", { className: "flex justify-between items-center", children: [_jsx("span", { className: "text-gray-600", children: "S\u1ED1 ti\u1EC1n thanh to\u00E1n:" }), _jsxs("span", { className: "font-bold text-green-600 text-lg", children: [paymentInfo.amount.toLocaleString("vi-VN"), "\u20AB"] })] }), _jsxs("div", { className: "flex justify-between items-center", children: [_jsx("span", { className: "text-gray-600", children: "Ph\u01B0\u01A1ng th\u1EE9c:" }), _jsx("span", { className: "font-semibold text-gray-900", children: paymentInfo.paymentMethod })] }), _jsxs("div", { className: "flex justify-between items-center", children: [_jsx("span", { className: "text-gray-600", children: "S\u1ED1 d\u01B0 v\u00ED c\u00F2n l\u1EA1i:" }), _jsxs("span", { className: "font-semibold text-blue-600", children: [paymentInfo.balance.toLocaleString("vi-VN"), "\u20AB"] })] })] }), _jsx("div", { className: "bg-blue-50 border-2 border-blue-200 rounded-lg p-4", children: _jsx("p", { className: "text-sm text-blue-800 text-center", children: "\u0110\u01A1n h\u00E0ng c\u1EE7a b\u1EA1n \u0111\u00E3 \u0111\u01B0\u1EE3c thanh to\u00E1n th\u00E0nh c\u00F4ng. Vui l\u00F2ng ch\u1EDD seller x\u00E1c nh\u1EADn \u0111\u01A1n h\u00E0ng." }) }), _jsxs("button", { onClick: () => {
                                        setShowPaymentSuccess(false);
                                        setPaymentInfo(null);
                                    }, className: "w-full py-3 px-4 bg-gradient-to-r from-[#4B5563] to-[#374151] text-white font-bold rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-2", children: [_jsx("span", { children: "\u0110\u00E3 hi\u1EC3u" }), _jsx(ArrowRight, { className: "w-5 h-5" })] })] })] }) }), document.body)] }));
}
