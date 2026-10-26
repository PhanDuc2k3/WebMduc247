import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useNavigate } from "react-router-dom";
import { homeCategories } from "./homeData";
const CanvaCategories = ({ products }) => {
    const navigate = useNavigate();
    return (_jsxs("section", { className: "canva-home__section", "aria-labelledby": "home-categories-title", children: [_jsx("header", { className: "canva-home__section-header", children: _jsxs("div", { children: [_jsx("p", { className: "canva-home__eyebrow", children: "Kh\u00E1m ph\u00E1 d\u1EC5 d\u00E0ng" }), _jsx("h2", { id: "home-categories-title", children: "Danh m\u1EE5c n\u1ED5i b\u1EADt" })] }) }), _jsx("div", { className: "canva-home__category-grid", children: homeCategories.map(({ icon: Icon, ...category }) => (_jsxs("button", { type: "button", className: "canva-home__category", onClick: () => navigate(category.href), children: [_jsx("span", { className: `canva-home__category-icon tone-${category.tone}`, children: _jsx(Icon, {}) }), _jsx("strong", { children: category.name }), _jsxs("small", { children: [products.filter((product) => category.value === "sale" ? Boolean(product.salePrice && product.salePrice < product.price) : product.category === category.value).length, " s\u1EA3n ph\u1EA9m g\u1EE3i \u00FD"] })] }, category.name))) })] }));
};
export default CanvaCategories;
