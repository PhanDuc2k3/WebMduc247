import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDownLeft, Download, Gift, LockKeyhole, ReceiptText, Search, ShieldCheck, Truck, Wallet } from "lucide-react";
import { orderV2Api, vnd, type OrderGroupV2 } from "../../api/orderV2Api";
import { paymentV2Api, type PaymentMethod, type RefundV2 } from "../../api/paymentV2Api";
import ContentBreadcrumb from "../../components/ui/ContentBreadcrumb";
import "./Wallet.css";
import "./WalletPageV2.css";

type Tab = "all" | "payment" | "refund";
type Activity = { id: string; groupId: string; type: "payment" | "refund"; title: string;
  amount: number; createdAt: string; status: string; reference: string };
const PAGE_SIZE = 10;
const methodLabel: Record<PaymentMethod, string> = {
  COD: "Thanh toán khi nhận hàng", MOMO: "Ví điện tử MoMo", VIETQR: "Chuyển khoản VietQR",
};
const paymentLabel = (status: string) => status === "PAID" ? "Đã thanh toán" : status === "REFUNDED" ? "Đã hoàn tiền"
  : status === "PARTIALLY_REFUNDED" ? "Đã hoàn một phần" : status === "FAILED" ? "Thất bại" : "Chờ thanh toán";
const refundLabel = (status: string) => status === "SUCCEEDED" ? "Đã hoàn" : status === "FAILED" ? "Thất bại" : "Đang xử lý";
const formatDate = (value: string) => new Date(value).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
const csvCell = (value: string | number) => {
  const text = String(value);
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
};

