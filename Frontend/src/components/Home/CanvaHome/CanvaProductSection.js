import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import CanvaProductCard from "./CanvaProductCard";
const getDailySaleEnd = () => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    return end;
};
const FlashCountdown = () => {
    const [saleEnd, setSaleEnd] = useState(getDailySaleEnd);
    const [remaining, setRemaining] = useState(() => Math.max(0, saleEnd.getTime() - Date.now()));
    useEffect(() => {
        const timer = window.setInterval(() => {
            const nextRemaining = saleEnd.getTime() - Date.now();
            if (nextRemaining <= 0) {
                const nextEnd = getDailySaleEnd();
                setSaleEnd(nextEnd);
                setRemaining(nextEnd.getTime() - Date.now());
            }
            else {
                setRemaining(nextRemaining);
            }
        }, 1000);
        return () => window.clearInterval(timer);
    }, [saleEnd]);
    const hours = Math.floor(remaining / 3_600_000);
    const minutes = Math.floor((remaining % 3_600_000) / 60_000);
    const seconds = Math.floor((remaining % 60_000) / 1000);
    const pad = (value) => value.toString().padStart(2, "0");
    return (_jsxs("div", { className: "canva-home__countdown", "aria-label": `Kết thúc sau ${hours} giờ ${minutes} phút ${seconds} giây`, children: [_jsx("span", { children: "K\u1EBFt th\u00FAc trong" }), _jsxs("time", { dateTime: saleEnd.toISOString(), children: [pad(hours), ":", pad(minutes), ":", pad(seconds)] })] }));
};
const CanvaProductSection = ({ id, kicker, title, products, flash = false, compact = false, viewAllTo }) => (_jsxs("section", { id: id, className: `canva-home__section ${flash ? "canva-home__flash" : ""}`, "aria-label": title, children: [_jsxs("header", { className: "canva-home__section-header", children: [_jsxs("div", { children: [kicker && _jsx("p", { className: "canva-home__eyebrow", children: kicker }), _jsxs("div", { className: "canva-home__title-row", children: [_jsxs("h2", { children: [flash ? "⚡ " : "", title] }), flash && _jsxs(_Fragment, { children: [_jsx("span", { className: "canva-home__live", children: "\u0110ang di\u1EC5n ra" }), _jsx(FlashCountdown, {})] })] })] }), _jsx(Link, { to: viewAllTo || (flash ? "/products?sale=true" : "/products"), children: "Xem t\u1EA5t c\u1EA3 \u2192" })] }), _jsx("div", { className: `canva-home__product-grid ${compact ? "is-compact" : ""}`, children: products.map((product) => _jsx(CanvaProductCard, { product: product, compact: compact, flash: flash }, product._id)) })] }));
export default CanvaProductSection;
