import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// StoreOverview.tsx
import React from "react";
import { Info, Tag as TagIcon } from "lucide-react";
const StoreOverview = ({ store }) => {
    if (!store)
        return null;
    return (_jsxs("div", { className: "bg-white rounded-xl md:rounded-2xl shadow-lg border-2 border-gray-100 p-4 md:p-6 lg:p-8 animate-fade-in-up", children: [_jsxs("div", { className: "flex items-center gap-2 sm:gap-3 pb-4 md:pb-6", children: [_jsx(Info, { className: "w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-blue-600 flex-shrink-0" }), _jsx("h2", { className: "text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900", children: "Th\u00F4ng tin c\u1EEDa h\u00E0ng" })] }), _jsx("div", { className: "bg-gradient-to-br from-gray-50 to-blue-50 p-4 md:p-6 rounded-lg md:rounded-xl border border-gray-200", children: _jsx("p", { className: "text-sm md:text-base lg:text-lg text-gray-700 leading-relaxed font-medium", children: store.description || "Cửa hàng chưa có mô tả" }) }), store.customCategory && (_jsx("div", { className: "pt-4 md:pt-6", children: _jsxs("div", { className: "flex items-start gap-2 sm:gap-3 p-3 sm:p-4 bg-purple-50 rounded-lg md:rounded-xl border border-purple-200", children: [_jsx(TagIcon, { className: "w-5 h-5 sm:w-6 sm:h-6 text-purple-600 flex-shrink-0 mt-0.5" }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("p", { className: "text-xs sm:text-sm font-semibold text-gray-600 mb-1", children: "Danh m\u1EE5c" }), _jsx("p", { className: "text-sm sm:text-base text-gray-800 break-words", children: store.customCategory })] })] }) }))] }));
};
export default StoreOverview;
