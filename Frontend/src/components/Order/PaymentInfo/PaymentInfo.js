import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState, useEffect } from "react";
import PaymentModal from "../PaymentModal/PaymentModal";
export default function PaymentInfo({ order, onPaymentSuccess }) {
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    // ✅ Tự động mở PaymentModal khi vào trang order sau khi checkout với ví
    useEffect(() => {
        if (order.paymentInfo.status === "paid")
            return; // Đã thanh toán rồi thì không mở
        const openWalletPayment = localStorage.getItem("openWalletPayment");
        if (openWalletPayment) {
            try {
                const data = JSON.parse(openWalletPayment);
                // Kiểm tra xem có phải đơn hàng này không và thời gian không quá 5 phút
                const timeDiff = Date.now() - (data.timestamp || 0);
                if (data.orderId === order._id && timeDiff < 5 * 60 * 1000) {
                    // Tự động mở PaymentModal
                    setShowPaymentModal(true);
                    // Xóa flag sau khi mở
                    localStorage.removeItem("openWalletPayment");
                }
                else {
                    // Xóa nếu không khớp hoặc quá cũ
                    localStorage.removeItem("openWalletPayment");
                }
            }
            catch (err) {
                console.error("Lỗi parse openWalletPayment:", err);
                localStorage.removeItem("openWalletPayment");
            }
        }
    }, [order._id, order.paymentInfo.status]);
    return (_jsxs("div", { className: "bg-white rounded-xl sm:rounded-2xl shadow-lg border-2 border-gray-100 overflow-hidden animate-fade-in-up", children: [_jsxs("div", { className: "bg-[#4B5563]/5 p-4 sm:p-6 border-b-2 border-gray-200", children: [_jsx("h2", { className: "text-xl sm:text-2xl font-bold text-[#4B5563] flex items-center gap-2 sm:gap-3", children: "Th\u00F4ng tin thanh to\u00E1n" }), _jsx("p", { className: "text-gray-600 text-xs sm:text-sm mt-1", children: "Chi ti\u1EBFt thanh to\u00E1n \u0111\u01A1n h\u00E0ng" })] }), _jsxs("div", { className: "p-4 sm:p-6 space-y-3 sm:space-y-4", children: [_jsxs("div", { className: "space-y-2 sm:space-y-3 text-xs sm:text-sm", children: [_jsxs("div", { className: "flex justify-between items-center p-3 bg-gray-50 rounded-lg sm:rounded-xl gap-2", children: [_jsx("span", { className: "font-semibold flex items-center gap-2", children: "T\u1EA1m t\u00EDnh" }), _jsxs("span", { className: "font-bold text-gray-900 break-words", children: [order.subtotal.toLocaleString("vi-VN"), "\u20AB"] })] }), _jsxs("div", { className: "flex justify-between items-center p-3 bg-gray-50 rounded-lg sm:rounded-xl gap-2", children: [_jsx("span", { className: "font-semibold flex items-center gap-2", children: "Ph\u00ED v\u1EADn chuy\u1EC3n" }), _jsxs("span", { className: "font-bold text-gray-900 break-words", children: [order.shippingFee.toLocaleString("vi-VN"), "\u20AB"] })] }), order.discount > 0 && (_jsxs("div", { className: "flex justify-between items-center p-3 bg-green-50 border-2 border-green-200 rounded-lg sm:rounded-xl gap-2", children: [_jsx("span", { className: "font-semibold text-green-700 flex items-center gap-2", children: "Gi\u1EA3m gi\u00E1" }), _jsxs("span", { className: "font-bold text-red-600 break-words", children: ["-", order.discount.toLocaleString("vi-VN"), "\u20AB"] })] })), _jsx("div", { className: "border-t-2 border-gray-300 pt-3 sm:pt-4 mt-3 sm:mt-4", children: _jsxs("div", { className: "flex justify-between items-center p-3 sm:p-4 bg-[#4B5563]/5 rounded-lg sm:rounded-xl gap-2", children: [_jsx("span", { className: "text-lg sm:text-xl font-extrabold text-gray-900 flex items-center gap-2", children: "T\u1ED5ng c\u1ED9ng" }), _jsxs("span", { className: "text-xl sm:text-2xl font-extrabold text-red-600 break-words", children: [order.total.toLocaleString("vi-VN"), "\u20AB"] })] }) }), _jsxs("div", { className: "flex justify-between items-center p-3 bg-gray-50 rounded-lg sm:rounded-xl mt-3 sm:mt-4 gap-2", children: [_jsx("span", { className: "font-semibold flex items-center gap-2", children: "Ph\u01B0\u01A1ng th\u1EE9c" }), _jsx("span", { className: "font-bold text-gray-900 break-words", children: order.paymentInfo.method })] })] }), _jsx("button", { onClick: () => {
                            if (order.paymentInfo.status !== "paid") {
                                setShowPaymentModal(true);
                            }
                        }, disabled: order.paymentInfo.status === "paid", className: `w-full py-3 sm:py-4 px-4 sm:px-6 font-bold rounded-lg sm:rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 text-sm sm:text-base ${order.paymentInfo.status === "paid"
                            ? "bg-[#4B5563] text-white cursor-default"
                            : "bg-yellow-400 text-white hover:bg-orange-500 cursor-pointer"} disabled:transform-none`, children: order.paymentInfo.status === "paid" ? "Đã thanh toán" : "Chưa thanh toán" })] }), showPaymentModal && (_jsx(PaymentModal, { isOpen: showPaymentModal, onClose: () => setShowPaymentModal(false), orderId: order._id, orderCode: order.orderCode, total: order.total, currentPaymentMethod: order.paymentInfo.method, onPaymentSuccess: () => {
                    setShowPaymentModal(false);
                    if (onPaymentSuccess) {
                        onPaymentSuccess();
                    }
                } }))] }));
}
