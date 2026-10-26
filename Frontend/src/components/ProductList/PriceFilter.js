import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { toast } from "react-toastify";
const PriceFilter = ({ selectedPrice, setSelectedPrice, }) => {
    const [price, setPrice] = useState(25); // giá tối đa (triệu)
    const [isPopupOpen, setIsPopupOpen] = useState(false);
    const [minPrice, setMinPrice] = useState("");
    const [maxPrice, setMaxPrice] = useState("");
    // Thanh trượt giá tối đa
    const handleSliderChange = (e) => {
        const value = Number(e.target.value);
        setPrice(value);
        setSelectedPrice(`0-${value * 1_000_000}`);
    };
    const handleReset = () => {
        setSelectedPrice("");
        setPrice(25);
        setMinPrice("");
        setMaxPrice("");
    };
    // Format số có dấu chấm
    const formatNumber = (value) => {
        if (value === "" || isNaN(Number(value)))
            return "";
        return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    };
    // Xử lý nhập giá
    const handleMinChange = (e) => {
        const raw = e.target.value.replace(/\D/g, "");
        setMinPrice(raw === "" ? "" : Number(raw));
    };
    const handleMaxChange = (e) => {
        const raw = e.target.value.replace(/\D/g, "");
        setMaxPrice(raw === "" ? "" : Number(raw));
    };
    const handleApplyRange = () => {
        if (minPrice === "" || maxPrice === "") {
            toast.warning(_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(AlertTriangle, { className: "text-yellow-500", size: 18 }), _jsx("span", { children: "Vui l\u00F2ng nh\u1EADp \u0111\u1EA7y \u0111\u1EE7 gi\u00E1 t\u1ED1i thi\u1EC3u v\u00E0 t\u1ED1i \u0111a!" })] }));
            return;
        }
        if (Number(minPrice) < 0 || Number(maxPrice) < 0) {
            toast.warning(_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(AlertTriangle, { className: "text-yellow-500", size: 18 }), _jsx("span", { children: "Gi\u00E1 kh\u00F4ng \u0111\u01B0\u1EE3c \u00E2m!" })] }));
            return;
        }
        if (Number(minPrice) >= Number(maxPrice)) {
            toast.warning(_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(AlertTriangle, { className: "text-yellow-500", size: 18 }), _jsx("span", { children: "Gi\u00E1 t\u1ED1i thi\u1EC3u ph\u1EA3i nh\u1ECF h\u01A1n gi\u00E1 t\u1ED1i \u0111a!" })] }));
            return;
        }
        setSelectedPrice(`${minPrice}-${maxPrice}`);
        setIsPopupOpen(false);
    };
    return (_jsxs("div", { className: "w-full", children: [_jsxs("div", { className: "mb-6 p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border border-blue-100", children: [_jsxs("div", { className: "flex items-center justify-between mb-3", children: [_jsx("span", { className: "text-sm font-semibold text-gray-700", children: "Kho\u1EA3ng gi\u00E1:" }), _jsxs("span", { className: "font-bold text-lg text-blue-600", children: ["0 - ", (price * 1_000_000).toLocaleString("vi-VN"), "\u20AB"] })] }), _jsx("input", { type: "range", min: "0", max: "50", step: "1", value: price, onChange: handleSliderChange, style: {
                            background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(price / 50) * 100}%, #e0e7ff ${(price / 50) * 100}%, #e0e7ff 100%)`,
                        }, className: "w-full h-3 rounded-lg appearance-none cursor-pointer" })] }), _jsx("div", { className: "flex flex-col gap-2 mb-6", children: [
                    { label: "Dưới 1 triệu", value: "duoi1tr" },
                    { label: "Từ 1 - 5 triệu", value: "1-5tr" },
                    { label: "Từ 5 - 10 triệu", value: "5-10tr" },
                    { label: "Trên 10 triệu", value: "tren10tr" },
                ].map((opt) => (_jsxs("label", { className: `flex items-center gap-3 cursor-pointer p-3 rounded-lg border-2 transition-all duration-300 ${selectedPrice === opt.value
                        ? "border-blue-500 bg-gradient-to-r from-blue-50 to-purple-50 text-blue-600 font-semibold shadow-md"
                        : "border-gray-200 hover:border-blue-300 hover:bg-gray-50 text-gray-700"}`, children: [_jsx("input", { type: "radio", name: "price", value: opt.value, checked: selectedPrice === opt.value, onChange: (e) => setSelectedPrice(e.target.value), className: "accent-blue-500 w-4 h-4" }), _jsx("span", { className: "text-sm font-medium flex-1", children: opt.label })] }, opt.value))) }), _jsxs("div", { className: "flex flex-col gap-3", children: [_jsx("button", { onClick: handleReset, className: "w-full px-4 py-2.5 text-sm font-semibold rounded-xl border-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-300 shadow-sm hover:shadow-md", children: "X\u00F3a l\u1ECDc" }), _jsx("button", { onClick: () => setIsPopupOpen(true), className: "w-full px-4 py-2.5 text-sm font-semibold rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600 transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105", children: "L\u1ECDc kho\u1EA3ng gi\u00E1 t\u00F9y ch\u1EC9nh" })] }), isPopupOpen && (_jsx("div", { className: "fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in p-4", children: _jsxs("div", { className: "bg-white rounded-2xl p-4 md:p-8 w-full max-w-md shadow-2xl animate-scale-in border border-gray-200 max-h-[90vh] overflow-y-auto", children: [_jsxs("div", { className: "flex items-center justify-between mb-4 md:mb-6", children: [_jsx("h3", { className: "text-xl md:text-2xl font-bold text-gray-900", children: "Nh\u1EADp kho\u1EA3ng gi\u00E1" }), _jsx("button", { onClick: () => setIsPopupOpen(false), className: "w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all duration-300 text-gray-600 hover:text-gray-900 text-xl", children: "\u00D7" })] }), _jsxs("div", { className: "flex flex-col gap-4 md:gap-5 mb-4 md:mb-6", children: [_jsxs("div", { children: [_jsx("label", { className: "text-sm font-semibold text-gray-700 mb-2 block", children: "Gi\u00E1 t\u1ED1i thi\u1EC3u" }), _jsx("input", { type: "text", value: formatNumber(minPrice), onChange: handleMinChange, placeholder: "VD: 0", className: "w-full border-2 border-gray-200 rounded-xl p-3 text-base md:text-lg mt-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-300 text-gray-700" })] }), _jsxs("div", { children: [_jsx("label", { className: "text-sm font-semibold text-gray-700 mb-2 block", children: "Gi\u00E1 t\u1ED1i \u0111a" }), _jsx("input", { type: "text", value: formatNumber(maxPrice), onChange: handleMaxChange, placeholder: "VD: 20.000.000", className: "w-full border-2 border-gray-200 rounded-xl p-3 text-base md:text-lg mt-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-300 text-gray-700" })] })] }), _jsxs("div", { className: "flex flex-col sm:flex-row justify-end gap-3", children: [_jsx("button", { onClick: () => setIsPopupOpen(false), className: "w-full sm:w-auto px-6 py-3 text-sm font-semibold border-2 border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 hover:border-gray-400 transition-all duration-300", children: "H\u1EE7y" }), _jsx("button", { onClick: handleApplyRange, className: "w-full sm:w-auto px-6 py-3 text-sm font-semibold bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl hover:from-blue-600 hover:to-purple-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105", children: "\u00C1p d\u1EE5ng" })] })] }) }))] }));
};
export default PriceFilter;
