import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { ArrowLeft, ExternalLink, Minus, Plus, RotateCcw, ShieldCheck, ShoppingBag, Trash2, Truck, X } from "lucide-react";
import ContentBreadcrumb from "../../components/ui/ContentBreadcrumb";
import { catalogApi, type CatalogItem } from "../../api/catalogApi";
import { orderV2Api, notifyCartChanged, vnd, type CartV2, type CartLine } from "../../api/orderV2Api";
import "./Cart.css";

type StoreGroup = { id: string; name: string; slug?: string; lines: CartLine[] };

export default function Cart() {
  const navigate = useNavigate();
  const [cart, setCart] = useState<CartV2 | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [recommendations, setRecommendations] = useState<CatalogItem[]>([]);
  const reload = useCallback(async () => {
    try { setCart(await orderV2Api.cart()); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Không thể tải giỏ hàng.", { containerId: "general-toast" }); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);
  useEffect(() => {
    let active = true;
    catalogApi.listProducts({ limit: 12, sort: "newest", inStock: true })
      .then(result => { if (active) setRecommendations(result.products); })
      .catch(() => { if (active) setRecommendations([]); });
    return () => { active = false; };
  }, []);

  const groups = useMemo(() => {
    const byStore = new Map<string, StoreGroup>();
    for (const line of cart?.items || []) {
      const id = line.storeId || "unavailable";
      if (!byStore.has(id)) byStore.set(id, { id, name: line.storeName || "Sản phẩm không còn bán", slug: line.storeSlug, lines: [] });
      byStore.get(id)!.lines.push(line);
    }
    return [...byStore.values()];
  }, [cart]);
  const selected = cart?.items.filter(item => item.selected) || [];
  const subtotal = selected.reduce((total, item) => total + (item.priceMinor || 0) * item.quantity, 0);
  const allSelected = Boolean(cart?.items.length) && selected.length === cart?.items.length;
  const inCart = new Set(cart?.items.map(item => item.productId).filter(Boolean));
  const suggested = [...recommendations.filter(item => !inCart.has(item.id)),
    ...recommendations.filter(item => inCart.has(item.id))].slice(0, 4);

  async function run(action: () => Promise<CartV2>, message: string) {
    setBusy(true);
    try { setCart(await action()); notifyCartChanged(); toast.success(message, { containerId: "general-toast" }); }
    catch (error) { await reload(); toast.error(error instanceof Error ? error.message : "Không thể cập nhật giỏ hàng.", { containerId: "general-toast" }); }
    finally { setBusy(false); }
  }
  async function runMany(lines: CartLine[], action: (line: CartLine) => Promise<CartV2>, message: string) {
    if (!lines.length) return;
    setBusy(true);
    try {
      let next: CartV2 | null = null;
      for (const line of lines) next = await action(line);
      setCart(next);
      notifyCartChanged();
      toast.success(message, { containerId: "general-toast" });
    } catch (error) {
      await reload();
      toast.error(error instanceof Error ? error.message : "Không thể cập nhật giỏ hàng.", { containerId: "general-toast" });
    } finally { setBusy(false); }
  }
  const recommendationSection = suggested.length ? <section className="cart-recommendations" aria-labelledby="cart-recommendations-title">
    <header><h2 id="cart-recommendations-title">Có thể bạn cũng thích</h2><Link to="/products">Khám phá thêm từ MDUC247</Link></header>
    <div className="cart-recommendations__grid">{suggested.map(item => <Link className="cart-recommendations__card" to={`/products/${item.id}`} key={item.id}>
      <img src={item.imageUrl || "/visual-placeholder.svg"} alt="" loading="lazy" />
      <span><strong>{item.name}</strong><em>{vnd(item.priceMinor)}</em>{item.rating != null && <small>★ {item.rating.toFixed(1)}{item.reviewCount ? ` · ${item.reviewCount} đánh giá` : ""}</small>}</span>
    </Link>)}</div>
  </section> : null;

  return <div className="cart-page">
    <ContentBreadcrumb items={[{ label: "Giỏ hàng" }]} />
    <header className="cart-page__heading"><div><h1>Giỏ hàng</h1><p>Chọn sản phẩm bạn muốn thanh toán.</p></div><span>{cart?.items.length || 0} sản phẩm</span></header>
    {loading ? <div className="cart-page__empty">Đang tải giỏ hàng...</div> : !cart?.items.length ?
      <div className="cart-page__empty"><ShoppingBag size={38} /><h2>Giỏ hàng của bạn đang trống</h2><p>Khám phá sản phẩm để bắt đầu mua sắm.</p><Link to="/products">Khám phá sản phẩm <ArrowLeft size={16} /></Link></div> :
      <div className="cart-page__layout">
        <div className="cart-page__list">
          {cart.promotionUnavailable && <p className="cart-page__notice">Khuyến mãi tạm không khả dụng; giá đang được lấy từ cửa hàng.</p>}
          <div className="cart-page__toolbar">
            <label><input type="checkbox" checked={allSelected} disabled={busy} onChange={event => { const checked = event.target.checked; void runMany(cart.items.filter(line => line.selected !== checked), line => orderV2Api.update(line.id, { selected: checked }), checked ? "Đã chọn tất cả sản phẩm." : "Đã bỏ chọn tất cả sản phẩm."); }} /><strong>{allSelected ? "Bỏ chọn tất cả" : "Chọn tất cả"}</strong><span>({selected.length} đã chọn)</span></label>
            <div><button type="button" className="is-danger" disabled={busy || !selected.length} onClick={() => void runMany(selected, line => orderV2Api.remove(line.id), "Đã xóa sản phẩm đã chọn.")}><Trash2 size={16} /> Xóa sản phẩm đã chọn</button><Link to="/products"><ArrowLeft size={16} /> Tiếp tục mua sắm</Link></div>
          </div>
          {groups.map(group => {
            const picked = group.lines.filter(line => line.selected);
            const groupTotal = picked.reduce((sum, line) => sum + (line.priceMinor || 0) * line.quantity, 0);
            const groupSelected = picked.length === group.lines.length;
            return <section className="cart-store" key={group.id} aria-label={`Sản phẩm của ${group.name}`}>
              <header className="cart-store__header"><div className="cart-store__identity"><input type="checkbox" aria-label={`${groupSelected ? "Bỏ chọn" : "Chọn"} tất cả sản phẩm của ${group.name}`} checked={groupSelected} disabled={busy} onChange={event => { const checked = event.target.checked; void runMany(group.lines.filter(line => line.selected !== checked), line => orderV2Api.update(line.id, { selected: checked }), "Đã cập nhật lựa chọn cửa hàng."); }} /><span className="cart-store__logo" aria-hidden="true">{group.name.slice(0, 2).toUpperCase()}</span><div><h2>{group.name}</h2><p>{picked.length} sản phẩm đã chọn · {vnd(groupTotal)}</p></div></div>
                {group.slug && <Link to={`/store/${group.slug}`}>Xem shop <ExternalLink size={15} /></Link>}</header>
              <div className="cart-store__items">{group.lines.map(line => {
                const price = line.priceMinor || 0;
                const original = line.priceOriginalMinor || price;
                const discount = original > price && original > 0 ? Math.round((1 - price / original) * 100) : 0;
                const attributes = Object.values(line.attributes || {}).filter(Boolean).join(" · ");
                return <article className={`cart-product${line.selected ? " is-selected" : ""}`} key={line.id}>
                  <input type="checkbox" aria-label={`Chọn ${line.productName || line.sku || "sản phẩm"}`} checked={line.selected} disabled={busy} onChange={event => void run(() => orderV2Api.update(line.id, { selected: event.target.checked }), "Đã cập nhật lựa chọn.")} />
                  <Link className="cart-product__image" to={line.productId ? `/products/${line.productId}` : "/products"}><img src={line.imageUrl || "/visual-placeholder.svg"} alt="" />{discount > 0 && <span>-{discount}%</span>}</Link>
                  <div className="cart-product__info"><Link to={line.productId ? `/products/${line.productId}` : "/products"}>{line.productName || line.sku || "Sản phẩm không còn bán"}</Link><p>{attributes || line.sku || "Sản phẩm"}</p><div className="cart-product__prices"><strong>{line.priceMinor === undefined ? "Chưa có giá" : vnd(price)}</strong>{original > price && <del>{vnd(original)}</del>}</div>
                    {line.flashCampaignId && <small className="cart-product__flash">Flash Sale giảm {vnd(line.flashDiscountMinor || 0)}</small>}
                    {line.error && <small className="cart-product__error">{line.error.message}{line.error.available !== undefined ? ` Còn ${line.error.available}.` : ""}</small>}
                    {line.observedPriceMinor != null && line.priceMinor !== undefined && line.observedPriceMinor !== line.priceMinor && <small className="cart-product__warning">Giá đã đổi từ {vnd(line.observedPriceMinor)}.</small>}
                  </div>
                  <div className="cart-product__actions"><div className="cart-product__stepper"><button type="button" aria-label={`Giảm số lượng ${line.productName || "sản phẩm"}`} disabled={busy || line.quantity <= 1} onClick={() => void run(() => orderV2Api.update(line.id, { quantity: line.quantity - 1 }), "Đã cập nhật số lượng.")}><Minus size={16} /></button><span aria-label={`Số lượng ${line.quantity}`}>{line.quantity}</span><button type="button" aria-label={`Tăng số lượng ${line.productName || "sản phẩm"}`} disabled={busy || line.quantity >= 99} onClick={() => void run(() => orderV2Api.update(line.id, { quantity: line.quantity + 1 }), "Đã cập nhật số lượng.")}><Plus size={16} /></button></div><p>Thành tiền: <strong>{line.priceMinor === undefined ? "—" : vnd(price * line.quantity)}</strong></p><button type="button" className="cart-product__remove" aria-label={`Xóa ${line.productName || "sản phẩm"}`} disabled={busy} onClick={() => void run(() => orderV2Api.remove(line.id), "Đã xóa sản phẩm.")}><X size={18} /></button></div>
                </article>;
              })}</div>
            </section>;
          })}
          <div className="cart-benefits"><div><Truck size={22} /><span><strong>Phí vận chuyển rõ ràng</strong><small>Xem trước khi đặt hàng</small></span></div><div><ShieldCheck size={22} /><span><strong>Thanh toán an toàn</strong><small>Xác nhận trong từng bước</small></span></div><div><RotateCcw size={22} /><span><strong>Hỗ trợ đổi trả</strong><small>Xem điều kiện áp dụng</small></span></div></div>
        </div>
        <aside className="cart-page__aside"><div className="cart-summary"><h2>Tóm tắt đơn hàng</h2><div className="cart-summary__rows"><div><span>Tạm tính</span><strong>{vnd(subtotal)}</strong></div><label>Phương thức vận chuyển<select value="standard" disabled aria-label="Phương thức vận chuyển"><option value="standard">Tiêu chuẩn · xem phí ở thanh toán</option></select></label><div><span>Phí vận chuyển</span><strong>Tính ở bước sau</strong></div></div><div className="cart-summary__total"><div><span>Tổng sản phẩm</span><strong>{vnd(subtotal)}</strong></div><small>Chưa gồm phí vận chuyển; giá cuối cùng được tính ở bước thanh toán.</small></div><button type="button" disabled={!selected.length || busy} onClick={() => navigate("/checkout")}>Thanh toán ({selected.length} sản phẩm)</button><p>Giá cuối cùng được xác nhận ở bước thanh toán.</p><div className="cart-summary__payments"><span>COD</span><span>MoMo/VietQR khi khả dụng</span></div></div></aside>
        {recommendationSection}
      </div>}
    {!loading && !cart?.items.length && recommendationSection}
  </div>;
}
