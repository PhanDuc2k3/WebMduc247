import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useEffect } from "react";
import { CreditCard, Mail, RefreshCw, ArrowRight, XCircle } from "lucide-react";
import { toast } from "react-toastify";
import walletApi from "../../../api/walletApi";
import paymentApi from "../../../api/paymentApi";
import orderApi from "../../../api/orderApi";
import { useNavigate } from "react-router-dom";
export default function WalletPaymentForm({ orderId, orderCode, total, onPaymentSuccess, onChangePaymentMethod, }) {
    const [paymentCode, setPaymentCode] = useState("");
    const [sendingCode, setSendingCode] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [codeSent, setCodeSent] = useState(false);
    const navigate = useNavigate();
    // Gửi mã xác thực khi component mount
    useEffect(() => {
        const sendInitialCode = async () => {
            if (!codeSent) {
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
                    toast.error(err?.response?.data?.message || "Không thể gửi mã xác thực. Vui lòng thử lại.", { containerId: "general-toast" });
                }
                finally {
                    setSendingCode(false);
                }
            }
        };
        sendInitialCode();
    }, [orderCode, total, codeSent]);
    // Handler xác nhận thanh toán với mã email
    const handleConfirmPayment = async () => {
        if (!paymentCode || paymentCode.length !== 6) {
            toast.error("Vui lòng nhập mã xác thực 6 chữ số", {
                containerId: "general-toast",
            });
            return;
        }
        setIsProcessing(true);
        try {
            const payRes = await walletApi.payWithWallet({
                orderCode,
                amount: total,
                emailCode: paymentCode,
            });
            console.log("=== Response Wallet Payment ===", payRes.data);
            toast.success("Thanh toán thành công!", {
                containerId: "general-toast",
            });
            // Reload order để cập nhật trạng thái
            onPaymentSuccess();
        }
        catch (err) {
            console.error("=== Lỗi thanh toán bằng ví ===", err);
            toast.error(err?.response?.data?.message || "Mã xác thực không đúng hoặc đã hết hạn. Vui lòng thử lại.", { containerId: "general-toast" });
        }
        finally {
            setIsProcessing(false);
        }
    };
    // Handler gửi lại mã
    const handleResendCode = async () => {
        setSendingCode(true);
        try {
            await walletApi.sendPaymentCode({
                orderCode,
                amount: total,
            });
            setCodeSent(true);
            toast.success("Đã gửi lại mã xác thực", {
                containerId: "general-toast",
            });
        }
        catch (err) {
            toast.error(err?.response?.data?.message || "Không thể gửi lại mã. Vui lòng thử lại sau.", { containerId: "general-toast" });
        }
        finally {
            setSendingCode(false);
        }
    };
    // Handler chuyển sang thanh toán online (MoMo)
    const handleSwitchToMoMo = async () => {
        try {
            setIsProcessing(true);
            // Cập nhật phương thức thanh toán
            await orderApi.updatePaymentMethod(orderId, "MOMO");
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
            console.error("Lỗi chuyển sang MoMo:", err);
            toast.error(err?.response?.data?.message || "Không thể chuyển sang thanh toán MoMo. Vui lòng thử lại.", { containerId: "general-toast" });
            setIsProcessing(false);
        }
    };
    // Handler chuyển sang thanh toán VietQR
    const handleSwitchToVietQR = async () => {
        try {
            setIsProcessing(true);
            // Cập nhật phương thức thanh toán
            await orderApi.updatePaymentMethod(orderId, "VIETQR");
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
            }
            else {
                throw new Error(payData.message || "Không lấy được QR code từ VietQR");
            }
        }
        catch (err) {
            console.error("Lỗi chuyển sang VietQR:", err);
            toast.error(err?.response?.data?.message || "Không thể chuyển sang thanh toán VietQR. Vui lòng thử lại.", { containerId: "general-toast" });
            setIsProcessing(false);
        }
    };
    // Handler chuyển sang COD
    const handleSwitchToCOD = async () => {
        try {
            setIsProcessing(true);
            // Cập nhật phương thức thanh toán
            await orderApi.updatePaymentMethod(orderId, "COD");
            toast.success("Đã chuyển sang thanh toán khi nhận hàng (COD)", {
                containerId: "general-toast",
            });
            // Reload order để cập nhật trạng thái
            onPaymentSuccess();
        }
        catch (err) {
            console.error("Lỗi chuyển sang COD:", err);
            toast.error(err?.response?.data?.message || "Không thể chuyển sang COD. Vui lòng thử lại.", { containerId: "general-toast" });
        }
        finally {
            setIsProcessing(false);
        }
    };
    return (_jsxs("div", { className: "bg-white rounded-xl sm:rounded-2xl shadow-lg border-2 border-blue-100 overflow-hidden animate-fade-in-up", children: [_jsxs("div", { className: "bg-gradient-to-r from-blue-50 to-indigo-50 p-4 sm:p-6 border-b-2 border-blue-200", children: [_jsxs("h2", { className: "text-xl sm:text-2xl font-bold text-[#4B5563] flex items-center gap-2 sm:gap-3", children: [_jsx(CreditCard, { className: "w-5 h-5 sm:w-6 sm:h-6" }), "Thanh to\u00E1n b\u1EB1ng v\u00ED"] }), _jsx("p", { className: "text-gray-600 text-xs sm:text-sm mt-1", children: "Vui l\u00F2ng nh\u1EADp m\u00E3 x\u00E1c th\u1EF1c \u0111\u00E3 \u0111\u01B0\u1EE3c g\u1EEDi \u0111\u1EBFn email c\u1EE7a b\u1EA1n" })] }), _jsxs("div", { className: "p-4 sm:p-6 space-y-4", children: [codeSent && (_jsxs("div", { className: "bg-green-50 border-2 border-green-200 rounded-lg p-3 flex items-start gap-3", children: [_jsx(Mail, { className: "w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" }), _jsxs("div", { className: "flex-1", children: [_jsx("p", { className: "text-sm font-semibold text-green-800", children: "M\u00E3 x\u00E1c th\u1EF1c \u0111\u00E3 \u0111\u01B0\u1EE3c g\u1EEDi \u0111\u1EBFn email c\u1EE7a b\u1EA1n" }), _jsx("p", { className: "text-xs text-green-600 mt-1", children: "Vui l\u00F2ng ki\u1EC3m tra h\u1ED9p th\u01B0 v\u00E0 nh\u1EADp m\u00E3 6 ch\u1EEF s\u1ED1" })] })] })), _jsxs("div", { className: "space-y-3", children: [_jsx("label", { className: "block text-sm font-semibold text-gray-700", children: "M\u00E3 x\u00E1c th\u1EF1c (6 ch\u1EEF s\u1ED1)" }), _jsx("input", { type: "text", value: paymentCode, onChange: (e) => {
                                    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                                    setPaymentCode(value);
                                }, placeholder: "Nh\u1EADp m\u00E3 x\u00E1c th\u1EF1c", maxLength: 6, className: "w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-[#4B5563] focus:outline-none text-lg text-center tracking-widest", disabled: isProcessing }), _jsxs("button", { onClick: handleResendCode, disabled: sendingCode || isProcessing, className: "w-full py-2 px-4 text-sm text-[#4B5563] hover:text-[#374151] font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed", children: [_jsx(RefreshCw, { className: `w-4 h-4 ${sendingCode ? "animate-spin" : ""}` }), sendingCode ? "Đang gửi..." : "Gửi lại mã xác thực"] })] }), _jsx("button", { onClick: handleConfirmPayment, disabled: isProcessing || paymentCode.length !== 6, className: "w-full py-3 sm:py-4 px-4 sm:px-6 bg-gradient-to-r from-[#4B5563] to-[#374151] text-white font-bold rounded-lg sm:rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2", children: isProcessing ? (_jsxs(_Fragment, { children: [_jsx(RefreshCw, { className: "w-5 h-5 animate-spin" }), _jsx("span", { children: "\u0110ang x\u1EED l\u00FD..." })] })) : (_jsxs(_Fragment, { children: [_jsx("span", { children: "X\u00E1c nh\u1EADn thanh to\u00E1n" }), _jsx(ArrowRight, { className: "w-5 h-5" })] })) }), _jsxs("div", { className: "flex items-center gap-3 my-4", children: [_jsx("div", { className: "flex-1 h-px bg-gray-300" }), _jsx("span", { className: "text-sm text-gray-500 font-semibold", children: "HO\u1EB6C" }), _jsx("div", { className: "flex-1 h-px bg-gray-300" })] }), _jsxs("div", { className: "space-y-2", children: [_jsx("p", { className: "text-sm font-semibold text-gray-700 mb-3", children: "Chuy\u1EC3n sang ph\u01B0\u01A1ng th\u1EE9c thanh to\u00E1n kh\u00E1c:" }), _jsxs("button", { onClick: handleSwitchToMoMo, disabled: isProcessing, className: "w-full py-2.5 px-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white font-semibold rounded-lg transition-all duration-300 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2", children: [_jsx(CreditCard, { className: "w-4 h-4" }), "Thanh to\u00E1n b\u1EB1ng MoMo"] }), _jsxs("button", { onClick: handleSwitchToVietQR, disabled: isProcessing, className: "w-full py-2.5 px-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-lg transition-all duration-300 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2", children: [_jsx(CreditCard, { className: "w-4 h-4" }), "Thanh to\u00E1n b\u1EB1ng VietQR"] }), _jsxs("button", { onClick: handleSwitchToCOD, disabled: isProcessing, className: "w-full py-2.5 px-4 bg-gray-600 text-white font-semibold rounded-lg transition-all duration-300 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2", children: [_jsx(CreditCard, { className: "w-4 h-4" }), "Chuy\u1EC3n sang COD (Thanh to\u00E1n khi nh\u1EADn h\u00E0ng)"] })] })] })] }));
}
