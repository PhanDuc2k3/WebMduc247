import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { Bolt, Flame, Minus, Plus, ShoppingCart, Star, Store } from "lucide-react";
import ContentBreadcrumb from "../../components/ui/ContentBreadcrumb";
import { catalogApi, type CatalogItem, type Variant } from "../../api/catalogApi";
import { orderV2Api, notifyCartChanged, vnd } from "../../api/orderV2Api";
import { engagementApi, type FlashSaleItem } from "../../api/engagementApi";
import ReviewSection from "../../components/ReviewReturn/ReviewSection";
import "./DetailProduct.css";

export default function DetailProduct() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<CatalogItem | null>(null);
  const [variantId, setVariantId] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [tab, setTab] = useState<"description" | "reviews">(() => new URLSearchParams(window.location.search).has("reviewItem") ? "reviews" : "description");
  const [flashItems, setFlashItems] = useState<FlashSaleItem[]>([]);
  const [flashClock, setFlashClock] = useState({ serverMs: 0, perfMs: 0 });
  const [flashTick, setFlashTick] = useState(0);

  useEffect(() => {
    let active = true;
    catalogApi.product(id).then(result => {
      if (!active) return;
      const chosen = result.product.variants?.filter(item => item.status === "active" && item.stock > 0)
        .sort((a, b) => a.priceMinor - b.priceMinor)[0] || result.product.variants?.find(item => item.status === "active");
      setProduct(result.product);
      setVariantId(chosen?.id || "");
      setImageUrl(result.product.images?.find(item => item.variantId === chosen?.id)?.url || result.product.imageUrl || "");
      setQuantity(1);
    }).catch(error => { if (active) toast.error(error instanceof Error ? error.message : "Không thể tải sản phẩm.", { containerId: "general-toast" }); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id]);
  useEffect(() => {
    let active = true;
    engagementApi.flashSales().then(result => {
      if (!active) return;
      const perf = performance.now();
      setFlashItems(result.items);
      setFlashClock({ serverMs: Date.parse(result.serverTime), perfMs: perf });
      setFlashTick(perf);
    }).catch(() => {});
    const timer = window.setInterval(() => setFlashTick(performance.now()), 1000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  async function addSelected(goCheckout = false) {
    if (!variantId) return;
    setAdding(true);
    try {
      const updated = await orderV2Api.add(variantId, quantity);
      if (goCheckout) {
        for (const line of updated.items) {
          const shouldSelect = line.variantId === variantId;
          if (line.selected !== shouldSelect) await orderV2Api.update(line.id, { selected: shouldSelect });
        }
      }
      notifyCartChanged();
      if (goCheckout) navigate("/checkout");
      else toast.success("Đã thêm vào giỏ hàng.", { containerId: "general-toast" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể thêm sản phẩm vào giỏ hàng.", { containerId: "general-toast" });
    } finally { setAdding(false); }
  }

  if (loading) return <div className="product-detail-page"><div className="product-detail__state">Đang tải sản phẩm...</div></div>;
  if (!product) return <div className="product-detail-page"><div className="product-detail__state">Không tìm thấy sản phẩm đang bán. <Link to="/products">Xem sản phẩm khác</Link></div></div>;

  const selected: Variant | undefined = product.variants?.find(item => item.id === variantId);
  const images = product.images?.filter(item => !item.variantId || item.variantId === variantId).map(item => item.url).filter((url): url is string => Boolean(url)) || [];
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

  return <div className="product-detail-page"><ContentBreadcrumb items={[{ label: "Sản phẩm", to: "/products" }, { label: product.name }]} />
    <div className="product-detail__layout">
      <div className="product-detail__gallery"><div className="product-detail__main-image"><img src={activeImage} alt={product.name} /></div><div className="product-detail__thumbnails">{(media.length ? media : ["/visual-placeholder.svg"]).map((url, index) => <button type="button" key={`${variantId}-${index}`} className={activeImage === url ? "is-active" : ""} onClick={() => setImageUrl(url)} aria-label={`Xem ảnh sản phẩm ${index + 1}`}><img src={url} alt="" /></button>)}</div></div>
      <section className="product-detail__info"><h1>{product.name}</h1><p className="product-detail__rating">{product.rating != null ? <><span><Star size={17} fill="currentColor" /> {product.rating.toFixed(1)}</span><small>({product.reviewCount} đánh giá)</small></> : <small>Chưa có đánh giá</small>}</p>
        <div className="product-detail__prices"><strong>{vnd(current)}</strong>{original > current && <del>{vnd(original)}</del>}</div>{discount > 0 && <span className="product-detail__discount"><Flame size={15} /> Giảm {discount}%</span>}
        {flash && <p className="product-detail__flash">Flash Sale · Còn {Math.min(flash.availableStock, flashQuota)} suất · Kết thúc sau {[Math.floor(flashRemaining / 3600), Math.floor(flashRemaining / 60) % 60, flashRemaining % 60].map(value => String(value).padStart(2, "0")).join(":")}</p>}
        {showOptions && <div className="product-detail__options"><h2>Chọn phiên bản</h2><div>{optionList.map(item => <button type="button" key={item.id} className={item.id === variantId ? "is-active" : ""} onClick={() => { setVariantId(item.id); setQuantity(1); setImageUrl(product.images?.find(image => image.variantId === item.id)?.url || product.imageUrl || ""); }}>{Object.values(item.attributes).join(" · ") || item.sku}</button>)}</div></div>}
        <div className="product-detail__quantity"><h2>Số lượng</h2><div><button type="button" aria-label="Giảm số lượng" disabled={quantity <= 1} onClick={() => setQuantity(value => value - 1)}><Minus size={17} /></button><span>{quantity}</span><button type="button" aria-label="Tăng số lượng" disabled={quantity >= maxQuantity} onClick={() => setQuantity(value => value + 1)}><Plus size={17} /></button></div><small>{maxQuantity > 0 ? `Còn ${maxQuantity} sản phẩm` : "Sản phẩm hiện hết hàng"}</small></div>
        <div className="product-detail__actions"><button type="button" className="product-detail__add" disabled={!maxQuantity || quantity > maxQuantity || adding} onClick={() => void addSelected()}><ShoppingCart size={18} /> {adding ? "Đang thêm..." : "Thêm vào giỏ"}</button><button type="button" className="product-detail__buy" disabled={!maxQuantity || quantity > maxQuantity || adding} onClick={() => void addSelected(true)}><Bolt size={18} /> Mua ngay</button></div>
        {product.store?.slug && <div className="product-detail__seller"><Store size={17} /> Người bán: <Link to={`/store/${product.store.slug}`}>{product.store.name}</Link></div>}
      </section>
    </div>
    <div className="product-detail__tabs" role="tablist" aria-label="Thông tin sản phẩm"><button type="button" role="tab" aria-selected={tab === "description"} className={tab === "description" ? "is-active" : ""} onClick={() => setTab("description")}>Mô tả</button><button type="button" role="tab" aria-selected={tab === "reviews"} className={tab === "reviews" ? "is-active" : ""} onClick={() => setTab("reviews")}>Đánh giá</button></div>
    {tab === "description" ? <section className="product-detail__description" role="tabpanel"><p>{product.description || "Chưa có mô tả cho sản phẩm này."}</p></section> : <div role="tabpanel"><ReviewSection productId={product.id} /></div>}
  </div>;
}
