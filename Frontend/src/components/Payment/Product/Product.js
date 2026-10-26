import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Package, ShoppingCart } from "lucide-react";
import { Link } from "react-router-dom";
const Product = ({ selectedItems }) => {
    const items = Array.isArray(selectedItems) ? selectedItems : [];
    return (_jsxs("section", { className: "checkout-card checkout-products", children: [_jsxs("h2", { children: [_jsx(Package, {}), " S\u1EA3n ph\u1EA9m trong \u0111\u01A1n"] }), items.length === 0 ? _jsxs("div", { className: "checkout-empty", children: [_jsx(ShoppingCart, {}), " Ch\u01B0a c\u00F3 s\u1EA3n ph\u1EA9m n\u00E0o \u0111\u01B0\u1EE3c ch\u1ECDn."] }) : (_jsx("div", { className: "checkout-product-list", children: items.map((item) => {
                    const unitPrice = (item.salePrice ?? item.price ?? 0) + (item.variation?.additionalPrice || 0);
                    const image = item.imageUrl?.startsWith("http") ? item.imageUrl : `${import.meta.env.VITE_API_URL || ""}${item.imageUrl || "/image.png"}`;
                    return _jsxs("article", { children: [_jsx("img", { src: image, alt: item.name }), _jsxs("div", { children: [_jsx("strong", { children: item.name }), _jsx("span", { children: [item.variation?.color, item.variation?.size].filter(Boolean).join(" · ") || "Phân loại tiêu chuẩn" }), _jsxs("small", { children: ["\u0110\u01A1n gi\u00E1: ", unitPrice.toLocaleString("vi-VN"), "\u20AB"] })] }), _jsxs("p", { children: [_jsxs("span", { children: ["SL: ", item.quantity] }), _jsxs("strong", { children: [(item.subtotal || unitPrice * item.quantity).toLocaleString("vi-VN"), "\u20AB"] })] })] }, item._id);
                }) })), _jsx(Link, { className: "checkout-back-cart", to: "/cart", children: "\u2190 Quay l\u1EA1i gi\u1ECF h\u00E0ng" })] }));
};
export default Product;
