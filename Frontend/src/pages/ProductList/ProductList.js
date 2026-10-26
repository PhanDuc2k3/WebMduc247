import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { Grid2X2, List, PackageSearch, Star } from "lucide-react";
import ContentBreadcrumb from "../../components/ui/ContentBreadcrumb";
import { catalogApi } from "../../api/catalogApi";
import { notifyCartChanged, orderV2Api, vnd } from "../../api/orderV2Api";
import { showImageFallback } from "../../utils/imageFallback";
import "./ProductList.css";
import "./ProductList.layout.css";
const PAGE_SIZE = 12;
const PRICE_CEILING = 20_000_000;
function flattenCategories(items) {
    return items.flatMap(item => [item, ...flattenCategories(item.children)]);
}
function CatalogProductCard({ product }) {
    const [adding, setAdding] = useState(false);
    const onSale = product.priceOriginalMinor > product.priceMinor;
    const discount = onSale ? Math.round((1 - product.priceMinor / product.priceOriginalMinor) * 100) : 0;
    async function addToCart() {
        setAdding(true);
        try {
            const detail = await catalogApi.product(product.id);
            const variant = detail.product.variants
                ?.filter(item => item.status === "active" && item.stock > 0)
                .sort((a, b) => a.priceMinor - b.priceMinor)[0];
            if (!variant)
                throw new Error("Sản phẩm hiện không còn hàng.");
            await orderV2Api.add(variant.id, 1);
            notifyCartChanged();
            toast.success(`Đã thêm ${product.name} vào giỏ.`, { containerId: "general-toast" });
        }
        catch (error) {
            toast.error(error instanceof Error ? error.message : "Không thể thêm sản phẩm vào giỏ.", { containerId: "general-toast" });
        }
        finally {
            setAdding(false);
        }
    }
    return _jsxs("article", { className: "catalog-card", children: [_jsxs("div", { className: "catalog-card__media", children: [_jsx(Link, { to: `/products/${product.id}`, "aria-label": `Xem ${product.name}`, children: _jsx("img", { src: product.imageUrl || "/visual-placeholder.svg", alt: product.name, loading: "lazy", onError: showImageFallback }) }), onSale && _jsxs("span", { children: ["-", discount, "%"] })] }), _jsxs("div", { className: "catalog-card__body", children: [_jsx("small", { children: product.store?.name || product.brand || "MDUC247" }), _jsx("h2", { children: _jsx(Link, { to: `/products/${product.id}`, children: product.name }) }), _jsx("p", { className: "catalog-card__rating", children: product.rating != null ? _jsxs(_Fragment, { children: [_jsx(Star, { "aria-hidden": "true" }), " ", product.rating.toFixed(1), product.reviewCount != null && product.reviewCount > 0 && _jsxs("span", { children: ["(", product.reviewCount, ")"] })] }) : _jsx("span", { children: "Ch\u01B0a c\u00F3 \u0111\u00E1nh gi\u00E1" }) }), _jsxs("p", { className: "catalog-card__price", children: [_jsx("strong", { children: vnd(product.priceMinor) }), onSale && _jsx("del", { children: vnd(product.priceOriginalMinor) })] }), _jsxs("div", { className: "catalog-card__meta", children: [_jsx("span", { className: product.inStock ? "" : "is-out", children: product.inStock ? "Còn hàng" : "Hết hàng" }), product.soldCount != null && _jsxs("small", { children: ["\u0110\u00E3 b\u00E1n ", product.soldCount.toLocaleString("vi-VN")] })] }), _jsx("button", { type: "button", disabled: !product.inStock || adding, onClick: () => void addToCart(), children: adding ? "Đang thêm..." : product.inStock ? "Thêm vào giỏ" : "Hết hàng" })] })] });
}
export default function ProductList() {
    const [params, setParams] = useSearchParams();
    const filterKey = params.toString();
    const page = Math.max(1, Number(params.get("page")) || 1);
    const [categories, setCategories] = useState([]);
    const [stores, setStores] = useState([]);
    const [products, setProducts] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState("grid");
    const [search, setSearch] = useState(params.get("search") || "");
    const [minPrice, setMinPrice] = useState(params.get("minPrice") || "");
    const [maxPrice, setMaxPrice] = useState(params.get("maxPrice") || "");
    const [storeSearch, setStoreSearch] = useState("");
    useEffect(() => {
        let active = true;
        catalogApi.categories()
            .then(tree => { if (active)
            setCategories(tree.categories); })
            .catch(() => { });
        return () => { active = false; };
    }, []);
    useEffect(() => {
        let active = true;
        const controller = new AbortController();
        const timer = window.setTimeout(() => {
            const search = storeSearch.trim();
            catalogApi.list(`?limit=${search ? 20 : 50}${search ? `&search=${encodeURIComponent(search)}` : ""}`, controller.signal)
                .then(result => { if (active)
                setStores(result.stores); })
                .catch(() => { if (active)
                setStores([]); });
        }, storeSearch ? 300 : 0);
        return () => { active = false; controller.abort(); window.clearTimeout(timer); };
    }, [storeSearch]);
    useEffect(() => {
        const current = new URLSearchParams(filterKey);
        setSearch(current.get("search") || "");
        setMinPrice(current.get("minPrice") || "");
        setMaxPrice(current.get("maxPrice") || "");
    }, [filterKey]);
    useEffect(() => {
        let active = true;
        setLoading(true);
        const current = new URLSearchParams(filterKey);
        const options = {
            page,
            limit: PAGE_SIZE,
            search: current.get("search") || undefined,
            category: current.get("category") || undefined,
            store: current.get("store") || undefined,
            minPrice: current.has("minPrice") ? Number(current.get("minPrice")) : undefined,
            maxPrice: current.has("maxPrice") ? Number(current.get("maxPrice")) : undefined,
            minRating: current.has("minRating") ? Number(current.get("minRating")) : undefined,
            inStock: current.get("inStock") === "true" ? true : undefined,
            sale: current.get("sale") === "true" ? true : undefined,
            sort: (current.get("sort") || "relevance"),
        };
        const { search: keyword, ...filters } = options;
        (keyword
            ? catalogApi.searchProducts({ ...filters, q: keyword })
            : catalogApi.listProducts(options))
            .then(result => { if (active) {
            setProducts(result.products);
            setTotal(result.total);
        } })
            .catch(error => {
            if (active) {
                setProducts([]);
                setTotal(0);
                toast.error(error instanceof Error ? error.message : "Không thể tải sản phẩm.", { containerId: "general-toast", toastId: "catalog-list-error" });
            }
        })
            .finally(() => { if (active)
            setLoading(false); });
        return () => { active = false; };
    }, [filterKey, page]);
    function updateFilters(changes) {
        const next = new URLSearchParams(params);
        Object.entries(changes).forEach(([key, value]) => {
            if (value)
                next.set(key, value);
            else
                next.delete(key);
        });
        next.delete("page");
        setParams(next);
    }
    function submitFilters(event) {
        event.preventDefault();
        const min = minPrice.trim() === "" ? "" : String(Math.max(0, Number(minPrice) || 0));
        const max = maxPrice.trim() === "" ? "" : String(Math.max(0, Number(maxPrice) || 0));
        if (min && max && Number(min) > Number(max)) {
            toast.error("Giá từ không được lớn hơn giá đến.", { containerId: "general-toast" });
            return;
        }
        updateFilters({ search: search.trim(), minPrice: min, maxPrice: max });
    }
    function selectPrice(min, max) {
        setMinPrice(min);
        setMaxPrice(max);
        updateFilters({ minPrice: min, maxPrice: max });
    }
    function goToPage(nextPage) {
        const next = new URLSearchParams(params);
        if (nextPage <= 1)
            next.delete("page");
        else
            next.set("page", String(nextPage));
        setParams(next);
        window.scrollTo({ top: 0, behavior: "smooth" });
    }
    const categoryOptions = flattenCategories(categories);
    const visibleStores = stores;
    const pageCount = Math.ceil(total / PAGE_SIZE);
    const firstPageButton = Math.max(1, Math.min(page - 2, pageCount - 4));
    const pageButtons = Array.from({ length: Math.min(pageCount, 5) }, (_, index) => firstPageButton + index);
    const first = total ? (page - 1) * PAGE_SIZE + 1 : 0;
    const last = Math.min(page * PAGE_SIZE, total);
    const hasFilters = ["search", "category", "store", "minPrice", "maxPrice", "minRating", "inStock", "sale"].some(key => params.has(key));
    return _jsxs("div", { className: "catalog-page", children: [_jsx(ContentBreadcrumb, { items: [{ label: "Tất cả sản phẩm" }] }), _jsxs("section", { className: "catalog-promo", "aria-labelledby": "catalog-promo-title", children: [_jsx("p", { children: "G\u1EE3i \u00FD t\u1EEB MDUC247" }), _jsx("h1", { id: "catalog-promo-title", children: "Kh\u00E1m ph\u00E1 s\u1EA3n ph\u1EA9m t\u1EEB c\u00E1c gian h\u00E0ng" }), _jsx("a", { href: "#catalog-results", children: "Xem s\u1EA3n ph\u1EA9m" })] }), _jsxs("div", { className: "catalog-layout", children: [_jsxs("aside", { className: "catalog-filter", "aria-label": "B\u1ED9 l\u1ECDc s\u1EA3n ph\u1EA9m", children: [_jsx("h2", { children: "B\u1ED9 l\u1ECDc" }), _jsxs("form", { onSubmit: submitFilters, children: [_jsxs("section", { children: [_jsx("h3", { children: "T\u00ECm ki\u1EBFm" }), _jsx("input", { className: "catalog-brand-search", value: search, maxLength: 100, onChange: event => setSearch(event.target.value), placeholder: "T\u00EAn s\u1EA3n ph\u1EA9m, th\u01B0\u01A1ng hi\u1EC7u...", "aria-label": "T\u00ECm ki\u1EBFm s\u1EA3n ph\u1EA9m" })] }), _jsxs("section", { children: [_jsxs("h3", { children: ["Danh m\u1EE5c ", _jsx("span", { "aria-hidden": "true", children: "\u2304" })] }), categoryOptions.map(category => _jsxs("label", { children: [_jsx("input", { type: "checkbox", checked: params.get("category") === category.slug, onChange: event => updateFilters({ category: event.target.checked ? category.slug : "" }) }), category.name] }, category.id))] }), _jsxs("section", { children: [_jsxs("h3", { children: ["Kho\u1EA3ng gi\u00E1 ", _jsx("span", { "aria-hidden": "true", children: "\u2304" })] }), _jsx("input", { className: "catalog-range", type: "range", min: "0", max: PRICE_CEILING, step: "100000", value: maxPrice === "" ? PRICE_CEILING : Math.min(PRICE_CEILING, Number(maxPrice)), onChange: event => setMaxPrice(event.target.value), onPointerUp: event => updateFilters({ maxPrice: event.currentTarget.value }), onKeyUp: event => updateFilters({ maxPrice: event.currentTarget.value }), "aria-label": "Gi\u00E1 t\u1ED1i \u0111a" }), _jsxs("div", { className: "catalog-price-inputs", children: [_jsxs("label", { children: ["T\u1EEB gi\u00E1", _jsx("input", { type: "number", min: "0", value: minPrice, onChange: event => setMinPrice(event.target.value) })] }), _jsx("span", { children: "\u0111" }), _jsxs("label", { children: ["\u0110\u1EBFn gi\u00E1", _jsx("input", { type: "number", min: "0", value: maxPrice, onChange: event => setMaxPrice(event.target.value) })] }), _jsx("span", { children: "\u0111" })] }), _jsxs("div", { className: "catalog-price-links", children: [_jsx("button", { type: "button", onClick: () => selectPrice("", "500000"), children: "D\u01B0\u1EDBi 500.000\u0111" }), _jsx("button", { type: "button", onClick: () => selectPrice("500000", "2000000"), children: "500.000\u0111\u20132.000.000\u0111" }), _jsx("button", { type: "button", onClick: () => selectPrice("2000000", "5000000"), children: "2.000.000\u0111\u20135.000.000\u0111" }), _jsx("button", { type: "button", onClick: () => selectPrice("5000000", ""), children: "Tr\u00EAn 5.000.000\u0111" })] })] }), _jsxs("section", { children: [_jsxs("h3", { children: ["C\u1EEDa h\u00E0ng ", _jsx("span", { "aria-hidden": "true", children: "\u2304" })] }), _jsx("input", { className: "catalog-brand-search", value: storeSearch, maxLength: 100, onChange: event => setStoreSearch(event.target.value), placeholder: "T\u00ECm c\u1EEDa h\u00E0ng...", "aria-label": "T\u00ECm c\u1EEDa h\u00E0ng" }), visibleStores.map(store => _jsxs("label", { children: [_jsx("input", { type: "checkbox", checked: params.get("store") === store.slug, onChange: event => updateFilters({ store: event.target.checked ? store.slug : "" }) }), store.name, store.productCount != null && _jsx("small", { children: store.productCount })] }, store.id))] }), _jsxs("section", { children: [_jsxs("h3", { children: ["\u0110\u00E1nh gi\u00E1 ", _jsx("span", { "aria-hidden": "true", children: "\u2304" })] }), [5, 4, 3].map(stars => _jsxs("label", { children: [_jsx("input", { type: "radio", name: "rating", checked: params.get("minRating") === String(stars), onChange: () => updateFilters({ minRating: String(stars) }) }), _jsx("span", { className: "catalog-stars", children: "★".repeat(stars) }), " t\u1EEB ", stars, " sao"] }, stars)), params.has("minRating") && _jsx("button", { className: "catalog-text-action", type: "button", onClick: () => updateFilters({ minRating: "" }), children: "B\u1ECF l\u1ECDc \u0111\u00E1nh gi\u00E1" })] }), _jsxs("section", { children: [_jsxs("h3", { children: ["T\u00ECnh tr\u1EA1ng ", _jsx("span", { "aria-hidden": "true", children: "\u2304" })] }), _jsxs("label", { children: [_jsx("input", { type: "checkbox", checked: params.get("inStock") === "true", onChange: event => updateFilters({ inStock: event.target.checked ? "true" : "" }) }), "C\u00F2n h\u00E0ng"] }), _jsxs("label", { children: [_jsx("input", { type: "checkbox", checked: params.get("sale") === "true", onChange: event => updateFilters({ sale: event.target.checked ? "true" : "" }) }), "\u0110ang gi\u1EA3m gi\u00E1"] })] }), _jsx("button", { className: "catalog-apply", type: "submit", children: "\u00C1p d\u1EE5ng t\u00ECm ki\u1EBFm v\u00E0 gi\u00E1" }), hasFilters && _jsx("button", { className: "catalog-clear", type: "button", onClick: () => setParams(new URLSearchParams()), children: "X\u00F3a t\u1EA5t c\u1EA3" })] })] }), _jsxs("main", { className: "catalog-results", id: "catalog-results", children: [_jsxs("div", { className: "catalog-toolbar", children: [_jsx("div", { children: _jsx("strong", { children: loading ? "Đang tải..." : `${total.toLocaleString("vi-VN")} sản phẩm` }) }), _jsxs("div", { children: [_jsx("span", { children: "S\u1EAFp x\u1EBFp" }), _jsxs("select", { "aria-label": "S\u1EAFp x\u1EBFp s\u1EA3n ph\u1EA9m", value: params.get("sort") || "relevance", onChange: event => updateFilters({ sort: event.target.value }), children: [_jsx("option", { value: "relevance", children: "Li\u00EAn quan nh\u1EA5t" }), _jsx("option", { value: "newest", children: "M\u1EDBi nh\u1EA5t" }), _jsx("option", { value: "price_asc", children: "Gi\u00E1 t\u0103ng d\u1EA7n" }), _jsx("option", { value: "price_desc", children: "Gi\u00E1 gi\u1EA3m d\u1EA7n" })] }), _jsx("button", { type: "button", className: view === "grid" ? "is-active" : "", "aria-label": "Xem d\u1EA1ng l\u01B0\u1EDBi", "aria-pressed": view === "grid", onClick: () => setView("grid"), children: _jsx(Grid2X2, {}) }), _jsx("button", { type: "button", className: view === "list" ? "is-active" : "", "aria-label": "Xem d\u1EA1ng danh s\u00E1ch", "aria-pressed": view === "list", onClick: () => setView("list"), children: _jsx(List, {}) })] })] }), loading ? _jsxs("div", { className: "catalog-loading", role: "status", children: [_jsx(PackageSearch, {}), _jsx("span", { children: "\u0110ang t\u1EA3i s\u1EA3n ph\u1EA9m..." })] }) : products.length ? _jsx("div", { className: `catalog-grid${view === "list" ? " is-list" : ""}`, children: products.map(product => _jsx(CatalogProductCard, { product: product }, product.id)) }) : _jsxs("div", { className: "catalog-empty", children: [_jsx(PackageSearch, {}), _jsx("h2", { children: "Kh\u00F4ng c\u00F3 s\u1EA3n ph\u1EA9m ph\u00F9 h\u1EE3p" }), _jsx("p", { children: "H\u00E3y th\u1EED \u0111i\u1EC1u ch\u1EC9nh b\u1ED9 l\u1ECDc ho\u1EB7c t\u00ECm ki\u1EBFm kh\u00E1c." })] }), !loading && _jsxs("div", { className: "catalog-pagination", children: [_jsxs("span", { children: ["Hi\u1EC3n th\u1ECB ", first, "\u2013", last, " trong ", total.toLocaleString("vi-VN"), " s\u1EA3n ph\u1EA9m"] }), pageCount > 1 && _jsxs("div", { children: [pageButtons.map(number => _jsx("button", { type: "button", className: number === page ? "is-active" : "", "aria-current": number === page ? "page" : undefined, onClick: () => goToPage(number), children: number }, number)), _jsx("button", { type: "button", disabled: page >= pageCount, onClick: () => goToPage(page + 1), children: "Ti\u1EBFp theo \u2192" })] })] })] })] }), categoryOptions.length > 0 && _jsxs("section", { className: "catalog-interests", children: [_jsx("h2", { children: "B\u1EA1n c\u00F3 th\u1EC3 quan t\u00E2m" }), _jsx("div", { children: categoryOptions.slice(0, 6).map(category => _jsx("button", { type: "button", onClick: () => { updateFilters({ category: category.slug }); document.getElementById("catalog-results")?.scrollIntoView({ behavior: "smooth" }); }, children: category.name }, category.id)) })] })] });
}
