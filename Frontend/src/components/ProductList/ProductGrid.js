import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React from "react";
const ProductGrid = ({ products }) => {
    return (_jsx("div", { className: "grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4", children: products.map((p) => (_jsxs("div", { className: "border rounded-xl p-4 bg-white hover:shadow-md transition", children: [_jsx("img", { src: p.images?.[0] || "/placeholder.jpg", alt: p.name, className: "h-40 w-full object-cover rounded-lg mb-3" }), _jsx("h3", { className: "font-semibold text-lg truncate", children: p.name }), _jsx("p", { className: "text-gray-500 text-sm mb-2", children: p.brand }), _jsx("p", { className: "font-bold text-gray-900", children: p.salePrice ? (_jsxs(_Fragment, { children: [_jsxs("span", { className: "text-red-600 mr-2", children: [p.salePrice.toLocaleString(), "\u20AB"] }), _jsxs("span", { className: "text-gray-400 line-through text-sm", children: [p.price.toLocaleString(), "\u20AB"] })] })) : (`${p.price.toLocaleString()}₫`) })] }, p._id))) }));
};
export default ProductGrid;
