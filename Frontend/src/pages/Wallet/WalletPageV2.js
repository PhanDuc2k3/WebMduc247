import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDownLeft, Download, Gift, LockKeyhole, ReceiptText, Search, ShieldCheck, Truck, Wallet } from "lucide-react";
import { orderV2Api, vnd } from "../../api/orderV2Api";
import { paymentV2Api } from "../../api/paymentV2Api";
import ContentBreadcrumb from "../../components/ui/ContentBreadcrumb";
import "./Wallet.css";
import "./WalletPageV2.css";
const PAGE_SIZE = 10;
const methodLabel = {
    COD: "Thanh toán khi nhận hàng", MOMO: "Ví điện tử MoMo", VIETQR: "Chuyển khoản VietQR",
};
const paymentLabel = (status) => status === "PAID" ? "Đã thanh toán" : status === "REFUNDED" ? "Đã hoàn tiền"
    : status === "PARTIALLY_REFUNDED" ? "Đã hoàn một phần" : status === "FAILED" ? "Thất bại" : "Chờ thanh toán";
const refundLabel = (status) => status === "SUCCEEDED" ? "Đã hoàn" : status === "FAILED" ? "Thất bại" : "Đang xử lý";
const formatDate = (value) => new Date(value).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
const csvCell = (value) => {
    const text = String(value);
    const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
    return `"${safe.replaceAll('"', '""')}"`;
};
export default function WalletPageV2() {
    const [groups, setGroups] = useState([]);
    const [refunds, setRefunds] = useState({});
    const [methods, setMethods] = useState([]);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [retry, setRetry] = useState(0);
    const [tab, setTab] = useState("all");
    const [period, setPeriod] = useState("all");
    const [status, setStatus] = useState("all");
    const [search, setSearch] = useState("");
    useEffect(() => {
        let active = true;
        paymentV2Api.methods().then(result => {
            if (active)
                setMethods(result.methods.filter(item => item.available).map(item => item.code));
        }).catch(() => { });
        return () => { active = false; };
    }, []);
    useEffect(() => {
        let active = true;
        setLoading(true);
        setError("");
        setRefunds({});
        orderV2Api.buyerOrders({ page, limit: PAGE_SIZE }).then(result => {
            if (!active)
                return;
            const visible = result.groups || [];
            setGroups(visible);
            setTotal(result.total);
            setLoading(false);
            void Promise.allSettled(visible.map(group => paymentV2Api.order(group.id))).then(responses => {
                if (!active)
                    return;
                const next = {};
                responses.forEach((response, index) => {
                    if (response.status === "fulfilled")
                        next[visible[index].id] = response.value.refunds;
                });
                setRefunds(next);
            });
        }).catch(cause => {
            if (active) {
                setGroups([]);
                setTotal(0);
                setError(cause instanceof Error ? cause.message : "Không thể tải hoạt động thanh toán.");
                setLoading(false);
            }
        });
        return () => { active = false; };
    }, [page, retry]);
    const activities = useMemo(() => groups.flatMap(group => [
        { id: group.id, groupId: group.id, type: "payment",
            title: `Đơn hàng #${group.id.slice(0, 8).toUpperCase()}`, amount: group.currentTotalMinor,
            createdAt: group.createdAt, status: paymentLabel(group.paymentStatus), reference: methodLabel[group.paymentMethod] },
        ...(refunds[group.id] || []).map(refund => ({ id: refund.id, groupId: group.id, type: "refund",
            title: `Hoàn tiền đơn #${group.id.slice(0, 8).toUpperCase()}`, amount: refund.amountMinor,
            createdAt: refund.createdAt, status: refundLabel(refund.status), reference: refund.reason })),
    ]).sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt)), [groups, refunds]);
    const filtered = activities.filter(item => {
        if (tab !== "all" && item.type !== tab)
            return false;
        if (period === "30d" && Date.parse(item.createdAt) < Date.now() - 30 * 86_400_000)
            return false;
        if (status !== "all" && item.status !== status)
            return false;
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
        anchor.href = url;
        anchor.download = `hoat-dong-thanh-toan-trang-${page}.csv`;
        anchor.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
    return _jsxs("div", { className: "wallet-page wallet-v2-page", children: [_jsx(ContentBreadcrumb, { items: [{ label: "Ví MDUC247" }] }), _jsx("h1", { className: "sr-only", children: "V\u00ED c\u1EE7a t\u00F4i" }), _jsxs("div", { className: "wallet-layout", children: [_jsxs("div", { className: "wallet-left", children: [_jsxs("section", { "aria-labelledby": "wallet-overview-title", children: [_jsx("h2", { id: "wallet-overview-title", className: "wallet-section-title", children: "T\u1ED5ng quan v\u00ED" }), _jsxs("div", { className: "wallet-balance-card", children: [_jsxs("div", { className: "wallet-balance-card__top", children: [_jsx("span", { children: "S\u1ED1 d\u01B0 kh\u1EA3 d\u1EE5ng" }), _jsx(LockKeyhole, { size: 17, "aria-hidden": "true" })] }), _jsx("strong", { children: "\u2014" }), _jsx("p", { className: "wallet-v2-unavailable", children: "V\u00ED n\u1ED9i b\u1ED9 ch\u01B0a \u0111\u01B0\u1EE3c k\u00EDch ho\u1EA1t" }), _jsxs("div", { className: "wallet-balance-card__stats", children: [_jsxs("span", { children: ["\u0110ang ch\u1EDD x\u1EED l\u00FD", _jsx("strong", { children: "\u2014" })] }), _jsxs("span", { children: ["Giao d\u1ECBch v\u00ED", _jsx("strong", { children: "\u2014" })] })] })] }), _jsxs("div", { className: "wallet-actions", children: [_jsx("button", { type: "button", disabled: true, title: "V\u00ED n\u1ED9i b\u1ED9 ch\u01B0a kh\u1EA3 d\u1EE5ng", children: "N\u1EA1p ti\u1EC1n" }), _jsx("button", { type: "button", disabled: true, title: "V\u00ED n\u1ED9i b\u1ED9 ch\u01B0a kh\u1EA3 d\u1EE5ng", children: "R\u00FAt ti\u1EC1n" }), _jsx("button", { type: "button", disabled: true, title: "V\u00ED n\u1ED9i b\u1ED9 ch\u01B0a kh\u1EA3 d\u1EE5ng", children: "Chuy\u1EC3n ti\u1EC1n" })] })] }), _jsxs("section", { className: "wallet-methods", children: [_jsx("header", { children: _jsx("h2", { children: "Ph\u01B0\u01A1ng th\u1EE9c thanh to\u00E1n" }) }), methods.length ? _jsx("div", { className: "wallet-v2-method-list", children: methods.map(method => _jsxs("div", { children: [_jsx(Wallet, { size: 17 }), _jsx("span", { children: methodLabel[method] })] }, method)) }) : _jsx("p", { className: "wallet-methods-empty", children: "Ph\u01B0\u01A1ng th\u1EE9c kh\u1EA3 d\u1EE5ng s\u1EBD hi\u1EC3n th\u1ECB khi h\u1EC7 th\u1ED1ng k\u1EBFt n\u1ED1i thanh to\u00E1n." })] })] }), _jsxs("section", { className: "wallet-history", children: [_jsxs("header", { children: [_jsxs("div", { children: [_jsx("h2", { children: "Ho\u1EA1t \u0111\u1ED9ng thanh to\u00E1n" }), _jsx("p", { children: "\u0110\u01A1n h\u00E0ng v\u00E0 kho\u1EA3n ho\u00E0n ti\u1EC1n th\u1EF1c t\u1EBF tr\u00EAn trang hi\u1EC7n t\u1EA1i." })] }), _jsxs("button", { type: "button", disabled: !filtered.length, onClick: downloadHistory, children: [_jsx(Download, { size: 15 }), " T\u1EA3i trang n\u00E0y"] })] }), _jsxs("div", { className: "wallet-tabs", role: "group", "aria-label": "L\u1ECDc ho\u1EA1t \u0111\u1ED9ng", children: [_jsx("button", { type: "button", className: tab === "all" ? "is-active" : "", onClick: () => setTab("all"), children: "T\u1EA5t c\u1EA3" }), _jsx("button", { type: "button", className: tab === "payment" ? "is-active" : "", onClick: () => setTab("payment"), children: "\u0110\u01A1n h\u00E0ng" }), _jsx("button", { type: "button", className: tab === "refund" ? "is-active" : "", onClick: () => setTab("refund"), children: "Ho\u00E0n ti\u1EC1n" }), _jsx("button", { type: "button", disabled: true, title: "V\u00ED n\u1ED9i b\u1ED9 ch\u01B0a kh\u1EA3 d\u1EE5ng", children: "N\u1EA1p ti\u1EC1n" }), _jsx("button", { type: "button", disabled: true, title: "V\u00ED n\u1ED9i b\u1ED9 ch\u01B0a kh\u1EA3 d\u1EE5ng", children: "R\u00FAt ti\u1EC1n" })] }), _jsxs("div", { className: "wallet-filters", children: [_jsxs("label", { children: ["Th\u1EDDi gian", _jsxs("select", { value: period, onChange: event => setPeriod(event.target.value), children: [_jsx("option", { value: "all", children: "M\u1ECDi th\u1EDDi gian" }), _jsx("option", { value: "30d", children: "30 ng\u00E0y g\u1EA7n \u0111\u00E2y" })] })] }), _jsxs("label", { children: ["Tr\u1EA1ng th\u00E1i", _jsxs("select", { value: status, onChange: event => setStatus(event.target.value), children: [_jsx("option", { value: "all", children: "M\u1ECDi tr\u1EA1ng th\u00E1i" }), _jsx("option", { value: "\u0110\u00E3 thanh to\u00E1n", children: "\u0110\u00E3 thanh to\u00E1n" }), _jsx("option", { value: "Ch\u1EDD thanh to\u00E1n", children: "Ch\u1EDD thanh to\u00E1n" }), _jsx("option", { value: "\u0110\u00E3 ho\u00E0n ti\u1EC1n", children: "\u0110\u00E3 ho\u00E0n ti\u1EC1n" }), _jsx("option", { value: "\u0110\u00E3 ho\u00E0n m\u1ED9t ph\u1EA7n", children: "\u0110\u00E3 ho\u00E0n m\u1ED9t ph\u1EA7n" }), _jsx("option", { value: "\u0110\u00E3 ho\u00E0n", children: "\u0110\u00E3 ho\u00E0n" }), _jsx("option", { value: "\u0110ang x\u1EED l\u00FD", children: "\u0110ang x\u1EED l\u00FD" }), _jsx("option", { value: "Th\u1EA5t b\u1EA1i", children: "Th\u1EA5t b\u1EA1i" })] })] }), _jsxs("label", { children: ["T\u00ECm trong trang n\u00E0y", _jsxs("span", { children: [_jsx(Search, { size: 15 }), _jsx("input", { value: search, onChange: event => setSearch(event.target.value), placeholder: "N\u1ED9i dung ho\u1EB7c m\u00E3 \u0111\u01A1n..." })] })] })] }), _jsx("div", { className: "wallet-transactions", children: error ? _jsxs("div", { className: "wallet-v2-state", children: [_jsx("p", { children: error }), _jsx("button", { type: "button", onClick: () => setRetry(value => value + 1), children: "Th\u1EED l\u1EA1i" }), _jsx(Link, { to: "/login", children: "\u0110\u0103ng nh\u1EADp" })] }) : loading ? _jsx("p", { className: "wallet-empty", children: "\u0110ang t\u1EA3i ho\u1EA1t \u0111\u1ED9ng thanh to\u00E1n..." }) : filtered.length ? filtered.map(item => _jsxs("article", { children: [_jsx("span", { className: `wallet-transaction-icon is-${item.type === "refund" ? "refund" : "payment"}`, children: item.type === "refund" ? _jsx(ArrowDownLeft, { size: 17 }) : _jsx(ReceiptText, { size: 17 }) }), _jsxs("div", { children: [_jsx(Link, { to: `/orders/${item.groupId}`, children: item.title }), _jsxs("small", { children: [formatDate(item.createdAt), " \u00B7 ", item.reference] }), _jsx("em", { className: item.status === "Đã thanh toán" || item.status === "Đã hoàn" ? "is-completed" : item.status === "Thất bại" ? "is-failed" : "is-pending", children: item.status })] }), _jsxs("b", { className: item.type === "refund" ? "is-positive" : "", children: [item.type === "refund" ? "+" : "", vnd(item.amount)] })] }, item.id)) : _jsx("p", { className: "wallet-empty", children: "Kh\u00F4ng c\u00F3 ho\u1EA1t \u0111\u1ED9ng ph\u00F9 h\u1EE3p tr\u00EAn trang n\u00E0y." }) }), _jsxs("footer", { className: "wallet-pagination", children: [_jsxs("span", { children: ["Trang ", page, "/", pageCount, " \u00B7 ", filtered.length, " m\u1EE5c \u0111ang hi\u1EC3n th\u1ECB"] }), _jsxs("div", { children: [_jsx("button", { type: "button", disabled: page <= 1 || loading, onClick: () => setPage(value => value - 1), children: "Tr\u01B0\u1EDBc" }), _jsx("button", { type: "button", disabled: page >= pageCount || loading, onClick: () => setPage(value => value + 1), children: "Sau" })] })] })] })] }), _jsxs("section", { className: "wallet-offers", children: [_jsx("h2", { children: "Ti\u1EC7n \u00EDch d\u00E0nh cho b\u1EA1n" }), _jsxs("div", { children: [_jsxs("article", { children: [_jsx("span", { className: "is-orange", children: _jsx(ReceiptText, { size: 20 }) }), _jsx("h3", { children: "Theo d\u00F5i \u0111\u01A1n h\u00E0ng" }), _jsx("p", { children: "Xem tr\u1EA1ng th\u00E1i, gi\u00E1 tr\u1ECB v\u00E0 l\u1ECBch s\u1EED thanh to\u00E1n t\u1EEBng \u0111\u01A1n." }), _jsx(Link, { to: "/orders", children: "Xem \u0111\u01A1n h\u00E0ng" })] }), _jsxs("article", { children: [_jsx("span", { children: _jsx(Truck, { size: 20 }) }), _jsx("h3", { children: "Voucher c\u1EE7a b\u1EA1n" }), _jsx("p", { children: "Ki\u1EC3m tra \u01B0u \u0111\u00E3i c\u00F3 th\u1EC3 \u00E1p d\u1EE5ng khi mua s\u1EAFm." }), _jsx(Link, { to: "/voucher", children: "Xem voucher" })] }), _jsxs("article", { children: [_jsx("span", { className: "is-purple", children: _jsx(Gift, { size: 20 }) }), _jsx("h3", { children: "Kh\u00E1m ph\u00E1 s\u1EA3n ph\u1EA9m" }), _jsx("p", { children: "T\u00ECm th\u00EAm s\u1EA3n ph\u1EA9m t\u1EEB c\u00E1c c\u1EEDa h\u00E0ng \u0111ang ho\u1EA1t \u0111\u1ED9ng." }), _jsx(Link, { to: "/products", children: "Kh\u00E1m ph\u00E1 ngay" })] })] })] }), _jsxs("section", { className: "wallet-security", children: [_jsxs("header", { children: [_jsx("span", { children: _jsx(ShieldCheck, { size: 20 }) }), _jsx("h2", { children: "B\u1EA3o m\u1EADt & tr\u1EE3 gi\u00FAp" })] }), _jsxs("div", { children: [_jsxs("article", { children: [_jsx("h3", { children: "B\u1EA3o v\u1EC7 t\u00E0i kho\u1EA3n" }), _jsx("p", { children: "Kh\u00F4ng chia s\u1EBB m\u1EADt kh\u1EA9u ho\u1EB7c m\u00E3 x\u00E1c th\u1EF1c v\u1EDBi ng\u01B0\u1EDDi kh\u00E1c." })] }), _jsxs("article", { children: [_jsx("h3", { children: "Ki\u1EC3m tra thanh to\u00E1n" }), _jsx("p", { children: "\u0110\u1ED1i chi\u1EBFu s\u1ED1 ti\u1EC1n v\u00E0 tr\u1EA1ng th\u00E1i trong chi ti\u1EBFt \u0111\u01A1n h\u00E0ng." })] }), _jsxs("article", { children: [_jsx("h3", { children: "C\u1EA7n h\u1ED7 tr\u1EE3?" }), _jsx("p", { children: "Li\u00EAn h\u1EC7 MDUC247 n\u1EBFu b\u1EA1n th\u1EA5y kho\u1EA3n thanh to\u00E1n b\u1EA5t th\u01B0\u1EDDng." })] })] }), _jsx(Link, { to: "/support", children: "Li\u00EAn h\u1EC7 h\u1ED7 tr\u1EE3 \u2192" })] })] });
}
