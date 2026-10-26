import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { ShoppingCart } from "lucide-react";
import type { FlashSaleItem } from "../../../api/engagementApi";
import { orderV2Api, notifyCartChanged, vnd } from "../../../api/orderV2Api";
import { showImageFallback } from "../../../utils/imageFallback";

export default function LiveFlashCard({ item }: { item: FlashSaleItem }) {
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
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể thêm sản phẩm vào giỏ.", { containerId: "general-toast" });
    } finally { setAdding(false); }
  }
  return <article className="canva-home__product-card is-flash">
    <div className="canva-home__product-media"><Link to={`/products/${item.productId}`} aria-label={`Xem ${item.productName}`}><img src={item.imageUrl || "/visual-placeholder.svg"} alt={item.productName} loading="lazy" onError={showImageFallback} /></Link>{discount > 0 && <span className="canva-home__badge is-discount">-{discount}%</span>}</div>
    <div className="canva-home__product-body"><Link className="canva-home__product-name" to={`/products/${item.productId}`}>{item.productName}</Link>
      <p className="canva-home__prices"><strong>{vnd(item.salePriceMinor)}</strong>{discount > 0 && <span>{vnd(item.regularPriceMinor)}</span>}</p>
      <div className="canva-home__flash-stock"><div className="canva-home__sold-progress" role="progressbar" aria-label="Tỷ lệ Flash Sale đã bán" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}><span style={{ width: `${progress}%` }} /></div><small>Đã bán {item.soldCount} · Còn {Math.max(0, item.availableStock)}</small></div>
      <button type="button" className="canva-home__add-cart" disabled={adding || item.availableStock < 1} onClick={() => void addToCart()}><ShoppingCart aria-hidden="true" />{adding ? "Đang thêm..." : item.availableStock > 0 ? "Thêm vào giỏ" : "Hết hàng"}</button>
    </div>
  </article>;
}
