import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight, Package, ShoppingBag } from "lucide-react";
import { orderV2Api, vnd, type OrderGroupV2 } from "../../api/orderV2Api";
import ContentBreadcrumb from "../../components/ui/ContentBreadcrumb";
import { showImageFallback } from "../../utils/imageFallback";
import { orderStatusName, orderStatusOptions } from "./orderStatus";
import "./BuyerOrdersV2.css";

const PAGE_SIZE = 10;
const tabs = [
  { value: "", label: "Tất cả" },
  { value: "PENDING_PAYMENT", label: "Chờ thanh toán" },
  { value: "PLACED", label: "Đã đặt" },
  { value: "CONFIRMED", label: "Đã xác nhận" },
  { value: "SHIPPING", label: "Đang giao" },
  { value: "COMPLETED", label: "Hoàn thành" },
  { value: "CANCELLED", label: "Đã hủy" },
];

function statusTone(status: string) {
  if (["CANCELLED", "CANCEL_PENDING", "PARTIAL_CANCELLED"].includes(status)) return "is-cancelled";
  if (["DELIVERED", "COMPLETED"].includes(status)) return "is-complete";
  if (["SHIPPING", "READY_TO_SHIP"].includes(status)) return "is-shipping";
  return "is-pending";
}

function progressFor(status: string) {
  if (["COMPLETED", "DELIVERED"].includes(status)) return 100;
  if (status === "SHIPPING") return 75;
  if (["READY_TO_SHIP", "PREPARING"].includes(status)) return 55;
  if (status === "CONFIRMED") return 35;
  if (["PLACED", "PENDING_PAYMENT", "PENDING_INVENTORY"].includes(status)) return 15;
  return 0;
}

function paymentStatusName(status: string) {
  if (status === "PAID") return "Đã thanh toán";
  if (status === "REFUNDED") return "Đã hoàn tiền";
  if (status === "PARTIALLY_REFUNDED") return "Đã hoàn một phần";
  return "Chưa thanh toán";
}

