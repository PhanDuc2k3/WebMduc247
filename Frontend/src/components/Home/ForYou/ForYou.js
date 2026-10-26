import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, ChevronRight } from "lucide-react";
import ProductCard from "../FeaturedProducts/ProductCard";
import productApi from "../../../api/productApi";
const ForYou = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        const getProducts = async () => {
            try {
                const res = await productApi.getRecommendedProducts();
                const productsData = res.data?.data ?? res.data?.products ?? res.data ?? [];
                setProducts(Array.isArray(productsData) ? productsData : []);
            }
            catch (err) {
                console.error("Lỗi tải sản phẩm đề xuất:", err);
                setProducts([]);
            }
            finally {
                setLoading(false);
            }
        };
        getProducts();
    }, []);
    if (loading) {
        return (_jsx("section", { className: "mt-3 sm:mt-6 lg:mt-8", children: _jsx("div", { className: "bg-white rounded-lg sm:rounded-xl md:rounded-2xl p-2 sm:p-3 md:p-5 shadow-sm border border-gray-100", children: _jsx("div", { className: "grid grid-cols-2 sm:grid-cols-5 gap-1.5 sm:gap-2 md:gap-3 lg:gap-4", children: [...Array(10)].map((_, i) => (_jsxs("div", { className: "bg-gray-100 rounded-lg sm:rounded-xl p-2 sm:p-3 animate-pulse", children: [_jsx("div", { className: "bg-gray-200 h-28 sm:h-32 md:h-40 rounded-lg mb-1.5 sm:mb-2" }), _jsx("div", { className: "bg-gray-200 h-3 sm:h-4 rounded w-3/4 mb-1 sm:mb-1.5" }), _jsx("div", { className: "bg-gray-200 h-3 sm:h-4 rounded w-1/2" })] }, i))) }) }) }));
    }
    if (products.length === 0) {
        return (_jsx("section", { className: "mt-3 sm:mt-6 lg:mt-8", children: _jsxs("div", { className: "bg-white rounded-lg sm:rounded-xl md:rounded-2xl p-2 sm:p-3 md:p-5 shadow-sm border border-gray-100", children: [_jsxs("div", { className: "flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3", children: [_jsx(Sparkles, { className: "w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-yellow-500" }), _jsx("h3", { className: "text-sm sm:text-base md:text-lg lg:text-xl font-bold text-gray-900", children: "Todays For You!" })] }), _jsx("div", { className: "text-center py-6 sm:py-8 text-gray-500", children: _jsx("p", { className: "text-xs sm:text-sm", children: "Kh\u00F4ng c\u00F3 s\u1EA3n ph\u1EA9m n\u00E0o." }) })] }) }));
    }
    return (_jsx("section", { className: "mt-3 sm:mt-6 lg:mt-8", children: _jsxs("div", { className: "bg-white rounded-lg sm:rounded-xl md:rounded-2xl p-2 sm:p-3 md:p-5 shadow-sm border border-gray-100", children: [_jsxs("div", { className: "flex items-center justify-between mb-2 sm:mb-3 md:mb-4", children: [_jsxs("div", { className: "flex items-center gap-1.5 sm:gap-2", children: [_jsx(Sparkles, { className: "w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-yellow-500" }), _jsx("h3", { className: "text-sm sm:text-base md:text-lg lg:text-xl font-bold text-gray-900", children: "Todays For You!" })] }), _jsxs(Link, { to: "/products", className: "flex items-center gap-0.5 sm:gap-1 text-gray-600 font-semibold hover:text-gray-700 transition-colors text-[10px] sm:text-xs md:text-sm", children: ["Xem t\u1EA5t c\u1EA3 ", _jsx(ChevronRight, { className: "w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" })] })] }), _jsx("div", { className: "grid grid-cols-2 sm:grid-cols-5 gap-1.5 sm:gap-2 md:gap-3 lg:gap-4", children: products.slice(0, 10).map((prod, index) => {
                        const productForCard = {
                            ...prod,
                            store: typeof prod.store === "string"
                                ? prod.store
                                : prod.store?.name
                                    ? { name: prod.store.name }
                                    : { name: "Unknown" },
                        };
                        return (_jsx("div", { className: "animate-slide-up", style: { animationDelay: `${index * 0.05}s` }, children: _jsx(ProductCard, { product: productForCard }) }, prod._id));
                    }) })] }) }));
};
export default ForYou;
