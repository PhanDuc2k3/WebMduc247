import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { X, CreditCard, Mail, RefreshCw, ArrowRight } from "lucide-react";
import { toast } from "react-toastify";
import walletApi from "../../../api/walletApi";
import paymentApi from "../../../api/paymentApi";
import orderApi from "../../../api/orderApi";
export default function PaymentModal({ isOpen, onClose, orderId, orderCode, total, currentPaymentMethod, onPaymentSuccess, }) {
    const navigate = useNavigate();
    const [selectedMethod, setSelectedMethod] = useState(currentPaymentMethod === "WALLET" ? "wallet" :
        currentPaymentMethod === "MOMO" ? "momo" :
            currentPaymentMethod === "VIETQR" ? "vietqr" : "cod");
    const [paymentCode, setPaymentCode] = useState("");
    const [sendingCode, setSendingCode] = useState(false);
    const [codeSent, setCodeSent] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const hasSentCodeForWalletRef = useRef(null); // Track orderCode đã gửi mã
    // Reset state khi modal mở
    useEffect(() => {
        if (isOpen) {
            setPaymentCode("");
            setCodeSent(false);
            const method = currentPaymentMethod === "WALLET" ? "wallet" :
                currentPaymentMethod === "MOMO" ? "momo" :
                    currentPaymentMethod === "VIETQR" ? "vietqr" : "cod";
            setSelectedMethod(method);
            // ✅ Tự động gửi mã khi modal mở với method = "wallet" (chỉ gửi một lần)
            if (method === "wallet" && hasSentCodeForWalletRef.current !== orderCode && !sendingCode) {
                // Delay nhỏ để đảm bảo state đã được set và tránh gửi trùng
                const timeoutId = setTimeout(() => {
                    if (hasSentCodeForWalletRef.current !== orderCode && !sendingCode) {
                        handleSendCode();
                    }
                }, 200);
                return () => clearTimeout(timeoutId);
            }
        }
        else {
            // Reset khi modal đóng
            hasSentCodeForWalletRef.current = null;
        }
    }, [isOpen, orderCode]); // Thêm orderCode vào dependency để theo dõi đúng order
    // Handler gửi mã xác thực
    const handleSendCode = async () => {
        // ✅ Kiểm tra xem đã gửi mã cho orderCode này chưa hoặc đang gửi
        if (hasSentCodeForWalletRef.current === orderCode || sendingCode) {
            return;
        }
        // ✅ Đánh dấu đã gửi ngay để tránh gửi trùng
        hasSentCodeForWalletRef.current = orderCode;
        setSendingCode(true);
        try {
            await walletApi.sendPaymentCode({
                orderCode,
                amount: total,
            });
            setCodeSent(true);
            toast.success("Mã xác thực đã được gửi đến email của bạn", {
                containerId: "general-toast",
            });
        }
        catch (err) {
            console.error("Lỗi gửi mã xác thực:", err);
            // ✅ Reset nếu lỗi để có thể gửi lại
            hasSentCodeForWalletRef.current = null;
            setCodeSent(false);
            toast.error(err?.response?.data?.message || "Không thể gửi mã xác thực. Vui lòng thử lại.", { containerId: "general-toast" });
        }
        finally {
            setSendingCode(false);
        }
    };
    // Handler khi chọn phương thức ví - tự động gửi mã và chuyển sang trang order
    const handleSelectWallet = () => {
        setSelectedMethod("wallet");
        // ✅ Gửi mã khi user chọn ví (chỉ gửi một lần)
        if (hasSentCodeForWalletRef.current !== orderCode && !codeSent && !sendingCode) {
            handleSendCode();
        }
        // ✅ Chuyển sang trang order khi chọn ví
        onClose();
        navigate(`/order/${orderId}`);
    };
    // Handler thanh toán bằng ví
    const handleWalletPayment = async () => {
        if (!paymentCode || paymentCode.length !== 6) {
            toast.error("Vui lòng nhập mã xác thực 6 chữ số", {
                containerId: "general-toast",
            });
            return;
        }
        setIsProcessing(true);
        try {
            // Cập nhật payment method nếu chưa phải WALLET
            if (currentPaymentMethod !== "WALLET") {
                await orderApi.updatePaymentMethod(orderId, "WALLET");
            }
            const payRes = await walletApi.payWithWallet({
                orderCode,
                amount: total,
                emailCode: paymentCode,
            });
            // ✅ Lưu thông tin thanh toán vào localStorage để hiển thị popup trên trang order
            const paymentInfo = {
                orderCode: payRes.data.order?.orderCode || orderCode,
                amount: total,
                paymentMethod: "Ví của tôi",
                paymentStatus: payRes.data.order?.paymentStatus || "paid",
                balance: payRes.data.wallet?.balance || 0,
                timestamp: Date.now(),
            };
            localStorage.setItem("walletPaymentSuccess", JSON.stringify(paymentInfo));
            toast.success("Thanh toán thành công!", {
                containerId: "general-toast",
            });
            onPaymentSuccess();
            onClose();
            // ✅ Chuyển sang trang order để hiển thị popup
            navigate(`/order/${orderId}`);
        }
        catch (err) {
            console.error("=== Lỗi thanh toán bằng ví ===", err);
            toast.error(err?.response?.data?.message || "Mã xác thực không đúng hoặc đã hết hạn. Vui lòng thử lại.", { containerId: "general-toast" });
        }
        finally {
            setIsProcessing(false);
        }
    };
    // Handler thanh toán bằng MoMo
    const handleMoMoPayment = async () => {
        try {
            setIsProcessing(true);
            // Cập nhật payment method
            if (currentPaymentMethod !== "MOMO") {
                await orderApi.updatePaymentMethod(orderId, "MOMO");
            }
            // Tạo payment MoMo
            const payRes = await paymentApi.createMoMoPayment({
                amount: total,
                orderInfo: `Thanh toán đơn hàng #${orderCode}`,
                orderCode,
            });
            const payData = payRes.data;
            if (payData.payUrl) {
                window.location.href = payData.payUrl;
            }
            else {
                throw new Error(payData.message || "Không lấy được payUrl từ MoMo");
            }
        }
        catch (err) {
            console.error("Lỗi thanh toán MoMo:", err);
            toast.error(err?.response?.data?.message || "Không thể thanh toán bằng MoMo. Vui lòng thử lại.", { containerId: "general-toast" });
            setIsProcessing(false);
        }
    };
    // Handler thanh toán bằng VietQR
    const handleVietQRPayment = async () => {
        try {
            setIsProcessing(true);
            // Cập nhật payment method
            if (currentPaymentMethod !== "VIETQR") {
                await orderApi.updatePaymentMethod(orderId, "VIETQR");
            }
            // Tạo payment VietQR
            const payRes = await paymentApi.createVietQRPayment({
                amount: total,
                orderInfo: `Thanh toán đơn hàng #${orderCode}`,
                orderCode,
            });
            const payData = payRes.data;
            if (payData.qrCodeUrl) {
                // Mở QR code trong tab mới hoặc hiển thị modal
                window.open(payData.qrCodeUrl, "_blank");
                toast.info("Vui lòng quét mã QR để thanh toán", {
                    containerId: "general-toast",
                });
                onPaymentSuccess();
                onClose();
            }
            else {
                throw new Error(payData.message || "Không lấy được QR code từ VietQR");
            }
        }
        catch (err) {
            console.error("Lỗi thanh toán VietQR:", err);
            toast.error(err?.response?.data?.message || "Không thể thanh toán bằng VietQR. Vui lòng thử lại.", { containerId: "general-toast" });
            setIsProcessing(false);
        }
    };
    // Handler chuyển sang COD
    const handleCODPayment = async () => {
        try {
            setIsProcessing(true);
            // Cập nhật payment method
            await orderApi.updatePaymentMethod(orderId, "COD");
            toast.success("Đã chuyển sang thanh toán khi nhận hàng (COD)", {
                containerId: "general-toast",
            });
            onPaymentSuccess();
            onClose();
        }
        catch (err) {
            console.error("Lỗi chuyển sang COD:", err);
            toast.error(err?.response?.data?.message || "Không thể chuyển sang COD. Vui lòng thử lại.", { containerId: "general-toast" });
        }
        finally {
            setIsProcessing(false);
        }
    };
    // Handler gửi lại mã
    const handleResendCode = async () => {
        if (sendingCode) {
            return;
        }
        // Reset flag để cho phép gửi lại
        hasSentCodeForWalletRef.current = null;
        await handleSendCode();
    };
    if (!isOpen)
        return null;
    return createPortal(_jsx("div", { className: "fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-fade-in", onClick: () => {
            if (!isProcessing) {
                onClose();
            }
        }, children: _jsxs("div", { className: "relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-scale-in", onClick: (e) => e.stopPropagation(), children: [_jsxs("div", { className: "sticky top-0 bg-white border-b-2 border-gray-200 p-4 sm:p-6 flex items-center justify-between z-10", children: [_jsxs("div", { children: [_jsxs("h2", { className: "text-xl sm:text-2xl font-bold text-[#4B5563] flex items-center gap-2", children: [_jsx(CreditCard, { className: "w-6 h-6" }), "Thanh to\u00E1n \u0111\u01A1n h\u00E0ng"] }), _jsxs("p", { className: "text-sm text-gray-600 mt-1", children: ["M\u00E3 \u0111\u01A1n: ", _jsx("strong", { children: orderCode }), " - T\u1ED5ng ti\u1EC1n: ", _jsxs("strong", { children: [total.toLocaleString("vi-VN"), "\u20AB"] })] })] }), _jsx("button", { onClick: onClose, disabled: isProcessing, className: "p-2 rounded-full bg-gray-100 hover:bg-gray-200 transition disabled:opacity-50", children: _jsx(X, { className: "w-5 h-5 text-gray-600" }) })] }), _jsxs("div", { className: "p-4 sm:p-6 space-y-6", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-semibold text-gray-700 mb-3", children: "Ch\u1ECDn ph\u01B0\u01A1ng th\u1EE9c thanh to\u00E1n" }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3", children: [_jsx("button", { onClick: handleSelectWallet, disabled: isProcessing, className: `p-4 border-2 rounded-lg transition-all ${selectedMethod === "wallet"
                                                ? "border-[#4B5563] bg-blue-50"
                                                : "border-gray-300 hover:border-gray-400"} disabled:opacity-50`, children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(CreditCard, { className: "w-5 h-5" }), _jsx("span", { className: "font-semibold", children: "V\u00ED c\u1EE7a t\u00F4i" })] }) }), _jsx("button", { onClick: () => setSelectedMethod("momo"), disabled: isProcessing, className: `p-4 border-2 rounded-lg transition-all ${selectedMethod === "momo"
                                                ? "border-pink-500 bg-pink-50"
                                                : "border-gray-300 hover:border-gray-400"} disabled:opacity-50`, children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(CreditCard, { className: "w-5 h-5" }), _jsx("span", { className: "font-semibold", children: "V\u00ED MoMo" })] }) }), _jsx("button", { onClick: () => setSelectedMethod("vietqr"), disabled: isProcessing, className: `p-4 border-2 rounded-lg transition-all ${selectedMethod === "vietqr"
                                                ? "border-green-500 bg-green-50"
                                                : "border-gray-300 hover:border-gray-400"} disabled:opacity-50`, children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(CreditCard, { className: "w-5 h-5" }), _jsx("span", { className: "font-semibold", children: "VietQR" })] }) }), _jsx("button", { onClick: () => setSelectedMethod("cod"), disabled: isProcessing, className: `p-4 border-2 rounded-lg transition-all ${selectedMethod === "cod"
                                                ? "border-gray-600 bg-gray-50"
                                                : "border-gray-300 hover:border-gray-400"} disabled:opacity-50`, children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(CreditCard, { className: "w-5 h-5" }), _jsx("span", { className: "font-semibold", children: "COD" })] }) })] })] }), selectedMethod === "wallet" && (_jsxs("div", { className: "space-y-4 p-4 bg-blue-50 rounded-lg border-2 border-blue-200", children: [_jsxs("div", { className: "flex items-center gap-2 mb-2", children: [_jsx(Mail, { className: "w-5 h-5 text-blue-600" }), _jsx("span", { className: "font-semibold text-blue-800", children: "Thanh to\u00E1n b\u1EB1ng v\u00ED" })] }), codeSent && (_jsx("div", { className: "bg-green-50 border border-green-200 rounded-lg p-3", children: _jsx("p", { className: "text-sm text-green-800", children: "M\u00E3 x\u00E1c th\u1EF1c \u0111\u00E3 \u0111\u01B0\u1EE3c g\u1EEDi \u0111\u1EBFn email c\u1EE7a b\u1EA1n. Vui l\u00F2ng ki\u1EC3m tra h\u1ED9p th\u01B0." }) })), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-semibold text-gray-700 mb-2", children: "M\u00E3 x\u00E1c th\u1EF1c (6 ch\u1EEF s\u1ED1)" }), _jsx("input", { type: "text", value: paymentCode, onChange: (e) => {
                                                const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                                                setPaymentCode(value);
                                            }, placeholder: "Nh\u1EADp m\u00E3 x\u00E1c th\u1EF1c", maxLength: 6, disabled: isProcessing, className: "w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#4B5563] focus:outline-none text-lg text-center tracking-widest disabled:bg-gray-100" })] }), _jsxs("button", { onClick: handleResendCode, disabled: sendingCode || isProcessing, className: "w-full py-2 px-4 text-sm text-[#4B5563] hover:text-[#374151] font-semibold flex items-center justify-center gap-2 disabled:opacity-50", children: [_jsx(RefreshCw, { className: `w-4 h-4 ${sendingCode ? "animate-spin" : ""}` }), sendingCode ? "Đang gửi..." : "Gửi lại mã xác thực"] }), _jsx("button", { onClick: handleWalletPayment, disabled: isProcessing || paymentCode.length !== 6, className: "w-full py-3 px-4 bg-gradient-to-r from-[#4B5563] to-[#374151] text-white font-bold rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2", children: isProcessing ? (_jsxs(_Fragment, { children: [_jsx(RefreshCw, { className: "w-5 h-5 animate-spin" }), _jsx("span", { children: "\u0110ang x\u1EED l\u00FD..." })] })) : (_jsxs(_Fragment, { children: [_jsx("span", { children: "X\u00E1c nh\u1EADn thanh to\u00E1n" }), _jsx(ArrowRight, { className: "w-5 h-5" })] })) })] })), selectedMethod === "momo" && (_jsxs("div", { className: "space-y-4 p-4 bg-pink-50 rounded-lg border-2 border-pink-200", children: [_jsxs("div", { className: "flex items-center gap-2 mb-2", children: [_jsx(CreditCard, { className: "w-5 h-5 text-pink-600" }), _jsx("span", { className: "font-semibold text-pink-800", children: "Thanh to\u00E1n b\u1EB1ng MoMo" })] }), _jsx("p", { className: "text-sm text-gray-700", children: "B\u1EA1n s\u1EBD \u0111\u01B0\u1EE3c chuy\u1EC3n \u0111\u1EBFn trang thanh to\u00E1n MoMo \u0111\u1EC3 ho\u00E0n t\u1EA5t giao d\u1ECBch." }), _jsx("button", { onClick: handleMoMoPayment, disabled: isProcessing, className: "w-full py-3 px-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2", children: isProcessing ? (_jsxs(_Fragment, { children: [_jsx(RefreshCw, { className: "w-5 h-5 animate-spin" }), _jsx("span", { children: "\u0110ang x\u1EED l\u00FD..." })] })) : (_jsxs(_Fragment, { children: [_jsx("span", { children: "Thanh to\u00E1n b\u1EB1ng MoMo" }), _jsx(ArrowRight, { className: "w-5 h-5" })] })) })] })), selectedMethod === "vietqr" && (_jsxs("div", { className: "space-y-4 p-4 bg-green-50 rounded-lg border-2 border-green-200", children: [_jsxs("div", { className: "flex items-center gap-2 mb-2", children: [_jsx(CreditCard, { className: "w-5 h-5 text-green-600" }), _jsx("span", { className: "font-semibold text-green-800", children: "Thanh to\u00E1n b\u1EB1ng VietQR" })] }), _jsx("p", { className: "text-sm text-gray-700", children: "M\u00E3 QR s\u1EBD \u0111\u01B0\u1EE3c m\u1EDF trong tab m\u1EDBi. Vui l\u00F2ng qu\u00E9t m\u00E3 \u0111\u1EC3 thanh to\u00E1n." }), _jsx("button", { onClick: handleVietQRPayment, disabled: isProcessing, className: "w-full py-3 px-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2", children: isProcessing ? (_jsxs(_Fragment, { children: [_jsx(RefreshCw, { className: "w-5 h-5 animate-spin" }), _jsx("span", { children: "\u0110ang x\u1EED l\u00FD..." })] })) : (_jsxs(_Fragment, { children: [_jsx("span", { children: "Thanh to\u00E1n b\u1EB1ng VietQR" }), _jsx(ArrowRight, { className: "w-5 h-5" })] })) })] })), selectedMethod === "cod" && (_jsxs("div", { className: "space-y-4 p-4 bg-gray-50 rounded-lg border-2 border-gray-200", children: [_jsxs("div", { className: "flex items-center gap-2 mb-2", children: [_jsx(CreditCard, { className: "w-5 h-5 text-gray-600" }), _jsx("span", { className: "font-semibold text-gray-800", children: "Thanh to\u00E1n khi nh\u1EADn h\u00E0ng (COD)" })] }), _jsx("p", { className: "text-sm text-gray-700", children: "B\u1EA1n s\u1EBD thanh to\u00E1n khi nh\u1EADn \u0111\u01B0\u1EE3c h\u00E0ng. \u0110\u01A1n h\u00E0ng s\u1EBD \u0111\u01B0\u1EE3c x\u1EED l\u00FD ngay." }), _jsx("button", { onClick: handleCODPayment, disabled: isProcessing, className: "w-full py-3 px-4 bg-gray-600 text-white font-bold rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2", children: isProcessing ? (_jsxs(_Fragment, { children: [_jsx(RefreshCw, { className: "w-5 h-5 animate-spin" }), _jsx("span", { children: "\u0110ang x\u1EED l\u00FD..." })] })) : (_jsxs(_Fragment, { children: [_jsx("span", { children: "X\u00E1c nh\u1EADn chuy\u1EC3n sang COD" }), _jsx(ArrowRight, { className: "w-5 h-5" })] })) })] }))] })] }) }), document.body);
}
