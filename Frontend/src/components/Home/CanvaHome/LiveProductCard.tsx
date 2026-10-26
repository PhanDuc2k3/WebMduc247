import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { ShoppingCart, Star } from "lucide-react";
import { catalogApi, type CatalogItem } from "../../../api/catalogApi";
import { orderV2Api, notifyCartChanged, vnd } from "../../../api/orderV2Api";
import { showImageFallback } from "../../../utils/imageFallback";

export default function LiveProductCard({ product, compact = false }: { product: CatalogItem; compact?: boolean }) {
  const [adding, setAdding] = useState(false);
  const onSale = product.priceOriginalMinor > product.priceMinor;
  const discount = onSale ? Math.round((1 - product.priceMinor / product.priceOriginalMinor) * 100) : 0;
  async function addToCart() {
    setAdding(true);
    try {
      const detail = await catalogApi.product(product.id);
      const variant = detail.product.variants?.filter(item => item.status === "active" && item.stock > 0)
        .sort((a, b) => a.priceMinor - b.priceMinor)[0];
      if (!variant) throw new Error("Sản phẩm hiện không còn hàng.");
      await orderV2Api.add(variant.id, 1);
      notifyCartChanged();
      toast.success(`Đã thêm ${product.name} vào giỏ.`, { containerId: "general-toast" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể thêm sản phẩm vào giỏ.", { containerId: "general-toast" });
    } finally { setAdding(false); }
  }
  return <article className={`canva-home__product-card${compact ? " is-compact" : ""}`}>
    <div className="canva-home__product-media"><Link to={`/products/${product.id}`} aria-label={`Xem ${product.name}`}><img src={product.imageUrl || "/visual-placeholder.svg"} alt={product.name} loading="lazy" onError={showImageFallback} /></Link><span className="canva-home__badge is-status">{onSale ? `-${discount}%` : "Mới"}</span></div>
    <div className="canva-home__product-body"><Link className="canva-home__product-name" to={`/products/${product.id}`}>{product.name}</Link>
      <p className="canva-home__rating">{product.rating != null ? <><Star aria-hidden="true" /> {product.rating.toFixed(1)}{product.reviewCount > 0 && <span>· {product.reviewCount} đánh giá</span>}</> : "Chưa có đánh giá"}</p>
      <p className="canva-home__prices"><strong>{vnd(product.priceMinor)}</strong>{onSale && <span>{vnd(product.priceOriginalMinor)}</span>}</p>
      <button type="button" className="canva-home__add-cart" disabled={adding || !product.inStock} onClick={() => void addToCart()}><ShoppingCart aria-hidden="true" />{adding ? "Đang thêm..." : product.inStock ? "Thêm vào giỏ" : "Hết hàng"}</button>
    </div>
  </article>;
}
