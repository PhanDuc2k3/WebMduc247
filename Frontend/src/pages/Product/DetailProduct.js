import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { Bolt, Flame, Minus, Plus, ShoppingCart, Star, Store } from "lucide-react";
import ContentBreadcrumb from "../../components/ui/ContentBreadcrumb";
import { catalogApi } from "../../api/catalogApi";
import { orderV2Api, notifyCartChanged, vnd } from "../../api/orderV2Api";
import { engagementApi } from "../../api/engagementApi";
import ReviewSection from "../../components/ReviewReturn/ReviewSection";
import "./DetailProduct.css";
export default function DetailProduct() {
    const { id = "" } = useParams();
    const navigate = useNavigate();
    const [product, setProduct] = useState(null);
    const [variantId, setVariantId] = useState("");
    const [imageUrl, setImageUrl] = useState("");
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);
    const [quantity, setQuantity] = useState(1);
    const [tab, setTab] = useState(() => new URLSearchParams(window.location.search).has("reviewItem") ? "reviews" : "description");
    const [flashItems, setFlashItems] = useState([]);
    const [flashClock, setFlashClock] = useState({ serverMs: 0, perfMs: 0 });
    const [flashTick, setFlashTick] = useState(0);
    useEffect(() => {
        let active = true;
        catalogApi.product(id).then(result => {
            if (!active)
                return;
            const chosen = result.product.variants?.filter(item => item.status === "active" && item.stock > 0)
                .sort((a, b) => a.priceMinor - b.priceMinor)[0] || result.product.variants?.find(item => item.status === "active");
            setProduct(result.product);
            setVariantId(chosen?.id || "");
            setImageUrl(result.product.images?.find(item => item.variantId === chosen?.id)?.url || result.product.imageUrl || "");
            setQuantity(1);
        }).catch(error => { if (active)
            toast.error(error instanceof Error ? error.message : "Không thể tải sản phẩm.", { containerId: "general-toast" }); })
            .finally(() => { if (active)
            setLoading(false); });
        return () => { active = false; };
    }, [id]);
    useEffect(() => {
        let active = true;
        engagementApi.flashSales().then(result => {
            if (!active)
                return;
            const perf = performance.now();
            setFlashItems(result.items);
            setFlashClock({ serverMs: Date.parse(result.serverTime), perfMs: perf });
            setFlashTick(perf);
        }).catch(() => { });
        const timer = window.setInterval(() => setFlashTick(performance.now()), 1000);
        return () => { active = false; window.clearInterval(timer); };
    }, []);
    async function addSelected(goCheckout = false) {
        if (!variantId)
            return;
        setAdding(true);
        try {
            const updated = await orderV2Api.add(variantId, quantity);
            if (goCheckout) {
                for (const line of updated.items) {
                    const shouldSelect = line.variantId === variantId;
                    if (line.selected !== shouldSelect)
                        await orderV2Api.update(line.id, { selected: shouldSelect });
                }
            }
            notifyCartChanged();
            if (goCheckout)
                navigate("/checkout");
            else
                toast.success("Đã thêm vào giỏ hàng.", { containerId: "general-toast" });
        }
        catch (error) {
            toast.error(error instanceof Error ? error.message : "Không thể thêm sản phẩm vào giỏ hàng.", { containerId: "general-toast" });
        }
        finally {
            setAdding(false);
        }
    }
    if (loading)
        return _jsx("div", { className: "product-detail-page", children: _jsx("div", { className: "product-detail__state", children: "\u0110ang t\u1EA3i s\u1EA3n ph\u1EA9m..." }) });
    if (!product)
        return _jsx("div", { className: "product-detail-page", children: _jsxs("div", { className: "product-detail__state", children: ["Kh\u00F4ng t\u00ECm th\u1EA5y s\u1EA3n ph\u1EA9m \u0111ang b\u00E1n. ", _jsx(Link, { to: "/products", children: "Xem s\u1EA3n ph\u1EA9m kh\u00E1c" })] }) });
    const selected = product.variants?.find(item => item.id === variantId);
    const images = product.images?.filter(item => !item.variantId || item.variantId === variantId).map(item => item.url).filter((url) => Boolean(url)) || [];
    const media = [...new Set([...(images || []), product.imageUrl || ""].filter(Boolean))];
    const activeImage = imageUrl || media[0] || "/visual-placeholder.svg";
    const flashNow = flashClock.serverMs + Math.max(0, flashTick - flashClock.perfMs);
    const flash = flashItems.find(item => item.variantId === variantId && Date.parse(item.endsAt) > flashNow);
    const current = flash?.salePriceMinor ?? selected?.priceMinor ?? product.priceMinor;
    const original = selected?.priceOriginalMinor ?? product.priceOriginalMinor;
    const discount = original > current ? Math.round((1 - current / original) * 100) : 0;
    const flashQuota = flash ? Math.max(0, flash.quota - flash.soldCount - flash.reservedCount) : 99;
    const maxQuantity = Math.max(0, Math.min(99, selected?.stock || 0, flashQuota));
    const flashRemaining = flash ? Math.max(0, Math.ceil((Date.parse(flash.endsAt) - flashNow) / 1000)) : 0;
    const optionList = product.variants?.filter(item => item.status === "active") || [];
    const showOptions = optionList.length > 1 || optionList.some(item => Object.keys(item.attributes).length > 0);
    return _jsxs("div", { className: "product-detail-page", children: [_jsx(ContentBreadcrumb, { items: [{ label: "Sản phẩm", to: "/products" }, { label: product.name }] }), _jsxs("div", { className: "product-detail__layout", children: [_jsxs("div", { className: "product-detail__gallery", children: [_jsx("div", { className: "product-detail__main-image", children: _jsx("img", { src: activeImage, alt: product.name }) }), _jsx("div", { className: "product-detail__thumbnails", children: (media.length ? media : ["/visual-placeholder.svg"]).map((url, index) => _jsx("button", { type: "button", className: activeImage === url ? "is-active" : "", onClick: () => setImageUrl(url), "aria-label": `Xem ảnh sản phẩm ${index + 1}`, children: _jsx("img", { src: url, alt: "" }) }, `${variantId}-${index}`)) })] }), _jsxs("section", { className: "product-detail__info", children: [_jsx("h1", { children: product.name }), _jsx("p", { className: "product-detail__rating", children: product.rating != null ? _jsxs(_Fragment, { children: [_jsxs("span", { children: [_jsx(Star, { size: 17, fill: "currentColor" }), " ", product.rating.toFixed(1)] }), _jsxs("small", { children: ["(", product.reviewCount, " \u0111\u00E1nh gi\u00E1)"] })] }) : _jsx("small", { children: "Ch\u01B0a c\u00F3 \u0111\u00E1nh gi\u00E1" }) }), _jsxs("div", { className: "product-detail__prices", children: [_jsx("strong", { children: vnd(current) }), original > current && _jsx("del", { children: vnd(original) })] }), discount > 0 && _jsxs("span", { className: "product-detail__discount", children: [_jsx(Flame, { size: 15 }), " Gi\u1EA3m ", discount, "%"] }), flash && _jsxs("p", { className: "product-detail__flash", children: ["Flash Sale \u00B7 C\u00F2n ", Math.min(flash.availableStock, flashQuota), " su\u1EA5t \u00B7 K\u1EBFt th\u00FAc sau ", [Math.floor(flashRemaining / 3600), Math.floor(flashRemaining / 60) % 60, flashRemaining % 60].map(value => String(value).padStart(2, "0")).join(":")] }), showOptions && _jsxs("div", { className: "product-detail__options", children: [_jsx("h2", { children: "Ch\u1ECDn phi\u00EAn b\u1EA3n" }), _jsx("div", { children: optionList.map(item => _jsx("button", { type: "button", className: item.id === variantId ? "is-active" : "", onClick: () => { setVariantId(item.id); setQuantity(1); setImageUrl(product.images?.find(image => image.variantId === item.id)?.url || product.imageUrl || ""); }, children: Object.values(item.attributes).join(" · ") || item.sku }, item.id)) })] }), _jsxs("div", { className: "product-detail__quantity", children: [_jsx("h2", { children: "S\u1ED1 l\u01B0\u1EE3ng" }), _jsxs("div", { children: [_jsx("button", { type: "button", "aria-label": "Gi\u1EA3m s\u1ED1 l\u01B0\u1EE3ng", disabled: quantity <= 1, onClick: () => setQuantity(value => value - 1), children: _jsx(Minus, { size: 17 }) }), _jsx("span", { children: quantity }), _jsx("button", { type: "button", "aria-label": "T\u0103ng s\u1ED1 l\u01B0\u1EE3ng", disabled: quantity >= maxQuantity, onClick: () => setQuantity(value => value + 1), children: _jsx(Plus, { size: 17 }) })] }), _jsx("small", { children: maxQuantity > 0 ? `Còn ${maxQuantity} sản phẩm` : "Sản phẩm hiện hết hàng" })] }), _jsxs("div", { className: "product-detail__actions", children: [_jsxs("button", { type: "button", className: "product-detail__add", disabled: !maxQuantity || quantity > maxQuantity || adding, onClick: () => void addSelected(), children: [_jsx(ShoppingCart, { size: 18 }), " ", adding ? "Đang thêm..." : "Thêm vào giỏ"] }), _jsxs("button", { type: "button", className: "product-detail__buy", disabled: !maxQuantity || quantity > maxQuantity || adding, onClick: () => void addSelected(true), children: [_jsx(Bolt, { size: 18 }), " Mua ngay"] })] }), product.store?.slug && _jsxs("div", { className: "product-detail__seller", children: [_jsx(Store, { size: 17 }), " Ng\u01B0\u1EDDi b\u00E1n: ", _jsx(Link, { to: `/store/${product.store.slug}`, children: product.store.name })] })] })] }), _jsxs("div", { className: "product-detail__tabs", role: "tablist", "aria-label": "Th\u00F4ng tin s\u1EA3n ph\u1EA9m", children: [_jsx("button", { type: "button", role: "tab", "aria-selected": tab === "description", className: tab === "description" ? "is-active" : "", onClick: () => setTab("description"), children: "M\u00F4 t\u1EA3" }), _jsx("button", { type: "button", role: "tab", "aria-selected": tab === "reviews", className: tab === "reviews" ? "is-active" : "", onClick: () => setTab("reviews"), children: "\u0110\u00E1nh gi\u00E1" })] }), tab === "description" ? _jsx("section", { className: "product-detail__description", role: "tabpanel", children: _jsx("p", { children: product.description || "Chưa có mô tả cho sản phẩm này." }) }) : _jsx("div", { role: "tabpanel", children: _jsx(ReviewSection, { productId: product.id }) })] });
}
