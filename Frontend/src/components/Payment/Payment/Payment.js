import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import walletApi from "../../../api/walletApi";
const Payment = ({ onChange }) => {
    const [selected, setSelected] = useState("wallet");
    const [balance, setBalance] = useState(null);
    useEffect(() => { walletApi.getWallet().then((response) => setBalance(response.data.wallet?.balance ?? 0)).catch(() => setBalance(null)); }, []);
    const methods = [
        { id: "wallet", label: "Ví MDUC247", description: balance === null ? "Thanh toán bằng số dư ví" : `Số dư: ${balance.toLocaleString("vi-VN")}₫` },
        { id: "vietqr", label: "Thẻ ngân hàng / VietQR", description: "Quét QR bằng ứng dụng ngân hàng" },
        { id: "momo", label: "Ví điện tử MoMo", description: "Thanh toán qua cổng MoMo" },
        { id: "cod", label: "Thanh toán khi nhận hàng", description: "Trả tiền khi nhận hàng" },
    ];
    return _jsxs("section", { className: "checkout-card checkout-options checkout-payment-methods", children: [_jsx("h2", { children: "Ph\u01B0\u01A1ng th\u1EE9c thanh to\u00E1n" }), _jsx("div", { children: methods.map((method) => _jsxs("label", { className: selected === method.id ? "is-selected" : "", children: [_jsx("input", { type: "radio", name: "payment", checked: selected === method.id, onChange: () => { setSelected(method.id); onChange?.(method.id); } }), _jsxs("span", { children: [_jsx("strong", { children: method.label }), _jsx("small", { children: method.description })] })] }, method.id)) }), _jsx("button", { type: "button", className: "checkout-link-button", children: "+ Th\u00EAm ph\u01B0\u01A1ng th\u1EE9c thanh to\u00E1n" }), _jsx("p", { className: "checkout-security", children: "B\u1EA3o m\u1EADt thanh to\u00E1n \u00B7 Th\u00F4ng tin \u0111\u01B0\u1EE3c m\u00E3 h\u00F3a trong qu\u00E1 tr\u00ECnh x\u1EED l\u00FD" })] });
};
export default Payment;
