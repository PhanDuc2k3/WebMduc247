import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { ShoppingCart } from "lucide-react";
import { orderV2Api, notifyCartChanged, vnd } from "../../../api/orderV2Api";
import { showImageFallback } from "../../../utils/imageFallback";
export default function LiveFlashCard({ item }) {
    const [adding, setAdding] = useState(false);
    const discount = item.regularPriceMinor > item.salePriceMinor
        ? Math.round((1 - item.salePriceMinor / item.regularPriceMinor) * 100) : 0;
    const progress = item.quota > 0 ? Math.min(100, Math.round(item.soldCount / item.quota * 100)) : 0;
    async function addToCart() {
        setAdding(true);
        try {
            await orderV2Api.add(item.variantId, 1);
            notifyCartChanged();
            toast.success(`Đã thêm ${item.productName} vào giỏ.`, { containerId: "general-toast" });
        }
        catch (error) {
            toast.error(error instanceof Error ? error.message : "Không thể thêm sản phẩm vào giỏ.", { containerId: "general-toast" });
        }
        finally {
            setAdding(false);
        }
    }
    return _jsxs("article", { className: "canva-home__product-card is-flash", children: [_jsxs("div", { className: "canva-home__product-media", children: [_jsx(Link, { to: `/products/${item.productId}`, "aria-label": `Xem ${item.productName}`, children: _jsx("img", { src: item.imageUrl || "/visual-placeholder.svg", alt: item.productName, loading: "lazy", onError: showImageFallback }) }), discount > 0 && _jsxs("span", { className: "canva-home__badge is-discount", children: ["-", discount, "%"] })] }), _jsxs("div", { className: "canva-home__product-body", children: [_jsx(Link, { className: "canva-home__product-name", to: `/products/${item.productId}`, children: item.productName }), _jsxs("p", { className: "canva-home__prices", children: [_jsx("strong", { children: vnd(item.salePriceMinor) }), discount > 0 && _jsx("span", { children: vnd(item.regularPriceMinor) })] }), _jsxs("div", { className: "canva-home__flash-stock", children: [_jsx("div", { className: "canva-home__sold-progress", role: "progressbar", "aria-label": "T\u1EF7 l\u1EC7 Flash Sale \u0111\u00E3 b\u00E1n", "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": progress, children: _jsx("span", { style: { width: `${progress}%` } }) }), _jsxs("small", { children: ["\u0110\u00E3 b\u00E1n ", item.soldCount, " \u00B7 C\u00F2n ", Math.max(0, item.availableStock)] })] }), _jsxs("button", { type: "button", className: "canva-home__add-cart", disabled: adding || item.availableStock < 1, onClick: () => void addToCart(), children: [_jsx(ShoppingCart, { "aria-hidden": "true" }), adding ? "Đang thêm..." : item.availableStock > 0 ? "Thêm vào giỏ" : "Hết hàng"] })] })] });
}
