import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ShoppingCart, Star } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import cartApi from "../../../api/cartApi";
import { useCart } from "../../../context/CartContext";
import FavoriteButton from "../../Favorite/FavoriteButton";
import { showImageFallback } from "../../../utils/imageFallback";
const money = (value) => `${value.toLocaleString("vi-VN")}₫`;
const CanvaProductCard = ({ product, compact = false, flash = false }) => {
    const navigate = useNavigate();
    const { fetchCart } = useCart();
    const [adding, setAdding] = useState(false);
    const currentPrice = product.salePrice ?? product.price;
    const discount = product.salePrice ? Math.round((1 - product.salePrice / product.price) * 100) : 0;
    const soldCount = Math.max(0, product.soldCount ?? 0);
    const stockCount = Math.max(0, product.quantity ?? 0);
    const soldProgress = soldCount + stockCount > 0
        ? Math.round((soldCount / (soldCount + stockCount)) * 100)
        : 0;
    const status = product.demo ? "Minh họa" : discount >= 20 ? "Giá tốt" : soldCount >= 800 ? "Bán chạy" : "Mới";
    const openProduct = () => navigate(product.demo ? "/products" : `/products/${product._id}`);
    const addProductToCart = async (event) => {
        event.stopPropagation();
        if (product.demo) {
            toast.info("Hãy chọn sản phẩm đang bán để thêm vào giỏ", { containerId: "general-toast" });
            navigate("/products");
            return;
        }
        setAdding(true);
        try {
            await cartApi.addToCart({
                productId: product._id,
                quantity: 1,
                variation: { color: "Đen", size: "Tiêu chuẩn", additionalPrice: 0 },
            });
            await fetchCart();
            toast.success(`Đã thêm ${product.name} vào giỏ`, { containerId: "general-toast" });
        }
        catch {
            toast.error("Không thể thêm sản phẩm vào giỏ. Vui lòng thử lại.", { containerId: "general-toast" });
        }
        finally {
            setAdding(false);
        }
    };
    return (_jsxs("article", { className: `canva-home__product-card ${compact ? "is-compact" : ""} ${flash ? "is-flash" : ""}`, role: "link", tabIndex: 0, "aria-label": `Xem ${product.name}`, onClick: openProduct, onKeyDown: (event) => {
            if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) {
                event.preventDefault();
                openProduct();
            }
        }, children: [_jsxs("div", { className: "canva-home__product-media", children: [_jsx("img", { src: product.images[0] || "/visual-placeholder.svg", alt: product.name, loading: "lazy", onError: showImageFallback }), _jsx("span", { className: `canva-home__badge ${flash ? "is-discount" : "is-status"}`, children: product.demo ? status : flash && discount > 0 ? `-${discount}%` : status }), !flash && !product.demo && (_jsx(FavoriteButton, { productId: product._id, className: "canva-home__heart", iconSize: 15 }))] }), _jsxs("div", { className: "canva-home__product-body", children: [_jsx("h3", { className: "canva-home__product-name", children: product.name }), !flash && (_jsxs("p", { className: "canva-home__rating", children: [_jsx(Star, {}), " ", typeof product.rating === "number" ? product.rating.toFixed(1) : "Chưa có đánh giá", typeof product.reviewsCount === "number" && _jsxs("span", { children: ["\u00B7 ", product.reviewsCount.toLocaleString("vi-VN"), " \u0111\u00E1nh gi\u00E1"] }), _jsxs("span", { children: ["\u00B7 \u0110\u00E3 b\u00E1n ", soldCount.toLocaleString("vi-VN")] })] })), _jsxs("p", { className: "canva-home__prices", children: [_jsx("strong", { children: money(currentPrice) }), product.salePrice && _jsx("span", { children: money(product.price) })] }), flash && (_jsxs("div", { className: "canva-home__flash-stock", children: [_jsx("div", { className: "canva-home__sold-progress", role: "progressbar", "aria-label": "T\u1EF7 l\u1EC7 \u0111\u00E3 b\u00E1n", "aria-valuemin": 0, "aria-valuemax": 100, "aria-valuenow": soldProgress, children: _jsx("span", { style: { width: `${soldProgress}%` } }) }), _jsxs("small", { children: ["\u0110\u00E3 b\u00E1n ", soldProgress, "% \u00B7 C\u00F2n ", stockCount.toLocaleString("vi-VN")] })] })), _jsxs("button", { type: "button", className: "canva-home__add-cart", onClick: addProductToCart, disabled: adding || stockCount === 0 && !product.demo, children: [_jsx(ShoppingCart, { "aria-hidden": "true" }), adding ? "Đang thêm..." : stockCount === 0 && !product.demo ? "Hết hàng" : "Thêm vào giỏ"] })] })] }));
};
export default CanvaProductCard;
