import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
import { useNavigate } from "react-router-dom";
import { Package, MapPin, CreditCard, Phone, ExternalLink, ShoppingBag } from "lucide-react";
const OrderMessageCard = ({ message, isMine = false }) => {
    const navigate = useNavigate();
    // Parse message để extract thông tin order
    const parseOrderMessage = (text) => {
        if (!text)
            return {
                orderCode: "",
                products: [],
                subtotal: "",
                shippingFee: "",
                discount: "",
                total: "",
                paymentMethod: "",
                status: "",
                address: null,
                orderLink: "",
            };
        // 1. Order Code
        const orderCodeMatch = text.match(/#([A-Z0-9-]+)/);
        const orderCode = orderCodeMatch ? orderCodeMatch[1] : "";
        // 2. Sản phẩm
        const productsSection = text.match(/(?:🛍️\s*)?Sản phẩm:\s*\n((?:\d+\.\s*.+?\s*x\d+\s*-\s*.+?₫\s*\n?)+)/);
        const products = [];
        if (productsSection) {
            const productLines = productsSection[1].trim().split("\n").filter(line => line.trim());
            productLines.forEach((line) => {
                const match = line.match(/\d+\.\s*(.+?)\s*x(\d+)\s*-\s*(.+?₫)/);
                if (match) {
                    products.push({
                        name: match[1].trim(),
                        quantity: parseInt(match[2]),
                        price: match[3].trim(),
                    });
                }
            });
        }
        // 3. Chi tiết thanh toán
        const chiTietSection = text.match(/(?:💰\s*)?Chi tiết thanh toán:\s*\n((?:[- ]*.+?:\s*.+?₫\s*\n?)+)/);
        let subtotal = "";
        let shippingFee = "";
        let discount = "";
        let total = "";
        if (chiTietSection) {
            const lines = chiTietSection[1].split("\n").filter(line => line.trim());
            lines.forEach((line) => {
                // Xử lý dòng có thể có dấu "-" ở đầu
                const cleanLine = line.replace(/^-\s*/, "").trim();
                if (cleanLine.includes("Tạm tính:")) {
                    const match = cleanLine.match(/Tạm tính:\s*(.+?₫)/);
                    if (match)
                        subtotal = match[1].trim();
                }
                else if (cleanLine.includes("Phí vận chuyển:")) {
                    const match = cleanLine.match(/Phí vận chuyển:\s*(.+?₫)/);
                    if (match)
                        shippingFee = match[1].trim();
                }
                else if (cleanLine.includes("Giảm giá:")) {
                    const match = cleanLine.match(/Giảm giá:\s*-?(.+?₫)/);
                    if (match)
                        discount = match[1].trim();
                }
                else if (cleanLine.includes("Tổng tiền:")) {
                    const match = cleanLine.match(/Tổng tiền:\s*(.+?₫)/);
                    if (match)
                        total = match[1].trim();
                }
            });
        }
        // 4. Phương thức thanh toán
        const paymentMethodMatch = text.match(/(?:💳\s*)?Phương thức thanh toán:\s*(.+?)(?:\n|$)/);
        const paymentMethod = paymentMethodMatch ? paymentMethodMatch[1].trim() : "";
        // 5. Trạng thái
        const statusMatch = text.match(/(?:📊\s*)?Trạng thái:\s*(.+?)(?:\n|$)/);
        const status = statusMatch ? statusMatch[1].trim() : "";
        // 6. Địa chỉ giao hàng
        const addressSection = text.match(/(?:📍\s*)?Địa chỉ giao hàng:\s*\n\s*(.+?)\s*\n\s*(.+?)\s*\n\s*(.+?)\s*(?:\n\s*\n|(?:\n|$))/s);
        const address = addressSection
            ? {
                fullName: addressSection[1].trim(),
                phone: addressSection[2].trim(),
                address: addressSection[3].trim(),
            }
            : null;
        // 7. Link
        const linkMatch = text.match(/(?:🔗\s*)?Xem chi tiết đơn hàng:\s*(https?:\/\/[^\s\n]+)/);
        const orderLink = linkMatch ? linkMatch[1].trim() : "";
        return {
            orderCode,
            products,
            subtotal,
            shippingFee,
            discount,
            total,
            paymentMethod,
            status,
            address,
            orderLink,
        };
    };
    const orderInfo = parseOrderMessage(message);
    // Chỉ hiển thị card nếu có order code
    if (!orderInfo.orderCode) {
        return (_jsx("div", { className: "font-medium whitespace-pre-wrap text-xs sm:text-sm md:text-base", children: message }));
    }
    const statusColors = {
        "Chờ xử lý": "bg-yellow-100 text-yellow-700",
        "Đã xác nhận": "bg-blue-100 text-blue-700",
        "Đã đóng gói": "bg-purple-100 text-purple-700",
        "Đang giao hàng": "bg-purple-100 text-purple-700",
        "Đã giao hàng": "bg-green-100 text-green-700",
        "Đã nhận hàng": "bg-green-100 text-green-700",
        "Hoàn thành": "bg-green-100 text-green-700",
        "Đã hủy": "bg-red-100 text-red-700",
        "pending": "bg-yellow-100 text-yellow-700",
        "confirmed": "bg-blue-100 text-blue-700",
        "packed": "bg-purple-100 text-purple-700",
        "shipping": "bg-purple-100 text-purple-700",
        "shipped": "bg-purple-100 text-purple-700",
        "delivered": "bg-green-100 text-green-700",
        "received": "bg-green-100 text-green-700",
        "completed": "bg-green-100 text-green-700",
        "cancelled": "bg-red-100 text-red-700",
    };
    const handleViewOrder = () => {
        if (orderInfo.orderLink) {
            // Nếu là internal link, navigate
            if (orderInfo.orderLink.includes(window.location.origin) || orderInfo.orderLink.startsWith('/')) {
                const url = new URL(orderInfo.orderLink, window.location.origin);
                const path = url.pathname;
                navigate(path);
            }
            else {
                // Nếu là external link, mở tab mới
                window.open(orderInfo.orderLink, '_blank');
            }
        }
    };
    return (_jsx("div", { className: "w-full max-w-full", children: _jsxs("div", { className: `rounded sm:rounded-md overflow-hidden border shadow-sm transition-all duration-300 hover:shadow ${isMine
                ? "bg-[#4B5563]/5 border-[#4B5563]/40"
                : "bg-white border-gray-200"}`, children: [_jsx("div", { className: `px-1.5 sm:px-2 md:px-3 py-0.5 sm:py-1 md:py-1.5 flex items-center justify-between ${isMine
                        ? "bg-[#4B5563] text-white"
                        : "bg-[#4B5563]/90 text-white"}`, children: _jsxs("div", { className: "flex items-center gap-1 min-w-0", children: [_jsx(Package, { className: "w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-4 md:h-4 flex-shrink-0" }), _jsxs("span", { className: "font-bold text-[9px] sm:text-[10px] md:text-base truncate", children: ["\u0110\u01A1n h\u00E0ng #", orderInfo.orderCode] })] }) }), _jsxs("div", { className: "p-1 sm:p-1.5 md:p-2 space-y-0.5 sm:space-y-1 md:space-y-1.5", children: [orderInfo.products.length > 0 && (_jsxs("div", { className: "bg-white/60 border border-gray-200 rounded p-0.5 sm:p-1 md:p-1.5", children: [_jsxs("h4", { className: "font-semibold text-gray-900 text-[9px] sm:text-[10px] md:text-base mb-0.5 md:mb-1 flex items-center gap-0.5 md:gap-1", children: [_jsx(ShoppingBag, { className: "w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 text-gray-700 flex-shrink-0" }), _jsx("span", { children: "S\u1EA3n ph\u1EA9m" })] }), _jsx("div", { className: "space-y-0.5 md:space-y-1", children: orderInfo.products.map((product, index) => (_jsxs("div", { className: "flex justify-between items-start gap-1 md:gap-1.5 p-0.5 sm:p-1 md:p-1.5 bg-white/50 rounded", children: [_jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("p", { className: "font-medium text-gray-900 text-[9px] sm:text-[10px] md:text-base truncate", children: product.name }), _jsxs("p", { className: "text-[8px] sm:text-[9px] md:text-sm text-gray-500", children: ["x", product.quantity] })] }), _jsx("p", { className: "font-semibold text-[#4B5563] text-[9px] sm:text-[10px] md:text-base whitespace-nowrap flex-shrink-0", children: product.price })] }, index))) })] })), _jsxs("div", { className: "bg-white/60 border border-gray-200 rounded p-0.5 sm:p-1 md:p-1.5", children: [_jsxs("h4", { className: "font-semibold text-gray-900 text-[9px] sm:text-[10px] md:text-base mb-0.5 md:mb-1 flex items-center gap-0.5 md:gap-1", children: [_jsx(CreditCard, { className: "w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 text-gray-700 flex-shrink-0" }), _jsx("span", { children: "Chi ti\u1EBFt thanh to\u00E1n" })] }), _jsxs("div", { className: "space-y-0.5 md:space-y-1 text-[9px] sm:text-[10px] md:text-base", children: [orderInfo.subtotal && (_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-gray-600", children: "T\u1EA1m t\u00EDnh:" }), _jsx("span", { className: "font-medium text-gray-900", children: orderInfo.subtotal })] })), orderInfo.shippingFee && (_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-gray-600", children: "Ph\u00ED v\u1EADn chuy\u1EC3n:" }), _jsx("span", { className: "font-medium text-gray-900", children: orderInfo.shippingFee })] })), orderInfo.discount && (_jsxs("div", { className: "flex justify-between text-green-600", children: [_jsx("span", { children: "Gi\u1EA3m gi\u00E1:" }), _jsxs("span", { className: "font-medium", children: ["-", orderInfo.discount] })] })), orderInfo.total && (_jsxs("div", { className: "flex justify-between pt-0.5 md:pt-1 border-t border-gray-300 mt-0.5 md:mt-1", children: [_jsx("span", { className: "font-bold text-[9px] sm:text-[10px] md:text-base text-gray-900", children: "T\u1ED5ng:" }), _jsx("span", { className: "font-bold text-[9px] sm:text-[10px] md:text-base text-red-600", children: orderInfo.total })] }))] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-0.5 sm:gap-1 md:gap-1.5", children: [orderInfo.paymentMethod && (_jsxs("div", { className: "bg-white/60 border border-gray-200 rounded p-0.5 sm:p-1 md:p-1.5", children: [_jsx("p", { className: "text-[8px] sm:text-[9px] md:text-sm text-gray-600 mb-0.5 md:mb-1 font-medium", children: "Ph\u01B0\u01A1ng th\u1EE9c" }), _jsx("p", { className: "font-semibold text-gray-900 text-[9px] sm:text-[10px] md:text-base truncate", children: orderInfo.paymentMethod })] })), orderInfo.status && (_jsxs("div", { className: "bg-white/60 border border-gray-200 rounded p-0.5 sm:p-1 md:p-1.5", children: [_jsx("p", { className: "text-[8px] sm:text-[9px] md:text-sm text-gray-600 mb-0.5 md:mb-1 font-medium", children: "Tr\u1EA1ng th\u00E1i" }), _jsx("span", { className: `inline-block px-0.5 py-0.5 sm:px-1 sm:py-0.5 md:px-1.5 md:py-1 rounded-full text-[8px] sm:text-[9px] md:text-sm font-semibold ${statusColors[orderInfo.status] || "bg-gray-100 text-gray-800"}`, children: orderInfo.status })] }))] }), orderInfo.address && (_jsxs("div", { className: "bg-white/60 border border-gray-200 rounded p-0.5 sm:p-1 md:p-1.5", children: [_jsxs("h4", { className: "font-semibold text-gray-900 text-[9px] sm:text-[10px] md:text-base mb-0.5 md:mb-1 flex items-center gap-0.5 md:gap-1", children: [_jsx(MapPin, { className: "w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 text-green-600 flex-shrink-0" }), _jsx("span", { children: "Giao \u0111\u1EBFn" })] }), _jsxs("div", { className: "text-[9px] sm:text-[10px] md:text-base text-gray-700 space-y-0.5 md:space-y-1", children: [_jsx("p", { className: "font-medium text-gray-900 text-[9px] sm:text-[10px] md:text-base", children: orderInfo.address.fullName }), _jsxs("p", { className: "flex items-center gap-0.5 md:gap-1 text-gray-600 break-all", children: [_jsx(Phone, { className: "w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 text-gray-500 flex-shrink-0" }), _jsx("span", { className: "text-[8px] sm:text-[9px] md:text-sm", children: orderInfo.address.phone })] }), _jsx("p", { className: "text-[9px] sm:text-[10px] md:text-base break-words text-gray-600 leading-tight md:leading-normal", children: orderInfo.address.address })] })] })), orderInfo.orderLink && (_jsxs("button", { onClick: handleViewOrder, className: "w-full py-0.5 sm:py-1 md:py-1.5 px-1.5 sm:px-2 md:px-3 rounded font-semibold text-white text-[9px] sm:text-[10px] md:text-base transition-all duration-300 shadow-sm hover:shadow md:hover:shadow-md transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-0.5 md:gap-1 bg-[#4B5563] hover:bg-[#374151]", children: [_jsx(ExternalLink, { className: "w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 flex-shrink-0" }), _jsx("span", { children: "Xem chi ti\u1EBFt" })] }))] })] }) }));
};
export default OrderMessageCard;
