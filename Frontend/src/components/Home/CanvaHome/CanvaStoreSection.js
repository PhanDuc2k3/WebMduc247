import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ArrowRight, Star } from "lucide-react";
import { useNavigate } from "react-router-dom";
const CanvaStoreSection = ({ stores }) => {
    const navigate = useNavigate();
    return (_jsxs("section", { className: "canva-home__section canva-home__stores", "aria-labelledby": "home-store-title", children: [_jsxs("header", { className: "canva-home__section-header", children: [_jsxs("div", { children: [_jsx("p", { className: "canva-home__eyebrow", children: "Mua s\u1EAFm an t\u00E2m" }), _jsx("h2", { id: "home-store-title", children: "C\u1EEDa h\u00E0ng n\u1ED5i b\u1EADt" })] }), _jsxs("button", { type: "button", onClick: () => navigate("/store"), children: ["Xem t\u1EA5t c\u1EA3 ", _jsx(ArrowRight, {})] })] }), _jsx("div", { className: "canva-home__store-grid", children: stores.map((store) => (_jsxs("button", { type: "button", className: "canva-home__store-card", onClick: () => navigate(store.demo ? "/store" : `/store/${store._id}`), children: [_jsx("img", { src: store.logoUrl || "/visual-placeholder.svg", alt: "" }), _jsxs("span", { children: [_jsx("strong", { children: store.name }), _jsx("small", { children: store.category || "Cửa hàng" }), _jsxs("em", { children: [_jsx(Star, {}), " ", typeof store.rating === "number" ? store.rating.toFixed(1) : "Chưa có đánh giá", typeof store.products === "number" ? ` · ${store.products} sản phẩm` : ""] })] }), _jsx(ArrowRight, { "aria-hidden": "true" })] }, store._id))) })] }));
};
export default CanvaStoreSection;