export default function WalletPageV2() {
  const [groups, setGroups] = useState<OrderGroupV2[]>([]);
  const [refunds, setRefunds] = useState<Record<string, RefundV2[]>>({});
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [tab, setTab] = useState<Tab>("all");
  const [period, setPeriod] = useState("all");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let active = true;
    paymentV2Api.methods().then(result => {
      if (active) setMethods(result.methods.filter(item => item.available).map(item => item.code));
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true); setError(""); setRefunds({});
    orderV2Api.buyerOrders({ page, limit: PAGE_SIZE }).then(result => {
      if (!active) return;
      const visible = result.groups || [];
      setGroups(visible); setTotal(result.total); setLoading(false);
      void Promise.allSettled(visible.map(group => paymentV2Api.order(group.id))).then(responses => {
        if (!active) return;
        const next: Record<string, RefundV2[]> = {};
        responses.forEach((response, index) => {
          if (response.status === "fulfilled") next[visible[index].id] = response.value.refunds;
        });
        setRefunds(next);
      });
    }).catch(cause => {
      if (active) { setGroups([]); setTotal(0); setError(cause instanceof Error ? cause.message : "Không thể tải hoạt động thanh toán."); setLoading(false); }
    });
    return () => { active = false; };
  }, [page, retry]);

  const activities = useMemo<Activity[]>(() => groups.flatMap(group => [
    { id: group.id, groupId: group.id, type: "payment" as const,
      title: `Đơn hàng #${group.id.slice(0, 8).toUpperCase()}`, amount: group.currentTotalMinor,
      createdAt: group.createdAt, status: paymentLabel(group.paymentStatus), reference: methodLabel[group.paymentMethod] },
    ...(refunds[group.id] || []).map(refund => ({ id: refund.id, groupId: group.id, type: "refund" as const,
      title: `Hoàn tiền đơn #${group.id.slice(0, 8).toUpperCase()}`, amount: refund.amountMinor,
      createdAt: refund.createdAt, status: refundLabel(refund.status), reference: refund.reason })),
  ]).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)), [groups, refunds]);
  const filtered = activities.filter(item => {
    if (tab !== "all" && item.type !== tab) return false;
    if (period === "30d" && Date.parse(item.createdAt) < Date.now() - 30 * 86_400_000) return false;
    if (status !== "all" && item.status !== status) return false;
    const keyword = search.trim().toLocaleLowerCase("vi-VN");
    return !keyword || `${item.title} ${item.reference} ${item.status}`.toLocaleLowerCase("vi-VN").includes(keyword);
  });

  function downloadHistory() {
    const lines = [["Thời gian", "Loại", "Mã đơn", "Nội dung", "Số tiền (VND)", "Trạng thái"],
      ...filtered.map(item => [formatDate(item.createdAt), item.type === "refund" ? "Hoàn tiền" : "Đơn hàng",
        item.groupId, item.reference, item.amount, item.status])];
    const csv = `\uFEFF${lines.map(row => row.map(csvCell).join(",")).join("\r\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = `hoat-dong-thanh-toan-trang-${page}.csv`; anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  return <div className="wallet-page wallet-v2-page">
    <ContentBreadcrumb items={[{ label: "Ví MDUC247" }]} /><h1 className="sr-only">Ví của tôi</h1>
    <div className="wallet-layout">
      <div className="wallet-left"><section aria-labelledby="wallet-overview-title"><h2 id="wallet-overview-title" className="wallet-section-title">Tổng quan ví</h2>
        <div className="wallet-balance-card"><div className="wallet-balance-card__top"><span>Số dư khả dụng</span><LockKeyhole size={17} aria-hidden="true" /></div><strong>—</strong><p className="wallet-v2-unavailable">Ví nội bộ chưa được kích hoạt</p><div className="wallet-balance-card__stats"><span>Đang chờ xử lý<strong>—</strong></span><span>Giao dịch ví<strong>—</strong></span></div></div>
        <div className="wallet-actions"><button type="button" disabled title="Ví nội bộ chưa khả dụng">Nạp tiền</button><button type="button" disabled title="Ví nội bộ chưa khả dụng">Rút tiền</button><button type="button" disabled title="Ví nội bộ chưa khả dụng">Chuyển tiền</button></div>
      </section><section className="wallet-methods"><header><h2>Phương thức thanh toán</h2></header>{methods.length ? <div className="wallet-v2-method-list">{methods.map(method => <div key={method}><Wallet size={17} /><span>{methodLabel[method]}</span></div>)}</div> : <p className="wallet-methods-empty">Phương thức khả dụng sẽ hiển thị khi hệ thống kết nối thanh toán.</p>}</section></div>

      <section className="wallet-history"><header><div><h2>Hoạt động thanh toán</h2><p>Đơn hàng và khoản hoàn tiền thực tế trên trang hiện tại.</p></div><button type="button" disabled={!filtered.length} onClick={downloadHistory}><Download size={15} /> Tải trang này</button></header>
        <div className="wallet-tabs" role="group" aria-label="Lọc hoạt động"><button type="button" className={tab === "all" ? "is-active" : ""} onClick={() => setTab("all")}>Tất cả</button><button type="button" className={tab === "payment" ? "is-active" : ""} onClick={() => setTab("payment")}>Đơn hàng</button><button type="button" className={tab === "refund" ? "is-active" : ""} onClick={() => setTab("refund")}>Hoàn tiền</button><button type="button" disabled title="Ví nội bộ chưa khả dụng">Nạp tiền</button><button type="button" disabled title="Ví nội bộ chưa khả dụng">Rút tiền</button></div>
        <div className="wallet-filters"><label>Thời gian<select value={period} onChange={event => setPeriod(event.target.value)}><option value="all">Mọi thời gian</option><option value="30d">30 ngày gần đây</option></select></label><label>Trạng thái<select value={status} onChange={event => setStatus(event.target.value)}><option value="all">Mọi trạng thái</option><option value="Đã thanh toán">Đã thanh toán</option><option value="Chờ thanh toán">Chờ thanh toán</option><option value="Đã hoàn tiền">Đã hoàn tiền</option><option value="Đã hoàn một phần">Đã hoàn một phần</option><option value="Đã hoàn">Đã hoàn</option><option value="Đang xử lý">Đang xử lý</option><option value="Thất bại">Thất bại</option></select></label><label>Tìm trong trang này<span><Search size={15} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Nội dung hoặc mã đơn..." /></span></label></div>
        <div className="wallet-transactions">{error ? <div className="wallet-v2-state"><p>{error}</p><button type="button" onClick={() => setRetry(value => value + 1)}>Thử lại</button><Link to="/login">Đăng nhập</Link></div> : loading ? <p className="wallet-empty">Đang tải hoạt động thanh toán...</p> : filtered.length ? filtered.map(item => <article key={item.id}><span className={`wallet-transaction-icon is-${item.type === "refund" ? "refund" : "payment"}`}>{item.type === "refund" ? <ArrowDownLeft size={17} /> : <ReceiptText size={17} />}</span><div><Link to={`/orders/${item.groupId}`}>{item.title}</Link><small>{formatDate(item.createdAt)} · {item.reference}</small><em className={item.status === "Đã thanh toán" || item.status === "Đã hoàn" ? "is-completed" : item.status === "Thất bại" ? "is-failed" : "is-pending"}>{item.status}</em></div><b className={item.type === "refund" ? "is-positive" : ""}>{item.type === "refund" ? "+" : ""}{vnd(item.amount)}</b></article>) : <p className="wallet-empty">Không có hoạt động phù hợp trên trang này.</p>}</div>
        <footer className="wallet-pagination"><span>Trang {page}/{pageCount} · {filtered.length} mục đang hiển thị</span><div><button type="button" disabled={page <= 1 || loading} onClick={() => setPage(value => value - 1)}>Trước</button><button type="button" disabled={page >= pageCount || loading} onClick={() => setPage(value => value + 1)}>Sau</button></div></footer>
      </section>
    </div>

    <section className="wallet-offers"><h2>Tiện ích dành cho bạn</h2><div><article><span className="is-orange"><ReceiptText size={20} /></span><h3>Theo dõi đơn hàng</h3><p>Xem trạng thái, giá trị và lịch sử thanh toán từng đơn.</p><Link to="/orders">Xem đơn hàng</Link></article><article><span><Truck size={20} /></span><h3>Voucher của bạn</h3><p>Kiểm tra ưu đãi có thể áp dụng khi mua sắm.</p><Link to="/voucher">Xem voucher</Link></article><article><span className="is-purple"><Gift size={20} /></span><h3>Khám phá sản phẩm</h3><p>Tìm thêm sản phẩm từ các cửa hàng đang hoạt động.</p><Link to="/products">Khám phá ngay</Link></article></div></section>
    <section className="wallet-security"><header><span><ShieldCheck size={20} /></span><h2>Bảo mật & trợ giúp</h2></header><div><article><h3>Bảo vệ tài khoản</h3><p>Không chia sẻ mật khẩu hoặc mã xác thực với người khác.</p></article><article><h3>Kiểm tra thanh toán</h3><p>Đối chiếu số tiền và trạng thái trong chi tiết đơn hàng.</p></article><article><h3>Cần hỗ trợ?</h3><p>Liên hệ MDUC247 nếu bạn thấy khoản thanh toán bất thường.</p></article></div><Link to="/support">Liên hệ hỗ trợ →</Link></section>
  </div>;
}
