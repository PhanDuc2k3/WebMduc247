import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
import { Building2 } from "lucide-react";
const PlatformFee = ({ platformFee }) => {
    if (platformFee <= 0)
        return null;
    return (_jsxs("div", { className: "flex justify-between items-center bg-purple-50 border-2 border-purple-200 rounded-lg sm:rounded-xl p-3 sm:p-4 mb-3 gap-2", children: [_jsxs("span", { className: "font-semibold text-purple-700 flex items-center gap-2 text-xs sm:text-sm", children: [_jsx(Building2, { className: "w-4 h-4 sm:w-5 sm:h-5" }), "Ph\u00ED s\u00E0n (10%)"] }), _jsxs("span", { className: "text-purple-600 font-bold text-base sm:text-lg break-words", children: [platformFee.toLocaleString("vi-VN"), "\u20AB"] })] }));
};
export default PlatformFee;
