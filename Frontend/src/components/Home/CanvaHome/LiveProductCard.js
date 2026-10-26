import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { ShoppingCart, Star } from "lucide-react";
import { catalogApi } from "../../../api/catalogApi";
import { orderV2Api, notifyCartChanged, vnd } from "../../../api/orderV2Api";
import { showImageFallback } from "../../../utils/imageFallback";
export default function LiveProductCard({ product, compact = false }) {
    const [adding, setAdding] = useState(false);
    const onSale = product.priceOriginalMinor > product.priceMinor;
    const discount = onSale ? Math.round((1 - product.priceMinor / product.priceOriginalMinor) * 100) : 0;
    async function addToCart() {
        setAdding(true);
        try {
            const detail = await catalogApi.product(product.id);
            const variant = detail.product.variants?.filter(item => item.status === "active" && item.stock > 0)
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
    return _jsxs("article", { className: `canva-home__product-card${compact ? " is-compact" : ""}`, children: [_jsxs("div", { className: "canva-home__product-media", children: [_jsx(Link, { to: `/products/${product.id}`, "aria-label": `Xem ${product.name}`, children: _jsx("img", { src: product.imageUrl || "/visual-placeholder.svg", alt: product.name, loading: "lazy", onError: showImageFallback }) }), _jsx("span", { className: "canva-home__badge is-status", children: onSale ? `-${discount}%` : "Mới" })] }), _jsxs("div", { className: "canva-home__product-body", children: [_jsx(Link, { className: "canva-home__product-name", to: `/products/${product.id}`, children: product.name }), _jsx("p", { className: "canva-home__rating", children: product.rating != null ? _jsxs(_Fragment, { children: [_jsx(Star, { "aria-hidden": "true" }), " ", product.rating.toFixed(1), product.reviewCount > 0 && _jsxs("span", { children: ["\u00B7 ", product.reviewCount, " \u0111\u00E1nh gi\u00E1"] })] }) : "Chưa có đánh giá" }), _jsxs("p", { className: "canva-home__prices", children: [_jsx("strong", { children: vnd(product.priceMinor) }), onSale && _jsx("span", { children: vnd(product.priceOriginalMinor) })] }), _jsxs("button", { type: "button", className: "canva-home__add-cart", disabled: adding || !product.inStock, onClick: () => void addToCart(), children: [_jsx(ShoppingCart, { "aria-hidden": "true" }), adding ? "Đang thêm..." : product.inStock ? "Thêm vào giỏ" : "Hết hàng"] })] })] });
}
