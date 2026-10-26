import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { Check, Circle, CircleCheck, CircleX, Clock3, MapPin, MessageCircle, Package, Phone, Share2, Truck, UserRound } from "lucide-react";
import { catalogApi } from "../../api/catalogApi";
import { chatV2Api } from "../../api/chatV2Api";
import { orderV2Api, vnd } from "../../api/orderV2Api";
import { paymentV2Api } from "../../api/paymentV2Api";
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
const formatDate = (value) => new Date(value).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
const isCancelled = (status) => ["CANCELLED", "CANCEL_PENDING"].includes(status);
function ShopOrderDetail({ order, groupId, store, onReload }) {
    const navigate = useNavigate();
    const [busy, setBusy] = useState(false);
    const [cancelOpen, setCancelOpen] = useState(false);
    const [reason, setReason] = useState("");
    const keys = useRef(new Map());
    const lastStage = isCancelled(order.status)
        ? order.history?.map(event => steps.findIndex(step => step.statuses.includes(event.toStatus))).filter(index => index >= 0).at(-1) ?? 0
        : Math.max(0, steps.findIndex(step => step.statuses.includes(order.status)));
    const progress = Math.round(((lastStage + 1) / steps.length) * 100);
    const itemCount = order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
    const canCancel = order.status === "PLACED";
    const canComplete = order.status === "DELIVERED";
    async function command(action) {
        if (action === "cancel" && reason.trim().length < 3) {
            toast.error("Vui lòng nhập lý do hủy ít nhất 3 ký tự.", { containerId: "general-toast" });
            return;
        }
        const token = `${order.id}:${order.version}:${action}`;
        if (!keys.current.has(token))
            keys.current.set(token, crypto.randomUUID());
        setBusy(true);
        try {
            if (action === "cancel")
                await orderV2Api.cancel(groupId, order.id, order.version, reason.trim(), keys.current.get(token));
            else
                await orderV2Api.complete(groupId, order.id, order.version, keys.current.get(token));
            keys.current.delete(token);
            await onReload();
            setCancelOpen(false);
            setReason("");
            toast.success(action === "cancel" ? "Đã gửi yêu cầu hủy đơn." : "Đã xác nhận nhận hàng.", { containerId: "general-toast" });
        }
        catch (error) {
            toast.error(error instanceof Error ? error.message : "Không thể cập nhật đơn hàng.", { containerId: "general-toast" });
            void onReload().catch(() => { });
        }
        finally {
            setBusy(false);
        }
    }
    async function messageStore() {
        setBusy(true);
        try {
            const { conversation } = await chatV2Api.create(order.storeId);
            navigate(`/messages/${conversation.id}`);
        }
        catch (error) {
            toast.error(error instanceof Error ? error.message : "Không thể mở tin nhắn với cửa hàng.", { containerId: "general-toast" });
        }
        finally {
            setBusy(false);
        }
    }
    async function shareOrder() {
        try {
            await navigator.clipboard.writeText(window.location.href);
            toast.success("Đã sao chép liên kết đơn hàng.", { containerId: "general-toast" });
        }
        catch {
            toast.error("Không thể sao chép liên kết trên trình duyệt này.", { containerId: "general-toast" });
        }
    }
    return _jsxs("section", { className: "buyer-order-shop", "aria-label": `Đơn hàng từ ${order.store.name || "cửa hàng"}`, children: [_jsxs("div", { className: "buyer-order-main", children: [_jsxs("article", { className: "buyer-order-card buyer-order-status", children: [_jsxs("header", { className: "buyer-order-card__heading", children: [_jsxs("div", { children: [_jsx("h2", { children: "Tr\u1EA1ng th\u00E1i \u0111\u01A1n h\u00E0ng" }), _jsxs("p", { children: ["M\u00E3 \u0111\u01A1n #", order.id.slice(0, 8).toUpperCase(), " \u00B7 Ng\u00E0y \u0111\u1EB7t: ", formatDate(order.createdAt)] })] }), _jsx("span", { className: `buyer-order-status__badge${isCancelled(order.status) ? " is-cancelled" : ""}`, children: orderStatusName(order.status) })] }), _jsxs("div", { className: "buyer-order-status__body", children: [_jsx("div", { className: "buyer-order-progress", role: "progressbar", "aria-valuenow": progress, "aria-valuemin": 0, "aria-valuemax": 100, "aria-label": "Ti\u1EBFn tr\u00ECnh \u0111\u01A1n h\u00E0ng", children: _jsx("span", { style: { width: `${progress}%` } }) }), _jsxs("div", { className: "buyer-order-progress-label", children: [_jsx("span", { children: "Ti\u1EBFn tr\u00ECnh \u0111\u01A1n h\u00E0ng" }), _jsxs("strong", { children: [progress, "%"] })] }), isCancelled(order.status) && _jsxs("div", { className: "buyer-order-cancelled-note", children: [_jsx(CircleX, { size: 18 }), " ", orderStatusName(order.status), ". C\u00E1c b\u01B0\u1EDBc ti\u1EBFp theo s\u1EBD kh\u00F4ng di\u1EC5n ra."] }), _jsx("ol", { className: "buyer-order-steps", children: steps.map((step, index) => {
                                            const done = index <= lastStage && !isCancelled(order.status);
                                            const event = order.history?.slice().reverse().find(history => step.statuses.includes(history.toStatus));
                                            return _jsxs("li", { className: done ? "is-done" : "", children: [_jsx("span", { className: "buyer-order-step-icon", children: done ? _jsx(Check, { size: 16, strokeWidth: 3 }) : _jsx(Circle, { size: 15 }) }), _jsxs("div", { children: [_jsx("strong", { children: step.label }), _jsx("small", { children: step.detail })] }), event && _jsx("time", { dateTime: event.occurredAt, children: formatDate(event.occurredAt) })] }, step.label);
                                        }) }), !!order.history?.length && _jsxs("details", { className: "buyer-order-history", children: [_jsx("summary", { children: "Xem l\u1ECBch s\u1EED tr\u1EA1ng th\u00E1i" }), order.history.map((event, index) => _jsxs("p", { children: [formatDate(event.occurredAt), " \u00B7 ", orderStatusName(event.toStatus), event.reason && !["checkout", "inventory_committed"].includes(event.reason) ? ` · ${event.reason}` : ""] }, `${event.toStatus}-${index}`))] })] })] }), _jsxs("article", { className: "buyer-order-card buyer-order-products", children: [_jsx("header", { className: "buyer-order-card__heading", children: _jsxs("div", { children: [_jsxs("h2", { children: [_jsx(Package, { size: 20 }), " S\u1EA3n ph\u1EA9m \u0111\u1EB7t h\u00E0ng (", itemCount, ")"] }), _jsx("p", { children: "Danh s\u00E1ch s\u1EA3n ph\u1EA9m trong \u0111\u01A1n h\u00E0ng" })] }) }), _jsx("div", { className: "buyer-order-products__list", children: order.items?.map(item => {
                                    const original = (item.snapshot.originalPriceMinor ?? item.unitPriceMinor) * item.quantity;
                                    return _jsxs("div", { className: "buyer-order-product", children: [_jsx(Link, { to: `/products/${item.productId}`, className: "buyer-order-product__image", "aria-label": `Xem ${item.name}`, children: _jsx("img", { src: item.snapshot.imageUrl || "/visual-placeholder.svg", alt: item.name, loading: "lazy", onError: showImageFallback }) }), _jsxs("div", { className: "buyer-order-product__info", children: [_jsx(Link, { to: `/products/${item.productId}`, children: item.name }), _jsxs("span", { children: ["S\u1ED1 l\u01B0\u1EE3ng: ", item.quantity, item.snapshot.attributes && Object.keys(item.snapshot.attributes).length ? ` · ${Object.values(item.snapshot.attributes).join(" · ")}` : ""] }), ["DELIVERED", "COMPLETED"].includes(order.status) && _jsx(Link, { className: "buyer-order-product__review", to: `/products/${item.productId}?reviewItem=${item.id}`, children: "\u0110\u00E1nh gi\u00E1 s\u1EA3n ph\u1EA9m" })] }), _jsxs("div", { className: "buyer-order-product__price", children: [_jsx("strong", { children: vnd(item.lineTotalMinor) }), original > item.lineTotalMinor && _jsx("del", { children: vnd(original) }), _jsxs("span", { children: ["T\u1ED5ng: ", vnd(item.lineTotalMinor)] })] })] }, item.id);
                                }) })] }), _jsxs("article", { className: "buyer-order-card buyer-order-payment", children: [_jsx("header", { className: "buyer-order-card__heading", children: _jsxs("div", { children: [_jsx("h2", { children: "Th\u00F4ng tin thanh to\u00E1n" }), _jsx("p", { children: "Chi ti\u1EBFt thanh to\u00E1n \u0111\u01A1n h\u00E0ng" })] }) }), _jsxs("div", { className: "buyer-order-payment__body", children: [_jsxs("div", { className: "buyer-order-payment__row", children: [_jsx("span", { children: "T\u1EA1m t\u00EDnh" }), _jsx("strong", { children: vnd(order.subtotalMinor) })] }), _jsxs("div", { className: "buyer-order-payment__row", children: [_jsx("span", { children: "Ph\u00ED v\u1EADn chuy\u1EC3n" }), _jsx("strong", { children: vnd(order.shippingMinor) })] }), order.discountMinor > 0 && _jsxs("div", { className: "buyer-order-payment__row is-discount", children: [_jsx("span", { children: "Gi\u1EA3m gi\u00E1" }), _jsxs("strong", { children: ["\u2212", vnd(order.discountMinor)] })] }), _jsxs("div", { className: "buyer-order-payment__total", children: [_jsx("span", { children: "T\u1ED5ng c\u1ED9ng" }), _jsx("strong", { children: vnd(order.totalMinor) })] }), _jsxs("div", { className: "buyer-order-payment__row", children: [_jsx("span", { children: "Ph\u01B0\u01A1ng th\u1EE9c" }), _jsx("strong", { children: order.paymentMethod === "COD" ? "Thanh toán khi nhận hàng" : order.paymentMethod === "MOMO" ? "MoMo" : "VietQR" })] }), _jsx("div", { className: `buyer-order-payment__state${order.paymentStatus === "PAID" ? " is-paid" : ""}`, children: order.paymentStatus === "PAID" ? "Đã thanh toán" : order.paymentMethod === "COD" ? "Chưa thanh toán · Thu tiền khi giao hàng" : "Chờ xác nhận thanh toán" })] })] }), ["DELIVERED", "COMPLETED"].includes(order.status) && _jsx(ReturnPanel, { order: order })] }), _jsxs("aside", { className: "buyer-order-side", children: [_jsxs("article", { className: "buyer-order-card buyer-order-store", children: [_jsx("header", { className: "buyer-order-card__heading", children: _jsxs("div", { children: [_jsxs("h2", { children: [_jsx(UserRound, { size: 21 }), " Th\u00F4ng tin c\u1EEDa h\u00E0ng"] }), _jsx("p", { children: "Li\u00EAn h\u1EC7 v\u00E0 th\u00F4ng tin li\u00EAn l\u1EA1c" })] }) }), _jsxs("div", { className: "buyer-order-store__body", children: [_jsxs("div", { className: "buyer-order-store__identity", children: [_jsx("span", { className: "buyer-order-store__logo", children: store?.logoUrl ? _jsx("img", { src: store.logoUrl, alt: "", onError: showImageFallback }) : (order.store.name || "CH").slice(0, 2).toUpperCase() }), _jsxs("div", { children: [_jsx("strong", { children: order.store.name || "Cửa hàng" }), _jsx("small", { children: "Gian h\u00E0ng tr\u00EAn MDUC247" })] })] }), _jsxs("button", { type: "button", disabled: busy, onClick: () => void messageStore(), children: [_jsx(MessageCircle, { size: 17 }), " Nh\u1EAFn tin"] })] })] }), _jsxs("article", { className: "buyer-order-card buyer-order-shipping", children: [_jsx("header", { className: "buyer-order-card__heading", children: _jsxs("div", { children: [_jsxs("h2", { children: [_jsx(Truck, { size: 21 }), " Th\u00F4ng tin v\u1EADn chuy\u1EC3n"] }), _jsx("p", { children: "Chi ti\u1EBFt \u0111\u1ECBa ch\u1EC9 v\u00E0 v\u1EADn \u0111\u01A1n" })] }) }), _jsxs("div", { className: "buyer-order-shipping__body", children: [_jsxs("div", { className: "buyer-order-address", children: [_jsxs("strong", { children: [_jsx(MapPin, { size: 16 }), " \u0110\u1ECBa ch\u1EC9 giao h\u00E0ng"] }), _jsx("p", { children: formatAddress(order.address) }), _jsxs("span", { children: [_jsx(Phone, { size: 13 }), " ", order.address.receiverPhone] }), _jsxs("span", { children: [_jsx(UserRound, { size: 13 }), " ", order.address.receiverName] })] }), _jsxs("div", { className: "buyer-order-shipping__row", children: [_jsx("span", { children: "\u0110\u01A1n v\u1ECB v\u1EADn chuy\u1EC3n" }), _jsx("strong", { children: "Ch\u01B0a c\u1EADp nh\u1EADt" })] }), _jsxs("div", { className: "buyer-order-shipping__row", children: [_jsx("span", { children: "M\u00E3 v\u1EADn \u0111\u01A1n" }), _jsx("strong", { children: order.shipmentRef || "Chưa cập nhật" })] }), _jsxs("button", { type: "button", onClick: () => void shareOrder(), children: [_jsx(Share2, { size: 16 }), " Chia s\u1EBB \u0111\u01A1n h\u00E0ng"] })] })] }), (canCancel || canComplete) && _jsxs("article", { className: `buyer-order-card buyer-order-action${canCancel ? " is-cancel" : ""}`, children: [_jsx("header", { className: "buyer-order-card__heading", children: _jsxs("div", { children: [_jsxs("h2", { children: [canCancel ? _jsx(CircleX, { size: 21 }) : _jsx(CircleCheck, { size: 21 }), " ", canCancel ? "Hủy đơn hàng" : "Xác nhận nhận hàng"] }), _jsx("p", { children: canCancel ? "Có thể hủy khi cửa hàng chưa xác nhận đơn." : "Xác nhận khi bạn đã nhận và kiểm tra hàng." })] }) }), _jsx("div", { className: "buyer-order-action__body", children: canCancel ? _jsxs(_Fragment, { children: [cancelOpen && _jsxs("label", { children: ["L\u00FD do h\u1EE7y", _jsx("input", { value: reason, onChange: event => setReason(event.target.value), maxLength: 200, placeholder: "Nh\u1EADp l\u00FD do h\u1EE7y \u0111\u01A1n" })] }), _jsx("button", { type: "button", disabled: busy, onClick: () => cancelOpen ? void command("cancel") : setCancelOpen(true), children: busy ? "Đang xử lý..." : cancelOpen ? "Xác nhận hủy đơn" : "Hủy đơn hàng" }), cancelOpen && _jsx("button", { type: "button", className: "buyer-order-action__back", onClick: () => setCancelOpen(false), children: "Gi\u1EEF \u0111\u01A1n h\u00E0ng" })] }) : _jsx("button", { type: "button", disabled: busy, onClick: () => void command("complete"), children: "\u0110\u00E3 nh\u1EADn h\u00E0ng" }) })] })] })] });
}
export function BuyerOrderDetailV2() {
    const { groupId = "" } = useParams();
    const [group, setGroup] = useState(null);
    const [stores, setStores] = useState([]);
    const [refunds, setRefunds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    async function reload() {
        setGroup((await orderV2Api.buyerOrder(groupId)).group);
        void paymentV2Api.order(groupId).then(result => setRefunds(result.refunds)).catch(() => { });
    }
    useEffect(() => {
        let active = true;
        setLoading(true);
        setError("");
        orderV2Api.buyerOrder(groupId)
            .then(result => { if (active)
            setGroup(result.group); })
            .catch(cause => { if (active)
            setError(cause instanceof Error ? cause.message : "Không thể tải chi tiết đơn hàng."); })
            .finally(() => { if (active)
            setLoading(false); });
        catalogApi.list("?limit=50").then(result => { if (active)
            setStores(result.stores); }).catch(() => { });
        paymentV2Api.order(groupId).then(result => { if (active)
            setRefunds(result.refunds); }).catch(() => { });
        return () => { active = false; };
    }, [groupId]);
    async function payNow() {
        if (!group || group.paymentMethod === "COD")
            return;
        setBusy(true);
        try {
            const { intent } = await paymentV2Api.create(group.id, group.paymentMethod, `pay:${group.id}`);
            sessionStorage.setItem("pendingPaymentIntentId", intent.id);
            if (!intent.checkoutUrl)
                throw new Error("Chưa có liên kết thanh toán. Vui lòng thử lại sau.");
            window.location.assign(intent.checkoutUrl);
        }
        catch (cause) {
            toast.error(cause instanceof Error ? cause.message : "Không thể mở cổng thanh toán.", { containerId: "general-toast" });
        }
        finally {
            setBusy(false);
        }
    }
    if (loading)
        return _jsxs("div", { className: "buyer-order-page buyer-order-state", role: "status", children: [_jsx(Clock3, {}), " \u0110ang t\u1EA3i \u0111\u01A1n h\u00E0ng..."] });
    if (error || !group)
        return _jsxs("div", { className: "buyer-order-page buyer-order-state", children: [_jsx("p", { children: error || "Không tìm thấy đơn hàng." }), _jsx(Link, { to: "/orders", children: "Xem \u0111\u01A1n h\u00E0ng c\u1EE7a t\u00F4i" })] });
    return _jsxs("div", { className: "buyer-order-page", children: [_jsx(ContentBreadcrumb, { items: [{ label: "Đơn hàng của tôi", to: "/orders" }, { label: "Chi tiết đơn hàng" }] }), group.orders.length > 1 && _jsxs("div", { className: "buyer-order-group-heading", children: [_jsxs("div", { children: [_jsx("h1", { children: "Chi ti\u1EBFt \u0111\u01A1n h\u00E0ng" }), _jsxs("p", { children: ["M\u00E3 nh\u00F3m #", group.id.slice(0, 8).toUpperCase(), " \u00B7 ", group.orders.length, " c\u1EEDa h\u00E0ng \u00B7 ", formatDate(group.createdAt)] })] }), _jsx("strong", { children: vnd(group.currentTotalMinor) })] }), group.paymentMethod !== "COD" && group.paymentStatus !== "PAID" && group.status === "PENDING_PAYMENT" && _jsxs("div", { className: "buyer-order-pay-banner", children: [_jsxs("div", { children: [_jsx("strong", { children: "\u0110\u01A1n h\u00E0ng \u0111ang ch\u1EDD thanh to\u00E1n" }), _jsx("span", { children: "Ho\u00E0n t\u1EA5t thanh to\u00E1n \u0111\u1EC3 c\u1EEDa h\u00E0ng x\u1EED l\u00FD \u0111\u01A1n." })] }), _jsx("button", { type: "button", disabled: busy, onClick: () => void payNow(), children: busy ? "Đang mở..." : "Tiếp tục thanh toán" })] }), group.orders.map(order => _jsx(ShopOrderDetail, { order: order, groupId: group.id, store: stores.find(store => store.id === order.storeId), onReload: reload }, order.id)), refunds.length > 0 && _jsxs("section", { className: "buyer-order-card buyer-order-refunds", children: [_jsx("h2", { children: "Ti\u1EBFn \u0111\u1ED9 ho\u00E0n ti\u1EC1n" }), refunds.map(refund => _jsxs("p", { children: [_jsxs("span", { children: ["\u0110\u01A1n #", refund.shopOrderId.slice(0, 8), " \u00B7 ", refund.reason] }), _jsxs("strong", { children: [vnd(refund.amountMinor), " \u00B7 ", refund.status === "SUCCEEDED" ? "Đã hoàn" : refund.status === "FAILED" ? "Thất bại" : "Đang đối soát"] })] }, refund.id))] })] });
}
