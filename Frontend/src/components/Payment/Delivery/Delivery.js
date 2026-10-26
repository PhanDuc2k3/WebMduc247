import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
const options = [
    { id: "standard", label: "Tiêu chuẩn", description: "Nhận dự kiến trong 3–5 ngày · Miễn phí từ 499.000₫", fee: 30000 },
    { id: "express", label: "Nhanh", description: "Nhận dự kiến trong 1–2 ngày", fee: 49000 },
    { id: "same-day", label: "Siêu tốc", description: "Nhận trong ngày (tùy khu vực)", fee: 65000 },
];
const calculateFee = (subtotal, fee, id) => subtotal === 0 || (id === "standard" && subtotal >= 499000) ? 0 : fee;
const Delivery = ({ onChange, subtotal }) => {
    const [selected, setSelected] = useState("standard");
    useEffect(() => {
        const option = options.find((item) => item.id === selected) || options[0];
        onChange(calculateFee(subtotal, option.fee, option.id));
    }, [selected, subtotal, onChange]);
    return _jsxs("section", { className: "checkout-card checkout-options", children: [_jsx("h2", { children: "Ph\u01B0\u01A1ng th\u1EE9c v\u1EADn chuy\u1EC3n" }), _jsx("div", { children: options.map((option) => _jsxs("label", { className: selected === option.id ? "is-selected" : "", children: [_jsx("input", { type: "radio", name: "delivery", checked: selected === option.id, onChange: () => setSelected(option.id) }), _jsxs("span", { children: [_jsx("strong", { children: option.label }), _jsx("small", { children: option.description })] }), _jsx("b", { children: calculateFee(subtotal, option.fee, option.id) ? `${calculateFee(subtotal, option.fee, option.id).toLocaleString("vi-VN")}₫` : "Miễn phí" })] }, option.id)) })] });
};
export default Delivery;
