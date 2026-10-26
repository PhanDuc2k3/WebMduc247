import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
import { Package } from "lucide-react";
const Subtotal = ({ subtotal }) => {
    return (_jsxs("div", { className: "flex justify-between items-center text-gray-900 mb-3 gap-2", children: [_jsxs("span", { className: "font-semibold flex items-center gap-2 text-sm sm:text-base", children: [_jsx(Package, { className: "w-4 h-4 sm:w-5 sm:h-5" }), "T\u1EA1m t\u00EDnh"] }), _jsxs("span", { className: "font-bold text-base sm:text-lg break-words", children: [subtotal.toLocaleString("vi-VN"), "\u20AB"] })] }));
};
export default Subtotal;
