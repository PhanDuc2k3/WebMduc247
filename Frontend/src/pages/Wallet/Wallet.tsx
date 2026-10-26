import { useEffect, useMemo, useState } from "react";
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Copy, Download, Eye, EyeOff, Gift, Loader2, ReceiptText, Search, ShieldCheck, Truck, X } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import walletApi, { type Transaction, type WalletData } from "../../api/walletApi";
import "./Wallet.css";
import { USE_MOCK_DATA } from "../../config/runtime";

type Action = "deposit" | "withdraw" | "transfer" | null;
type TransactionTab = "all" | Transaction["type"];

const transactionLabels: Record<Transaction["type"], string> = {
  deposit: "Nạp tiền",
  payment: "Thanh toán",
  refund: "Hoàn tiền",
  withdraw: "Rút tiền",
};

const WalletPage = () => {
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBalance, setShowBalance] = useState(true);
  const [activeTab, setActiveTab] = useState<TransactionTab>("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [action, setAction] = useState<Action>(null);
  const [amount, setAmount] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadWallet = async () => {
      try {
        const [walletResponse, transactionResponse] = await Promise.all([
          walletApi.getWallet(),
          walletApi.getTransactions(1, 20),
        ]);
        setWallet(walletResponse.data.wallet);
        const apiTransactions = transactionResponse.data.transactions || [];
        setTransactions(apiTransactions);
      } catch {
        toast.error("Không thể tải dữ liệu ví", { containerId: "general-toast" });
      } finally {
        setLoading(false);
      }
    };
    void loadWallet();
  }, []);

  const filteredTransactions = useMemo(() => transactions.filter((transaction) => {
    const matchesTab = activeTab === "all" || transaction.type === activeTab;
    const matchesStatus = statusFilter === "all" || transaction.status === statusFilter;
    const keyword = query.trim().toLowerCase();
    const matchesQuery = !keyword || `${transaction.description || ""} ${transaction.orderCode || ""} ${transaction.paymentId || ""}`.toLowerCase().includes(keyword);
    return matchesTab && matchesStatus && matchesQuery;
  }), [activeTab, query, statusFilter, transactions]);

  const pageSize = 4;
  const pageCount = Math.max(1, Math.ceil(filteredTransactions.length / pageSize));
  const visibleTransactions = filteredTransactions.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => setPage(1), [activeTab, statusFilter, query]);

  const formatMoney = (value: number) => `${value.toLocaleString("vi-VN")}₫`;
  const formatDate = (value?: string) => value ? new Date(value).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

  const submitAction = async () => {
    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      toast.warning("Vui lòng nhập số tiền hợp lệ", { containerId: "general-toast" });
      return;
    }
    setSubmitting(true);
    try {
      const createdAt = new Date().toISOString();
      if (action === "deposit") {
        await walletApi.deposit({ amount: numericAmount, method: "vietqr", description: "Nạp tiền mock vào ví" });
        setWallet((current) => current ? { ...current, balance: current.balance + numericAmount, transactionCount: current.transactionCount + 1 } : current);
        setTransactions((current) => [{ _id: `tx-${Date.now()}`, type: "deposit", amount: numericAmount, method: "vietqr", description: "Nạp tiền qua Vietcombank", status: "completed", createdAt }, ...current]);
      } else if (action === "withdraw") {
        await walletApi.withdraw({ amount: numericAmount, bankName: "Vietcombank", accountNumber: accountNumber || "00004826", emailCode: "123456" });
        setWallet((current) => current ? { ...current, balance: Math.max(0, current.balance - numericAmount), transactionCount: current.transactionCount + 1 } : current);
        setTransactions((current) => [{ _id: `tx-${Date.now()}`, type: "withdraw", amount: numericAmount, method: "vietqr", description: "Rút tiền về Vietcombank", status: "pending", createdAt }, ...current]);
      } else {
        setWallet((current) => current ? { ...current, balance: Math.max(0, current.balance - numericAmount), transactionCount: current.transactionCount + 1 } : current);
        setTransactions((current) => [{ _id: `tx-${Date.now()}`, type: "payment", amount: numericAmount, method: "wallet", description: `Chuyển tiền đến ${accountNumber || "người nhận mock"}`, status: "completed", createdAt }, ...current]);
      }
      toast.success("Giao dịch mock đã được tạo", { containerId: "general-toast" });
      setAction(null);
      setAmount("");
      setAccountNumber("");
    } finally {
      setSubmitting(false);
    }
  };

  const downloadHistory = () => {
    const rows = ["Thời gian,Loại,Mô tả,Số tiền,Trạng thái", ...transactions.map((item) => `${formatDate(item.createdAt)},${transactionLabels[item.type]},${item.description || ""},${item.amount},${item.status}`)];
    const url = URL.createObjectURL(new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "lich-su-vi-mduc247.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="wallet-loading"><Loader2 /><span>Đang tải ví của bạn...</span></div>;

  return (
    <div className="wallet-page">
      <nav className="wallet-breadcrumb"><Link to="/">Trang chủ</Link><span>/</span><strong>Ví MDUC247</strong></nav>

      <div className="wallet-layout">
        <div className="wallet-left">
          <section aria-labelledby="wallet-overview-title">
            <h2 id="wallet-overview-title" className="wallet-section-title">Tổng quan ví</h2>
            <div className="wallet-balance-card">
              <div className="wallet-balance-card__top"><span>Số dư khả dụng</span><button type="button" onClick={() => setShowBalance((value) => !value)} aria-label={showBalance ? "Ẩn số dư" : "Hiện số dư"}>{showBalance ? <Eye /> : <EyeOff />}</button></div>
              <strong>{showBalance ? formatMoney(wallet?.balance || 0) : "••••••••"}</strong>
              <div className="wallet-balance-card__stats"><span>Đang chờ xử lý<strong>{formatMoney(transactions.filter((item) => item.status === "pending").reduce((sum, item) => sum + item.amount, 0))}</strong></span><span>Tổng giao dịch<strong>{wallet?.transactionCount || 0}</strong></span></div>
            </div>
            <div className="wallet-actions"><button type="button" className="is-primary" onClick={() => setAction("deposit")}>Nạp tiền</button><button type="button" onClick={() => setAction("withdraw")}>Rút tiền</button><button type="button" onClick={() => setAction("transfer")}>Chuyển tiền</button></div>
          </section>

          <section className="wallet-methods"><header><h2>Phương thức thanh toán</h2></header>
            <p className="wallet-methods-empty">Các phương thức liên kết sẽ xuất hiện tại đây khi tài khoản của bạn có dữ liệu.</p>
          </section>
        </div>

        <section className="wallet-history">
          <header><div><h2>Lịch sử giao dịch</h2><p>{USE_MOCK_DATA ? "Dữ liệu minh họa từ tài khoản xem trước." : "Các giao dịch gần đây của bạn."}</p></div><button type="button" onClick={downloadHistory}><Download /> Tải lịch sử</button></header>
          <div className="wallet-tabs">{(["all", "deposit", "payment", "refund", "withdraw"] as TransactionTab[]).map((tab) => <button type="button" key={tab} className={activeTab === tab ? "is-active" : ""} onClick={() => setActiveTab(tab)}>{tab === "all" ? "Tất cả" : transactionLabels[tab]}</button>)}</div>
          <div className="wallet-filters"><label>Thời gian<select><option>Mọi thời gian</option><option>30 ngày gần đây</option></select></label><label>Trạng thái<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">Mọi trạng thái</option><option value="completed">Thành công</option><option value="pending">Đang xử lý</option><option value="failed">Thất bại</option></select></label><label>Tìm giao dịch<span><Search /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Nội dung hoặc mã..." /></span></label></div>
          <div className="wallet-transactions">{visibleTransactions.length ? visibleTransactions.map((transaction) => {
            const positive = transaction.type === "deposit" || transaction.type === "refund";
            const Icon = transaction.type === "deposit" ? ArrowDownLeft : transaction.type === "withdraw" ? ArrowUpRight : transaction.type === "refund" ? ArrowLeftRight : ReceiptText;
            return <article key={transaction._id}><span className={`wallet-transaction-icon is-${transaction.type}`}><Icon /></span><div><strong>{transaction.description || transactionLabels[transaction.type]}</strong><small>{formatDate(transaction.createdAt)} · {transaction.orderCode || transaction._id}</small><em className={`is-${transaction.status}`}>{transaction.status === "completed" ? "Thành công" : transaction.status === "pending" ? "Đang xử lý" : "Thất bại"}</em></div><b className={positive ? "is-positive" : ""}>{positive ? "+" : "-"}{formatMoney(transaction.amount)}</b></article>;
          }) : <p className="wallet-empty">Không có giao dịch phù hợp.</p>}</div>
          <footer className="wallet-pagination"><span>Trang {page}/{pageCount} · {filteredTransactions.length} giao dịch</span><div><button type="button" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>Trước</button><button type="button" disabled={page === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>Sau</button></div></footer>
        </section>
      </div>

      <section className="wallet-offers"><h2>Ưu đãi dành cho bạn</h2><div><article><span className="is-orange"><Copy /></span><h3>Hoàn tiền khi thanh toán</h3><p>Khám phá cách tích lũy lợi ích khi mua sắm cùng ví.</p><Link to="/flash-sale">Xem ưu đãi</Link></article><article><span><Truck /></span><h3>Voucher phí vận chuyển</h3><p>Một chút tiết kiệm cho hành trình giao hàng của bạn.</p><Link to="/voucher">Xem voucher</Link></article><article><span className="is-purple"><Gift /></span><h3>Đổi điểm thưởng</h3><p>Biến điểm tích lũy thành những phần quà thú vị.</p><Link to="/voucher">Khám phá quà</Link></article></div></section>

      <section className="wallet-security"><header><span><ShieldCheck /></span><h2>Bảo mật & trợ giúp</h2></header><div><article><h3>Bảo vệ tài khoản</h3><p>Không chia sẻ mật khẩu hoặc mã xác thực với người khác.</p></article><article><h3>Kiểm tra giao dịch</h3><p>Xem lại số tiền và người nhận trước khi xác nhận.</p></article><article><h3>Cần hỗ trợ?</h3><p>Liên hệ MDUC247 nếu bạn thấy giao dịch bất thường.</p></article></div><Link to="/support">Liên hệ hỗ trợ →</Link></section>

      {action && <div className="wallet-modal" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setAction(null)}><section role="dialog" aria-modal="true" aria-labelledby="wallet-action-title"><header><div><p>Giao dịch minh họa</p><h2 id="wallet-action-title">{action === "deposit" ? "Nạp tiền vào ví" : action === "withdraw" ? "Rút tiền" : "Chuyển tiền"}</h2></div><button type="button" onClick={() => setAction(null)} aria-label="Đóng"><X /></button></header><label>Số tiền<input type="number" min="1000" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="Nhập số tiền" /></label>{action !== "deposit" && <label>{action === "withdraw" ? "Số tài khoản nhận" : "Người nhận"}<input value={accountNumber} onChange={(event) => setAccountNumber(event.target.value)} placeholder={action === "withdraw" ? "Ví dụ: 00004826" : "Email hoặc số điện thoại"} /></label>}<div className="wallet-amount-presets">{[100000, 500000, 1000000].map((value) => <button type="button" key={value} onClick={() => setAmount(String(value))}>{value.toLocaleString("vi-VN")}₫</button>)}</div><button type="button" className="wallet-submit" disabled={submitting} onClick={submitAction}>{submitting ? "Đang xử lý..." : "Xác nhận giao dịch mock"}</button></section></div>}
    </div>
  );
};

export default WalletPage;
