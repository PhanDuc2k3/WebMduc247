import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import favoriteApi from "../../api/favoriteApi";
import FavoriteButton from "../../components/Favorite/FavoriteButton";
import ContentBreadcrumb from "../../components/ui/ContentBreadcrumb";
const Whitelist = () => {
    const [products, setProducts] = useState([]);
    const [stores, setStores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("products");
    useEffect(() => {
        fetchFavorites();
    }, []);
    const fetchFavorites = async () => {
        try {
            setLoading(true);
            const res = await favoriteApi.getMyFavorites();
            setProducts(res.data.products || []);
            setStores(res.data.stores || []);
        }
        catch (error) {
            console.error("Error fetching favorites:", error);
            if (error.response?.status === 401) {
                // Not logged in - could redirect or show message
            }
        }
        finally {
            setLoading(false);
        }
    };
    const handleRemoveFavorite = () => {
        // Refetch after removing
        fetchFavorites();
    };
    const getImageUrl = (img) => {
        if (!img)
            return "/no-image.png";
        return img.startsWith("http") ? img : `${import.meta.env.VITE_API_URL}${img}`;
    };
    if (loading) {
        return (_jsxs("div", { className: "w-full py-8 md:py-12", children: [_jsx(ContentBreadcrumb, { items: [{ label: "Yêu thích" }] }), _jsx("div", { className: "bg-white rounded-xl shadow-lg p-8", children: _jsxs("div", { className: "text-center py-16", children: [_jsx("div", { className: "text-4xl mb-4 animate-pulse", children: "\u23F3" }), _jsx("p", { className: "text-gray-500 font-medium", children: "\u0110ang t\u1EA3i y\u00EAu th\u00EDch..." })] }) })] }));
    }
    return (_jsxs("div", { className: "w-full py-8 md:py-12", children: [_jsx(ContentBreadcrumb, { items: [{ label: "Yêu thích" }] }), _jsx("div", { className: "bg-white rounded-xl shadow-lg p-6 mb-6", children: _jsxs("div", { className: "flex gap-4 border-b border-gray-200", children: [_jsxs("button", { onClick: () => setActiveTab("products"), className: `pb-3 px-4 font-bold transition-all duration-300 relative ${activeTab === "products"
                                ? "text-blue-600"
                                : "text-gray-500 hover:text-gray-700"}`, children: [_jsxs("span", { className: "flex items-center gap-2", children: [_jsx("span", { children: "\uD83D\uDECD\uFE0F" }), " S\u1EA3n ph\u1EA9m", _jsx("span", { className: "bg-blue-100 text-blue-600 px-2 py-1 rounded-full text-xs", children: products.length })] }), activeTab === "products" && (_jsx("span", { className: "absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full" }))] }), _jsxs("button", { onClick: () => setActiveTab("stores"), className: `pb-3 px-4 font-bold transition-all duration-300 relative ${activeTab === "stores"
                                ? "text-blue-600"
                                : "text-gray-500 hover:text-gray-700"}`, children: [_jsxs("span", { className: "flex items-center gap-2", children: [_jsx("span", { children: "\uD83C\uDFEA" }), " C\u1EEDa h\u00E0ng", _jsx("span", { className: "bg-blue-100 text-blue-600 px-2 py-1 rounded-full text-xs", children: stores.length })] }), activeTab === "stores" && (_jsx("span", { className: "absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full" }))] })] }) }), activeTab === "products" && (_jsx("div", { className: "animate-fade-in-up", children: products.length > 0 ? (_jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6", children: products.map((product, index) => (_jsxs("div", { className: "bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-blue-400 hover:shadow-lg transition-all duration-300 group relative animate-slide-up", style: { animationDelay: `${index * 0.05}s` }, children: [_jsxs(Link, { to: `/products/${product._id}`, className: "block", children: [_jsxs("div", { className: "relative overflow-hidden rounded-lg mb-3", children: [_jsx("img", { src: getImageUrl(product.images?.[0]), alt: product.name, className: "w-full h-[200px] object-cover group-hover:scale-110 transition-transform duration-300" }), _jsx("div", { className: "absolute top-3 right-3 z-20", children: _jsx(FavoriteButton, { productId: product._id, iconSize: 20 }) })] }), _jsx("div", { className: "text-lg font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors", children: product.name })] }), _jsxs("div", { className: "flex items-center gap-2 mb-2 text-sm text-gray-500", children: [_jsxs("span", { children: ["\u2B50 ", product.rating || 0] }), _jsx("span", { children: "\u2022" }), _jsxs("span", { children: ["\u0110\u00E3 b\u00E1n ", product.soldCount || 0] })] }), _jsx("div", { className: "text-xl font-bold text-red-600 mb-3", children: product.salePrice ? (_jsxs(_Fragment, { children: [_jsxs("span", { className: "text-red-600", children: [product.salePrice.toLocaleString("vi-VN"), "\u20AB"] }), _jsxs("span", { className: "text-gray-400 line-through text-sm ml-2", children: [product.price.toLocaleString("vi-VN"), "\u20AB"] })] })) : (_jsxs("span", { children: [product.price.toLocaleString("vi-VN"), "\u20AB"] })) })] }, product._id))) })) : (_jsxs("div", { className: "bg-white rounded-xl shadow-lg p-16 text-center animate-fade-in", children: [_jsx("div", { className: "text-6xl mb-4", children: "\u2764\uFE0F" }), _jsx("p", { className: "text-gray-500 text-lg font-medium mb-2", children: "Ch\u01B0a c\u00F3 s\u1EA3n ph\u1EA9m y\u00EAu th\u00EDch n\u00E0o" }), _jsx("p", { className: "text-gray-400 text-sm mb-6", children: "Kh\u00E1m ph\u00E1 v\u00E0 th\u00EAm s\u1EA3n ph\u1EA9m y\u00EAu th\u00EDch c\u1EE7a b\u1EA1n" }), _jsx(Link, { to: "/products", className: "inline-block bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-xl font-bold hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105", children: "\uD83D\uDECD\uFE0F Xem s\u1EA3n ph\u1EA9m" })] })) })), activeTab === "stores" && (_jsx("div", { className: "animate-fade-in-up", children: stores.length > 0 ? (_jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6", children: stores.map((store, index) => (_jsx("div", { className: "bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-blue-400 hover:shadow-lg transition-all duration-300 group relative animate-slide-up", style: { animationDelay: `${index * 0.05}s` }, children: _jsxs(Link, { to: `/store/${store._id}`, className: "block", children: [_jsxs("div", { className: "relative overflow-hidden rounded-lg mb-3", children: [store.bannerUrl && (_jsx("img", { src: store.bannerUrl, alt: store.name, className: "w-full h-[150px] object-cover group-hover:scale-110 transition-transform duration-300" })), !store.bannerUrl && (_jsx("div", { className: "w-full h-[150px] bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center", children: _jsx("span", { className: "text-6xl", children: "\uD83C\uDFEA" }) })), _jsx("div", { className: "absolute top-3 right-3 z-20", children: _jsx(FavoriteButton, { storeId: store._id, iconSize: 20 }) })] }), _jsxs("div", { className: "flex items-center gap-3 mb-2", children: [store.logoUrl && (_jsx("img", { src: store.logoUrl, alt: store.name, className: "w-14 h-14 rounded-full border-2 border-gray-200" })), _jsx("div", { className: "text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1", children: store.name })] }), _jsx("div", { className: "text-sm text-gray-600 line-clamp-2 mb-2", children: store.description }), _jsx("div", { className: "flex items-center gap-2 text-sm text-gray-500", children: _jsxs("span", { children: ["\u2B50 ", store.rating || 0] }) })] }) }, store._id))) })) : (_jsxs("div", { className: "bg-white rounded-xl shadow-lg p-16 text-center animate-fade-in", children: [_jsx("div", { className: "text-6xl mb-4", children: "\uD83C\uDFEA" }), _jsx("p", { className: "text-gray-500 text-lg font-medium mb-2", children: "Ch\u01B0a c\u00F3 c\u1EEDa h\u00E0ng y\u00EAu th\u00EDch n\u00E0o" }), _jsx("p", { className: "text-gray-400 text-sm mb-6", children: "Kh\u00E1m ph\u00E1 v\u00E0 theo d\u00F5i c\u00E1c c\u1EEDa h\u00E0ng b\u1EA1n y\u00EAu th\u00EDch" }), _jsx(Link, { to: "/store", className: "inline-block bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 rounded-xl font-bold hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105", children: "\uD83C\uDFEA Xem c\u1EEDa h\u00E0ng" })] })) }))] }));
};
export default Whitelist;
