import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ProductCard from "./ProductCard";
import productApi from "../../../api/productApi";
const FeaturedProducts = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);
    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);
    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const res = await productApi.getFeaturedProducts();
                setProducts(res.data || []);
            }
            catch (err) {
                console.error("❌ Lỗi tải sản phẩm:", err);
                setProducts([]);
            }
            finally {
                setLoading(false);
            }
        };
        fetchProducts();
    }, []);
    if (loading)
        return _jsx("p", { className: "p-4 sm:p-6 text-center text-gray-500 text-sm sm:text-base", children: "\u23F3 \u0110ang t\u1EA3i s\u1EA3n ph\u1EA9m..." });
    if (!products.length)
        return _jsx("p", { className: "p-4 sm:p-6 text-center text-gray-500 text-sm sm:text-base", children: "\u274C Ch\u01B0a c\u00F3 s\u1EA3n ph\u1EA9m n\u1ED5i b\u1EADt" });
    const isDesktop = windowWidth >= 1024;
    const itemsPerRow = Math.floor(windowWidth / 220);
    const visibleCount = isDesktop ? itemsPerRow * 2 : 8;
    const visibleProducts = products.slice(0, visibleCount);
    return (_jsxs("section", { className: "p-3 sm:p-4 md:p-6 bg-gradient-to-br from-gray-50 via-white to-gray-50 rounded-xl sm:rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300", children: [_jsxs("div", { className: "mb-4 sm:mb-5 md:mb-6 animate-fade-in-down", children: [_jsx("h3", { className: "text-lg sm:text-xl md:text-[24px] lg:text-[28px] font-bold mb-1 sm:mb-2 text-gray-900 gradient-text", children: "\u2B50 S\u1EA3n ph\u1EA9m n\u1ED5i b\u1EADt" }), _jsx("p", { className: "text-xs sm:text-sm text-gray-600", children: "Nh\u1EEFng s\u1EA3n ph\u1EA9m \u0111\u01B0\u1EE3c y\u00EAu th\u00EDch nh\u1EA5t hi\u1EC7n t\u1EA1i" })] }), _jsx("div", { className: "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3 sm:gap-4 md:gap-6", children: visibleProducts.map((prod, index) => {
                    // ✅ Chuyển store về đúng kiểu
                    const productForCard = {
                        ...prod,
                        store: typeof prod.store === "string"
                            ? prod.store
                            : prod.store?.name
                                ? { name: prod.store.name }
                                : { name: "Unknown" },
                    };
                    return (_jsx("div", { className: "animate-slide-up", style: { animationDelay: `${index * 0.1}s` }, children: _jsx(ProductCard, { product: productForCard }) }, prod._id));
                }) }), _jsx("div", { className: "text-center mt-6 sm:mt-8", children: _jsx(Link, { to: "/products", className: "inline-block font-bold text-blue-600 hover:text-blue-700 hover:underline transition-all duration-300 transform hover:scale-105 text-sm sm:text-base md:text-lg", children: "Xem th\u00EAm s\u1EA3n ph\u1EA9m \u2192" }) })] }));
};
export default FeaturedProducts;
