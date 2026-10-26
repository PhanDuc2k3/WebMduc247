import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState } from 'react';
import ContentBreadcrumb from '../../components/ui/ContentBreadcrumb';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { XCircle } from 'lucide-react';
import orderApi from '../../api/orderApi';
import paymentApi from '../../api/paymentApi';
import walletApi from '../../api/walletApi';
import { toast } from 'react-toastify';
const PaymentQR = () => {
    const [vietqrData, setVietqrData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [paymentStatus, setPaymentStatus] = useState('pending');
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const orderCode = searchParams.get('orderCode');
    const type = searchParams.get('type'); // "deposit" nếu là nạp tiền vào ví
    useEffect(() => {
        // Lấy dữ liệu QR từ localStorage
        const saved = localStorage.getItem('vietqrData');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                setVietqrData(data);
                setLoading(false);
            }
            catch (err) {
                console.error('Lỗi parse vietqrData:', err);
                setLoading(false);
            }
        }
        else {
            setLoading(false);
        }
        // Kiểm tra nếu là nạp tiền (không phải đơn hàng)
        const isDeposit = type === 'deposit' || (orderCode && orderCode.startsWith('DEP-'));
        // Polling để check trạng thái thanh toán (chỉ cho đơn hàng thực, không phải nạp tiền)
        if (orderCode && !isDeposit) {
            const checkPayment = async () => {
                try {
                    const res = await orderApi.getOrderByCode(orderCode);
                    const data = res.data;
                    if (data.paymentInfo?.status === 'paid') {
                        setPaymentStatus('paid');
                        localStorage.removeItem('vietqrData');
                        setTimeout(() => {
                            navigate(`/order/${data._id}`);
                        }, 2000);
                    }
                }
                catch (err) {
                    console.error('Check payment failed:', err);
                }
            };
            // Check ngay lập tức
            checkPayment();
            // Polling mỗi 3 giây
            const intervalId = window.setInterval(checkPayment, 3000);
            const timeoutId = window.setTimeout(() => {
                clearInterval(intervalId);
            }, 300000); // 5 phút
            return () => {
                clearInterval(intervalId);
                clearTimeout(timeoutId);
            };
        }
    }, [orderCode, navigate, type]);
    const handleMarkPaid = async () => {
        if (!orderCode)
            return;
        setPaymentStatus('checking');
        try {
            // Nếu là nạp tiền vào ví
            if (type === 'deposit') {
                const walletDeposit = localStorage.getItem('walletDeposit');
                if (walletDeposit) {
                    const depositInfo = JSON.parse(walletDeposit);
                    // Nạp tiền vào ví
                    await walletApi.deposit({
                        amount: depositInfo.amount,
                        method: 'vietqr',
                        orderCode: depositInfo.orderCode,
                        description: 'Nạp tiền vào ví qua VietQR',
                    });
                    localStorage.removeItem('walletDeposit');
                    localStorage.removeItem('vietqrData');
                    setPaymentStatus('paid');
                    setTimeout(() => {
                        navigate('/wallet');
                    }, 1500);
                    return;
                }
            }
            // Xử lý thanh toán đơn hàng bình thường
            await paymentApi.markOrderPaid(orderCode);
            // Kiểm tra lại trạng thái
            const res = await orderApi.getOrderByCode(orderCode);
            const data = res.data;
            setPaymentStatus('paid');
            localStorage.removeItem('vietqrData');
            setTimeout(() => {
                navigate(`/order/${data._id}`);
            }, 1500);
        }
        catch (err) {
            console.error('Mark paid failed:', err);
            toast.error(_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(XCircle, { className: "text-red-500", size: 18 }), _jsx("span", { children: err.response?.data?.message || 'Không thể đánh dấu đã thanh toán' })] }));
            setPaymentStatus('pending');
        }
    };
    if (loading) {
        return (_jsx("div", { className: "min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600 mx-auto mb-4" }), _jsx("p", { className: "text-gray-600 text-lg", children: "\u0110ang t\u1EA3i th\u00F4ng tin thanh to\u00E1n..." })] }) }));
    }
    if (!vietqrData) {
        return (_jsx("div", { className: "min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50", children: _jsxs("div", { className: "bg-white rounded-2xl shadow-xl p-8 max-w-md text-center", children: [_jsx("div", { className: "text-6xl mb-4", children: "\u26A0\uFE0F" }), _jsx("h2", { className: "text-2xl font-bold text-gray-900 mb-4", children: "Kh\u00F4ng t\u00ECm th\u1EA5y th\u00F4ng tin QR code" }), _jsx("p", { className: "text-gray-600 mb-6", children: "Vui l\u00F2ng quay l\u1EA1i trang thanh to\u00E1n v\u00E0 th\u1EED l\u1EA1i." }), _jsx("button", { onClick: () => navigate('/checkout'), className: "px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors", children: "Quay l\u1EA1i thanh to\u00E1n" })] }) }));
    }
    if (paymentStatus === 'paid') {
        return (_jsx("div", { className: "min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50", children: _jsxs("div", { className: "bg-white rounded-2xl shadow-xl p-8 max-w-md text-center", children: [_jsx("div", { className: "text-6xl mb-4", children: "\u2705" }), _jsx("h2", { className: "text-2xl font-bold text-gray-900 mb-4", children: "Thanh to\u00E1n th\u00E0nh c\u00F4ng!" }), _jsx("p", { className: "text-gray-600 mb-6", children: "\u0110ang chuy\u1EC3n \u0111\u1EBFn trang \u0111\u01A1n h\u00E0ng..." }), _jsx("div", { className: "animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-600 mx-auto" })] }) }));
    }
    return (_jsx("div", { className: "min-h-screen py-8 px-4 bg-gradient-to-br from-blue-50 via-white to-purple-50", children: _jsxs("div", { className: "max-w-2xl mx-auto", children: [_jsx(ContentBreadcrumb, { items: [{ label: "Giỏ hàng", to: "/cart" }, { label: "Thanh toán VietQR" }] }), _jsxs("div", { className: "bg-white rounded-2xl shadow-2xl overflow-hidden", children: [_jsxs("div", { className: "bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white text-center", children: [_jsx("h1", { className: "text-3xl font-bold mb-2", children: "Thanh to\u00E1n b\u1EB1ng VietQR" }), _jsx("p", { className: "text-white/90", children: "Qu\u00E9t m\u00E3 QR \u0111\u1EC3 thanh to\u00E1n" })] }), _jsxs("div", { className: "p-8 space-y-6", children: [_jsxs("div", { className: "flex flex-col items-center", children: [_jsx("div", { className: "bg-white p-6 rounded-2xl shadow-lg border-4 border-blue-200 mb-4", children: _jsx("img", { src: vietqrData.qrCodeUrl, alt: "VietQR Code", className: "w-64 h-64 object-contain", onError: (e) => {
                                                    console.error('Lỗi tải QR code');
                                                    e.target.src = 'https://via.placeholder.com/256?text=QR+Code+Error';
                                                } }) }), _jsx("p", { className: "text-sm text-gray-500 text-center max-w-xs", children: "M\u1EDF \u1EE9ng d\u1EE5ng ng\u00E2n h\u00E0ng tr\u00EAn \u0111i\u1EC7n tho\u1EA1i v\u00E0 qu\u00E9t m\u00E3 QR \u0111\u1EC3 thanh to\u00E1n" })] }), _jsxs("div", { className: "bg-gray-50 rounded-xl p-6 space-y-4 border-2 border-gray-200", children: [_jsx("h2", { className: "text-xl font-bold text-gray-900 mb-4", children: "Th\u00F4ng tin thanh to\u00E1n" }), _jsxs("div", { className: "flex justify-between items-center py-2 border-b border-gray-300", children: [_jsx("span", { className: "text-gray-600 font-semibold", children: "M\u00E3 \u0111\u01A1n h\u00E0ng:" }), _jsx("span", { className: "text-gray-900 font-bold", children: vietqrData.orderCode })] }), _jsxs("div", { className: "flex justify-between items-center py-2 border-b border-gray-300", children: [_jsx("span", { className: "text-gray-600 font-semibold", children: "S\u1ED1 ti\u1EC1n:" }), _jsxs("span", { className: "text-green-600 font-bold text-xl", children: [vietqrData.amount.toLocaleString('vi-VN'), "\u20AB"] })] }), _jsxs("div", { className: "flex justify-between items-center py-2 border-b border-gray-300", children: [_jsx("span", { className: "text-gray-600 font-semibold", children: "S\u1ED1 t\u00E0i kho\u1EA3n:" }), _jsx("span", { className: "text-gray-900 font-bold", children: vietqrData.accountNo })] }), _jsxs("div", { className: "flex justify-between items-center py-2 border-b border-gray-300", children: [_jsx("span", { className: "text-gray-600 font-semibold", children: "Ch\u1EE7 t\u00E0i kho\u1EA3n:" }), _jsx("span", { className: "text-gray-900 font-bold", children: vietqrData.accountName })] }), _jsxs("div", { className: "flex justify-between items-start py-2", children: [_jsx("span", { className: "text-gray-600 font-semibold", children: "N\u1ED9i dung:" }), _jsx("span", { className: "text-gray-900 font-bold text-right max-w-xs", children: vietqrData.orderInfo })] })] }), _jsxs("div", { className: "bg-blue-50 border-2 border-blue-200 rounded-xl p-6", children: [_jsxs("h3", { className: "font-bold text-blue-900 mb-3 flex items-center gap-2", children: [_jsx("span", { children: "\uD83D\uDCF1" }), " H\u01B0\u1EDBng d\u1EABn thanh to\u00E1n"] }), _jsxs("ol", { className: "list-decimal list-inside space-y-2 text-blue-800 text-sm", children: [_jsx("li", { children: "M\u1EDF \u1EE9ng d\u1EE5ng ng\u00E2n h\u00E0ng tr\u00EAn \u0111i\u1EC7n tho\u1EA1i" }), _jsx("li", { children: "Ch\u1ECDn ch\u1EE9c n\u0103ng \"Qu\u00E9t QR\" ho\u1EB7c \"Thanh to\u00E1n QR\"" }), _jsx("li", { children: "Qu\u00E9t m\u00E3 QR \u1EDF tr\u00EAn" }), _jsx("li", { children: "X\u00E1c nh\u1EADn th\u00F4ng tin v\u00E0 ho\u00E0n t\u1EA5t thanh to\u00E1n" }), _jsx("li", { children: "Nh\u1EA5n n\u00FAt \"T\u00F4i \u0111\u00E3 thanh to\u00E1n\" b\u00EAn d\u01B0\u1EDBi sau khi thanh to\u00E1n th\u00E0nh c\u00F4ng" })] })] }), _jsxs("div", { className: "flex flex-col gap-4 pt-4", children: [_jsx("button", { onClick: handleMarkPaid, disabled: paymentStatus === 'checking', className: `w-full py-4 px-6 rounded-xl font-bold text-lg transition-all duration-300 ${paymentStatus === 'checking'
                                                ? 'bg-gray-400 cursor-not-allowed'
                                                : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105'}`, children: paymentStatus === 'checking' ? (_jsxs("span", { className: "flex items-center justify-center gap-2", children: [_jsx("div", { className: "animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white" }), "\u0110ang ki\u1EC3m tra..."] })) : ('✅ Tôi đã thanh toán') }), _jsx("button", { onClick: () => navigate('/checkout'), className: "w-full py-3 px-6 rounded-xl font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors", children: "Quay l\u1EA1i thanh to\u00E1n" })] }), _jsx("div", { className: "bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4", children: _jsx("p", { className: "text-yellow-800 text-sm text-center", children: "\u26A0\uFE0F Vui l\u00F2ng ch\u1EC9 nh\u1EA5n \"T\u00F4i \u0111\u00E3 thanh to\u00E1n\" sau khi b\u1EA1n \u0111\u00E3 ho\u00E0n t\u1EA5t thanh to\u00E1n trong \u1EE9ng d\u1EE5ng ng\u00E2n h\u00E0ng" }) })] })] })] }) }));
};
export default PaymentQR;
