import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { TicketPercent, X } from "lucide-react";
import { engagementApi, type Campaign, type Voucher } from "../../api/engagementApi";
import { vnd, type CheckoutQuote } from "../../api/orderV2Api";

type Kind = "store" | "platform";
type Entry = { campaign: Campaign; voucher: Voucher };
type Props = {
  storeCode: string;
  platformCode: string;
  storeIds: string[];
  storeNames: Record<string, string>;
  appliedVouchers: CheckoutQuote["vouchers"];
  notice?: string;
  busy: boolean;
  onApply: (kind: Kind, code: string) => void;
  onRemove: (kind: Kind) => void;
};

export default function CheckoutVoucherPicker({ storeCode, platformCode, storeIds, storeNames,
  appliedVouchers, notice, busy, onApply, onRemove }: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Kind>("store");
  const [storeInput, setStoreInput] = useState(storeCode);
  const [platformInput, setPlatformInput] = useState(platformCode);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const trigger = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => { setStoreInput(storeCode); }, [storeCode]);
  useEffect(() => { setPlatformInput(platformCode); }, [platformCode]);
  useEffect(() => {
    if (!open) return;
    let active = true;
    setLoading(true); setError("");
    engagementApi.active().then(result => { if (active) setEntries(result.promotions); })
      .catch(cause => { if (active) setError(cause instanceof Error ? cause.message : "Không thể tải voucher."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [open, retry]);
  useEffect(() => {
    if (!open) return;
    const oldOverflow = document.body.style.overflow;
    const triggerElement = trigger.current;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", closeOnEscape);
    return () => { document.body.style.overflow = oldOverflow; document.removeEventListener("keydown", closeOnEscape); triggerElement?.focus(); };
  }, [open]);
  useEffect(() => { if (open) input.current?.focus(); }, [open, tab]);

  const selectedCode = tab === "store" ? storeCode : platformCode;
  const inputValue = tab === "store" ? storeInput : platformInput;
  const setInputValue = tab === "store" ? setStoreInput : setPlatformInput;
  const visible = entries.filter(entry => tab === "store"
    ? !!entry.campaign.storeId && storeIds.includes(entry.campaign.storeId)
    : !entry.campaign.storeId);
  const summary = [storeCode && `Shop: ${storeCode}`, platformCode && `Sàn: ${platformCode}`].filter(Boolean).join(" · ");

  function apply(event: FormEvent) {
    event.preventDefault();
    const code = inputValue.trim().toUpperCase();
    if (code) onApply(tab, code);
  }
  function choose(code: string) {
    setInputValue(code);
    onApply(tab, code);
  }
  function keepFocusInside(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Tab") return;
    const focusable = [...event.currentTarget.querySelectorAll<HTMLElement>("button:not([disabled]), input:not([disabled])")];
    const first = focusable[0], last = focusable.at(-1);
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  return <section className="checkout-card checkout-vouchers">
    <h2><TicketPercent size={19} aria-hidden="true" /> Voucher</h2>
    <button ref={trigger} type="button" className="checkout-voucher-trigger" onClick={() => { setTab(platformCode && !storeCode ? "platform" : "store"); setOpen(true); }} aria-haspopup="dialog" aria-expanded={open}>
      <span>{summary || "Chọn hoặc nhập mã voucher"}</span><strong>Chọn voucher</strong>
    </button>
    {notice && <p className="checkout-voucher-notice" role="status">{notice}</p>}
    {!!appliedVouchers.length && <div className="checkout-voucher-applied-list">{appliedVouchers.map(item =>
      <p className="checkout-voucher-applied" key={item.id}>{item.kind === "store" ? "Shop" : "Sàn"}: {item.code} · Giảm {vnd(item.discountMinor)}</p>)}</div>}
    {(storeCode || platformCode) && <p className="checkout-voucher-stacking">Có thể chọn tối đa một voucher shop và một voucher sàn. Điều kiện được kiểm tra khi tính đơn.</p>}
    {open && createPortal(<div className="checkout-voucher-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setOpen(false); }}>
      <div className="checkout-voucher-dialog" role="dialog" aria-modal="true" aria-labelledby="checkout-voucher-title" onKeyDown={keepFocusInside}>
        <header className="checkout-voucher-dialog-head"><div><small>Ưu đãi cho đơn hàng</small><h2 id="checkout-voucher-title">Chọn voucher</h2></div><button type="button" className="checkout-voucher-close" onClick={() => setOpen(false)} aria-label="Đóng popup voucher"><X size={20} /></button></header>
        <nav className="checkout-voucher-tabs" role="tablist" aria-label="Loại voucher">
          <button type="button" role="tab" id="checkout-tab-store" aria-selected={tab === "store"} className={tab === "store" ? "is-active" : ""} onClick={() => setTab("store")}>Voucher shop{storeCode && <i aria-label="Đã chọn" />}</button>
          <button type="button" role="tab" id="checkout-tab-platform" aria-selected={tab === "platform"} className={tab === "platform" ? "is-active" : ""} onClick={() => setTab("platform")}>Voucher sàn{platformCode && <i aria-label="Đã chọn" />}</button>
        </nav>
        <div className="checkout-voucher-dialog-body" role="tabpanel" id={`checkout-panel-${tab}`} aria-labelledby={`checkout-tab-${tab}`}>
          <p className="checkout-voucher-help">{tab === "store" ? "Ưu đãi từ các cửa hàng có sản phẩm trong đơn." : "Ưu đãi áp dụng từ MDUC247."}</p>
          <form className="checkout-voucher-code-form" onSubmit={apply}><label htmlFor="checkout-voucher-code">Nhập mã {tab === "store" ? "voucher shop" : "voucher sàn"}</label><div><input ref={input} id="checkout-voucher-code" value={inputValue} onChange={event => setInputValue(event.target.value.toUpperCase())} maxLength={32} placeholder="Nhập mã voucher" autoComplete="off" /><button type="submit" disabled={busy || !inputValue.trim()}>Áp dụng</button></div></form>
          {selectedCode && <div className="checkout-voucher-selected"><span>Đã chọn: <strong>{selectedCode}</strong></span><button type="button" disabled={busy} onClick={() => { setInputValue(""); onRemove(tab); }}>Bỏ mã</button></div>}
          <div className="checkout-voucher-list-head"><h3>Voucher đang có</h3><span>{visible.length} ưu đãi</span></div>
          {loading ? <p className="checkout-voucher-state" role="status">Đang tải voucher...</p> : error ? <div className="checkout-voucher-state" role="alert"><p>{error}</p><button type="button" onClick={() => setRetry(value => value + 1)}>Thử lại</button></div> : visible.length ? <div className="checkout-voucher-list">{visible.map(({ campaign, voucher }) => {
            const chosen = selectedCode === voucher.code;
            const discount = voucher.discountType === "FIXED" ? `Giảm ${vnd(voucher.discountValue)}` : `Giảm ${voucher.discountValue / 100}%${voucher.maxDiscountMinor != null ? `, tối đa ${vnd(voucher.maxDiscountMinor)}` : ""}`;
            return <article className={`checkout-voucher-option${chosen ? " is-selected" : ""}`} key={voucher.id}><div><strong>{campaign.title}</strong><span className="checkout-voucher-code">{voucher.code}</span></div><p>{discount}</p><small>{tab === "store" ? `${storeNames[campaign.storeId || ""] || "Cửa hàng trong đơn"} · ` : ""}{voucher.minSpendMinor ? `Đơn từ ${vnd(voucher.minSpendMinor)}` : "Không yêu cầu giá trị tối thiểu"}</small><button type="button" disabled={busy} onClick={() => choose(voucher.code)}>{chosen ? "Đã chọn" : "Chọn mã"}</button></article>;
          })}</div> : <p className="checkout-voucher-state">Chưa có voucher {tab === "store" ? "shop" : "sàn"} đang hoạt động cho đơn này. Bạn vẫn có thể nhập mã đã nhận.</p>}
        </div>
        <footer className="checkout-voucher-dialog-foot"><span>Voucher shop được tính trước voucher sàn khi đủ điều kiện.</span><button type="button" onClick={() => setOpen(false)}>Hoàn tất</button></footer>
      </div>
    </div>, document.body)}
  </section>;
}
