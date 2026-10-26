import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
const TotalAmount = ({ total }) => {
    return (_jsxs("div", { className: "flex justify-between items-center gap-2", children: [_jsx("span", { className: "text-xl sm:text-2xl font-extrabold text-gray-900 flex items-center gap-2", children: "T\u1ED5ng c\u1ED9ng" }), _jsxs("span", { className: "text-2xl sm:text-3xl font-extrabold text-red-600 break-words", children: [total.toLocaleString("vi-VN"), "\u20AB"] })] }));
};
export default TotalAmount;
