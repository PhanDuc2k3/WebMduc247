import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
const ShippingFee = ({ shippingFee, shippingDiscount = 0 }) => {
    const finalShippingFee = Math.max(0, shippingFee - shippingDiscount);
    return (_jsxs("div", { className: "flex justify-between items-center bg-blue-50 border-2 border-blue-200 rounded-lg sm:rounded-xl p-3 sm:p-4 mb-3 gap-2", children: [_jsxs("div", { className: "flex flex-col min-w-0", children: [_jsx("span", { className: "font-semibold text-blue-700 flex items-center gap-2 text-xs sm:text-sm", children: "Ph\u00ED v\u1EADn chuy\u1EC3n" }), shippingDiscount > 0 && (_jsxs("span", { className: "text-xs text-green-600 font-semibold", children: ["Gi\u1EA3m: -", shippingDiscount.toLocaleString("vi-VN"), "\u20AB"] }))] }), _jsxs("div", { className: "flex flex-col items-end flex-shrink-0", children: [shippingDiscount > 0 && (_jsxs("span", { className: "text-xs sm:text-sm text-gray-400 line-through", children: [shippingFee.toLocaleString("vi-VN"), "\u20AB"] })), _jsxs("span", { className: "text-blue-600 font-bold text-base sm:text-lg break-words", children: [finalShippingFee.toLocaleString("vi-VN"), "\u20AB"] })] })] }));
};
export default ShippingFee;
