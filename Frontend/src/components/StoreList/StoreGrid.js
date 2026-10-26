import { jsx as _jsx } from "react/jsx-runtime";
import React from "react";
import StoreCard from "../../components/Home/FeaturedStores/StoreCard";
const StoreGrid = ({ stores, onlineStores = [] }) => {
    // Debug: Log createdAt từ stores
    if (stores.length > 0) {
        console.log("[StoreGrid] First store createdAt:", stores[0].createdAt, "Type:", typeof stores[0].createdAt);
        console.log("[StoreGrid] First store full object:", stores[0]);
    }
    return (_jsx("div", { className: "grid gap-3 md:gap-4 lg:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3", style: { position: 'relative', zIndex: 1 }, children: stores.map((store, index) => (_jsx(StoreCard, { storeId: store._id, ownerId: typeof store.owner === "string" ? store.owner : store.owner._id, name: store.name, description: store.description, logoUrl: store.logoUrl, bannerUrl: store.bannerUrl, createdAt: store.createdAt, isActive: store.isActive, customCategory: store.customCategory, isOnline: onlineStores.includes(store._id) }, store._id))) }));
};
export default StoreGrid;
