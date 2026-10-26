import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { XCircle } from 'lucide-react';
import orderApi from '../../../api/orderApi';
import paymentApi from '../../../api/paymentApi';
import walletApi from '../../../api/walletApi';
import { toast } from 'react-toastify';
const PaymentSuccess = () => {
    const [status, setStatus] = useState('pending');
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    useEffect(() => {
        const token = localStorage.getItem('token');
        const orderCode = searchParams.get("orderCode");
        const paymentMethod = searchParams.get("paymentMethod");
        const type = searchParams.get("type"); // "deposit" nếu là nạp tiền vào ví
        if (!orderCode || !token) {
            setStatus("fail");
            return;
        }
        // Kiểm tra nếu là nạp tiền vào ví (orderCode bắt đầu bằng "DEP-" hoặc có type=deposit)
        const isDeposit = type === "deposit" || orderCode.startsWith("DEP-");
        // Xử lý nạp tiền vào ví
        if (isDeposit) {
            const handleWalletDeposit = async () => {
                try {
                    const walletDeposit = localStorage.getItem('walletDeposit');
                    if (!walletDeposit) {
                        setStatus("fail");
                        return;
                    }
                    const depositInfo = JSON.parse(walletDeposit);
                    const resultCode = searchParams.get("resultCode"); // MoMo resultCode
                    // Xử lý MoMo callback cho nạp tiền
                    if (resultCode === "0" || depositInfo.method === "momo") {
                        // Nạp tiền vào ví
                        await walletApi.deposit({
                            amount: depositInfo.amount,
                            method: depositInfo.method,
                            orderCode: depositInfo.orderCode,
                            paymentId: searchParams.get("transId") || "",
                            description: `Nạp tiền vào ví qua ${depositInfo.method === 'momo' ? 'MoMo' : 'VietQR'}`,
                        });
                        localStorage.removeItem('walletDeposit');
                        localStorage.removeItem('vietqrData');
                        setStatus("success");
                        setTimeout(() => {
                            navigate('/wallet');
                        }, 1500);
                        return;
                    }
                    // Xử lý VietQR cho nạp tiền (người dùng tự đánh dấu đã thanh toán)
                    if (depositInfo.method === "vietqr") {
                        // Kiểm tra xem đã đánh dấu đã thanh toán chưa
                        // Logic này có thể được xử lý ở PaymentQR page khi user nhấn "Tôi đã thanh toán"
                        setStatus("success");
                        setTimeout(() => {
                            navigate('/wallet');
                        }, 1500);
                        return;
                    }
                }
                catch (err) {
                    console.error("Lỗi nạp tiền vào ví:", err);
                    setStatus("fail");
                }
            };
            handleWalletDeposit();
            return;
        }
        const resultCode = searchParams.get("resultCode"); // MoMo
        // Xử lý VietQR - người dùng tự đánh dấu đã thanh toán hoặc polling
        if (paymentMethod === "vietqr") {
            // Với VietQR, polling để check trạng thái thanh toán
            // (vì người dùng scan QR và thanh toán, cần check manual hoặc webhook từ ngân hàng)
            const checkPayment = async () => {
                try {
                    const res = await orderApi.getOrderByCode(orderCode);
                    const data = res.data;
                    if (data.paymentInfo?.status === "paid") {
                        setStatus("success");
                        localStorage.removeItem("lastOrderId");
                        localStorage.removeItem("lastOrderCode");
                        localStorage.removeItem("vietqrData");
                        setTimeout(() => navigate(`/order/${data._id}`), 1000);
                    }
                }
                catch (err) {
                    console.error("Check VietQR payment failed:", err);
                }
            };
            // Polling mỗi 3 giây trong 5 phút
            const intervalId = window.setInterval(checkPayment, 3000);
            const timeoutId = window.setTimeout(() => {
                clearInterval(intervalId);
            }, 300000); // 5 phút
            return () => {
                clearInterval(intervalId);
                clearTimeout(timeoutId);
            };
        }
        // Xử lý MoMo callback (resultCode = "0" nghĩa là thành công)
        if (resultCode === "0") {
            const markPaid = async () => {
                try {
                    // Kiểm tra lại nếu là nạp tiền (có thể không có type parameter nhưng có DEP- orderCode)
                    if (orderCode.startsWith("DEP-")) {
                        const walletDeposit = localStorage.getItem('walletDeposit');
                        if (walletDeposit) {
                            const depositInfo = JSON.parse(walletDeposit);
                            // Nạp tiền vào ví
                            await walletApi.deposit({
                                amount: depositInfo.amount,
                                method: depositInfo.method || 'momo',
                                orderCode: depositInfo.orderCode,
                                paymentId: searchParams.get("transId") || "",
                                description: `Nạp tiền vào ví qua ${depositInfo.method === 'momo' ? 'MoMo' : 'VietQR'}`,
                            });
                            localStorage.removeItem('walletDeposit');
                            localStorage.removeItem('vietqrData');
                            setStatus("success");
                            setTimeout(() => {
                                navigate('/wallet');
                            }, 1500);
                            return;
                        }
                    }
                    // Xử lý đơn hàng bình thường
                    const res = await paymentApi.markOrderPaid(orderCode);
                    const data = res.data;
                    console.log("Order marked paid:", data);
                    setStatus("success");
                    localStorage.removeItem("lastOrderId");
                    localStorage.removeItem("lastOrderCode");
                    // redirect sang trang chi tiết đơn hàng
                    setTimeout(() => navigate(`/order/${data.orderId}`), 1000);
                }
                catch (err) {
                    console.error("Mark paid failed:", err);
                    const errorMessage = err.response?.data?.message || err.message || "Không thể đánh dấu đã thanh toán";
                    toast.error(_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(XCircle, { className: "text-red-500", size: 18 }), _jsx("span", { children: errorMessage })] }));
                    setStatus("fail");
                }
            };
            markPaid();
            return;
        }
        // Backup polling nếu resultCode != 0 hoặc tạm pending
        let intervalId;
        let timeoutId;
        const checkPayment = async () => {
            try {
                const res = await orderApi.getOrderByCode(orderCode);
                const data = res.data;
                if (data.paymentInfo?.status === "paid") {
                    setStatus("success");
                    clearInterval(intervalId);
                    clearTimeout(timeoutId);
                    localStorage.removeItem("lastOrderId");
                    localStorage.removeItem("lastOrderCode");
                    setTimeout(() => navigate(`/order/${data._id}`), 1000);
                }
                else if (data.paymentInfo?.status === "failed") {
                    setStatus("fail");
                    clearInterval(intervalId);
                    clearTimeout(timeoutId);
                }
            }
            catch (err) {
                console.error("Check payment failed:", err);
                setStatus("fail");
                clearInterval(intervalId);
                clearTimeout(timeoutId);
            }
        };
        checkPayment();
        intervalId = window.setInterval(checkPayment, 3000);
        timeoutId = window.setTimeout(() => {
            setStatus("fail");
            clearInterval(intervalId);
        }, 60000);
        return () => {
            clearInterval(intervalId);
            clearTimeout(timeoutId);
        };
    }, [searchParams, navigate]);
    if (status === 'pending')
        return _jsx("div", { children: "\u0110ang ki\u1EC3m tra thanh to\u00E1n..." });
    if (status === 'success')
        return _jsx("div", { children: "\uD83C\uDF89 Thanh to\u00E1n th\u00E0nh c\u00F4ng! \u0110ang chuy\u1EC3n t\u1EDBi chi ti\u1EBFt \u0111\u01A1n h\u00E0ng..." });
    return _jsx("div", { children: "\u274C Thanh to\u00E1n th\u1EA5t b\u1EA1i ho\u1EB7c b\u1ECB h\u1EE7y" });
};
export default PaymentSuccess;
