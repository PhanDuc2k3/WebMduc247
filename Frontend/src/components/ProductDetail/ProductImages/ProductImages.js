import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from "react";
const ProductImages = ({ images, mainImage, setMainImage, }) => {
    const [zoomed, setZoomed] = useState(false);
    const [zoomPosition, setZoomPosition] = useState({ x: 0, y: 0 });
    const handleMouseMove = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        setZoomPosition({ x, y });
    };
    return (_jsxs("div", { className: "w-full", children: [_jsx("div", { className: "w-full mb-6 relative group rounded-2xl overflow-hidden shadow-xl border-4 border-gray-100 hover:border-[#4B5563] transition-all duration-300 bg-white", onMouseEnter: () => setZoomed(true), onMouseLeave: () => setZoomed(false), onMouseMove: handleMouseMove, children: mainImage ? (_jsxs("div", { className: "relative w-full aspect-[3/4] bg-gray-50 overflow-hidden", children: [_jsx("img", { src: mainImage, alt: "product", className: `w-full h-full object-contain transition-transform duration-300 ${zoomed ? "scale-150" : "scale-100"}`, style: {
                                transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%`
                            } }), zoomed && (_jsx("div", { className: "absolute inset-0 bg-gradient-to-t from-black/10 to-transparent pointer-events-none" }))] })) : (_jsx("div", { className: "w-full aspect-[3/4] flex items-center justify-center border-2 border-dashed border-gray-300 rounded-xl text-gray-400 bg-gray-50", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "text-4xl mb-2 text-[#4B5563]", children: "\uD83D\uDCF7" }), _jsx("p", { className: "text-sm", children: "Ch\u01B0a c\u00F3 \u1EA3nh" })] }) })) }), _jsx("div", { className: "flex gap-3 overflow-x-auto pb-2 no-scrollbar", children: images.map((img, idx) => (_jsx("div", { className: `flex-shrink-0 w-20 h-20 rounded-xl border-4 overflow-hidden cursor-pointer transition-all duration-300 transform hover:scale-110 ${mainImage === img
                        ? "border-[#4B5563] shadow-lg ring-4 ring-[#4B5563]/30"
                        : "border-gray-200 hover:border-[#4B5563]"}`, onClick: () => setMainImage(img), children: _jsx("img", { src: img, alt: `thumb-${idx}`, className: "w-full h-full object-cover" }) }, idx))) }), images.length > 1 && (_jsxs("p", { className: "text-xs text-gray-500 mt-2 text-center", children: [images.length, " \u1EA3nh - Click \u0111\u1EC3 xem chi ti\u1EBFt"] }))] }));
};
export default ProductImages;