function OrderCard({ group, detail, previewLoading }: { group: OrderGroupV2; detail?: OrderGroupV2; previewLoading: boolean }) {
  const orders = detail?.orders || group.orders;
  const lines = detail?.orders.flatMap(order => (order.items || []).map(item => ({ item, store: order.store.name || "Cửa hàng" }))) || [];
  const itemCount = lines.reduce((sum, line) => sum + line.item.quantity, 0);
  const isSingleStore = group.orders.length === 1;
  const progress = isSingleStore ? progressFor(group.orders[0].status) : 0;
  const destination = `/orders/${group.id}`;

  return <article className="buyer-orders-card">
    <header className="buyer-orders-card__header"><div><span className="buyer-orders-card__id"><ShoppingBag size={17} /> Đơn hàng #{group.id.slice(0, 8).toUpperCase()}</span><small><CalendarDays size={14} /> {new Date(group.createdAt).toLocaleString("vi-VN")}</small></div><span className={`buyer-orders-status ${statusTone(group.status)}`}>{orderStatusName(group.status)}</span></header>
    <div className="buyer-orders-card__body">
      <div className="buyer-orders-card__products">
        <div className="buyer-orders-card__store-row"><strong>{orders.map(order => order.store.name || "Cửa hàng").join(" · ")}</strong><span>{isSingleStore ? "1 cửa hàng" : `${group.orders.length} cửa hàng`}</span></div>
        {lines.length ? <><div className="buyer-orders-card__items">{lines.slice(0, 2).map(({ item, store }) => <div className="buyer-orders-product" key={item.id}><Link to={`/products/${item.productId}`} className="buyer-orders-product__image" aria-label={`Xem ${item.name}`}><img src={item.snapshot.imageUrl || "/visual-placeholder.svg"} alt={item.name} loading="lazy" onError={showImageFallback} /></Link><div><Link to={`/products/${item.productId}`}>{item.name}</Link><small>{store} · Số lượng: {item.quantity}</small></div><strong>{vnd(item.lineTotalMinor)}</strong></div>)}</div>{lines.length > 2 && <Link className="buyer-orders-card__more" to={destination}>Xem thêm {lines.length - 2} sản phẩm <ArrowRight size={14} /></Link>}<span className="buyer-orders-card__quantity">{itemCount} sản phẩm trong đơn</span></> : <div className="buyer-orders-card__preview-empty"><Package size={20} /><span>{previewLoading ? "Đang tải sản phẩm..." : "Xem sản phẩm trong chi tiết đơn hàng"}</span></div>}
      </div>
      <div className="buyer-orders-card__summary">
        <p className="buyer-orders-card__summary-label">Trạng thái đơn hàng</p>
        {isSingleStore ? <><strong className="buyer-orders-card__summary-status">{orderStatusName(group.orders[0].status)}</strong><div className="buyer-orders-card__progress" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Tiến trình đơn hàng"><span style={{ width: `${progress}%` }} /></div></> : <div className="buyer-orders-card__shop-statuses">{group.orders.map(order => <span key={order.id}>{order.store.name || "Cửa hàng"}: {orderStatusName(order.status)}</span>)}</div>}
        <p className="buyer-orders-card__payment">{group.paymentMethod === "COD" ? "Thanh toán khi nhận hàng" : group.paymentMethod === "MOMO" ? "MoMo" : "VietQR"} · {paymentStatusName(group.paymentStatus)}</p>
        <div className="buyer-orders-card__total"><span>{group.cancelledTotalMinor > 0 ? "Tổng còn hiệu lực" : "Tổng cộng"}</span><strong>{vnd(group.currentTotalMinor)}</strong></div>
        {group.cancelledTotalMinor > 0 && <p className="buyer-orders-card__cancelled-amount">Đã hủy: {vnd(group.cancelledTotalMinor)}</p>}
        <Link className="buyer-orders-card__open" to={destination}>Xem chi tiết đơn hàng <ArrowRight size={16} /></Link>
      </div>
    </div>
  </article>;
}

export function BuyerOrdersV2() {
  const [params, setParams] = useSearchParams();
  const rawStatus = params.get("status") || "";
  const status = orderStatusOptions.some(([value]) => value === rawStatus) ? rawStatus : "";
  const rawPage = Number(params.get("page"));
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const [groups, setGroups] = useState<OrderGroupV2[]>([]);
  const [details, setDetails] = useState<Record<string, OrderGroupV2>>({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [previewsLoading, setPreviewsLoading] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true); setPreviewsLoading(false); setDetails({}); setError("");
    orderV2Api.buyerOrders({ page, limit: PAGE_SIZE, status: status || undefined })
      .then(result => {
        if (!active) return;
        const visible = result.groups || [];
        setGroups(visible); setTotal(result.total); setLoading(false);
        if (!visible.length) return;
        setPreviewsLoading(true);
        void Promise.allSettled(visible.map(group => orderV2Api.buyerOrder(group.id))).then(results => {
          if (!active) return;
          const loaded: Record<string, OrderGroupV2> = {};
          results.forEach((result, index) => { if (result.status === "fulfilled") loaded[visible[index].id] = result.value.group; });
          setDetails(loaded); setPreviewsLoading(false);
        });
      })
      .catch(cause => { if (active) { setGroups([]); setTotal(0); setError(cause instanceof Error ? cause.message : "Không thể tải đơn hàng."); setLoading(false); } });
    return () => { active = false; };
  }, [page, status, retry]);

  function changeStatus(value: string) {
    const next = new URLSearchParams();
    if (value) next.set("status", value);
    setParams(next);
  }
  function changePage(value: number) {
    const next = new URLSearchParams(params);
    if (value <= 1) next.delete("page"); else next.set("page", String(value));
    setParams(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const first = total ? (page - 1) * PAGE_SIZE + 1 : 0;
  const last = Math.min(page * PAGE_SIZE, total);

  return <div className="buyer-orders-page">
    <ContentBreadcrumb items={[{ label: "Đơn hàng của tôi" }]} />
    <header className="buyer-orders-heading"><div><span>THEO DÕI MUA SẮM</span><h1>Đơn hàng của tôi</h1><p>Xem sản phẩm, trạng thái giao hàng và thanh toán của từng đơn.</p></div><div className="buyer-orders-heading__count"><ShoppingBag size={20} /><strong>{total.toLocaleString("vi-VN")}</strong><small>đơn hàng{status ? " phù hợp" : ""}</small></div></header>
    <div className="buyer-orders-filters"><div className="buyer-orders-tabs" role="group" aria-label="Lọc đơn theo trạng thái">{tabs.map(tab => <button type="button" key={tab.value} className={status === tab.value ? "is-active" : ""} aria-pressed={status === tab.value} onClick={() => changeStatus(tab.value)}>{tab.label}</button>)}</div><label>Lọc khác<select value={tabs.some(tab => tab.value === status) ? "" : status} onChange={event => changeStatus(event.target.value)} aria-label="Trạng thái khác"><option value="">Chọn trạng thái</option>{orderStatusOptions.filter(([value]) => !tabs.some(tab => tab.value === value)).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
    {error ? <div className="buyer-orders-state"><Package size={31} /><h2>Không thể tải đơn hàng</h2><p>{error}</p><button type="button" onClick={() => setRetry(value => value + 1)}>Thử lại</button></div> : loading ? <div className="buyer-orders-state" role="status"><Package size={31} /><p>Đang tải đơn hàng...</p></div> : groups.length ? <><div className="buyer-orders-list">{groups.map(group => <OrderCard key={group.id} group={group} detail={details[group.id]} previewLoading={previewsLoading} />)}</div><nav className="buyer-orders-pagination" aria-label="Phân trang đơn hàng"><span>Hiển thị {first}–{last} trong {total.toLocaleString("vi-VN")} đơn hàng</span>{pageCount > 1 && <div><button type="button" disabled={page <= 1} onClick={() => changePage(page - 1)} aria-label="Trang trước"><ChevronLeft size={17} /></button><strong>Trang {page} / {pageCount}</strong><button type="button" disabled={page >= pageCount} onClick={() => changePage(page + 1)} aria-label="Trang sau"><ChevronRight size={17} /></button></div>}</nav></> : <div className="buyer-orders-state"><Package size={31} /><h2>{status ? "Chưa có đơn ở trạng thái này" : "Bạn chưa có đơn hàng"}</h2><p>{status ? "Chọn trạng thái khác để xem các đơn đã đặt." : "Khám phá sản phẩm và bắt đầu mua sắm."}</p>{status ? <button type="button" onClick={() => changeStatus("")}>Xem tất cả đơn hàng</button> : <Link to="/products">Khám phá sản phẩm <ArrowRight size={16} /></Link>}</div>}
  </div>;
}
