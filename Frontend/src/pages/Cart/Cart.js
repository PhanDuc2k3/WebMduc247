import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { ArrowLeft, ExternalLink, Minus, Plus, RotateCcw, ShieldCheck, ShoppingBag, Trash2, Truck, X } from "lucide-react";
import ContentBreadcrumb from "../../components/ui/ContentBreadcrumb";
import { catalogApi } from "../../api/catalogApi";
import { orderV2Api, notifyCartChanged, vnd } from "../../api/orderV2Api";
import "./Cart.css";
export default function Cart() {
    const navigate = useNavigate();
    const [cart, setCart] = useState(null);
    const [busy, setBusy] = useState(false);
    const [loading, setLoading] = useState(true);
    const [recommendations, setRecommendations] = useState([]);
    const reload = useCallback(async () => {
        try {
            setCart(await orderV2Api.cart());
        }
        catch (error) {
            toast.error(error instanceof Error ? error.message : "Không thể tải giỏ hàng.", { containerId: "general-toast" });
        }
        finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => { void reload(); }, [reload]);
    useEffect(() => {
        let active = true;
        catalogApi.listProducts({ limit: 12, sort: "newest", inStock: true })
            .then(result => { if (active)
            setRecommendations(result.products); })
            .catch(() => { if (active)
            setRecommendations([]); });
        return () => { active = false; };
    }, []);
    const groups = useMemo(() => {
        const byStore = new Map();
        for (const line of cart?.items || []) {
            const id = line.storeId || "unavailable";
            if (!byStore.has(id))
                byStore.set(id, { id, name: line.storeName || "Sản phẩm không còn bán", slug: line.storeSlug, lines: [] });
            byStore.get(id).lines.push(line);
        }
        return [...byStore.values()];
    }, [cart]);
    const selected = cart?.items.filter(item => item.selected) || [];
    const subtotal = selected.reduce((total, item) => total + (item.priceMinor || 0) * item.quantity, 0);
    const allSelected = Boolean(cart?.items.length) && selected.length === cart?.items.length;
    const inCart = new Set(cart?.items.map(item => item.productId).filter(Boolean));
    const suggested = [...recommendations.filter(item => !inCart.has(item.id)),
        ...recommendations.filter(item => inCart.has(item.id))].slice(0, 4);
    async function run(action, message) {
        setBusy(true);
        try {
            setCart(await action());
            notifyCartChanged();
            toast.success(message, { containerId: "general-toast" });
        }
        catch (error) {
            await reload();
            toast.error(error instanceof Error ? error.message : "Không thể cập nhật giỏ hàng.", { containerId: "general-toast" });
        }
        finally {
            setBusy(false);
        }
    }
    async function runMany(lines, action, message) {
        if (!lines.length)
            return;
        setBusy(true);
        try {
            let next = null;
            for (const line of lines)
                next = await action(line);
            setCart(next);
            notifyCartChanged();
            toast.success(message, { containerId: "general-toast" });
        }
        catch (error) {
            await reload();
            toast.error(error instanceof Error ? error.message : "Không thể cập nhật giỏ hàng.", { containerId: "general-toast" });
        }
        finally {
            setBusy(false);
        }
    }
    const recommendationSection = suggested.length ? _jsxs("section", { className: "cart-recommendations", "aria-labelledby": "cart-recommendations-title", children: [_jsxs("header", { children: [_jsx("h2", { id: "cart-recommendations-title", children: "C\u00F3 th\u1EC3 b\u1EA1n c\u0169ng th\u00EDch" }), _jsx(Link, { to: "/products", children: "Kh\u00E1m ph\u00E1 th\u00EAm t\u1EEB MDUC247" })] }), _jsx("div", { className: "cart-recommendations__grid", children: suggested.map(item => _jsxs(Link, { className: "cart-recommendations__card", to: `/products/${item.id}`, children: [_jsx("img", { src: item.imageUrl || "/visual-placeholder.svg", alt: "", loading: "lazy" }), _jsxs("span", { children: [_jsx("strong", { children: item.name }), _jsx("em", { children: vnd(item.priceMinor) }), item.rating != null && _jsxs("small", { children: ["\u2605 ", item.rating.toFixed(1), item.reviewCount ? ` · ${item.reviewCount} đánh giá` : ""] })] })] }, item.id)) })] }) : null;
    return _jsxs("div", { className: "cart-page", children: [_jsx(ContentBreadcrumb, { items: [{ label: "Giỏ hàng" }] }), _jsxs("header", { className: "cart-page__heading", children: [_jsxs("div", { children: [_jsx("h1", { children: "Gi\u1ECF h\u00E0ng" }), _jsx("p", { children: "Ch\u1ECDn s\u1EA3n ph\u1EA9m b\u1EA1n mu\u1ED1n thanh to\u00E1n." })] }), _jsxs("span", { children: [cart?.items.length || 0, " s\u1EA3n ph\u1EA9m"] })] }), loading ? _jsx("div", { className: "cart-page__empty", children: "\u0110ang t\u1EA3i gi\u1ECF h\u00E0ng..." }) : !cart?.items.length ?
                _jsxs("div", { className: "cart-page__empty", children: [_jsx(ShoppingBag, { size: 38 }), _jsx("h2", { children: "Gi\u1ECF h\u00E0ng c\u1EE7a b\u1EA1n \u0111ang tr\u1ED1ng" }), _jsx("p", { children: "Kh\u00E1m ph\u00E1 s\u1EA3n ph\u1EA9m \u0111\u1EC3 b\u1EAFt \u0111\u1EA7u mua s\u1EAFm." }), _jsxs(Link, { to: "/products", children: ["Kh\u00E1m ph\u00E1 s\u1EA3n ph\u1EA9m ", _jsx(ArrowLeft, { size: 16 })] })] }) :
                _jsxs("div", { className: "cart-page__layout", children: [_jsxs("div", { className: "cart-page__list", children: [cart.promotionUnavailable && _jsx("p", { className: "cart-page__notice", children: "Khuy\u1EBFn m\u00E3i t\u1EA1m kh\u00F4ng kh\u1EA3 d\u1EE5ng; gi\u00E1 \u0111ang \u0111\u01B0\u1EE3c l\u1EA5y t\u1EEB c\u1EEDa h\u00E0ng." }), _jsxs("div", { className: "cart-page__toolbar", children: [_jsxs("label", { children: [_jsx("input", { type: "checkbox", checked: allSelected, disabled: busy, onChange: event => { const checked = event.target.checked; void runMany(cart.items.filter(line => line.selected !== checked), line => orderV2Api.update(line.id, { selected: checked }), checked ? "Đã chọn tất cả sản phẩm." : "Đã bỏ chọn tất cả sản phẩm."); } }), _jsx("strong", { children: allSelected ? "Bỏ chọn tất cả" : "Chọn tất cả" }), _jsxs("span", { children: ["(", selected.length, " \u0111\u00E3 ch\u1ECDn)"] })] }), _jsxs("div", { children: [_jsxs("button", { type: "button", className: "is-danger", disabled: busy || !selected.length, onClick: () => void runMany(selected, line => orderV2Api.remove(line.id), "Đã xóa sản phẩm đã chọn."), children: [_jsx(Trash2, { size: 16 }), " X\u00F3a s\u1EA3n ph\u1EA9m \u0111\u00E3 ch\u1ECDn"] }), _jsxs(Link, { to: "/products", children: [_jsx(ArrowLeft, { size: 16 }), " Ti\u1EBFp t\u1EE5c mua s\u1EAFm"] })] })] }), groups.map(group => {
                                    const picked = group.lines.filter(line => line.selected);
                                    const groupTotal = picked.reduce((sum, line) => sum + (line.priceMinor || 0) * line.quantity, 0);
                                    const groupSelected = picked.length === group.lines.length;
                                    return _jsxs("section", { className: "cart-store", "aria-label": `Sản phẩm của ${group.name}`, children: [_jsxs("header", { className: "cart-store__header", children: [_jsxs("div", { className: "cart-store__identity", children: [_jsx("input", { type: "checkbox", "aria-label": `${groupSelected ? "Bỏ chọn" : "Chọn"} tất cả sản phẩm của ${group.name}`, checked: groupSelected, disabled: busy, onChange: event => { const checked = event.target.checked; void runMany(group.lines.filter(line => line.selected !== checked), line => orderV2Api.update(line.id, { selected: checked }), "Đã cập nhật lựa chọn cửa hàng."); } }), _jsx("span", { className: "cart-store__logo", "aria-hidden": "true", children: group.name.slice(0, 2).toUpperCase() }), _jsxs("div", { children: [_jsx("h2", { children: group.name }), _jsxs("p", { children: [picked.length, " s\u1EA3n ph\u1EA9m \u0111\u00E3 ch\u1ECDn \u00B7 ", vnd(groupTotal)] })] })] }), group.slug && _jsxs(Link, { to: `/store/${group.slug}`, children: ["Xem shop ", _jsx(ExternalLink, { size: 15 })] })] }), _jsx("div", { className: "cart-store__items", children: group.lines.map(line => {
                                                    const price = line.priceMinor || 0;
                                                    const original = line.priceOriginalMinor || price;
                                                    const discount = original > price && original > 0 ? Math.round((1 - price / original) * 100) : 0;
                                                    const attributes = Object.values(line.attributes || {}).filter(Boolean).join(" · ");
                                                    return _jsxs("article", { className: `cart-product${line.selected ? " is-selected" : ""}`, children: [_jsx("input", { type: "checkbox", "aria-label": `Chọn ${line.productName || line.sku || "sản phẩm"}`, checked: line.selected, disabled: busy, onChange: event => void run(() => orderV2Api.update(line.id, { selected: event.target.checked }), "Đã cập nhật lựa chọn.") }), _jsxs(Link, { className: "cart-product__image", to: line.productId ? `/products/${line.productId}` : "/products", children: [_jsx("img", { src: line.imageUrl || "/visual-placeholder.svg", alt: "" }), discount > 0 && _jsxs("span", { children: ["-", discount, "%"] })] }), _jsxs("div", { className: "cart-product__info", children: [_jsx(Link, { to: line.productId ? `/products/${line.productId}` : "/products", children: line.productName || line.sku || "Sản phẩm không còn bán" }), _jsx("p", { children: attributes || line.sku || "Sản phẩm" }), _jsxs("div", { className: "cart-product__prices", children: [_jsx("strong", { children: line.priceMinor === undefined ? "Chưa có giá" : vnd(price) }), original > price && _jsx("del", { children: vnd(original) })] }), line.flashCampaignId && _jsxs("small", { className: "cart-product__flash", children: ["Flash Sale gi\u1EA3m ", vnd(line.flashDiscountMinor || 0)] }), line.error && _jsxs("small", { className: "cart-product__error", children: [line.error.message, line.error.available !== undefined ? ` Còn ${line.error.available}.` : ""] }), line.observedPriceMinor != null && line.priceMinor !== undefined && line.observedPriceMinor !== line.priceMinor && _jsxs("small", { className: "cart-product__warning", children: ["Gi\u00E1 \u0111\u00E3 \u0111\u1ED5i t\u1EEB ", vnd(line.observedPriceMinor), "."] })] }), _jsxs("div", { className: "cart-product__actions", children: [_jsxs("div", { className: "cart-product__stepper", children: [_jsx("button", { type: "button", "aria-label": `Giảm số lượng ${line.productName || "sản phẩm"}`, disabled: busy || line.quantity <= 1, onClick: () => void run(() => orderV2Api.update(line.id, { quantity: line.quantity - 1 }), "Đã cập nhật số lượng."), children: _jsx(Minus, { size: 16 }) }), _jsx("span", { "aria-label": `Số lượng ${line.quantity}`, children: line.quantity }), _jsx("button", { type: "button", "aria-label": `Tăng số lượng ${line.productName || "sản phẩm"}`, disabled: busy || line.quantity >= 99, onClick: () => void run(() => orderV2Api.update(line.id, { quantity: line.quantity + 1 }), "Đã cập nhật số lượng."), children: _jsx(Plus, { size: 16 }) })] }), _jsxs("p", { children: ["Th\u00E0nh ti\u1EC1n: ", _jsx("strong", { children: line.priceMinor === undefined ? "—" : vnd(price * line.quantity) })] }), _jsx("button", { type: "button", className: "cart-product__remove", "aria-label": `Xóa ${line.productName || "sản phẩm"}`, disabled: busy, onClick: () => void run(() => orderV2Api.remove(line.id), "Đã xóa sản phẩm."), children: _jsx(X, { size: 18 }) })] })] }, line.id);
                                                }) })] }, group.id);
                                }), _jsxs("div", { className: "cart-benefits", children: [_jsxs("div", { children: [_jsx(Truck, { size: 22 }), _jsxs("span", { children: [_jsx("strong", { children: "Ph\u00ED v\u1EADn chuy\u1EC3n r\u00F5 r\u00E0ng" }), _jsx("small", { children: "Xem tr\u01B0\u1EDBc khi \u0111\u1EB7t h\u00E0ng" })] })] }), _jsxs("div", { children: [_jsx(ShieldCheck, { size: 22 }), _jsxs("span", { children: [_jsx("strong", { children: "Thanh to\u00E1n an to\u00E0n" }), _jsx("small", { children: "X\u00E1c nh\u1EADn trong t\u1EEBng b\u01B0\u1EDBc" })] })] }), _jsxs("div", { children: [_jsx(RotateCcw, { size: 22 }), _jsxs("span", { children: [_jsx("strong", { children: "H\u1ED7 tr\u1EE3 \u0111\u1ED5i tr\u1EA3" }), _jsx("small", { children: "Xem \u0111i\u1EC1u ki\u1EC7n \u00E1p d\u1EE5ng" })] })] })] })] }), _jsx("aside", { className: "cart-page__aside", children: _jsxs("div", { className: "cart-summary", children: [_jsx("h2", { children: "T\u00F3m t\u1EAFt \u0111\u01A1n h\u00E0ng" }), _jsxs("div", { className: "cart-summary__rows", children: [_jsxs("div", { children: [_jsx("span", { children: "T\u1EA1m t\u00EDnh" }), _jsx("strong", { children: vnd(subtotal) })] }), _jsxs("label", { children: ["Ph\u01B0\u01A1ng th\u1EE9c v\u1EADn chuy\u1EC3n", _jsx("select", { value: "standard", disabled: true, "aria-label": "Ph\u01B0\u01A1ng th\u1EE9c v\u1EADn chuy\u1EC3n", children: _jsx("option", { value: "standard", children: "Ti\u00EAu chu\u1EA9n \u00B7 xem ph\u00ED \u1EDF thanh to\u00E1n" }) })] }), _jsxs("div", { children: [_jsx("span", { children: "Ph\u00ED v\u1EADn chuy\u1EC3n" }), _jsx("strong", { children: "T\u00EDnh \u1EDF b\u01B0\u1EDBc sau" })] })] }), _jsxs("div", { className: "cart-summary__total", children: [_jsxs("div", { children: [_jsx("span", { children: "T\u1ED5ng s\u1EA3n ph\u1EA9m" }), _jsx("strong", { children: vnd(subtotal) })] }), _jsx("small", { children: "Ch\u01B0a g\u1ED3m ph\u00ED v\u1EADn chuy\u1EC3n; gi\u00E1 cu\u1ED1i c\u00F9ng \u0111\u01B0\u1EE3c t\u00EDnh \u1EDF b\u01B0\u1EDBc thanh to\u00E1n." })] }), _jsxs("button", { type: "button", disabled: !selected.length || busy, onClick: () => navigate("/checkout"), children: ["Thanh to\u00E1n (", selected.length, " s\u1EA3n ph\u1EA9m)"] }), _jsx("p", { children: "Gi\u00E1 cu\u1ED1i c\u00F9ng \u0111\u01B0\u1EE3c x\u00E1c nh\u1EADn \u1EDF b\u01B0\u1EDBc thanh to\u00E1n." }), _jsxs("div", { className: "cart-summary__payments", children: [_jsx("span", { children: "COD" }), _jsx("span", { children: "MoMo/VietQR khi kh\u1EA3 d\u1EE5ng" })] })] }) }), recommendationSection] }), !loading && !cart?.items.length && recommendationSection] });
}
