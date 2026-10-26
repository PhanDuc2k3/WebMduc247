import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useState } from "react";
import { Minus, Plus, X, Loader2 } from "lucide-react";
import axiosClient from "../../../api/axiosClient";
import { toast } from "react-toastify";
import { useCart } from "../../../context/CartContext";
const CartItem = ({ item, selected, onSelect, onUpdateQty, onRemove, disabled = false, }) => {
    const [loading, setLoading] = useState(false);
    const { fetchCart } = useCart(); // Lấy hàm fetchCart từ Context
    const getFullUrl = (path) => {
        const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
        return path?.startsWith("http") ? path : `${baseUrl}${path}`;
    };
    const [localQuantity, setLocalQuantity] = useState(item.quantity);
    const handleUpdateQuantity = async (newQuantity) => {
        if (newQuantity < 1 || loading)
            return;
        // ✅ Cập nhật số lượng và thành tiền tạm thời để UI phản hồi tức thì
        const updatedSubtotal = (item.salePrice ?? item.price) * newQuantity;
        setLocalQuantity(newQuantity);
        item.subtotal = updatedSubtotal;
        setLoading(true);
        try {
            const token = localStorage.getItem("token");
            if (!token)
                return;
            await axiosClient.put(`/api/cart/update`, { itemId: item._id, quantity: newQuantity }, { headers: { Authorization: `Bearer ${token}` } });
            // ✅ Đồng bộ lại từ server (CartContext)
            fetchCart();
            // ✅ Gọi callback từ Cart.tsx để cập nhật cart state trong Cart.tsx
            if (onUpdateQty) {
                onUpdateQty(item._id, newQuantity);
            }
        }
        catch (error) {
            console.error(error);
            toast.error("Cập nhật số lượng thất bại.");
            // Revert lại nếu có lỗi
            setLocalQuantity(item.quantity);
            item.subtotal = (item.salePrice ?? item.price) * item.quantity;
        }
        finally {
            setLoading(false);
        }
    };
    const currentPrice = item.salePrice ?? item.price;
    const discountPercent = item.salePrice ? Math.round((1 - item.salePrice / item.price) * 100) : 0;
    return (_jsx("div", { className: `cart-product group ${selected ? "bg-gradient-to-br from-blue-50/50 to-purple-50/50 border-blue-400 shadow-md" : "border-gray-200 hover:border-gray-300"} animate-fade-in-up`, children: _jsxs("div", { className: "flex flex-col sm:flex-row gap-4 sm:gap-6 p-4 sm:p-5 md:p-6", children: [_jsxs("div", { className: "flex items-start gap-3 sm:gap-4", children: [_jsx("div", { className: "flex-shrink-0 pt-1", children: _jsx("input", { type: "checkbox", checked: selected, onChange: () => onSelect(item._id), disabled: disabled, className: `w-5 h-5 sm:w-6 sm:h-6 rounded border-2 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-300 accent-blue-600 touch-manipulation ${disabled
                                    ? "border-gray-200 bg-gray-100 cursor-not-allowed opacity-50"
                                    : "border-gray-300 hover:scale-110 cursor-pointer"}` }) }), _jsxs("div", { className: "cart-product__image", children: [_jsx("img", { src: getFullUrl(item.imageUrl), alt: item.name, className: "w-full h-full object-cover transition-transform duration-300 group-hover:scale-110", loading: "lazy" }), discountPercent > 0 && (_jsxs("span", { className: "absolute top-1.5 right-1.5 sm:top-2 sm:right-2 bg-red-600 text-white text-[10px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full shadow-lg", children: ["-", discountPercent, "%"] }))] })] }), _jsxs("div", { className: "cart-product__info flex-1 min-w-0 space-y-3", children: [_jsx("h3", { className: "cart-product__name line-clamp-2", children: item.name }), (item.variation?.color || item.variation?.size || item.variation?.additionalPrice !== undefined) && (_jsxs("div", { className: "flex flex-wrap gap-2", children: [item.variation?.color && (_jsx("span", { className: "inline-flex items-center text-xs sm:text-sm bg-blue-100 text-blue-700 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full font-semibold border border-blue-200", children: item.variation.color })), item.variation?.size && (_jsx("span", { className: "inline-flex items-center text-xs sm:text-sm bg-purple-100 text-purple-700 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full font-semibold border border-purple-200", children: item.variation.size })), item.variation && item.variation.additionalPrice !== undefined && (_jsxs("span", { className: "inline-flex items-center text-xs sm:text-sm bg-green-100 text-green-700 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full font-semibold border border-green-200", children: ["+", (item.variation.additionalPrice || 0).toLocaleString("vi-VN"), "\u20AB"] }))] })), _jsxs("div", { className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4", children: [_jsxs("div", { className: "flex items-baseline gap-2 sm:gap-3", children: [_jsxs("span", { className: "text-lg sm:text-xl md:text-2xl font-bold text-red-600", children: [currentPrice.toLocaleString("vi-VN"), "\u20AB"] }), item.salePrice && (_jsxs("span", { className: "text-sm sm:text-base text-gray-400 line-through", children: [item.price.toLocaleString("vi-VN"), "\u20AB"] }))] }), _jsxs("div", { className: "flex items-center gap-2 sm:gap-3", children: [_jsx("span", { className: "text-xs sm:text-sm text-gray-600 font-medium", children: "Th\u00E0nh ti\u1EC1n:" }), _jsxs("span", { className: "text-base sm:text-lg md:text-xl font-bold text-blue-600", children: [item.subtotal.toLocaleString("vi-VN"), "\u20AB"] })] })] })] }), _jsxs("div", { className: "cart-product__actions", children: [_jsxs("div", { className: "flex flex-col items-center gap-2", children: [_jsxs("div", { className: "flex items-center gap-1 sm:gap-2 border-2 border-gray-200 rounded-lg md:rounded-xl bg-white shadow-sm", children: [_jsx("button", { onClick: () => handleUpdateQuantity(localQuantity - 1), disabled: localQuantity <= 1 || loading, className: "w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 flex items-center justify-center rounded-l-lg text-gray-600 hover:bg-red-50 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-105 active:scale-95 touch-manipulation", title: "Gi\u1EA3m s\u1ED1 l\u01B0\u1EE3ng", children: _jsx(Minus, { className: "w-4 h-4 sm:w-5 sm:h-5" }) }), _jsx("span", { className: "min-w-[3rem] sm:min-w-[3.5rem] text-center font-bold text-sm sm:text-base md:text-lg text-gray-900 bg-gray-50 px-2 sm:px-3 py-1 sm:py-1.5 border-x border-gray-200", children: loading ? (_jsx(Loader2, { className: "w-4 h-4 sm:w-5 sm:h-5 animate-spin mx-auto text-blue-600" })) : (localQuantity) }), _jsx("button", { onClick: () => handleUpdateQuantity(localQuantity + 1), disabled: loading, className: "w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 flex items-center justify-center rounded-r-lg text-gray-600 hover:bg-green-50 hover:text-green-600 transition-all duration-300 transform hover:scale-105 active:scale-95 touch-manipulation", title: "T\u0103ng s\u1ED1 l\u01B0\u1EE3ng", children: _jsx(Plus, { className: "w-4 h-4 sm:w-5 sm:h-5" }) })] }), loading && (_jsx("span", { className: "text-xs text-blue-600 animate-pulse", children: "\u0110ang c\u1EADp nh\u1EADt..." }))] }), _jsx("button", { onClick: () => onRemove(item._id), className: "w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 flex items-center justify-center rounded-lg md:rounded-xl text-gray-400 hover:bg-red-50 hover:text-red-600 border-2 border-gray-200 hover:border-red-300 transition-all duration-300 transform hover:scale-110 active:scale-95 touch-manipulation group/remove", title: "X\u00F3a s\u1EA3n ph\u1EA9m", children: _jsx(X, { className: "w-4 h-4 sm:w-5 sm:h-5 group-hover/remove:rotate-90 transition-transform duration-300" }) })] })] }) }));
};
export default CartItem;
