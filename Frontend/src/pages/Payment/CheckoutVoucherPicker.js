import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { TicketPercent, X } from "lucide-react";
import { engagementApi } from "../../api/engagementApi";
import { vnd } from "../../api/orderV2Api";
export default function CheckoutVoucherPicker({ storeCode, platformCode, storeIds, storeNames, appliedVouchers, notice, busy, onApply, onRemove }) {
    const [open, setOpen] = useState(false);
    const [tab, setTab] = useState("store");
    const [storeInput, setStoreInput] = useState(storeCode);
    const [platformInput, setPlatformInput] = useState(platformCode);
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [retry, setRetry] = useState(0);
    const trigger = useRef(null);
    const input = useRef(null);
    useEffect(() => { setStoreInput(storeCode); }, [storeCode]);
    useEffect(() => { setPlatformInput(platformCode); }, [platformCode]);
    useEffect(() => {
        if (!open)
            return;
        let active = true;
        setLoading(true);
        setError("");
        engagementApi.active().then(result => { if (active)
            setEntries(result.promotions); })
            .catch(cause => { if (active)
            setError(cause instanceof Error ? cause.message : "Không thể tải voucher."); })
            .finally(() => { if (active)
            setLoading(false); });
        return () => { active = false; };
    }, [open, retry]);
    useEffect(() => {
        if (!open)
            return;
        const oldOverflow = document.body.style.overflow;
        const triggerElement = trigger.current;
        document.body.style.overflow = "hidden";
        const closeOnEscape = (event) => { if (event.key === "Escape")
            setOpen(false); };
        document.addEventListener("keydown", closeOnEscape);
        return () => { document.body.style.overflow = oldOverflow; document.removeEventListener("keydown", closeOnEscape); triggerElement?.focus(); };
    }, [open]);
    useEffect(() => { if (open)
        input.current?.focus(); }, [open, tab]);
    const selectedCode = tab === "store" ? storeCode : platformCode;
    const inputValue = tab === "store" ? storeInput : platformInput;
    const setInputValue = tab === "store" ? setStoreInput : setPlatformInput;
    const visible = entries.filter(entry => tab === "store"
        ? !!entry.campaign.storeId && storeIds.includes(entry.campaign.storeId)
        : !entry.campaign.storeId);
    const summary = [storeCode && `Shop: ${storeCode}`, platformCode && `Sàn: ${platformCode}`].filter(Boolean).join(" · ");
    function apply(event) {
        event.preventDefault();
        const code = inputValue.trim().toUpperCase();
        if (code)
            onApply(tab, code);
    }
    function choose(code) {
        setInputValue(code);
        onApply(tab, code);
    }
    function keepFocusInside(event) {
        if (event.key !== "Tab")
            return;
        const focusable = [...event.currentTarget.querySelectorAll("button:not([disabled]), input:not([disabled])")];
        const first = focusable[0], last = focusable.at(-1);
        if (!first || !last)
            return;
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        }
        else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    }
    return _jsxs("section", { className: "checkout-card checkout-vouchers", children: [_jsxs("h2", { children: [_jsx(TicketPercent, { size: 19, "aria-hidden": "true" }), " Voucher"] }), _jsxs("button", { ref: trigger, type: "button", className: "checkout-voucher-trigger", onClick: () => { setTab(platformCode && !storeCode ? "platform" : "store"); setOpen(true); }, "aria-haspopup": "dialog", "aria-expanded": open, children: [_jsx("span", { children: summary || "Chọn hoặc nhập mã voucher" }), _jsx("strong", { children: "Ch\u1ECDn voucher" })] }), notice && _jsx("p", { className: "checkout-voucher-notice", role: "status", children: notice }), !!appliedVouchers.length && _jsx("div", { className: "checkout-voucher-applied-list", children: appliedVouchers.map(item => _jsxs("p", { className: "checkout-voucher-applied", children: [item.kind === "store" ? "Shop" : "Sàn", ": ", item.code, " \u00B7 Gi\u1EA3m ", vnd(item.discountMinor)] }, item.id)) }), (storeCode || platformCode) && _jsx("p", { className: "checkout-voucher-stacking", children: "C\u00F3 th\u1EC3 ch\u1ECDn t\u1ED1i \u0111a m\u1ED9t voucher shop v\u00E0 m\u1ED9t voucher s\u00E0n. \u0110i\u1EC1u ki\u1EC7n \u0111\u01B0\u1EE3c ki\u1EC3m tra khi t\u00EDnh \u0111\u01A1n." }), open && createPortal(_jsx("div", { className: "checkout-voucher-backdrop", onMouseDown: event => { if (event.target === event.currentTarget)
                    setOpen(false); }, children: _jsxs("div", { className: "checkout-voucher-dialog", role: "dialog", "aria-modal": "true", "aria-labelledby": "checkout-voucher-title", onKeyDown: keepFocusInside, children: [_jsxs("header", { className: "checkout-voucher-dialog-head", children: [_jsxs("div", { children: [_jsx("small", { children: "\u01AFu \u0111\u00E3i cho \u0111\u01A1n h\u00E0ng" }), _jsx("h2", { id: "checkout-voucher-title", children: "Ch\u1ECDn voucher" })] }), _jsx("button", { type: "button", className: "checkout-voucher-close", onClick: () => setOpen(false), "aria-label": "\u0110\u00F3ng popup voucher", children: _jsx(X, { size: 20 }) })] }), _jsxs("nav", { className: "checkout-voucher-tabs", role: "tablist", "aria-label": "Lo\u1EA1i voucher", children: [_jsxs("button", { type: "button", role: "tab", id: "checkout-tab-store", "aria-selected": tab === "store", className: tab === "store" ? "is-active" : "", onClick: () => setTab("store"), children: ["Voucher shop", storeCode && _jsx("i", { "aria-label": "\u0110\u00E3 ch\u1ECDn" })] }), _jsxs("button", { type: "button", role: "tab", id: "checkout-tab-platform", "aria-selected": tab === "platform", className: tab === "platform" ? "is-active" : "", onClick: () => setTab("platform"), children: ["Voucher s\u00E0n", platformCode && _jsx("i", { "aria-label": "\u0110\u00E3 ch\u1ECDn" })] })] }), _jsxs("div", { className: "checkout-voucher-dialog-body", role: "tabpanel", id: `checkout-panel-${tab}`, "aria-labelledby": `checkout-tab-${tab}`, children: [_jsx("p", { className: "checkout-voucher-help", children: tab === "store" ? "Ưu đãi từ các cửa hàng có sản phẩm trong đơn." : "Ưu đãi áp dụng từ MDUC247." }), _jsxs("form", { className: "checkout-voucher-code-form", onSubmit: apply, children: [_jsxs("label", { htmlFor: "checkout-voucher-code", children: ["Nh\u1EADp m\u00E3 ", tab === "store" ? "voucher shop" : "voucher sàn"] }), _jsxs("div", { children: [_jsx("input", { ref: input, id: "checkout-voucher-code", value: inputValue, onChange: event => setInputValue(event.target.value.toUpperCase()), maxLength: 32, placeholder: "Nh\u1EADp m\u00E3 voucher", autoComplete: "off" }), _jsx("button", { type: "submit", disabled: busy || !inputValue.trim(), children: "\u00C1p d\u1EE5ng" })] })] }), selectedCode && _jsxs("div", { className: "checkout-voucher-selected", children: [_jsxs("span", { children: ["\u0110\u00E3 ch\u1ECDn: ", _jsx("strong", { children: selectedCode })] }), _jsx("button", { type: "button", disabled: busy, onClick: () => { setInputValue(""); onRemove(tab); }, children: "B\u1ECF m\u00E3" })] }), _jsxs("div", { className: "checkout-voucher-list-head", children: [_jsx("h3", { children: "Voucher \u0111ang c\u00F3" }), _jsxs("span", { children: [visible.length, " \u01B0u \u0111\u00E3i"] })] }), loading ? _jsx("p", { className: "checkout-voucher-state", role: "status", children: "\u0110ang t\u1EA3i voucher..." }) : error ? _jsxs("div", { className: "checkout-voucher-state", role: "alert", children: [_jsx("p", { children: error }), _jsx("button", { type: "button", onClick: () => setRetry(value => value + 1), children: "Th\u1EED l\u1EA1i" })] }) : visible.length ? _jsx("div", { className: "checkout-voucher-list", children: visible.map(({ campaign, voucher }) => {
                                        const chosen = selectedCode === voucher.code;
                                        const discount = voucher.discountType === "FIXED" ? `Giảm ${vnd(voucher.discountValue)}` : `Giảm ${voucher.discountValue / 100}%${voucher.maxDiscountMinor != null ? `, tối đa ${vnd(voucher.maxDiscountMinor)}` : ""}`;
                                        return _jsxs("article", { className: `checkout-voucher-option${chosen ? " is-selected" : ""}`, children: [_jsxs("div", { children: [_jsx("strong", { children: campaign.title }), _jsx("span", { className: "checkout-voucher-code", children: voucher.code })] }), _jsx("p", { children: discount }), _jsxs("small", { children: [tab === "store" ? `${storeNames[campaign.storeId || ""] || "Cửa hàng trong đơn"} · ` : "", voucher.minSpendMinor ? `Đơn từ ${vnd(voucher.minSpendMinor)}` : "Không yêu cầu giá trị tối thiểu"] }), _jsx("button", { type: "button", disabled: busy, onClick: () => choose(voucher.code), children: chosen ? "Đã chọn" : "Chọn mã" })] }, voucher.id);
                                    }) }) : _jsxs("p", { className: "checkout-voucher-state", children: ["Ch\u01B0a c\u00F3 voucher ", tab === "store" ? "shop" : "sàn", " \u0111ang ho\u1EA1t \u0111\u1ED9ng cho \u0111\u01A1n n\u00E0y. B\u1EA1n v\u1EABn c\u00F3 th\u1EC3 nh\u1EADp m\u00E3 \u0111\u00E3 nh\u1EADn."] })] }), _jsxs("footer", { className: "checkout-voucher-dialog-foot", children: [_jsx("span", { children: "Voucher shop \u0111\u01B0\u1EE3c t\u00EDnh tr\u01B0\u1EDBc voucher s\u00E0n khi \u0111\u1EE7 \u0111i\u1EC1u ki\u1EC7n." }), _jsx("button", { type: "button", onClick: () => setOpen(false), children: "Ho\u00E0n t\u1EA5t" })] })] }) }), document.body)] });
}
