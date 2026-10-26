import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { ArrowLeft, LockKeyhole, MapPin, Package, ShieldCheck, Truck } from "lucide-react";
import { identityAuthorizedRequest, IdentityApiError } from "../../api/identityApi";
import { orderV2Api, notifyCartChanged, vnd } from "../../api/orderV2Api";
import { paymentV2Api } from "../../api/paymentV2Api";
import { profileApi } from "../../api/profileApi";
import ContentBreadcrumb from "../../components/ui/ContentBreadcrumb";
import CheckoutVoucherPicker from "./CheckoutVoucherPicker";
import { formatAddress } from "../../utils/formatAddress";
import "./Payment.css";
import "./PaymentVouchers.css";
const paymentHint = {
    COD: "Trả tiền khi nhận hàng",
    MOMO: "Thanh toán qua cổng MoMo",
    VIETQR: "Chuyển khoản bằng mã QR",
};
export default function Checkout() {
    const navigate = useNavigate();
    const [addresses, setAddresses] = useState([]);
    const [addressId, setAddressId] = useState("");
    const [addressDetail, setAddressDetail] = useState(null);
    const [addressChoicesOpen, setAddressChoicesOpen] = useState(false);
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [quote, setQuote] = useState(null);
    const [checkoutError, setCheckoutError] = useState("");
    const [voucherIssue, setVoucherIssue] = useState("");
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const previewRequest = useRef(0);
    const [placeKey, setPlaceKey] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("COD");
    const [methods, setMethods] = useState([{ code: "COD", name: "Thanh toán khi nhận hàng" }]);
    const [voucherCode, setVoucherCode] = useState(() => sessionStorage.getItem("cartVoucherCode") || "");
    const [storeVoucherCode, setStoreVoucherCode] = useState(() => sessionStorage.getItem("cartStoreVoucherCode") || "");
    useEffect(() => {
        identityAuthorizedRequest("/users/me/addresses")
            .then(data => { setAddresses(data.addresses); setAddressId(data.addresses.find(item => item.isDefault)?.id || data.addresses[0]?.id || ""); })
            .catch(error => toast.error(error instanceof Error ? error.message : "Không thể tải địa chỉ.", { containerId: "general-toast" }))
            .finally(() => setLoading(false));
    }, []);
    useEffect(() => {
        if (!addressId) {
            setAddressDetail(null);
            return;
        }
        let active = true;
        profileApi.address(addressId).then(result => { if (active)
            setAddressDetail(result.address); })
            .catch(() => { if (active)
            setAddressDetail(null); });
        return () => { active = false; };
    }, [addressId]);
    useEffect(() => {
        paymentV2Api.methods().then(result => setMethods(result.methods.filter(item => item.available)))
            .catch(error => toast.warning(error instanceof Error ? error.message : "Chưa thể tải phương thức online; COD vẫn khả dụng.", { containerId: "general-toast" }));
    }, []);
    const preview = useCallback(async () => {
        const request = ++previewRequest.current;
        if (!addressId) {
            setQuote(null);
            setBusy(false);
            return;
        }
        setBusy(true);
        setCheckoutError("");
        try {
            const result = await orderV2Api.preview({ addressId, paymentMethod,
                ...(voucherCode ? { platformVoucherCode: voucherCode } : {}),
                ...(storeVoucherCode ? { storeVoucherCode } : {}) });
            if (request !== previewRequest.current)
                return;
            setQuote(result);
            setPlaceKey(crypto.randomUUID());
            if (result.vouchers.length)
                toast.success(`Đã tính ${result.vouchers.map(item => item.code).join(" + ")}.`, { containerId: "general-toast", toastId: "voucher-applied" });
        }
        catch (error) {
            if (request !== previewRequest.current)
                return;
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
            }
            else {
                setCheckoutError(message);
                toast.error(message, { containerId: "general-toast" });
            }
        }
        finally {
            if (request === previewRequest.current)
                setBusy(false);
        }
    }, [addressId, paymentMethod, voucherCode, storeVoucherCode]);
    useEffect(() => { void preview(); }, [preview]);
    async function place() {
        if (!acceptedTerms || !quote || !addressId || !placeKey || quote.errors.length)
            return;
        setBusy(true);
        try {
            const result = await orderV2Api.place({ quoteId: quote.quoteId, addressId, paymentMethod,
                idempotencyKey: placeKey, expectedTotalMinor: quote.payableTotalMinor,
                ...(voucherCode ? { platformVoucherCode: voucherCode } : {}),
                ...(storeVoucherCode ? { storeVoucherCode } : {}) });
            notifyCartChanged();
            sessionStorage.removeItem("cartVoucherCode");
            sessionStorage.removeItem("cartStoreVoucherCode");
            toast.success("Đặt hàng thành công.", { containerId: "general-toast" });
            navigate(`/orders/${result.groupId}`, { replace: true });
        }
        catch (error) {
            toast.error(error instanceof Error ? error.message : "Không thể đặt hàng.", { containerId: "general-toast" });
            if (error instanceof Error && /thay đổi|hết hạn|không hợp lệ/i.test(error.message))
                void preview();
        }
        finally {
            setBusy(false);
        }
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
    function applyVoucher(kind, code) {
        setVoucherIssue("");
        const current = kind === "store" ? storeVoucherCode : voucherCode;
        if (code === current) {
            void preview();
            return;
        }
        previewRequest.current += 1;
        setQuote(null);
        if (kind === "store") {
            setStoreVoucherCode(code);
            sessionStorage.setItem("cartStoreVoucherCode", code);
        }
        else {
            setVoucherCode(code);
            sessionStorage.setItem("cartVoucherCode", code);
        }
    }
    function removeVoucher(kind) {
        setVoucherIssue("");
        previewRequest.current += 1;
        setQuote(null);
        if (kind === "store") {
            setStoreVoucherCode("");
            sessionStorage.removeItem("cartStoreVoucherCode");
        }
        else {
            setVoucherCode("");
            sessionStorage.removeItem("cartVoucherCode");
        }
    }
    return _jsxs("div", { className: "checkout-page", children: [_jsx(ContentBreadcrumb, { items: [{ label: "Giỏ hàng", to: "/cart" }, { label: "Thanh toán" }] }), _jsx("h1", { className: "sr-only", children: "Thanh to\u00E1n" }), _jsxs("div", { className: "checkout-layout", children: [_jsxs("div", { className: "checkout-main", children: [_jsxs("section", { className: "checkout-card", children: [_jsxs("div", { className: "checkout-card-heading", children: [_jsxs("h2", { children: [_jsx(MapPin, { size: 18 }), " \u0110\u1ECBa ch\u1EC9 nh\u1EADn h\u00E0ng"] }), !!addresses.length && _jsx("button", { type: "button", onClick: () => setAddressChoicesOpen(value => !value), children: addressChoicesOpen ? "Đóng" : "Thay đổi" })] }), loading ? _jsx("p", { className: "checkout-empty", children: "\u0110ang t\u1EA3i \u0111\u1ECBa ch\u1EC9..." }) : selectedAddress ? _jsxs("div", { className: "checkout-address-current", children: [_jsxs("p", { children: [_jsx("strong", { children: selectedAddress.receiverName }), _jsx("span", { children: fullAddress?.receiverPhone || selectedAddress.receiverPhoneMasked }), selectedAddress.isDefault && _jsx("em", { children: "M\u1EB7c \u0111\u1ECBnh" })] }), _jsx("address", { children: formatAddress(selectedAddress) }), fullAddress?.note && _jsxs("small", { children: ["Ghi ch\u00FA: ", fullAddress.note] })] }) : _jsx("p", { className: "checkout-empty", children: "B\u1EA1n ch\u01B0a c\u00F3 \u0111\u1ECBa ch\u1EC9 giao h\u00E0ng." }), addressChoicesOpen && _jsxs("div", { className: "checkout-address-list", children: [addresses.map(item => _jsxs("button", { type: "button", className: item.id === addressId ? "is-selected" : "", onClick: () => { if (item.id !== addressId) {
                                                    setQuote(null);
                                                    setAddressId(item.id);
                                                } setAddressChoicesOpen(false); }, children: [_jsx("strong", { children: item.receiverName }), _jsx("span", { children: item.isDefault ? "Mặc định" : "" }), _jsx("small", { children: formatAddress(item) })] }, item.id)), _jsx(Link, { className: "checkout-link-button", to: "/profile", children: "Qu\u1EA3n l\u00FD \u0111\u1ECBa ch\u1EC9 trong h\u1ED3 s\u01A1" })] }), !addresses.length && !loading && _jsx(Link, { className: "checkout-link-button", to: "/profile", children: "Th\u00EAm \u0111\u1ECBa ch\u1EC9 trong h\u1ED3 s\u01A1" })] }), _jsxs("section", { className: "checkout-card checkout-products", children: [_jsxs("h2", { children: [_jsx(Package, { size: 18 }), " S\u1EA3n ph\u1EA9m trong \u0111\u01A1n"] }), lines.length ? _jsx("div", { className: "checkout-product-list", children: quote?.stores.flatMap(store => store.lines.map(line => _jsxs("article", { children: [_jsx("img", { src: line.imageUrl || "/visual-placeholder.svg", alt: "" }), _jsxs("div", { children: [_jsx("strong", { children: line.productName || line.sku }), _jsxs("span", { children: [store.storeName, line.attributes && Object.values(line.attributes).length ? ` · ${Object.values(line.attributes).join(" · ")}` : ""] }), _jsxs("small", { children: ["\u0110\u01A1n gi\u00E1: ", vnd(line.unitPriceMinor)] })] }), _jsxs("p", { children: [_jsxs("span", { children: ["SL: ", line.quantity] }), _jsx("strong", { children: vnd(line.lineTotalMinor) })] })] }, line.id))) }) : _jsx("p", { className: "checkout-empty", role: checkoutError ? "alert" : undefined, children: busy ? "Đang tính sản phẩm..." : checkoutError || "Chưa có sản phẩm để thanh toán." }), _jsxs(Link, { className: "checkout-back-cart", to: "/cart", children: [_jsx(ArrowLeft, { size: 14 }), " Quay l\u1EA1i gi\u1ECF h\u00E0ng"] })] }), _jsxs("section", { className: "checkout-card checkout-options", children: [_jsx("h2", { children: "Ph\u01B0\u01A1ng th\u1EE9c v\u1EADn chuy\u1EC3n" }), _jsx("div", { children: _jsxs("label", { className: "is-selected", children: [_jsx("input", { type: "radio", checked: true, readOnly: true, name: "shipping-method" }), _jsxs("span", { children: [_jsx("strong", { children: "Ti\u00EAu chu\u1EA9n" }), _jsx("small", { children: "Ph\u00ED giao h\u00E0ng \u0111\u01B0\u1EE3c h\u1EC7 th\u1ED1ng \u01B0\u1EDBc t\u00EDnh theo t\u1EEBng c\u1EEDa h\u00E0ng." })] }), _jsx("b", { children: quote ? vnd(quote.shippingEstimateMinor) : "—" })] }) })] }), _jsxs("section", { className: "checkout-card checkout-options checkout-payment-methods", children: [_jsx("h2", { children: "Ph\u01B0\u01A1ng th\u1EE9c thanh to\u00E1n" }), _jsx("div", { children: methods.map(item => _jsxs("label", { className: paymentMethod === item.code ? "is-selected" : "", children: [_jsx("input", { type: "radio", name: "payment-method", checked: paymentMethod === item.code, onChange: () => { setQuote(null); setPaymentMethod(item.code); } }), _jsxs("span", { children: [_jsx("strong", { children: item.name }), _jsx("small", { children: paymentHint[item.code] })] })] }, item.code)) }), _jsxs("p", { className: "checkout-security", children: [_jsx(LockKeyhole, { size: 15 }), " X\u00E1c nh\u1EADn thanh to\u00E1n trong t\u1EEBng b\u01B0\u1EDBc; kh\u00F4ng l\u01B0u th\u00F4ng tin th\u1EBB tr\u00EAn trang n\u00E0y."] })] }), _jsx(CheckoutVoucherPicker, { storeCode: storeVoucherCode, platformCode: voucherCode, storeIds: quote?.stores.map(store => store.storeId) || [], storeNames: Object.fromEntries(quote?.stores.map(store => [store.storeId, store.storeName]) || []), appliedVouchers: quote?.vouchers || [], busy: busy, notice: voucherIssue, onApply: applyVoucher, onRemove: removeVoucher }), _jsxs("section", { className: "checkout-card checkout-note", children: [_jsx("h2", { children: "Ghi ch\u00FA giao h\u00E0ng" }), _jsxs("label", { children: ["Ghi ch\u00FA t\u1EEB \u0111\u1ECBa ch\u1EC9 nh\u1EADn h\u00E0ng", _jsx("textarea", { value: fullAddress?.note || "", readOnly: true, placeholder: "Ch\u01B0a c\u00F3 ghi ch\u00FA cho \u0111\u1ECBa ch\u1EC9 n\u00E0y" })] }), _jsx(Link, { className: "checkout-link-button", to: "/profile", children: "Th\u00EAm ho\u1EB7c s\u1EEDa ghi ch\u00FA trong s\u1ED5 \u0111\u1ECBa ch\u1EC9" })] }), quote?.errors.length ? _jsxs("section", { className: "checkout-card checkout-errors", children: [_jsx("h2", { children: "C\u1EA7n ki\u1EC3m tra l\u1EA1i" }), quote.errors.map((error, index) => _jsx("p", { children: error.message }, index)), _jsx(Link, { to: "/cart", children: "Quay l\u1EA1i gi\u1ECF h\u00E0ng" })] }) : null] }), _jsx("aside", { className: "checkout-aside", children: _jsxs("div", { className: "checkout-summary", children: [_jsx("h2", { children: "T\u00F3m t\u1EAFt \u0111\u01A1n h\u00E0ng" }), _jsxs("p", { className: "checkout-summary-count", children: [itemCount, " s\u1EA3n ph\u1EA9m trong \u0111\u01A1n h\u00E0ng"] }), _jsx("div", { className: "checkout-summary-products", children: lines.map(line => _jsxs("p", { children: [_jsxs("span", { children: [line.productName || line.sku, " \u00D7 ", line.quantity] }), _jsx("strong", { children: vnd(line.lineTotalMinor) })] }, line.id)) }), _jsxs("div", { className: "checkout-summary-lines", children: [_jsxs("p", { children: [_jsx("span", { children: "T\u1EA1m t\u00EDnh" }), _jsx("strong", { children: vnd(quote?.subtotalMinor || 0) })] }), _jsxs("p", { children: [_jsx("span", { children: "Ph\u00ED v\u1EADn chuy\u1EC3n d\u1EF1 ki\u1EBFn" }), _jsx("strong", { children: vnd(quote?.shippingEstimateMinor || 0) })] }), _jsxs("p", { children: [_jsx("span", { children: "Gi\u1EA3m gi\u00E1" }), _jsxs("strong", { children: ["\u2212", vnd(quote?.discountMinor || 0)] })] })] }), _jsxs("div", { className: "checkout-summary-total", children: [_jsx("span", { children: "T\u1ED5ng c\u1ED9ng" }), _jsx("strong", { children: vnd(quote?.payableTotalMinor || 0) }), _jsx("small", { children: "Gi\u00E1 do h\u1EC7 th\u1ED1ng x\u00E1c nh\u1EADn" })] }), _jsxs("div", { className: "checkout-terms", children: [_jsx("input", { id: "checkout-agree", type: "checkbox", checked: acceptedTerms, onChange: event => setAcceptedTerms(event.target.checked) }), _jsxs("label", { htmlFor: "checkout-agree", children: ["T\u00F4i \u0111\u1ED3ng \u00FD v\u1EDBi ", _jsx(Link, { to: "/terms", children: "\u0110i\u1EC1u kho\u1EA3n s\u1EED d\u1EE5ng" }), " v\u00E0 ", _jsx(Link, { to: "/privacy", children: "Ch\u00EDnh s\u00E1ch b\u1EA3o m\u1EADt" }), " c\u1EE7a MDUC247."] })] }), _jsx("button", { type: "button", className: "checkout-place-order", disabled: busy || !acceptedTerms || !quote || !!quote.errors.length || expired, onClick: () => void place(), children: busy ? "Đang xử lý..." : "Đặt hàng" }), placeBlockReason && _jsx("p", { className: "checkout-place-reason", role: "status", children: placeBlockReason }), _jsxs("p", { className: "checkout-summary-safe", children: [_jsx(ShieldCheck, { size: 14 }), " ", paymentMethod === "COD" ? "Giá cuối cùng được kiểm tra lại trước khi tạo đơn." : "Sau khi tạo đơn, bạn sẽ thanh toán tại trang chi tiết đơn hàng."] }), _jsx("button", { type: "button", className: "checkout-refresh", disabled: busy || !addressId, onClick: () => void preview(), children: "C\u1EADp nh\u1EADt b\u1EA3ng gi\u00E1" }), quote?.promotionUnavailable && _jsx("p", { className: "checkout-promotion-warning", children: "Khuy\u1EBFn m\u00E3i t\u1EA1m kh\u00F4ng kh\u1EA3 d\u1EE5ng; gi\u00E1 \u0111ang l\u1EA5y t\u1EEB Catalog." })] }) })] }), _jsxs("p", { className: "checkout-footer", children: [_jsx(Truck, { size: 15 }), " Ph\u00ED giao h\u00E0ng hi\u1EC7n l\u00E0 \u01B0\u1EDBc t\u00EDnh t\u1EA1i th\u1EDDi \u0111i\u1EC3m \u0111\u1EB7t \u0111\u01A1n."] })] });
}
