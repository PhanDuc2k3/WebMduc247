import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const VoucherBox = ({ onOpenPopup, selectedSystemVoucher, selectedFreeshipVoucher, selectedStoreVoucher, onRemoveSystemVoucher, onRemoveFreeshipVoucher, onRemoveStoreVoucher }) => {
    const selected = [
        [selectedSystemVoucher, onRemoveSystemVoucher],
        [selectedFreeshipVoucher, onRemoveFreeshipVoucher],
        [selectedStoreVoucher, onRemoveStoreVoucher],
    ];
    return _jsxs("section", { className: "checkout-card checkout-vouchers", children: [_jsx("h2", { children: "M\u00E3 gi\u1EA3m gi\u00E1 v\u00E0 \u01B0u \u0111\u00E3i" }), _jsxs("div", { className: "checkout-voucher-input", children: [_jsx("input", { readOnly: true, placeholder: "Ch\u1ECDn ho\u1EB7c nh\u1EADp m\u00E3 gi\u1EA3m gi\u00E1", onClick: onOpenPopup }), _jsx("button", { type: "button", onClick: onOpenPopup, children: "\u00C1p d\u1EE5ng" })] }), _jsx("div", { className: "checkout-voucher-tags", children: selected.map(([voucher, remove]) => voucher && _jsxs("span", { children: [voucher.code, " \u00B7 ", voucher.title, _jsx("button", { type: "button", onClick: remove, children: "\u00D7" })] }, voucher.code)) }), !selected.some(([voucher]) => voucher) && _jsx("button", { type: "button", className: "checkout-link-button", onClick: onOpenPopup, children: "Xem voucher kh\u1EA3 d\u1EE5ng" })] });
};
export default VoucherBox;
