import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Eye } from "lucide-react";
import { showImageFallback } from "../../utils/imageFallback";
const PromotionCard = ({ _id, title, description, tags = [], date, views = 0, imageUrl, }) => {
    const getImageUrl = (url) => {
        if (!url)
            return "/visual-placeholder.svg";
        return url.startsWith("http") ? url : `${import.meta.env.VITE_API_URL}${url}`;
    };
    return (_jsxs(Link, { to: _id ? `/promotion/${_id}` : "#", className: "canva-promotion-card block bg-white rounded-2xl border border-[#e8edf5] overflow-hidden transition-all duration-300 group animate-fade-in-up", children: [_jsxs("div", { className: "relative overflow-hidden", children: [_jsx("img", { src: getImageUrl(imageUrl), alt: title, onError: showImageFallback, className: "w-full h-56 object-cover transition-transform duration-500 group-hover:scale-110" }), _jsx("div", { className: "absolute top-0 left-0 w-full h-full bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" })] }), _jsxs("div", { className: "p-6", children: [tags.length > 0 && (_jsx("div", { className: "flex items-center gap-2 mb-3 flex-wrap", children: tags.map((tag, i) => (_jsx("span", { className: "text-xs font-bold px-3 py-1.5 rounded-full bg-[#e9edff] text-[#476de4]", children: tag }, i))) })), _jsx("h2", { className: "text-xl font-black text-[#172b49] mb-3 leading-tight group-hover:text-[#476de4] transition-colors duration-300", children: title }), _jsx("p", { className: "text-sm text-gray-700 mb-4 leading-relaxed font-medium line-clamp-3", children: description }), _jsxs("div", { className: "flex items-center justify-between text-sm mb-4 p-3 bg-gradient-to-r from-gray-50 to-[#4B5563]/10 rounded-xl", children: [_jsxs("div", { className: "flex items-center gap-2 text-gray-700 font-bold", children: [_jsx(CalendarDays, { size: 18, className: "text-[#4B5563]" }), _jsx("span", { children: date })] }), _jsxs("div", { className: "flex items-center gap-2 text-gray-700 font-bold", children: [_jsx(Eye, { size: 18, className: "text-[#4B5563]" }), _jsxs("span", { children: [views.toLocaleString(), " l\u01B0\u1EE3t xem"] })] })] }), _jsx("button", { className: "w-full bg-[#476de4] text-white py-3 rounded-xl font-bold hover:bg-[#375ac9] transition-all duration-200", children: "Xem chi ti\u1EBFt \u2192" })] })] }));
};
export default PromotionCard;
