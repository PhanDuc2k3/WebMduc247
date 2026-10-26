import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { orderV2Api, vnd, type ShopOrderV2 } from "../../api/orderV2Api";
import { orderStatusName } from "../Order/orderStatus";
import ReturnPanel from "../../components/ReviewReturn/ReturnPanel";
import SellerReviewPanel from "../../components/ReviewReturn/SellerReviewPanel";
import { formatAddress } from "../../utils/formatAddress";

const card = "rounded-2xl border border-[#e6ebf5] bg-white p-5 shadow-sm";
export function SellerOrdersV2() {
  const { storeId="" } = useParams();
  const [orders,setOrders] = useState<ShopOrderV2[]>([]);
  const [status,setStatus] = useState("");
  const [page,setPage] = useState(1);
  const [total,setTotal] = useState(0);
  const [loading,setLoading] = useState(true);
  useEffect(() => {
    let active=true; setLoading(true);
    orderV2Api.sellerOrders(storeId,{ page,limit:10,status }).then(result => {
      if (active) { setOrders(result.orders || []); setTotal(result.total); }
    }).catch(error => { if (active) toast.error(error instanceof Error ? error.message : "Không thể tải đơn của shop.", { containerId:"general-toast" }); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active=false; };
  },[storeId,page,status]);
  return <div className="py-8 pb-16"><Link to="/mystore" className="font-semibold text-[#476de4]">← Cửa hàng của tôi</Link>
    <h1 className="mt-5 text-3xl font-extrabold">Đơn hàng của shop</h1>
    <select value={status} onChange={event => { setStatus(event.target.value); setPage(1); }} className="mt-5 rounded-xl border bg-white px-3 py-2">
      <option value="">Mọi trạng thái</option>{["PLACED","CONFIRMED","PREPARING","READY_TO_SHIP","SHIPPING","DELIVERED","COMPLETED","CANCELLED"].map(item =>
        <option key={item} value={item}>{orderStatusName(item)}</option>)}</select>
    {loading ? <p className="mt-5">Đang tải...</p> : orders.length ? <div className="mt-5 space-y-4">{orders.map(order =>
      <Link key={order.id} to={`/mystore/orders/${order.id}`} className={`${card} block hover:border-[#476de4]`}>
        <div className="flex justify-between gap-3"><strong>Đơn #{order.id.slice(0,8)}</strong><span className="text-[#476de4]">{orderStatusName(order.status)}</span></div>
        <p className="mt-2 text-sm text-[#70819d]">{new Date(order.createdAt).toLocaleString("vi-VN")} · {order.address.receiverName}</p>
        <strong className="mt-3 block text-right">{vnd(order.totalMinor)}</strong></Link>)}</div> :
      <div className={`${card} mt-5`}>Chưa có đơn hàng.</div>}
    <div className="mt-5 flex gap-3"><button disabled={page<=1} onClick={()=>setPage(value=>value-1)} className="rounded-lg border bg-white px-3 py-2 disabled:opacity-50">Trước</button>
      <span>Trang {page} / {Math.max(1,Math.ceil(total/10))}</span>
      <button disabled={page*10>=total} onClick={()=>setPage(value=>value+1)} className="rounded-lg border bg-white px-3 py-2 disabled:opacity-50">Sau</button></div>
  </div>;
}
export function SellerOrderDetailV2() {
  const { id="" } = useParams();
  const [order,setOrder] = useState<ShopOrderV2 | null>(null);
  const [busy,setBusy] = useState(false);
  const [loading,setLoading] = useState(true);
  const [reason,setReason] = useState("CANNOT_FULFILL");
  const keys = useRef(new Map<string,string>());
  async function reload() { setOrder((await orderV2Api.sellerOrder(id)).order); }
  useEffect(() => { let active=true; orderV2Api.sellerOrder(id).then(result => { if (active) setOrder(result.order); })
    .catch(error => { if (active) toast.error(error instanceof Error ? error.message : "Không thể tải đơn shop.", { containerId:"general-toast" }); })
    .finally(() => { if (active) setLoading(false); }); return () => { active=false; }; },[id]);
  async function command(action:"confirm"|"prepare"|"ready-to-ship"|"reject") {
    if (!order) return;
    const token = `${order.id}:${order.version}:${action}`;
    if (!keys.current.has(token)) keys.current.set(token,crypto.randomUUID());
    setBusy(true);
    try {
      await orderV2Api.sellerCommand(order.id,action,{ expectedVersion:order.version,
        idempotencyKey:keys.current.get(token)!, ...(action==="reject" ? { reason } : {}) });
      keys.current.delete(token); await reload();
      toast.success("Đã cập nhật trạng thái đơn.", { containerId:"general-toast" });
    } catch (error) { toast.error(error instanceof Error ? error.message : "Không thể cập nhật đơn.", { containerId:"general-toast" }); void reload().catch(() => {}); }
    finally { setBusy(false); }
  }
  if (loading) return <div className="py-12">Đang tải đơn hàng...</div>;
  if (!order) return <div className="py-12">Không tìm thấy đơn hàng.</div>;
  return <div className="py-8 pb-16"><Link to={`/mystore/${order.storeId}/orders`} className="font-semibold text-[#476de4]">← Đơn hàng của shop</Link>
    <div className="mt-5 flex flex-wrap justify-between gap-3"><div><h1 className="text-3xl font-extrabold">Đơn #{order.id.slice(0,8)}</h1>
      <p className="mt-1 text-[#476de4]">{orderStatusName(order.status)}</p></div><strong className="text-2xl">{vnd(order.totalMinor)}</strong></div>
    <section className={`${card} mt-6`}><h2 className="text-xl font-bold">Sản phẩm</h2>
      {order.items?.map(item => <div key={item.id} className="mt-3 flex justify-between gap-4 border-t pt-3"><div>
        <strong>{item.name} × {item.quantity}</strong><p className="text-sm text-[#70819d]">{item.sku}</p></div>
        <span>{vnd(item.lineTotalMinor)}</span></div>)}
      <p className="mt-4 border-t pt-3">Giá gốc {vnd(order.subtotalMinor)} · Giảm {vnd(order.discountMinor)} · Giao hàng {vnd(order.shippingMinor)}</p></section>
    <section className={`${card} mt-5`}><h2 className="text-xl font-bold">Giao cho</h2>
      <p className="mt-2">{order.address.receiverName} · {order.address.receiverPhone}</p>
      <p>{formatAddress(order.address)}</p>
      {order.shipmentRef && <p className="mt-2">Mã vận đơn: {order.shipmentRef}</p>}</section>
    <section className={`${card} mt-5`}><h2 className="text-xl font-bold">Thao tác</h2>
      <div className="mt-4 flex flex-wrap gap-3">
        {order.status==="PLACED" && <button disabled={busy} onClick={()=>void command("confirm")} className="rounded-xl bg-[#476de4] px-4 py-2 font-bold text-white disabled:opacity-50">Xác nhận đơn</button>}
        {order.status==="CONFIRMED" && <button disabled={busy} onClick={()=>void command("prepare")} className="rounded-xl bg-[#476de4] px-4 py-2 font-bold text-white disabled:opacity-50">Bắt đầu chuẩn bị</button>}
        {order.status==="PREPARING" && <button disabled={busy} onClick={()=>void command("ready-to-ship")} className="rounded-xl bg-[#476de4] px-4 py-2 font-bold text-white disabled:opacity-50">Sẵn sàng giao</button>}
        {["PLACED","CONFIRMED"].includes(order.status) && <div className="flex gap-2"><select value={reason} onChange={event=>setReason(event.target.value)} className="rounded-xl border px-3 py-2">
          <option value="CANNOT_FULFILL">Không thể xử lý</option><option value="OUT_OF_STOCK">Hết hàng thực tế</option>
          <option value="STORE_CLOSED">Shop tạm đóng</option></select>
          <button disabled={busy} onClick={()=>void command("reject")} className="rounded-xl border border-red-300 px-4 py-2 font-semibold text-red-600 disabled:opacity-50">Từ chối</button></div>}
        {["READY_TO_SHIP","SHIPPING","DELIVERED"].includes(order.status) && <p className="text-sm text-[#70819d]">Trạng thái giao hàng được cập nhật từ dịch vụ giao hàng.</p>}
      </div></section>
    <ReturnPanel order={order} seller />
    <SellerReviewPanel storeId={order.storeId} />
    <section className={`${card} mt-5`}><h2 className="text-xl font-bold">Lịch sử</h2>{order.history?.map((item,index) =>
      <p key={index} className="mt-2 text-sm text-[#70819d]">{new Date(item.occurredAt).toLocaleString("vi-VN")} · {orderStatusName(item.toStatus)} · {item.actorType}{item.reason ? ` · ${item.reason}` : ""}</p>)}</section>
  </div>;
}
