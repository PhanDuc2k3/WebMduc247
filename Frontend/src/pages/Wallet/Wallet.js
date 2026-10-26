import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Copy, Download, Eye, EyeOff, Gift, Loader2, ReceiptText, Search, ShieldCheck, Truck, X } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import walletApi, {} from "../../api/walletApi";
import "./Wallet.css";
import { USE_MOCK_DATA } from "../../config/runtime";
const transactionLabels = {
    deposit: "Nạp tiền",
    payment: "Thanh toán",
    refund: "Hoàn tiền",
    withdraw: "Rút tiền",
};
const WalletPage = () => {
    const [wallet, setWallet] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showBalance, setShowBalance] = useState(true);
    const [activeTab, setActiveTab] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");
    const [query, setQuery] = useState("");
    const [page, setPage] = useState(1);
    const [action, setAction] = useState(null);
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
            }
            catch {
                toast.error("Không thể tải dữ liệu ví", { containerId: "general-toast" });
            }
            finally {
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
    const formatMoney = (value) => `${value.toLocaleString("vi-VN")}₫`;
    const formatDate = (value) => value ? new Date(value).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
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
            }
            else if (action === "withdraw") {
                await walletApi.withdraw({ amount: numericAmount, bankName: "Vietcombank", accountNumber: accountNumber || "00004826", emailCode: "123456" });
                setWallet((current) => current ? { ...current, balance: Math.max(0, current.balance - numericAmount), transactionCount: current.transactionCount + 1 } : current);
                setTransactions((current) => [{ _id: `tx-${Date.now()}`, type: "withdraw", amount: numericAmount, method: "vietqr", description: "Rút tiền về Vietcombank", status: "pending", createdAt }, ...current]);
            }
            else {
                setWallet((current) => current ? { ...current, balance: Math.max(0, current.balance - numericAmount), transactionCount: current.transactionCount + 1 } : current);
                setTransactions((current) => [{ _id: `tx-${Date.now()}`, type: "payment", amount: numericAmount, method: "wallet", description: `Chuyển tiền đến ${accountNumber || "người nhận mock"}`, status: "completed", createdAt }, ...current]);
            }
            toast.success("Giao dịch mock đã được tạo", { containerId: "general-toast" });
            setAction(null);
            setAmount("");
            setAccountNumber("");
        }
        finally {
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
    if (loading)
        return _jsxs("div", { className: "wallet-loading", children: [_jsx(Loader2, {}), _jsx("span", { children: "\u0110ang t\u1EA3i v\u00ED c\u1EE7a b\u1EA1n..." })] });
    return (_jsxs("div", { className: "wallet-page", children: [_jsxs("nav", { className: "wallet-breadcrumb", children: [_jsx(Link, { to: "/", children: "Trang ch\u1EE7" }), _jsx("span", { children: "/" }), _jsx("strong", { children: "V\u00ED MDUC247" })] }), _jsxs("div", { className: "wallet-layout", children: [_jsxs("div", { className: "wallet-left", children: [_jsxs("section", { "aria-labelledby": "wallet-overview-title", children: [_jsx("h2", { id: "wallet-overview-title", className: "wallet-section-title", children: "T\u1ED5ng quan v\u00ED" }), _jsxs("div", { className: "wallet-balance-card", children: [_jsxs("div", { className: "wallet-balance-card__top", children: [_jsx("span", { children: "S\u1ED1 d\u01B0 kh\u1EA3 d\u1EE5ng" }), _jsx("button", { type: "button", onClick: () => setShowBalance((value) => !value), "aria-label": showBalance ? "Ẩn số dư" : "Hiện số dư", children: showBalance ? _jsx(Eye, {}) : _jsx(EyeOff, {}) })] }), _jsx("strong", { children: showBalance ? formatMoney(wallet?.balance || 0) : "••••••••" }), _jsxs("div", { className: "wallet-balance-card__stats", children: [_jsxs("span", { children: ["\u0110ang ch\u1EDD x\u1EED l\u00FD", _jsx("strong", { children: formatMoney(transactions.filter((item) => item.status === "pending").reduce((sum, item) => sum + item.amount, 0)) })] }), _jsxs("span", { children: ["T\u1ED5ng giao d\u1ECBch", _jsx("strong", { children: wallet?.transactionCount || 0 })] })] })] }), _jsxs("div", { className: "wallet-actions", children: [_jsx("button", { type: "button", className: "is-primary", onClick: () => setAction("deposit"), children: "N\u1EA1p ti\u1EC1n" }), _jsx("button", { type: "button", onClick: () => setAction("withdraw"), children: "R\u00FAt ti\u1EC1n" }), _jsx("button", { type: "button", onClick: () => setAction("transfer"), children: "Chuy\u1EC3n ti\u1EC1n" })] })] }), _jsxs("section", { className: "wallet-methods", children: [_jsx("header", { children: _jsx("h2", { children: "Ph\u01B0\u01A1ng th\u1EE9c thanh to\u00E1n" }) }), _jsx("p", { className: "wallet-methods-empty", children: "C\u00E1c ph\u01B0\u01A1ng th\u1EE9c li\u00EAn k\u1EBFt s\u1EBD xu\u1EA5t hi\u1EC7n t\u1EA1i \u0111\u00E2y khi t\u00E0i kho\u1EA3n c\u1EE7a b\u1EA1n c\u00F3 d\u1EEF li\u1EC7u." })] })] }), _jsxs("section", { className: "wallet-history", children: [_jsxs("header", { children: [_jsxs("div", { children: [_jsx("h2", { children: "L\u1ECBch s\u1EED giao d\u1ECBch" }), _jsx("p", { children: USE_MOCK_DATA ? "Dữ liệu minh họa từ tài khoản xem trước." : "Các giao dịch gần đây của bạn." })] }), _jsxs("button", { type: "button", onClick: downloadHistory, children: [_jsx(Download, {}), " T\u1EA3i l\u1ECBch s\u1EED"] })] }), _jsx("div", { className: "wallet-tabs", children: ["all", "deposit", "payment", "refund", "withdraw"].map((tab) => _jsx("button", { type: "button", className: activeTab === tab ? "is-active" : "", onClick: () => setActiveTab(tab), children: tab === "all" ? "Tất cả" : transactionLabels[tab] }, tab)) }), _jsxs("div", { className: "wallet-filters", children: [_jsxs("label", { children: ["Th\u1EDDi gian", _jsxs("select", { children: [_jsx("option", { children: "M\u1ECDi th\u1EDDi gian" }), _jsx("option", { children: "30 ng\u00E0y g\u1EA7n \u0111\u00E2y" })] })] }), _jsxs("label", { children: ["Tr\u1EA1ng th\u00E1i", _jsxs("select", { value: statusFilter, onChange: (event) => setStatusFilter(event.target.value), children: [_jsx("option", { value: "all", children: "M\u1ECDi tr\u1EA1ng th\u00E1i" }), _jsx("option", { value: "completed", children: "Th\u00E0nh c\u00F4ng" }), _jsx("option", { value: "pending", children: "\u0110ang x\u1EED l\u00FD" }), _jsx("option", { value: "failed", children: "Th\u1EA5t b\u1EA1i" })] })] }), _jsxs("label", { children: ["T\u00ECm giao d\u1ECBch", _jsxs("span", { children: [_jsx(Search, {}), _jsx("input", { value: query, onChange: (event) => setQuery(event.target.value), placeholder: "N\u1ED9i dung ho\u1EB7c m\u00E3..." })] })] })] }), _jsx("div", { className: "wallet-transactions", children: visibleTransactions.length ? visibleTransactions.map((transaction) => {
                                    const positive = transaction.type === "deposit" || transaction.type === "refund";
                                    const Icon = transaction.type === "deposit" ? ArrowDownLeft : transaction.type === "withdraw" ? ArrowUpRight : transaction.type === "refund" ? ArrowLeftRight : ReceiptText;
                                    return _jsxs("article", { children: [_jsx("span", { className: `wallet-transaction-icon is-${transaction.type}`, children: _jsx(Icon, {}) }), _jsxs("div", { children: [_jsx("strong", { children: transaction.description || transactionLabels[transaction.type] }), _jsxs("small", { children: [formatDate(transaction.createdAt), " \u00B7 ", transaction.orderCode || transaction._id] }), _jsx("em", { className: `is-${transaction.status}`, children: transaction.status === "completed" ? "Thành công" : transaction.status === "pending" ? "Đang xử lý" : "Thất bại" })] }), _jsxs("b", { className: positive ? "is-positive" : "", children: [positive ? "+" : "-", formatMoney(transaction.amount)] })] }, transaction._id);
                                }) : _jsx("p", { className: "wallet-empty", children: "Kh\u00F4ng c\u00F3 giao d\u1ECBch ph\u00F9 h\u1EE3p." }) }), _jsxs("footer", { className: "wallet-pagination", children: [_jsxs("span", { children: ["Trang ", page, "/", pageCount, " \u00B7 ", filteredTransactions.length, " giao d\u1ECBch"] }), _jsxs("div", { children: [_jsx("button", { type: "button", disabled: page === 1, onClick: () => setPage((value) => Math.max(1, value - 1)), children: "Tr\u01B0\u1EDBc" }), _jsx("button", { type: "button", disabled: page === pageCount, onClick: () => setPage((value) => Math.min(pageCount, value + 1)), children: "Sau" })] })] })] })] }), _jsxs("section", { className: "wallet-offers", children: [_jsx("h2", { children: "\u01AFu \u0111\u00E3i d\u00E0nh cho b\u1EA1n" }), _jsxs("div", { children: [_jsxs("article", { children: [_jsx("span", { className: "is-orange", children: _jsx(Copy, {}) }), _jsx("h3", { children: "Ho\u00E0n ti\u1EC1n khi thanh to\u00E1n" }), _jsx("p", { children: "Kh\u00E1m ph\u00E1 c\u00E1ch t\u00EDch l\u0169y l\u1EE3i \u00EDch khi mua s\u1EAFm c\u00F9ng v\u00ED." }), _jsx(Link, { to: "/flash-sale", children: "Xem \u01B0u \u0111\u00E3i" })] }), _jsxs("article", { children: [_jsx("span", { children: _jsx(Truck, {}) }), _jsx("h3", { children: "Voucher ph\u00ED v\u1EADn chuy\u1EC3n" }), _jsx("p", { children: "M\u1ED9t ch\u00FAt ti\u1EBFt ki\u1EC7m cho h\u00E0nh tr\u00ECnh giao h\u00E0ng c\u1EE7a b\u1EA1n." }), _jsx(Link, { to: "/voucher", children: "Xem voucher" })] }), _jsxs("article", { children: [_jsx("span", { className: "is-purple", children: _jsx(Gift, {}) }), _jsx("h3", { children: "\u0110\u1ED5i \u0111i\u1EC3m th\u01B0\u1EDFng" }), _jsx("p", { children: "Bi\u1EBFn \u0111i\u1EC3m t\u00EDch l\u0169y th\u00E0nh nh\u1EEFng ph\u1EA7n qu\u00E0 th\u00FA v\u1ECB." }), _jsx(Link, { to: "/voucher", children: "Kh\u00E1m ph\u00E1 qu\u00E0" })] })] })] }), _jsxs("section", { className: "wallet-security", children: [_jsxs("header", { children: [_jsx("span", { children: _jsx(ShieldCheck, {}) }), _jsx("h2", { children: "B\u1EA3o m\u1EADt & tr\u1EE3 gi\u00FAp" })] }), _jsxs("div", { children: [_jsxs("article", { children: [_jsx("h3", { children: "B\u1EA3o v\u1EC7 t\u00E0i kho\u1EA3n" }), _jsx("p", { children: "Kh\u00F4ng chia s\u1EBB m\u1EADt kh\u1EA9u ho\u1EB7c m\u00E3 x\u00E1c th\u1EF1c v\u1EDBi ng\u01B0\u1EDDi kh\u00E1c." })] }), _jsxs("article", { children: [_jsx("h3", { children: "Ki\u1EC3m tra giao d\u1ECBch" }), _jsx("p", { children: "Xem l\u1EA1i s\u1ED1 ti\u1EC1n v\u00E0 ng\u01B0\u1EDDi nh\u1EADn tr\u01B0\u1EDBc khi x\u00E1c nh\u1EADn." })] }), _jsxs("article", { children: [_jsx("h3", { children: "C\u1EA7n h\u1ED7 tr\u1EE3?" }), _jsx("p", { children: "Li\u00EAn h\u1EC7 MDUC247 n\u1EBFu b\u1EA1n th\u1EA5y giao d\u1ECBch b\u1EA5t th\u01B0\u1EDDng." })] })] }), _jsx(Link, { to: "/support", children: "Li\u00EAn h\u1EC7 h\u1ED7 tr\u1EE3 \u2192" })] }), action && _jsx("div", { className: "wallet-modal", role: "presentation", onMouseDown: (event) => event.target === event.currentTarget && setAction(null), children: _jsxs("section", { role: "dialog", "aria-modal": "true", "aria-labelledby": "wallet-action-title", children: [_jsxs("header", { children: [_jsxs("div", { children: [_jsx("p", { children: "Giao d\u1ECBch minh h\u1ECDa" }), _jsx("h2", { id: "wallet-action-title", children: action === "deposit" ? "Nạp tiền vào ví" : action === "withdraw" ? "Rút tiền" : "Chuyển tiền" })] }), _jsx("button", { type: "button", onClick: () => setAction(null), "aria-label": "\u0110\u00F3ng", children: _jsx(X, {}) })] }), _jsxs("label", { children: ["S\u1ED1 ti\u1EC1n", _jsx("input", { type: "number", min: "1000", value: amount, onChange: (event) => setAmount(event.target.value), placeholder: "Nh\u1EADp s\u1ED1 ti\u1EC1n" })] }), action !== "deposit" && _jsxs("label", { children: [action === "withdraw" ? "Số tài khoản nhận" : "Người nhận", _jsx("input", { value: accountNumber, onChange: (event) => setAccountNumber(event.target.value), placeholder: action === "withdraw" ? "Ví dụ: 00004826" : "Email hoặc số điện thoại" })] }), _jsx("div", { className: "wallet-amount-presets", children: [100000, 500000, 1000000].map((value) => _jsxs("button", { type: "button", onClick: () => setAmount(String(value)), children: [value.toLocaleString("vi-VN"), "\u20AB"] }, value)) }), _jsx("button", { type: "button", className: "wallet-submit", disabled: submitting, onClick: submitAction, children: submitting ? "Đang xử lý..." : "Xác nhận giao dịch mock" })] }) })] }));
};
export default WalletPage;
