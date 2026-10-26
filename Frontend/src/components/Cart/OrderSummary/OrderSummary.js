import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
const OrderSummary = ({ selectedItems, cart, discount = 0 }) => {
    const navigate = useNavigate();
    const [shippingMethod, setShippingMethod] = useState("standard");
    // ✅ Kiểm tra xem có nhiều cửa hàng được chọn không
    const getStoreId = (item) => {
        return typeof item.storeId === "string" ? item.storeId : item.storeId?._id || "";
    };
    // ✅ Tính toán trực tiếp từ cart.items và selectedItems để đảm bảo luôn có dữ liệu mới nhất
    const { selectedProducts, storeIds, subtotal } = useMemo(() => {
        const safeCart = Array.isArray(cart?.items) ? cart.items : [];
        const filtered = safeCart.filter((item) => selectedItems.includes(item._id));
        // Tính tổng tiền trực tiếp - luôn tính lại từ quantity để đảm bảo chính xác
        const calculatedSubtotal = filtered.reduce((sum, item) => {
            const price = Number(item.salePrice ?? item.price ?? 0);
            const extra = Number(item.variation?.additionalPrice ?? 0);
            const qty = Number(item.quantity) || 0;
            const itemSubtotal = (price + extra) * qty;
            return sum + itemSubtotal;
        }, 0);
        // Tính storeIds
        const ids = new Set(filtered.map((item) => getStoreId(item)));
        return {
            selectedProducts: filtered,
            storeIds: Array.from(ids),
            subtotal: calculatedSubtotal
        };
    }, [cart?.items, selectedItems]); // ✅ Tính toán trực tiếp từ cart.items và selectedItems
    const hasMultipleStores = storeIds.length > 1;
    const shippingFee = shippingMethod === "express" ? 49000 : subtotal >= 499000 || subtotal === 0 ? 0 : 30000;
    const total = Math.max(0, subtotal + shippingFee - discount);
    // ✅ Thanh toán
    const handleCheckout = () => {
        if (!selectedProducts || selectedProducts.length === 0) {
            toast.warning("Vui lòng chọn ít nhất một sản phẩm để thanh toán!", { containerId: "general-toast" });
            return;
        }
        // ✅ Kiểm tra chỉ cho phép thanh toán từ 1 cửa hàng
        if (hasMultipleStores) {
            toast.error("Chỉ có thể thanh toán sản phẩm từ cùng một cửa hàng!", { containerId: "general-toast" });
            return;
        }
        // Lưu voucher nếu có
        const appliedVoucher = JSON.parse(localStorage.getItem("appliedVoucher") || "null") || {
            voucherId: null,
            discount: 0,
        };
        localStorage.setItem("appliedVoucher", JSON.stringify(appliedVoucher));
        // Lưu sản phẩm được chọn
        localStorage.setItem("checkoutItems", JSON.stringify(selectedProducts));
        // Điều hướng sang trang checkout
        navigate("/checkout");
    };
    const formatPrice = (value) => (value || 0).toLocaleString("vi-VN") + "₫";
    return (_jsxs("div", { className: "cart-summary animate-fade-in-right", children: [_jsx("div", { className: "cart-summary__header", children: _jsx("h2", { children: "T\u00F3m t\u1EAFt \u0111\u01A1n h\u00E0ng" }) }), hasMultipleStores && (_jsx("div", { className: "mb-4 p-4 bg-red-50 border-2 border-red-300 rounded-xl", children: _jsxs("div", { className: "flex items-start gap-2", children: [_jsx(AlertTriangle, { className: "text-red-500 flex-shrink-0 mt-0.5", size: 18 }), _jsxs("p", { className: "text-sm text-red-800 font-medium", children: ["B\u1EA1n \u0111ang ch\u1ECDn s\u1EA3n ph\u1EA9m t\u1EEB ", storeIds.length, " c\u1EEDa h\u00E0ng kh\u00E1c nhau. Vui l\u00F2ng ch\u1EC9 ch\u1ECDn s\u1EA3n ph\u1EA9m t\u1EEB m\u1ED9t c\u1EEDa h\u00E0ng \u0111\u1EC3 thanh to\u00E1n."] })] }) })), _jsxs("div", { className: "cart-summary__rows", children: [_jsxs("div", { children: [_jsx("span", { children: "T\u1EA1m t\u00EDnh" }), _jsx("strong", { children: formatPrice(subtotal) })] }), _jsxs("label", { children: ["Ph\u01B0\u01A1ng th\u1EE9c v\u1EADn chuy\u1EC3n", _jsxs("select", { value: shippingMethod, onChange: (event) => setShippingMethod(event.target.value), children: [_jsx("option", { value: "standard", children: "Ti\u00EAu chu\u1EA9n - mi\u1EC5n ph\u00ED t\u1EEB 499.000\u20AB" }), _jsx("option", { value: "express", children: "Giao nhanh - 49.000\u20AB" })] })] }), _jsxs("div", { children: [_jsx("span", { children: "Ph\u00ED v\u1EADn chuy\u1EC3n" }), _jsx("strong", { children: shippingFee ? formatPrice(shippingFee) : "Miễn phí" })] }), _jsxs("div", { children: [_jsx("span", { children: "Gi\u1EA3m gi\u00E1" }), _jsxs("strong", { className: "is-discount", children: ["-", formatPrice(discount)] })] })] }), _jsxs("div", { className: "cart-summary__total", children: [_jsxs("div", { children: [_jsx("span", { children: "T\u1ED5ng c\u1ED9ng" }), _jsx("strong", { children: formatPrice(total) })] }), _jsx("small", { children: "\u0110\u00E3 bao g\u1ED3m VAT n\u1EBFu c\u00F3" })] }), _jsx("button", { onClick: handleCheckout, disabled: !selectedProducts || selectedProducts.length === 0 || hasMultipleStores, className: `cart-summary__checkout ${selectedProducts && selectedProducts.length > 0 && !hasMultipleStores
                    ? "bg-[#4B5563] text-white hover:bg-[#374151] hover:scale-105 active:scale-95"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"}`, children: selectedProducts && selectedProducts.length > 0 ? (_jsxs("span", { className: "flex items-center justify-center gap-2", children: ["Thanh to\u00E1n (", selectedProducts.length, " s\u1EA3n ph\u1EA9m)"] })) : ("Vui lòng chọn sản phẩm") }), _jsx("p", { className: "cart-summary__preview-note", children: "\u25C7 B\u01B0\u1EDBc thanh to\u00E1n \u0111\u01B0\u1EE3c hi\u1EC3n th\u1ECB \u1EDF ch\u1EBF \u0111\u1ED9 xem tr\u01B0\u1EDBc" }), _jsx("div", { className: "mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl", children: _jsx("p", { className: "text-xs text-yellow-800", children: "Vui l\u00F2ng ki\u1EC3m tra k\u1EF9 th\u00F4ng tin \u0111\u01A1n h\u00E0ng tr\u01B0\u1EDBc khi thanh to\u00E1n." }) }), _jsxs("div", { className: "cart-summary__payments", children: [_jsx("span", { children: "VISA" }), _jsx("span", { children: "Mastercard" }), _jsx("span", { children: "V\u00ED \u0111i\u1EC7n t\u1EED" })] })] }));
};
export default OrderSummary;
