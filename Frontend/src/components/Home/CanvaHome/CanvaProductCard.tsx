import { ShoppingCart, Star } from "lucide-react";
import { useState, type MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import cartApi from "../../../api/cartApi";
import { useCart } from "../../../context/CartContext";
import FavoriteButton from "../../Favorite/FavoriteButton";
import type { HomeProduct } from "./homeData";
import { showImageFallback } from "../../../utils/imageFallback";

const money = (value: number) => `${value.toLocaleString("vi-VN")}₫`;

interface Props {
  product: HomeProduct;
  compact?: boolean;
  flash?: boolean;
}

const CanvaProductCard = ({ product, compact = false, flash = false }: Props) => {
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

  const addProductToCart = async (event: MouseEvent<HTMLButtonElement>) => {
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
    } catch {
      toast.error("Không thể thêm sản phẩm vào giỏ. Vui lòng thử lại.", { containerId: "general-toast" });
    } finally {
      setAdding(false);
    }
  };

  return (
    <article
      className={`canva-home__product-card ${compact ? "is-compact" : ""} ${flash ? "is-flash" : ""}`}
      role="link"
      tabIndex={0}
      aria-label={`Xem ${product.name}`}
      onClick={openProduct}
      onKeyDown={(event) => {
        if (event.target === event.currentTarget && (event.key === "Enter" || event.key === " ")) {
          event.preventDefault();
          openProduct();
        }
      }}
    >
      <div className="canva-home__product-media">
        <img src={product.images[0] || "/visual-placeholder.svg"} alt={product.name} loading="lazy" onError={showImageFallback} />
        <span className={`canva-home__badge ${flash ? "is-discount" : "is-status"}`}>
          {product.demo ? status : flash && discount > 0 ? `-${discount}%` : status}
        </span>
        {!flash && !product.demo && (
          <FavoriteButton productId={product._id} className="canva-home__heart" iconSize={15} />
        )}
      </div>

      <div className="canva-home__product-body">
        <h3 className="canva-home__product-name">{product.name}</h3>

        {!flash && (
          <p className="canva-home__rating">
            <Star /> {typeof product.rating === "number" ? product.rating.toFixed(1) : "Chưa có đánh giá"}
            {typeof product.reviewsCount === "number" && <span>· {product.reviewsCount.toLocaleString("vi-VN")} đánh giá</span>}
            <span>· Đã bán {soldCount.toLocaleString("vi-VN")}</span>
          </p>
        )}

        <p className="canva-home__prices">
          <strong>{money(currentPrice)}</strong>
          {product.salePrice && <span>{money(product.price)}</span>}
        </p>

        {flash && (
          <div className="canva-home__flash-stock">
            <div className="canva-home__sold-progress" role="progressbar" aria-label="Tỷ lệ đã bán" aria-valuemin={0} aria-valuemax={100} aria-valuenow={soldProgress}>
              <span style={{ width: `${soldProgress}%` }} />
            </div>
            <small>Đã bán {soldProgress}% · Còn {stockCount.toLocaleString("vi-VN")}</small>
          </div>
        )}

        <button type="button" className="canva-home__add-cart" onClick={addProductToCart} disabled={adding || stockCount === 0 && !product.demo}>
          <ShoppingCart aria-hidden="true" />
          {adding ? "Đang thêm..." : stockCount === 0 && !product.demo ? "Hết hàng" : "Thêm vào giỏ"}
        </button>
      </div>
    </article>
  );
};

export default CanvaProductCard;
