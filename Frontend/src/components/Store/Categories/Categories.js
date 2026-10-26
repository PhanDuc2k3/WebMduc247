import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import storeApi from "../../../api/storeApi";
import ProductCard from "../../Home/FeaturedProducts/ProductCard"; // giả sử bạn đã có component này
const Categories = ({ storeId }) => {
    const [searchParams] = useSearchParams();
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedCategoryId, setSelectedCategoryId] = useState(null);
    const [products, setProducts] = useState([]);
    const [productsLoading, setProductsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    // Đọc search term từ URL query
    useEffect(() => {
        const search = searchParams.get("search");
        if (search) {
            setSearchTerm(search);
        }
    }, [searchParams]);
    // ========================
    // Lấy danh sách category của store
    // ========================
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const res = await storeApi.getCategories(storeId);
                setCategories(res.data.categories || []);
            }
            catch (err) {
                console.error("Lỗi fetch categories:", err);
            }
            finally {
                setLoading(false);
            }
        };
        fetchCategories();
    }, [storeId]);
    // ========================
    // Fetch sản phẩm khi chọn category
    // ========================
    useEffect(() => {
        if (!selectedCategoryId)
            return;
        const fetchProducts = async () => {
            setProductsLoading(true);
            try {
                // backend route: /stores/:storeId/categories/:categoryId/products
                const res = await storeApi.getProductsByCategory(storeId, selectedCategoryId);
                setProducts(res.data.products || []);
            }
            catch (err) {
                console.error("Lỗi fetch products:", err);
            }
            finally {
                setProductsLoading(false);
            }
        };
        fetchProducts();
    }, [selectedCategoryId, storeId]);
    if (loading) {
        return (_jsxs("div", { className: "p-4 md:p-6 text-center animate-fade-in", children: [_jsx("div", { className: "text-3xl md:text-4xl mb-3 md:mb-4 animate-pulse", children: "\u23F3" }), _jsx("p", { className: "text-gray-500 text-sm md:text-base lg:text-lg font-medium", children: "\u0110ang t\u1EA3i danh m\u1EE5c..." })] }));
    }
    if (!categories.length) {
        return (_jsxs("div", { className: "p-6 md:p-8 text-center animate-fade-in", children: [_jsx("div", { className: "text-4xl md:text-6xl mb-3 md:mb-4", children: "\uD83D\uDCC1" }), _jsx("p", { className: "text-gray-500 text-sm md:text-base lg:text-lg font-medium mb-1 md:mb-2", children: "Ch\u01B0a c\u00F3 danh m\u1EE5c n\u00E0o" }), _jsx("p", { className: "text-gray-400 text-xs md:text-sm", children: "C\u1EEDa h\u00E0ng s\u1EBD s\u1EDBm c\u1EADp nh\u1EADt danh m\u1EE5c" })] }));
    }
    return (_jsxs("div", { className: "p-4 md:p-6 lg:p-8 rounded-xl md:rounded-2xl bg-gradient-to-br from-gray-50 via-white to-gray-50 shadow-lg border border-gray-200 animate-fade-in-up", children: [_jsxs("div", { className: "pb-4 md:pb-6 animate-fade-in-down", children: [_jsxs("h2", { className: "text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-2 md:gap-3", children: [_jsx("span", { children: "\uD83D\uDCC2" }), " Danh m\u1EE5c s\u1EA3n ph\u1EA9m"] }), _jsx("p", { className: "text-gray-600 text-xs md:text-sm pt-2", children: "Ch\u1ECDn danh m\u1EE5c \u0111\u1EC3 xem s\u1EA3n ph\u1EA9m" })] }), _jsx("div", { className: "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-3 lg:gap-4 pb-6 md:pb-8", children: categories.map((category, index) => (_jsxs("div", { onClick: () => setSelectedCategoryId(category._id), className: `rounded-lg md:rounded-xl p-3 md:p-4 lg:p-5 cursor-pointer transition-all duration-300 transform hover:scale-105 border-2 text-center animate-scale-in
              ${selectedCategoryId === category._id
                        ? "bg-gradient-to-br from-blue-50 to-purple-50 border-blue-500 shadow-lg scale-105"
                        : "bg-white border-gray-200 hover:border-blue-300 hover:shadow-md"}`, style: { animationDelay: `${index * 0.05}s` }, children: [_jsx("div", { className: "text-2xl md:text-3xl mb-1 md:mb-2", children: "\uD83D\uDCC1" }), _jsx("span", { className: `text-xs md:text-sm font-bold line-clamp-2 ${selectedCategoryId === category._id ? "text-blue-600" : "text-gray-700"}`, children: category.name })] }, category._id))) }), selectedCategoryId && (_jsxs("div", { className: "pt-6 md:pt-8 border-t border-gray-200 animate-fade-in-up", children: [_jsxs("div", { className: "pb-4 md:pb-6", children: [_jsxs("h3", { className: "text-lg md:text-xl font-bold text-gray-900 flex items-center gap-2", children: [_jsx("span", { children: "\uD83D\uDECD\uFE0F" }), " S\u1EA3n ph\u1EA9m trong danh m\u1EE5c"] }), _jsxs("p", { className: "text-gray-600 text-xs md:text-sm pt-1", children: [products.length, " s\u1EA3n ph\u1EA9m"] })] }), productsLoading ? (_jsxs("div", { className: "text-center py-8 md:py-12 animate-fade-in", children: [_jsx("div", { className: "text-3xl md:text-4xl mb-3 md:mb-4 animate-pulse", children: "\u23F3" }), _jsx("p", { className: "text-gray-500 text-sm md:text-base font-medium", children: "\u0110ang t\u1EA3i s\u1EA3n ph\u1EA9m..." })] })) : (() => {
                        // Filter sản phẩm theo search term
                        const filteredProducts = products.filter((p) => {
                            if (!searchTerm)
                                return true;
                            return p.name?.toLowerCase().includes(searchTerm.toLowerCase());
                        });
                        return filteredProducts.length ? (_jsx("div", { className: "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3 lg:gap-4 xl:gap-6", children: filteredProducts.map((product, index) => (_jsx("div", { className: "animate-slide-up", style: { animationDelay: `${index * 0.05}s` }, children: _jsx(ProductCard, { product: product }) }, product._id))) })) : (_jsxs("div", { className: "text-center py-8 md:py-12 animate-fade-in", children: [_jsx("div", { className: "text-4xl md:text-6xl mb-3 md:mb-4", children: searchTerm ? "🔍" : "📦" }), _jsx("p", { className: "text-gray-500 text-base md:text-lg font-medium mb-1 md:mb-2", children: searchTerm ? "Không tìm thấy sản phẩm nào" : "Chưa có sản phẩm nào" }), _jsx("p", { className: "text-gray-400 text-xs md:text-sm", children: searchTerm ? "Hãy thử thay đổi từ khóa tìm kiếm" : "Danh mục này chưa có sản phẩm" })] }));
                    })()] }))] }));
};
export default Categories;
