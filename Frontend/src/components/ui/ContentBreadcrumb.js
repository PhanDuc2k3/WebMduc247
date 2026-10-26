import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from "react-router-dom";
const ContentBreadcrumb = ({ items }) => (_jsxs("nav", { className: "content-breadcrumb", "aria-label": "\u0110\u01B0\u1EDDng d\u1EABn trang", children: [_jsx(Link, { to: "/", children: "Trang ch\u1EE7" }), items.map((item, index) => (_jsxs("span", { className: "content-breadcrumb__item", children: [_jsx("span", { "aria-hidden": "true", children: "/" }), item.to ? _jsx(Link, { to: item.to, children: item.label }) : _jsx("strong", { "aria-current": "page", children: item.label })] }, `${item.label}-${index}`)))] }));
export default ContentBreadcrumb;
