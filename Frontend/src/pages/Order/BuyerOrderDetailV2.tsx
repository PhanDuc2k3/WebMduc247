import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { Check, Circle, CircleCheck, CircleX, Clock3, MapPin, MessageCircle, Package, Phone, Share2, Truck, UserRound } from "lucide-react";
import { catalogApi, type CatalogStore } from "../../api/catalogApi";
import { chatV2Api } from "../../api/chatV2Api";
import { orderV2Api, vnd, type OrderGroupV2, type ShopOrderV2 } from "../../api/orderV2Api";
import { paymentV2Api, type RefundV2 } from "../../api/paymentV2Api";
import ReturnPanel from "../../components/ReviewReturn/ReturnPanel";
import ContentBreadcrumb from "../../components/ui/ContentBreadcrumb";
import { formatAddress } from "../../utils/formatAddress";
import { showImageFallback } from "../../utils/imageFallback";
import { orderStatusName } from "./orderStatus";
import "./BuyerOrderDetailV2.css";

const steps = [
  { label: "Đã đặt hàng", detail: "Đơn hàng đã được tạo", statuses: ["PENDING_INVENTORY", "PENDING_PAYMENT", "PLACED"] },
  { label: "Xác nhận", detail: "Cửa hàng đã xác nhận đơn", statuses: ["CONFIRMED"] },
  { label: "Đóng gói", detail: "Cửa hàng đang chuẩn bị sản phẩm", statuses: ["PREPARING", "READY_TO_SHIP"] },
  { label: "Vận chuyển", detail: "Đơn hàng đang được vận chuyển", statuses: ["SHIPPING"] },
  { label: "Đã giao hàng", detail: "Đơn hàng đã được giao", statuses: ["DELIVERED"] },
  { label: "Đã nhận hàng", detail: "Người mua đã xác nhận nhận hàng", statuses: ["COMPLETED"] },
];

const formatDate = (value: string) => new Date(value).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
const isCancelled = (status: string) => ["CANCELLED", "CANCEL_PENDING"].includes(status);

