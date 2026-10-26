import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { ArrowLeft, LockKeyhole, MapPin, Package, ShieldCheck, Truck } from "lucide-react";
import { identityAuthorizedRequest, IdentityApiError } from "../../api/identityApi";
import { orderV2Api, notifyCartChanged, vnd, type CheckoutQuote, type ShippingAddress } from "../../api/orderV2Api";
import { paymentV2Api, type PaymentMethod } from "../../api/paymentV2Api";
import { profileApi, type Address } from "../../api/profileApi";
import ContentBreadcrumb from "../../components/ui/ContentBreadcrumb";
import CheckoutVoucherPicker from "./CheckoutVoucherPicker";
import { formatAddress } from "../../utils/formatAddress";
import "./Payment.css";
import "./PaymentVouchers.css";

const paymentHint: Record<PaymentMethod, string> = {
  COD: "Trả tiền khi nhận hàng",
  MOMO: "Thanh toán qua cổng MoMo",
  VIETQR: "Chuyển khoản bằng mã QR",
};

export default function Checkout() {
  const navigate = useNavigate();
  const [addresses, setAddresses] = useState<ShippingAddress[]>([]);
  const [addressId, setAddressId] = useState("");
  const [addressDetail, setAddressDetail] = useState<Address | null>(null);
  const [addressChoicesOpen, setAddressChoicesOpen] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [quote, setQuote] = useState<CheckoutQuote | null>(null);
  const [checkoutError, setCheckoutError] = useState("");
  const [voucherIssue, setVoucherIssue] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const previewRequest = useRef(0);
  const [placeKey, setPlaceKey] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("COD");
  const [methods, setMethods] = useState<Array<{ code: PaymentMethod; name: string }>>([{ code: "COD", name: "Thanh toán khi nhận hàng" }]);
  const [voucherCode, setVoucherCode] = useState(() => sessionStorage.getItem("cartVoucherCode") || "");
  const [storeVoucherCode, setStoreVoucherCode] = useState(() => sessionStorage.getItem("cartStoreVoucherCode") || "");

  useEffect(() => {
    identityAuthorizedRequest<{ addresses: ShippingAddress[] }>("/users/me/addresses")
      .then(data => { setAddresses(data.addresses); setAddressId(data.addresses.find(item => item.isDefault)?.id || data.addresses[0]?.id || ""); })
      .catch(error => toast.error(error instanceof Error ? error.message : "Không thể tải địa chỉ.", { containerId: "general-toast" }))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    if (!addressId) { setAddressDetail(null); return; }
    let active = true;
    profileApi.address(addressId).then(result => { if (active) setAddressDetail(result.address); })
      .catch(() => { if (active) setAddressDetail(null); });
    return () => { active = false; };
  }, [addressId]);
  useEffect(() => {
    paymentV2Api.methods().then(result => setMethods(result.methods.filter(item => item.available)))
      .catch(error => toast.warning(error instanceof Error ? error.message : "Chưa thể tải phương thức online; COD vẫn khả dụng.", { containerId: "general-toast" }));
  }, []);

  const preview = useCallback(async () => {
    const request = ++previewRequest.current;
    if (!addressId) { setQuote(null); setBusy(false); return; }
    setBusy(true);
    setCheckoutError("");
    try {
      const result = await orderV2Api.preview({ addressId, paymentMethod,
        ...(voucherCode ? { platformVoucherCode: voucherCode } : {}),
        ...(storeVoucherCode ? { storeVoucherCode } : {}) });
      if (request !== previewRequest.current) return;
      setQuote(result);
      setPlaceKey(crypto.randomUUID());
      if (result.vouchers.length) toast.success(`Đã tính ${result.vouchers.map(item => item.code).join(" + ")}.`, { containerId: "general-toast", toastId: "voucher-applied" });
    } catch (error) {
      if (request !== previewRequest.current) return;
      setQuote(null);
      setPlaceKey("");
      const message = error instanceof Error ? error.message : "Không thể tính checkout.";
      const voucherError = error instanceof IdentityApiError &&
        (error.code === "INVALID_VOUCHER" || error.code?.startsWith("VOUCHER_"));
      if (voucherError && (voucherCode || storeVoucherCode)) {
        sessionStorage.removeItem("cartVoucherCode");
        sessionStorage.removeItem("cartStoreVoucherCode");
        setVoucherCode("");
        setStoreVoucherCode("");
        setVoucherIssue(`Đã gỡ voucher đã lưu vì không áp dụng được: ${message}`);
        toast.warning("Mã voucher không áp dụng được đã được gỡ. Đang tính lại đơn hàng.", { containerId: "general-toast", toastId: "voucher-recovered" });
      } else {
        setCheckoutError(message);
        toast.error(message, { containerId: "general-toast" });
      }
    } finally { if (request === previewRequest.current) setBusy(false); }
  }, [addressId, paymentMethod, voucherCode, storeVoucherCode]);
  useEffect(() => { void preview(); }, [preview]);

  async function place() {
    if (!acceptedTerms || !quote || !addressId || !placeKey || quote.errors.length) return;
    setBusy(true);
    try {
      const result = await orderV2Api.place({ quoteId: quote.quoteId, addressId, paymentMethod,
        idempotencyKey: placeKey, expectedTotalMinor: quote.payableTotalMinor,
        ...(voucherCode ? { platformVoucherCode: voucherCode } : {}),
        ...(storeVoucherCode ? { storeVoucherCode } : {}) });
      notifyCartChanged(); sessionStorage.removeItem("cartVoucherCode");
      sessionStorage.removeItem("cartStoreVoucherCode");
      toast.success("Đặt hàng thành công.", { containerId: "general-toast" });
      navigate(`/orders/${result.groupId}`, { replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể đặt hàng.", { containerId: "general-toast" });
      if (error instanceof Error && /thay đổi|hết hạn|không hợp lệ/i.test(error.message)) void preview();
    } finally { setBusy(false); }
  }

  const selectedAddress = addresses.find(item => item.id === addressId);
  const fullAddress = addressDetail?.id === addressId ? addressDetail : null;
  const lines = quote?.stores.flatMap(store => store.lines) || [];
  const itemCount = lines.reduce((sum, line) => sum + line.quantity, 0);
  const expired = quote ? new Date(quote.expiresAt) <= new Date() : true;
  const placeBlockReason = busy ? "" : !quote ? checkoutError || "Đơn hàng chưa sẵn sàng. Hãy kiểm tra giỏ hàng hoặc cập nhật bảng giá." :
    quote.errors.length ? "Hãy xử lý các lỗi đơn hàng trước khi đặt." :
      expired ? "Bảng giá đã hết hạn. Hãy cập nhật bảng giá." :
        !acceptedTerms ? "Vui lòng đồng ý với điều khoản sử dụng trước khi đặt hàng." : "";

  function applyVoucher(kind: "store" | "platform", code: string) {
    setVoucherIssue("");
    const current = kind === "store" ? storeVoucherCode : voucherCode;
    if (code === current) { void preview(); return; }
    previewRequest.current += 1;
    setQuote(null);
    if (kind === "store") {
      setStoreVoucherCode(code);
      sessionStorage.setItem("cartStoreVoucherCode", code);
    } else {
      setVoucherCode(code);
      sessionStorage.setItem("cartVoucherCode", code);
    }
  }
  function removeVoucher(kind: "store" | "platform") {
    setVoucherIssue("");
    previewRequest.current += 1;
    setQuote(null);
    if (kind === "store") {
      setStoreVoucherCode("");
      sessionStorage.removeItem("cartStoreVoucherCode");
    } else {
      setVoucherCode("");
      sessionStorage.removeItem("cartVoucherCode");
    }
  }

  return <div className="checkout-page">
    <ContentBreadcrumb items={[{ label: "Giỏ hàng", to: "/cart" }, { label: "Thanh toán" }]} />
    <h1 className="sr-only">Thanh toán</h1>
    <div className="checkout-layout">
      <div className="checkout-main">
        <section className="checkout-card"><div className="checkout-card-heading"><h2><MapPin size={18} /> Địa chỉ nhận hàng</h2>{!!addresses.length && <button type="button" onClick={() => setAddressChoicesOpen(value => !value)}>{addressChoicesOpen ? "Đóng" : "Thay đổi"}</button>}</div>
          {loading ? <p className="checkout-empty">Đang tải địa chỉ...</p> : selectedAddress ? <div className="checkout-address-current"><p><strong>{selectedAddress.receiverName}</strong><span>{fullAddress?.receiverPhone || selectedAddress.receiverPhoneMasked}</span>{selectedAddress.isDefault && <em>Mặc định</em>}</p><address>{formatAddress(selectedAddress)}</address>{fullAddress?.note && <small>Ghi chú: {fullAddress.note}</small>}</div> : <p className="checkout-empty">Bạn chưa có địa chỉ giao hàng.</p>}
          {addressChoicesOpen && <div className="checkout-address-list">{addresses.map(item => <button type="button" key={item.id} className={item.id === addressId ? "is-selected" : ""} onClick={() => { if (item.id !== addressId) { setQuote(null); setAddressId(item.id); } setAddressChoicesOpen(false); }}><strong>{item.receiverName}</strong><span>{item.isDefault ? "Mặc định" : ""}</span><small>{formatAddress(item)}</small></button>)}<Link className="checkout-link-button" to="/profile">Quản lý địa chỉ trong hồ sơ</Link></div>}
          {!addresses.length && !loading && <Link className="checkout-link-button" to="/profile">Thêm địa chỉ trong hồ sơ</Link>}
        </section>
        <section className="checkout-card checkout-products"><h2><Package size={18} /> Sản phẩm trong đơn</h2>
          {lines.length ? <div className="checkout-product-list">{quote?.stores.flatMap(store => store.lines.map(line => <article key={line.id}><img src={line.imageUrl || "/visual-placeholder.svg"} alt="" /><div><strong>{line.productName || line.sku}</strong><span>{store.storeName}{line.attributes && Object.values(line.attributes).length ? ` · ${Object.values(line.attributes).join(" · ")}` : ""}</span><small>Đơn giá: {vnd(line.unitPriceMinor)}</small></div><p><span>SL: {line.quantity}</span><strong>{vnd(line.lineTotalMinor)}</strong></p></article>))}</div> : <p className="checkout-empty" role={checkoutError ? "alert" : undefined}>{busy ? "Đang tính sản phẩm..." : checkoutError || "Chưa có sản phẩm để thanh toán."}</p>}
          <Link className="checkout-back-cart" to="/cart"><ArrowLeft size={14} /> Quay lại giỏ hàng</Link>
        </section>
        <section className="checkout-card checkout-options"><h2>Phương thức vận chuyển</h2><div><label className="is-selected"><input type="radio" checked readOnly name="shipping-method" /><span><strong>Tiêu chuẩn</strong><small>Phí giao hàng được hệ thống ước tính theo từng cửa hàng.</small></span><b>{quote ? vnd(quote.shippingEstimateMinor) : "—"}</b></label></div></section>
        <section className="checkout-card checkout-options checkout-payment-methods"><h2>Phương thức thanh toán</h2><div>{methods.map(item => <label key={item.code} className={paymentMethod === item.code ? "is-selected" : ""}><input type="radio" name="payment-method" checked={paymentMethod === item.code} onChange={() => { setQuote(null); setPaymentMethod(item.code); }} /><span><strong>{item.name}</strong><small>{paymentHint[item.code]}</small></span></label>)}</div><p className="checkout-security"><LockKeyhole size={15} /> Xác nhận thanh toán trong từng bước; không lưu thông tin thẻ trên trang này.</p></section>
        <CheckoutVoucherPicker storeCode={storeVoucherCode} platformCode={voucherCode}
          storeIds={quote?.stores.map(store => store.storeId) || []}
          storeNames={Object.fromEntries(quote?.stores.map(store => [store.storeId, store.storeName]) || [])}
          appliedVouchers={quote?.vouchers || []} busy={busy} notice={voucherIssue}
          onApply={applyVoucher} onRemove={removeVoucher} />
        <section className="checkout-card checkout-note"><h2>Ghi chú giao hàng</h2><label>Ghi chú từ địa chỉ nhận hàng<textarea value={fullAddress?.note || ""} readOnly placeholder="Chưa có ghi chú cho địa chỉ này" /></label><Link className="checkout-link-button" to="/profile">Thêm hoặc sửa ghi chú trong sổ địa chỉ</Link></section>
        {quote?.errors.length ? <section className="checkout-card checkout-errors"><h2>Cần kiểm tra lại</h2>{quote.errors.map((error, index) => <p key={index}>{error.message}</p>)}<Link to="/cart">Quay lại giỏ hàng</Link></section> : null}
      </div>
      <aside className="checkout-aside"><div className="checkout-summary"><h2>Tóm tắt đơn hàng</h2><p className="checkout-summary-count">{itemCount} sản phẩm trong đơn hàng</p><div className="checkout-summary-products">{lines.map(line => <p key={line.id}><span>{line.productName || line.sku} × {line.quantity}</span><strong>{vnd(line.lineTotalMinor)}</strong></p>)}</div><div className="checkout-summary-lines"><p><span>Tạm tính</span><strong>{vnd(quote?.subtotalMinor || 0)}</strong></p><p><span>Phí vận chuyển dự kiến</span><strong>{vnd(quote?.shippingEstimateMinor || 0)}</strong></p><p><span>Giảm giá</span><strong>−{vnd(quote?.discountMinor || 0)}</strong></p></div><div className="checkout-summary-total"><span>Tổng cộng</span><strong>{vnd(quote?.payableTotalMinor || 0)}</strong><small>Giá do hệ thống xác nhận</small></div><div className="checkout-terms"><input id="checkout-agree" type="checkbox" checked={acceptedTerms} onChange={event => setAcceptedTerms(event.target.checked)} /><label htmlFor="checkout-agree">Tôi đồng ý với <Link to="/terms">Điều khoản sử dụng</Link> và <Link to="/privacy">Chính sách bảo mật</Link> của MDUC247.</label></div><button type="button" className="checkout-place-order" disabled={busy || !acceptedTerms || !quote || !!quote.errors.length || expired} onClick={() => void place()}>{busy ? "Đang xử lý..." : "Đặt hàng"}</button>{placeBlockReason && <p className="checkout-place-reason" role="status">{placeBlockReason}</p>}<p className="checkout-summary-safe"><ShieldCheck size={14} /> {paymentMethod === "COD" ? "Giá cuối cùng được kiểm tra lại trước khi tạo đơn." : "Sau khi tạo đơn, bạn sẽ thanh toán tại trang chi tiết đơn hàng."}</p><button type="button" className="checkout-refresh" disabled={busy || !addressId} onClick={() => void preview()}>Cập nhật bảng giá</button>{quote?.promotionUnavailable && <p className="checkout-promotion-warning">Khuyến mãi tạm không khả dụng; giá đang lấy từ Catalog.</p>}</div></aside>
    </div>
    <p className="checkout-footer"><Truck size={15} /> Phí giao hàng hiện là ước tính tại thời điểm đặt đơn.</p>
  </div>;
}
