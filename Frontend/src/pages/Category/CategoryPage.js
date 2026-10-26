import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { ArrowRight, BatteryCharging, Cable, Headphones, Package, RotateCcw, ShieldCheck, Smartphone, Truck, Watch } from "lucide-react";
import ContentBreadcrumb from "../../components/ui/ContentBreadcrumb";
import LiveProductCard from "../../components/Home/CanvaHome/LiveProductCard";
import { catalogApi } from "../../api/catalogApi";
import { categoryPages } from "./categoryData";
import "../../components/Home/CanvaHome/CanvaHome.css";
import "./CategoryPage.css";
const findCategory = (items, slug) => {
    for (const item of items) {
        if (item.slug === slug)
            return item;
        const nested = findCategory(item.children, slug);
        if (nested)
            return nested;
    }
    return null;
};
const phoneIcons = [Smartphone, Smartphone, Headphones, Cable, BatteryCharging, Watch];
export default function CategoryPage() {
    const { slug = "" } = useParams();
    const config = categoryPages[slug];
    const actualSlug = config?.apiCategory || slug;
    const [category, setCategory] = useState(null);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        let active = true;
        setLoading(true);
        setCategory(null);
        setProducts([]);
        Promise.all([catalogApi.categories(), catalogApi.listProducts({ category: actualSlug, page: 1, limit: 50 })])
            .then(([tree, listing]) => { if (active) {
            setCategory(findCategory(tree.categories, actualSlug));
            setProducts(listing.products);
        } })
            .catch(error => { if (active)
            toast.error(error instanceof Error ? error.message : "Không thể tải danh mục.", { containerId: "general-toast" }); })
            .finally(() => { if (active)
            setLoading(false); });
        return () => { active = false; };
    }, [actualSlug]);
    const title = config?.title || category?.name || slug;
    const shortcuts = config?.subcategories || category?.children.map(item => item.name) || [];
    const catalogLink = `/products?category=${actualSlug}`;
    return _jsxs("div", { className: "category-page", children: [_jsx(ContentBreadcrumb, { items: [{ label: "Danh mục", to: "/products" }, { label: title }] }), loading ? _jsx("p", { className: "category-page__state", children: "\u0110ang t\u1EA3i danh m\u1EE5c v\u00E0 s\u1EA3n ph\u1EA9m..." }) : !category ?
                _jsxs("div", { className: "category-page__state", children: [_jsx("h1", { children: "Kh\u00F4ng t\u00ECm th\u1EA5y danh m\u1EE5c" }), _jsx(Link, { to: "/products", children: "Xem t\u1EA5t c\u1EA3 s\u1EA3n ph\u1EA9m" })] }) : _jsxs(_Fragment, { children: [!!shortcuts.length && _jsxs("section", { className: "category-page__subcategories", "aria-labelledby": "category-quick-title", children: [_jsxs("header", { children: [_jsxs("div", { children: [_jsx("p", { children: "Kh\u00E1m ph\u00E1 nhanh" }), _jsx("h1", { id: "category-quick-title", children: "B\u1EA1n \u0111ang t\u00ECm g\u00EC?" })] }), _jsxs(Link, { to: catalogLink, children: ["Xem to\u00E0n b\u1ED9 ", _jsx(ArrowRight, { size: 17 })] })] }), _jsx("div", { children: shortcuts.slice(0, 6).map((name, index) => {
                                    const child = category.children.find(item => item.name === name);
                                    const Icon = slug === "phone" ? phoneIcons[index] : config?.icon || Package;
                                    return _jsxs(Link, { to: child ? `/category/${child.slug}` : `${catalogLink}&search=${encodeURIComponent(name)}`, children: [_jsx("span", { className: `category-page__sub-icon category-page__sub-icon--${index % 4}`, children: _jsx(Icon, { size: 24 }) }), _jsx("strong", { children: name }), _jsx("small", { children: "Kh\u00E1m ph\u00E1 ngay" })] }, name);
                                }) })] }), _jsxs("section", { className: `category-page__promo category-page__promo--${config?.tone || "blue"}`, "aria-label": `Gợi ý ${title}`, children: [_jsxs("div", { children: [_jsx("p", { children: "G\u1EE3i \u00FD t\u1EEB MDUC247" }), _jsx("h2", { children: config?.promoTitle || `Khám phá ${title}` }), _jsx("span", { children: config?.promoDescription || "Xem các sản phẩm đang được bán trong danh mục này." }), _jsxs(Link, { className: "category-page__promo-action", to: catalogLink, children: ["Mua s\u1EAFm ngay ", _jsx(ArrowRight, { size: 17 })] })] }), _jsx("img", { src: config?.image || category.imageUrl || "/home/shopping-hero.png", alt: config?.imageAlt || title })] }), _jsxs("section", { className: "canva-home__section category-page__products", "aria-labelledby": "category-products-title", children: [_jsxs("header", { className: "canva-home__section-header", children: [_jsxs("div", { children: [_jsx("p", { className: "canva-home__eyebrow", children: "\u0110\u01B0\u1EE3c quan t\u00E2m nhi\u1EC1u" }), _jsxs("h2", { id: "category-products-title", children: ["N\u1ED5i b\u1EADt trong ", title] })] }), _jsxs(Link, { to: catalogLink, children: ["Xem t\u1EA5t c\u1EA3 ", _jsx(ArrowRight, { size: 17 })] })] }), products.length ? _jsx("div", { className: "canva-home__product-grid", children: products.slice(0, 10).map(product => _jsx(LiveProductCard, { product: product }, product.id)) }) : _jsx("p", { className: "category-page__state", children: "Ch\u01B0a c\u00F3 s\u1EA3n ph\u1EA9m \u0111ang b\u00E1n trong danh m\u1EE5c n\u00E0y." })] }), _jsxs("div", { className: "category-page__benefits", children: [_jsxs("article", { children: [_jsx(Truck, { "aria-hidden": "true" }), _jsxs("span", { children: [_jsx("strong", { children: "Giao h\u00E0ng thu\u1EADn ti\u1EC7n" }), _jsx("small", { children: "Theo d\u00F5i \u0111\u01A1n h\u00E0ng d\u1EC5 d\u00E0ng" })] })] }), _jsxs("article", { children: [_jsx(ShieldCheck, { "aria-hidden": "true" }), _jsxs("span", { children: [_jsx("strong", { children: "Mua s\u1EAFm an t\u00E2m" }), _jsx("small", { children: "Th\u00F4ng tin c\u1EEDa h\u00E0ng r\u00F5 r\u00E0ng" })] })] }), _jsxs("article", { children: [_jsx(RotateCcw, { "aria-hidden": "true" }), _jsxs("span", { children: [_jsx("strong", { children: "H\u1ED7 tr\u1EE3 \u0111\u1ED5i tr\u1EA3" }), _jsx("small", { children: "Quy tr\u00ECnh minh b\u1EA1ch" })] })] })] })] })] });
}
