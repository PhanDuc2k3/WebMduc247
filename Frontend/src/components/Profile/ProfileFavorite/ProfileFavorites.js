import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState } from "react";
import { Clock, ShoppingBag, Store, Heart } from "lucide-react";
import favoriteApi from "../../../api/favoriteApi";
import ProductCard from "../../Home/FeaturedProducts/ProductCard";
import StoreCard from "../../Home/FeaturedStores/StoreCard";
const ProfileFavorites = () => {
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
        }
        finally {
            setLoading(false);
        }
    };
    const handleRemoveFavorite = async () => {
        // Refetch after removing
        await fetchFavorites();
    };
    if (loading) {
        return (_jsx("div", { className: "bg-white rounded-xl md:rounded-2xl shadow p-4 md:p-6 lg:p-8", children: _jsxs("div", { className: "text-center py-8 md:py-12 lg:py-16", children: [_jsx(Clock, { size: 40, className: "mx-auto mb-3 md:mb-4 animate-pulse text-[#4B5563]" }), _jsx("p", { className: "text-gray-500 text-sm md:text-base font-medium", children: "\u0110ang t\u1EA3i y\u00EAu th\u00EDch..." })] }) }));
    }
    return (_jsxs("div", { className: "bg-white rounded-xl md:rounded-2xl shadow-lg p-4 md:p-6 lg:p-8", children: [_jsxs("div", { className: "flex gap-2 md:gap-4 mb-4 md:mb-6 border-b border-gray-200 pb-2", children: [_jsxs("button", { onClick: () => setActiveTab("products"), className: `pb-2 md:pb-3 px-3 md:px-4 font-bold transition-all duration-300 relative flex items-center gap-1.5 md:gap-2 text-xs sm:text-sm md:text-base ${activeTab === "products"
                            ? "text-[#4B5563]"
                            : "text-gray-500 hover:text-[#4B5563]"}`, children: [_jsx(ShoppingBag, { size: 16, className: "md:w-[18px] md:h-[18px] text-[#4B5563]" }), "S\u1EA3n ph\u1EA9m (", products.length, ")", activeTab === "products" && (_jsx("span", { className: "absolute bottom-0 left-0 right-0 h-0.5 md:h-1 bg-[#4B5563] rounded-full" }))] }), _jsxs("button", { onClick: () => setActiveTab("stores"), className: `pb-2 md:pb-3 px-3 md:px-4 font-bold transition-all duration-300 relative flex items-center gap-1.5 md:gap-2 text-xs sm:text-sm md:text-base ${activeTab === "stores"
                            ? "text-[#4B5563]"
                            : "text-gray-500 hover:text-[#4B5563]"}`, children: [_jsx(Store, { size: 16, className: "md:w-[18px] md:h-[18px] text-[#4B5563]" }), "C\u1EEDa h\u00E0ng (", stores.length, ")", activeTab === "stores" && (_jsx("span", { className: "absolute bottom-0 left-0 right-0 h-0.5 md:h-1 bg-[#4B5563] rounded-full" }))] })] }), activeTab === "products" && (_jsx("div", { children: products.length > 0 ? (_jsx("div", { className: "grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3 md:gap-4 lg:gap-6", children: products.map((product) => {
                        // Convert ProductType to ProductCard format
                        const productForCard = {
                            _id: product._id,
                            name: product.name,
                            price: product.price,
                            salePrice: product.salePrice,
                            images: product.images,
                            rating: product.rating,
                            reviewsCount: product.reviewsCount,
                            soldCount: product.soldCount,
                            location: product.location,
                            store: typeof product.store === 'string'
                                ? product.store
                                : (product.store && typeof product.store === 'object' && 'name' in product.store)
                                    ? { name: product.store.name || 'Unknown Store' }
                                    : 'Unknown Store'
                        };
                        return (_jsx(ProductCard, { product: productForCard }, product._id));
                    }) })) : (_jsxs("div", { className: "text-center py-8 md:py-12 lg:py-16", children: [_jsx(Heart, { size: 48, className: "mx-auto mb-3 md:mb-4 text-[#4B5563]" }), _jsx("p", { className: "text-gray-500 text-sm sm:text-base md:text-lg font-medium mb-2", children: "Ch\u01B0a c\u00F3 s\u1EA3n ph\u1EA9m y\u00EAu th\u00EDch n\u00E0o" }), _jsx("p", { className: "text-gray-400 text-xs md:text-sm", children: "Kh\u00E1m ph\u00E1 v\u00E0 th\u00EAm s\u1EA3n ph\u1EA9m y\u00EAu th\u00EDch c\u1EE7a b\u1EA1n" })] })) })), activeTab === "stores" && (_jsx("div", { children: stores.length > 0 ? (_jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 lg:gap-6", children: stores.map((store) => {
                        const ownerId = typeof store.owner === "string"
                            ? store.owner
                            : (store.owner && typeof store.owner === 'object' && '_id' in store.owner)
                                ? store.owner._id
                                : undefined;
                        // Đảm bảo createdAt được truyền đúng - xử lý nhiều format
                        const createdAtValue = store.createdAt || store.joinDate;
                        return (_jsx(StoreCard, { storeId: store._id, ownerId: ownerId, name: store.name, description: store.description, logoUrl: store.logoUrl, bannerUrl: store.bannerUrl, createdAt: createdAtValue, isActive: store.isActive, customCategory: store.customCategory, isOnline: false }, store._id));
                    }) })) : (_jsxs("div", { className: "text-center py-8 md:py-12 lg:py-16", children: [_jsx(Store, { size: 48, className: "mx-auto mb-3 md:mb-4 text-[#4B5563]" }), _jsx("p", { className: "text-gray-500 text-sm sm:text-base md:text-lg font-medium mb-2", children: "Ch\u01B0a c\u00F3 c\u1EEDa h\u00E0ng y\u00EAu th\u00EDch n\u00E0o" }), _jsx("p", { className: "text-gray-400 text-xs md:text-sm", children: "Kh\u00E1m ph\u00E1 v\u00E0 theo d\u00F5i c\u00E1c c\u1EEDa h\u00E0ng b\u1EA1n y\u00EAu th\u00EDch" })] })) }))] }));
};
export default ProfileFavorites;
