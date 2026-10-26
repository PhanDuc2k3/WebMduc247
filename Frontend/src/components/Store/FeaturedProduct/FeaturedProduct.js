import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// components/Store/FeaturedProduct/FeaturedProduct.tsx
import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import ProductCard from "../../Home/FeaturedProducts/ProductCard";
import productApi from "../../../api/productApi";
const FeaturedProduct = ({ storeId }) => {
    const [searchParams] = useSearchParams();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [windowWidth, setWindowWidth] = useState(window.innerWidth);
    const [searchTerm, setSearchTerm] = useState("");
    // Đọc search term từ URL query
    useEffect(() => {
        const search = searchParams.get("search");
        if (search) {
            setSearchTerm(search);
        }
    }, [searchParams]);
    useEffect(() => {
        const handleResize = () => setWindowWidth(window.innerWidth);
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);
    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const res = await productApi.getProductsByStore(storeId);
                let productsData = res.data || [];
                // Sắp xếp theo số lượt bán giảm dần
                productsData.sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0));
                setProducts(productsData);
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
    }, [storeId]);
    if (loading) {
        return (_jsxs("div", { className: "p-4 md:p-6 text-center animate-fade-in", children: [_jsx("div", { className: "text-3xl md:text-4xl mb-3 md:mb-4 animate-pulse", children: "\u23F3" }), _jsx("p", { className: "text-gray-500 text-sm md:text-base lg:text-lg font-medium", children: "\u0110ang t\u1EA3i s\u1EA3n ph\u1EA9m..." })] }));
    }
    if (!products.length) {
        return (_jsxs("div", { className: "p-6 md:p-8 text-center animate-fade-in", children: [_jsx("div", { className: "text-4xl md:text-6xl mb-3 md:mb-4", children: "\uD83D\uDCE6" }), _jsx("p", { className: "text-gray-500 text-sm md:text-base lg:text-lg font-medium mb-1 md:mb-2", children: "Ch\u01B0a c\u00F3 s\u1EA3n ph\u1EA9m n\u1ED5i b\u1EADt" }), _jsx("p", { className: "text-gray-400 text-xs md:text-sm", children: "C\u1EEDa h\u00E0ng s\u1EBD s\u1EDBm c\u1EADp nh\u1EADt s\u1EA3n ph\u1EA9m" })] }));
    }
    // Filter sản phẩm theo search term
    const filteredProducts = products.filter((p) => {
        if (!searchTerm)
            return true;
        return p.name.toLowerCase().includes(searchTerm.toLowerCase());
    });
    if (searchTerm && !filteredProducts.length) {
        return (_jsxs("div", { className: "p-6 md:p-8 text-center animate-fade-in", children: [_jsx("div", { className: "text-4xl md:text-6xl mb-3 md:mb-4", children: "\uD83D\uDD0D" }), _jsx("p", { className: "text-gray-500 text-sm md:text-base lg:text-lg font-medium mb-1 md:mb-2", children: "Kh\u00F4ng t\u00ECm th\u1EA5y s\u1EA3n ph\u1EA9m n\u00E0o" }), _jsx("p", { className: "text-gray-400 text-xs md:text-sm", children: "H\u00E3y th\u1EED thay \u0111\u1ED5i t\u1EEB kh\u00F3a t\u00ECm ki\u1EBFm" })] }));
    }
    const isDesktop = windowWidth >= 1024;
    const itemsPerRow = Math.floor(windowWidth / 220);
    const visibleCount = isDesktop ? itemsPerRow * 2 : 8;
    const visibleProducts = filteredProducts.slice(0, visibleCount);
    return (_jsxs("section", { className: "p-4 md:p-6 lg:p-8 rounded-xl md:rounded-2xl bg-gradient-to-br from-gray-50 via-white to-gray-50 shadow-lg border border-gray-200 animate-fade-in-up", children: [_jsxs("div", { className: "pb-4 md:pb-6 animate-fade-in-down", children: [_jsxs("h2", { className: "text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-2 md:gap-3", children: [_jsx("span", { children: "\uD83D\uDD25" }), " S\u1EA3n ph\u1EA9m b\u00E1n ch\u1EA1y"] }), _jsx("p", { className: "text-gray-600 text-xs md:text-sm pt-2", children: "Nh\u1EEFng s\u1EA3n ph\u1EA9m \u0111\u01B0\u1EE3c y\u00EAu th\u00EDch nh\u1EA5t t\u1EEB c\u1EEDa h\u00E0ng n\u00E0y" })] }), _jsx("div", { className: "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3 lg:gap-4 xl:gap-6", children: visibleProducts.map((prod, index) => {
                    const productForCard = {
                        ...prod,
                        store: typeof prod.store === "string"
                            ? prod.store
                            : prod.store?.name
                                ? { name: prod.store.name }
                                : { name: "Unknown" },
                    };
                    return (_jsx("div", { className: "animate-slide-up", style: { animationDelay: `${index * 0.1}s` }, children: _jsx(ProductCard, { product: productForCard }) }, prod._id));
                }) }), _jsx("div", { className: "text-center pt-6 md:pt-8", children: _jsx(Link, { to: `/store/${storeId}/products`, className: "inline-block font-bold text-blue-600 hover:text-blue-700 hover:underline transition-all duration-300 transform hover:scale-105 text-sm md:text-base lg:text-lg", children: "Xem th\u00EAm s\u1EA3n ph\u1EA9m \u2192" }) })] }));
};
export default FeaturedProduct;