function ShopOrderDetail({ order, groupId, store, onReload }: {
  order: ShopOrderV2; groupId: string; store?: CatalogStore; onReload: () => Promise<void>;
}) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState("");
  const keys = useRef(new Map<string, string>());
  const lastStage = isCancelled(order.status)
    ? order.history?.map(event => steps.findIndex(step => step.statuses.includes(event.toStatus))).filter(index => index >= 0).at(-1) ?? 0
    : Math.max(0, steps.findIndex(step => step.statuses.includes(order.status)));
  const progress = Math.round(((lastStage + 1) / steps.length) * 100);
  const itemCount = order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  const canCancel = order.status === "PLACED";
  const canComplete = order.status === "DELIVERED";

  async function command(action: "cancel" | "complete") {
    if (action === "cancel" && reason.trim().length < 3) {
      toast.error("Vui lòng nhập lý do hủy ít nhất 3 ký tự.", { containerId: "general-toast" });
      return;
    }
    const token = `${order.id}:${order.version}:${action}`;
    if (!keys.current.has(token)) keys.current.set(token, crypto.randomUUID());
    setBusy(true);
    try {
      if (action === "cancel") await orderV2Api.cancel(groupId, order.id, order.version, reason.trim(), keys.current.get(token)!);
      else await orderV2Api.complete(groupId, order.id, order.version, keys.current.get(token)!);
      keys.current.delete(token);
      await onReload();
      setCancelOpen(false); setReason("");
      toast.success(action === "cancel" ? "Đã gửi yêu cầu hủy đơn." : "Đã xác nhận nhận hàng.", { containerId: "general-toast" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể cập nhật đơn hàng.", { containerId: "general-toast" });
      void onReload().catch(() => {});
    } finally { setBusy(false); }
  }

  async function messageStore() {
    setBusy(true);
    try {
      const { conversation } = await chatV2Api.create(order.storeId);
      navigate(`/messages/${conversation.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể mở tin nhắn với cửa hàng.", { containerId: "general-toast" });
    } finally { setBusy(false); }
  }

  async function shareOrder() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Đã sao chép liên kết đơn hàng.", { containerId: "general-toast" });
    } catch {
      toast.error("Không thể sao chép liên kết trên trình duyệt này.", { containerId: "general-toast" });
    }
  }

  return <section className="buyer-order-shop" aria-label={`Đơn hàng từ ${order.store.name || "cửa hàng"}`}>
    <div className="buyer-order-main">
      <article className="buyer-order-card buyer-order-status">
        <header className="buyer-order-card__heading"><div><h2>Trạng thái đơn hàng</h2><p>Mã đơn #{order.id.slice(0, 8).toUpperCase()} · Ngày đặt: {formatDate(order.createdAt)}</p></div><span className={`buyer-order-status__badge${isCancelled(order.status) ? " is-cancelled" : ""}`}>{orderStatusName(order.status)}</span></header>
        <div className="buyer-order-status__body">
          <div className="buyer-order-progress" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100} aria-label="Tiến trình đơn hàng"><span style={{ width: `${progress}%` }} /></div>
          <div className="buyer-order-progress-label"><span>Tiến trình đơn hàng</span><strong>{progress}%</strong></div>
          {isCancelled(order.status) && <div className="buyer-order-cancelled-note"><CircleX size={18} /> {orderStatusName(order.status)}. Các bước tiếp theo sẽ không diễn ra.</div>}
          <ol className="buyer-order-steps">{steps.map((step, index) => {
            const done = index <= lastStage && !isCancelled(order.status);
            const event = order.history?.slice().reverse().find(history => step.statuses.includes(history.toStatus));
            return <li className={done ? "is-done" : ""} key={step.label}><span className="buyer-order-step-icon">{done ? <Check size={16} strokeWidth={3} /> : <Circle size={15} />}</span><div><strong>{step.label}</strong><small>{step.detail}</small></div>{event && <time dateTime={event.occurredAt}>{formatDate(event.occurredAt)}</time>}</li>;
          })}</ol>
          {!!order.history?.length && <details className="buyer-order-history"><summary>Xem lịch sử trạng thái</summary>{order.history.map((event, index) => <p key={`${event.toStatus}-${index}`}>{formatDate(event.occurredAt)} · {orderStatusName(event.toStatus)}{event.reason && !["checkout", "inventory_committed"].includes(event.reason) ? ` · ${event.reason}` : ""}</p>)}</details>}
        </div>
      </article>

      <article className="buyer-order-card buyer-order-products"><header className="buyer-order-card__heading"><div><h2><Package size={20} /> Sản phẩm đặt hàng ({itemCount})</h2><p>Danh sách sản phẩm trong đơn hàng</p></div></header><div className="buyer-order-products__list">{order.items?.map(item => {
        const original = (item.snapshot.originalPriceMinor ?? item.unitPriceMinor) * item.quantity;
        return <div className="buyer-order-product" key={item.id}><Link to={`/products/${item.productId}`} className="buyer-order-product__image" aria-label={`Xem ${item.name}`}><img src={item.snapshot.imageUrl || "/visual-placeholder.svg"} alt={item.name} loading="lazy" onError={showImageFallback} /></Link><div className="buyer-order-product__info"><Link to={`/products/${item.productId}`}>{item.name}</Link><span>Số lượng: {item.quantity}{item.snapshot.attributes && Object.keys(item.snapshot.attributes).length ? ` · ${Object.values(item.snapshot.attributes).join(" · ")}` : ""}</span>{["DELIVERED", "COMPLETED"].includes(order.status) && <Link className="buyer-order-product__review" to={`/products/${item.productId}?reviewItem=${item.id}`}>Đánh giá sản phẩm</Link>}</div><div className="buyer-order-product__price"><strong>{vnd(item.lineTotalMinor)}</strong>{original > item.lineTotalMinor && <del>{vnd(original)}</del>}<span>Tổng: {vnd(item.lineTotalMinor)}</span></div></div>;
      })}</div></article>

      <article className="buyer-order-card buyer-order-payment"><header className="buyer-order-card__heading"><div><h2>Thông tin thanh toán</h2><p>Chi tiết thanh toán đơn hàng</p></div></header><div className="buyer-order-payment__body"><div className="buyer-order-payment__row"><span>Tạm tính</span><strong>{vnd(order.subtotalMinor)}</strong></div><div className="buyer-order-payment__row"><span>Phí vận chuyển</span><strong>{vnd(order.shippingMinor)}</strong></div>{order.discountMinor > 0 && <div className="buyer-order-payment__row is-discount"><span>Giảm giá</span><strong>−{vnd(order.discountMinor)}</strong></div>}<div className="buyer-order-payment__total"><span>Tổng cộng</span><strong>{vnd(order.totalMinor)}</strong></div><div className="buyer-order-payment__row"><span>Phương thức</span><strong>{order.paymentMethod === "COD" ? "Thanh toán khi nhận hàng" : order.paymentMethod === "MOMO" ? "MoMo" : "VietQR"}</strong></div><div className={`buyer-order-payment__state${order.paymentStatus === "PAID" ? " is-paid" : ""}`}>{order.paymentStatus === "PAID" ? "Đã thanh toán" : order.paymentMethod === "COD" ? "Chưa thanh toán · Thu tiền khi giao hàng" : "Chờ xác nhận thanh toán"}</div></div></article>
      {["DELIVERED", "COMPLETED"].includes(order.status) && <ReturnPanel order={order} />}
    </div>

    <aside className="buyer-order-side">
      <article className="buyer-order-card buyer-order-store"><header className="buyer-order-card__heading"><div><h2><UserRound size={21} /> Thông tin cửa hàng</h2><p>Liên hệ và thông tin liên lạc</p></div></header><div className="buyer-order-store__body"><div className="buyer-order-store__identity"><span className="buyer-order-store__logo">{store?.logoUrl ? <img src={store.logoUrl} alt="" onError={showImageFallback} /> : (order.store.name || "CH").slice(0, 2).toUpperCase()}</span><div><strong>{order.store.name || "Cửa hàng"}</strong><small>Gian hàng trên MDUC247</small></div></div><button type="button" disabled={busy} onClick={() => void messageStore()}><MessageCircle size={17} /> Nhắn tin</button></div></article>
      <article className="buyer-order-card buyer-order-shipping"><header className="buyer-order-card__heading"><div><h2><Truck size={21} /> Thông tin vận chuyển</h2><p>Chi tiết địa chỉ và vận đơn</p></div></header><div className="buyer-order-shipping__body"><div className="buyer-order-address"><strong><MapPin size={16} /> Địa chỉ giao hàng</strong><p>{formatAddress(order.address)}</p><span><Phone size={13} /> {order.address.receiverPhone}</span><span><UserRound size={13} /> {order.address.receiverName}</span></div><div className="buyer-order-shipping__row"><span>Đơn vị vận chuyển</span><strong>Chưa cập nhật</strong></div><div className="buyer-order-shipping__row"><span>Mã vận đơn</span><strong>{order.shipmentRef || "Chưa cập nhật"}</strong></div><button type="button" onClick={() => void shareOrder()}><Share2 size={16} /> Chia sẻ đơn hàng</button></div></article>
      {(canCancel || canComplete) && <article className={`buyer-order-card buyer-order-action${canCancel ? " is-cancel" : ""}`}><header className="buyer-order-card__heading"><div><h2>{canCancel ? <CircleX size={21} /> : <CircleCheck size={21} />} {canCancel ? "Hủy đơn hàng" : "Xác nhận nhận hàng"}</h2><p>{canCancel ? "Có thể hủy khi cửa hàng chưa xác nhận đơn." : "Xác nhận khi bạn đã nhận và kiểm tra hàng."}</p></div></header><div className="buyer-order-action__body">{canCancel ? <>{cancelOpen && <label>Lý do hủy<input value={reason} onChange={event => setReason(event.target.value)} maxLength={200} placeholder="Nhập lý do hủy đơn" /></label>}<button type="button" disabled={busy} onClick={() => cancelOpen ? void command("cancel") : setCancelOpen(true)}>{busy ? "Đang xử lý..." : cancelOpen ? "Xác nhận hủy đơn" : "Hủy đơn hàng"}</button>{cancelOpen && <button type="button" className="buyer-order-action__back" onClick={() => setCancelOpen(false)}>Giữ đơn hàng</button>}</> : <button type="button" disabled={busy} onClick={() => void command("complete")}>Đã nhận hàng</button>}</div></article>}
    </aside>
  </section>;
}

export function BuyerOrderDetailV2() {
  const { groupId = "" } = useParams();
  const [group, setGroup] = useState<OrderGroupV2 | null>(null);
  const [stores, setStores] = useState<CatalogStore[]>([]);
  const [refunds, setRefunds] = useState<RefundV2[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function reload() {
    setGroup((await orderV2Api.buyerOrder(groupId)).group);
    void paymentV2Api.order(groupId).then(result => setRefunds(result.refunds)).catch(() => {});
  }
  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    orderV2Api.buyerOrder(groupId)
      .then(result => { if (active) setGroup(result.group); })
      .catch(cause => { if (active) setError(cause instanceof Error ? cause.message : "Không thể tải chi tiết đơn hàng."); })
      .finally(() => { if (active) setLoading(false); });
    catalogApi.list("?limit=50").then(result => { if (active) setStores(result.stores); }).catch(() => {});
    paymentV2Api.order(groupId).then(result => { if (active) setRefunds(result.refunds); }).catch(() => {});
    return () => { active = false; };
  }, [groupId]);

  async function payNow() {
    if (!group || group.paymentMethod === "COD") return;
    setBusy(true);
    try {
      const { intent } = await paymentV2Api.create(group.id, group.paymentMethod, `pay:${group.id}`);
      sessionStorage.setItem("pendingPaymentIntentId", intent.id);
      if (!intent.checkoutUrl) throw new Error("Chưa có liên kết thanh toán. Vui lòng thử lại sau.");
      window.location.assign(intent.checkoutUrl);
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : "Không thể mở cổng thanh toán.", { containerId: "general-toast" });
    } finally { setBusy(false); }
  }

  if (loading) return <div className="buyer-order-page buyer-order-state" role="status"><Clock3 /> Đang tải đơn hàng...</div>;
  if (error || !group) return <div className="buyer-order-page buyer-order-state"><p>{error || "Không tìm thấy đơn hàng."}</p><Link to="/orders">Xem đơn hàng của tôi</Link></div>;

  return <div className="buyer-order-page"><ContentBreadcrumb items={[{ label: "Đơn hàng của tôi", to: "/orders" }, { label: "Chi tiết đơn hàng" }]} />
    {group.orders.length > 1 && <div className="buyer-order-group-heading"><div><h1>Chi tiết đơn hàng</h1><p>Mã nhóm #{group.id.slice(0, 8).toUpperCase()} · {group.orders.length} cửa hàng · {formatDate(group.createdAt)}</p></div><strong>{vnd(group.currentTotalMinor)}</strong></div>}
    {group.paymentMethod !== "COD" && group.paymentStatus !== "PAID" && group.status === "PENDING_PAYMENT" && <div className="buyer-order-pay-banner"><div><strong>Đơn hàng đang chờ thanh toán</strong><span>Hoàn tất thanh toán để cửa hàng xử lý đơn.</span></div><button type="button" disabled={busy} onClick={() => void payNow()}>{busy ? "Đang mở..." : "Tiếp tục thanh toán"}</button></div>}
    {group.orders.map(order => <ShopOrderDetail key={order.id} order={order} groupId={group.id} store={stores.find(store => store.id === order.storeId)} onReload={reload} />)}
    {refunds.length > 0 && <section className="buyer-order-card buyer-order-refunds"><h2>Tiến độ hoàn tiền</h2>{refunds.map(refund => <p key={refund.id}><span>Đơn #{refund.shopOrderId.slice(0, 8)} · {refund.reason}</span><strong>{vnd(refund.amountMinor)} · {refund.status === "SUCCEEDED" ? "Đã hoàn" : refund.status === "FAILED" ? "Thất bại" : "Đang đối soát"}</strong></p>)}</section>}
  </div>;
}
