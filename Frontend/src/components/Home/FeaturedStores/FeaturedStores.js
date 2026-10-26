import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useEffect, useState } from "react";
import StoreCard from "./StoreCard";
import storeApi from "../../../api/storeApi";
import { useNavigate } from "react-router-dom";
import { useChat } from "../../../context/chatContext";
const FeaturedStores = () => {
    const [stores, setStores] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const { onlineStores } = useChat();
    useEffect(() => {
        const fetchStores = async () => {
            setLoading(true);
            try {
                const { data } = await storeApi.getAllActiveStores();
                const mappedStores = data.stores.map((s) => {
                    // Đảm bảo createdAt được truyền đúng format
                    const createdAtValue = s.createdAt || s.created_at || s.created;
                    return {
                        ...s,
                        rating: s.rating ?? 0,
                        products: s.products ?? 0,
                        followers: s.followers ?? 0,
                        responseRate: s.responseRate ?? 0,
                        responseTime: s.responseTime ?? "—",
                        joinDate: createdAtValue ? new Date(createdAtValue).toLocaleDateString() : "—",
                        createdAt: createdAtValue, // ✅ Đảm bảo createdAt được truyền vào
                        isActive: s.isActive ?? true,
                        customCategory: s.category || s.customCategory,
                    };
                });
                setStores(mappedStores);
            }
            catch (err) {
                console.error("Lỗi khi fetch stores:", err);
            }
            finally {
                setLoading(false);
            }
        };
        fetchStores();
    }, []);
    if (loading) {
        return (_jsx("div", { className: "p-4 sm:p-6 text-center text-gray-500 text-sm sm:text-base", children: "\u0110ang t\u1EA3i danh s\u00E1ch c\u1EEDa h\u00E0ng..." }));
    }
    if (!stores.length) {
        return (_jsx("div", { className: "p-4 sm:p-6 text-center text-gray-500 text-sm sm:text-base", children: "Kh\u00F4ng c\u00F3 c\u1EEDa h\u00E0ng n\u00E0o." }));
    }
    // 👇 Giới hạn hiển thị tối đa 6 cửa hàng (2 hàng nếu mỗi hàng 3 cột)
    const visibleStores = stores.slice(0, 6);
    return (_jsxs("section", { className: "p-3 sm:p-4 md:p-6 bg-gradient-to-br from-gray-50 via-white to-gray-50 rounded-xl sm:rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300 w-full", children: [_jsxs("div", { className: "mb-4 sm:mb-5 md:mb-6 animate-fade-in-down", children: [_jsx("h3", { className: "text-lg sm:text-xl md:text-[24px] lg:text-[28px] font-bold mb-1 sm:mb-2 text-gray-900 gradient-text", children: "\uD83C\uDFEC C\u1EEDa h\u00E0ng n\u1ED5i b\u1EADt" }), _jsx("p", { className: "text-xs sm:text-sm text-gray-600", children: "M\u1ED9t s\u1ED1 c\u1EEDa h\u00E0ng ti\u00EAu bi\u1EC3u tr\u00EAn h\u1EC7 th\u1ED1ng" })] }), _jsx("div", { className: "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 md:gap-6 justify-start items-start", children: visibleStores.map((store, index) => (_jsx("div", { className: "animate-slide-up", style: { animationDelay: `${index * 0.1}s` }, children: _jsx(StoreCard, { storeId: store._id, ownerId: typeof store.owner === "string" ? store.owner : store.owner._id, name: store.name, description: store.description, logoUrl: store.logoUrl, bannerUrl: store.bannerUrl, createdAt: store.createdAt, isActive: store.isActive, customCategory: store.customCategory, isOnline: onlineStores.includes(store._id) }) }, store._id))) }), _jsx("div", { onClick: () => navigate("/store"), className: "text-center mt-6 sm:mt-8 cursor-pointer", children: _jsx("span", { className: "inline-block font-bold text-gray-600 hover:text-gray-700 hover:underline transition-all duration-300 transform hover:scale-105 text-sm sm:text-base md:text-lg", children: "Xem th\u00EAm c\u1EEDa h\u00E0ng \u2192" }) })] }));
};
export default FeaturedStores;
