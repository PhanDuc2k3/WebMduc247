import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import FavoriteButton from "../../Favorite/FavoriteButton";
import { Flame, Star, Store as StoreIcon, MapPin } from "lucide-react";
// Helper hiển thị URL ảnh
const getImageUrl = (img) => {
    if (!img)
        return "/no-image.png";
    return img.startsWith("http") ? img : `${import.meta.env.VITE_API_URL}${img}`;
};
const ProductCard = ({ product }) => {
    const navigate = useNavigate();
    useEffect(() => {
    }, [product.images]);
    // Handle click on card - navigate to product detail (mobile only)
    const handleCardClick = (e) => {
        const target = e.target;
        if (target.closest('[data-favorite-button]')) {
            return;
        }
        if (target.closest('a[href*="/products/"]')) {
            return;
        }
        const isMobile = window.innerWidth < 640 || 'ontouchstart' in window;
        if (isMobile) {
            navigate(`/products/${product._id}`);
        }
    };
    return (_jsxs("div", { onClick: handleCardClick, className: "group bg-white border border-gray-200 rounded-lg shadow-sm w-full flex flex-col cursor-pointer active:scale-[0.98] touch-manipulation hover:shadow-md transition-shadow", children: [_jsxs("div", { className: "relative overflow-hidden rounded-t-lg", children: [_jsx("img", { src: getImageUrl(product.images?.[0]), alt: product.name, className: "w-full h-28 sm:h-32 md:h-40 lg:h-48 object-cover transition-transform duration-300 group-hover:scale-105", loading: "lazy" }), product.salePrice && (_jsxs("div", { className: "absolute top-1 left-1 flex flex-col gap-0.5", children: [_jsxs("span", { className: "bg-red-600 text-white text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-full", children: ["-", Math.round((1 - product.salePrice / product.price) * 100), "%"] }), _jsxs("span", { className: "bg-orange-500 text-white text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5", children: [_jsx(Flame, { className: "w-2.5 h-2.5" }), "HOT"] })] })), _jsx("div", { className: "absolute top-1 right-1 z-20", onClick: (e) => e.stopPropagation(), "data-favorite-button": true, children: _jsx(FavoriteButton, { productId: product._id }) }), _jsx("a", { href: `/products/${product._id}`, onClick: (e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            navigate(`/products/${product._id}`);
                        }, className: "absolute bottom-1 sm:bottom-1.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-0.5 sm:py-1 rounded-full opacity-0 transform translate-y-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0 hover:from-orange-600 hover:to-orange-700 shadow-xl z-20 hidden sm:block", children: "Xem" })] }), _jsxs("div", { className: "p-1.5 sm:p-2 flex flex-col flex-1 gap-0.5 sm:gap-1", children: [_jsx("div", { className: "text-[11px] sm:text-xs font-semibold text-gray-800 line-clamp-2 leading-tight", children: product.name }), _jsxs("div", { className: "flex items-baseline gap-1", children: [_jsxs("span", { className: "text-[11px] sm:text-sm text-red-600 font-bold", children: [(product.salePrice || product.price).toLocaleString("vi-VN"), "\u20AB"] }), product.salePrice && (_jsxs("span", { className: "text-[10px] sm:text-xs text-gray-400 line-through", children: [product.price.toLocaleString("vi-VN"), "\u20AB"] }))] }), _jsxs("div", { className: "flex items-center justify-between text-[10px] sm:text-[11px] text-gray-600", children: [_jsxs("div", { className: "flex items-center gap-0.5", children: [_jsx(Star, { className: "w-2.5 h-2.5 text-yellow-400 fill-yellow-400" }), _jsx("span", { className: "font-semibold", children: product.rating?.toFixed(1) || "0" }), _jsxs("span", { className: "text-gray-500", children: ["(", product.reviewsCount ?? 0, ")"] })] }), _jsxs("span", { className: "text-gray-500", children: ["\u0110\u00E3 b\u00E1n ", product.soldCount || 0] })] }), _jsxs("div", { className: "flex items-center gap-1 text-[10px] sm:text-[11px] text-gray-500 mt-auto", children: [_jsx(StoreIcon, { className: "w-2.5 h-2.5 flex-shrink-0" }), _jsx("span", { className: "truncate", children: typeof product.store === "string" ? product.store : product.store?.name || "N/A" }), _jsxs("span", { className: "hidden sm:flex items-center gap-0.5 ml-auto flex-shrink-0", children: [_jsx(MapPin, { className: "w-2.5 h-2.5" }), product.location || "VN"] })] })] })] }));
};
export default ProductCard;
