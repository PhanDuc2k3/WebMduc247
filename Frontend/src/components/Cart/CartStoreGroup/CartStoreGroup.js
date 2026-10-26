import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
import { CheckCircle2, Circle, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import CartItem from "../CartItem/CartItem";
const CartStoreGroup = ({ store, items, selectedItems, onSelect, onUpdateQty, onRemove, cart }) => {
    const allSelected = items.every((item) => selectedItems.includes(item._id));
    // Lấy storeId của store này
    const getStoreId = (item) => {
        return typeof item.storeId === "string" ? item.storeId : item.storeId._id;
    };
    const currentStoreId = items.length > 0 ? getStoreId(items[0]) : null;
    // Kiểm tra xem có item từ cửa hàng khác đang được chọn không
    const hasOtherStoreSelected = cart?.items?.some((item) => {
        const itemStoreId = getStoreId(item);
        return itemStoreId !== currentStoreId && selectedItems.includes(item._id);
    }) || false;
    // Nếu có cửa hàng khác được chọn, disable checkbox của cửa hàng này
    const isDisabled = hasOtherStoreSelected;
    const handleToggleAll = () => {
        if (allSelected) {
            items.forEach((item) => {
                if (selectedItems.includes(item._id)) {
                    onSelect(item._id);
                }
            });
        }
        else {
            // Nếu đã có cửa hàng khác được chọn, bỏ chọn tất cả cửa hàng khác trước
            if (hasOtherStoreSelected) {
                // Bỏ chọn tất cả item từ cửa hàng khác
                cart?.items?.forEach((item) => {
                    const itemStoreId = getStoreId(item);
                    if (itemStoreId !== currentStoreId && selectedItems.includes(item._id)) {
                        onSelect(item._id);
                    }
                });
            }
            // Sau đó chọn tất cả item từ cửa hàng này
            items.forEach((item) => {
                if (!selectedItems.includes(item._id)) {
                    onSelect(item._id);
                }
            });
        }
    };
    const storeTotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    return (_jsxs("div", { className: "cart-store animate-fade-in-up", children: [_jsxs("div", { className: "cart-store__header", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("button", { type: "button", className: "cart-store__check", onClick: handleToggleAll, disabled: isDisabled, "aria-label": allSelected ? "Bỏ chọn cửa hàng" : "Chọn cửa hàng", children: allSelected ? _jsx(CheckCircle2, {}) : _jsx(Circle, {}) }), _jsx("div", { className: "cart-store__logo", children: store.logoUrl ? _jsx("img", { src: store.logoUrl, alt: store.name }) : _jsx("span", { children: store.name.slice(0, 2).toUpperCase() }) }), _jsxs("div", { className: "flex flex-col", children: [_jsx("span", { className: "cart-store__name", children: store.name }), _jsxs("span", { className: "cart-store__trusted", children: ["\u2713 Gian h\u00E0ng uy t\u00EDn \u00B7 ", items.length, " s\u1EA3n ph\u1EA9m \u00B7 ", storeTotal.toLocaleString("vi-VN"), "\u20AB"] })] })] }), currentStoreId && _jsxs(Link, { className: "cart-store__visit", to: `/store/${currentStoreId}`, children: ["Xem shop ", _jsx(ExternalLink, {})] })] }), _jsx("div", { className: "cart-store__items", children: items.map((item, index) => (_jsx("div", { className: "animate-fade-in-up", style: { animationDelay: `${index * 0.05}s` }, children: _jsx(CartItem, { item: item, selected: selectedItems.includes(item._id), onSelect: onSelect, onUpdateQty: onUpdateQty, onRemove: onRemove, disabled: isDisabled }) }, item._id))) })] }));
};
export default CartStoreGroup;
