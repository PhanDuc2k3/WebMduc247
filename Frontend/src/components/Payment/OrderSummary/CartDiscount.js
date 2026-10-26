import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
const CartDiscount = ({ voucherDiscount = 0 }) => {
    if (voucherDiscount <= 0)
        return null; // không hiển thị nếu không có voucher
    return (_jsxs("div", { className: "flex justify-between items-center bg-green-50 border-2 border-green-200 rounded-lg sm:rounded-xl p-3 sm:p-4 mb-3 gap-2", children: [_jsx("span", { className: "font-semibold text-green-700 flex items-center gap-2 text-xs sm:text-sm", children: "Gi\u1EA3m gi\u00E1 Voucher" }), _jsxs("span", { className: "text-red-600 font-bold text-base sm:text-lg break-words", children: ["-", voucherDiscount.toLocaleString("vi-VN"), "\u20AB"] })] }));
};
export default CartDiscount;
