import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight, Package, ShoppingBag } from "lucide-react";
import { orderV2Api, vnd } from "../../api/orderV2Api";
import ContentBreadcrumb from "../../components/ui/ContentBreadcrumb";
import { showImageFallback } from "../../utils/imageFallback";
import { orderStatusName, orderStatusOptions } from "./orderStatus";
import "./BuyerOrdersV2.css";
const PAGE_SIZE = 10;
const tabs = [
    { value: "", label: "Tất cả" },
    { value: "PENDING_PAYMENT", label: "Chờ thanh toán" },
    { value: "PLACED", label: "Đã đặt" },
    { value: "CONFIRMED", label: "Đã xác nhận" },
    { value: "SHIPPING", label: "Đang giao" },
    { value: "COMPLETED", label: "Hoàn thành" },
    { value: "CANCELLED", label: "Đã hủy" },
];
function statusTone(status) {
    if (["CANCELLED", "CANCEL_PENDING", "PARTIAL_CANCELLED"].includes(status))
        return "is-cancelled";
    if (["DELIVERED", "COMPLETED"].includes(status))
        return "is-complete";
    if (["SHIPPING", "READY_TO_SHIP"].includes(status))
        return "is-shipping";
    return "is-pending";
}
function progressFor(status) {
    if (["COMPLETED", "DELIVERED"].includes(status))
        return 100;
    if (status === "SHIPPING")
        return 75;
    if (["READY_TO_SHIP", "PREPARING"].includes(status))
        return 55;
    if (status === "CONFIRMED")
        return 35;
    if (["PLACED", "PENDING_PAYMENT", "PENDING_INVENTORY"].includes(status))
        return 15;
    return 0;
}
function paymentStatusName(status) {
    if (status === "PAID")
        return "Đã thanh toán";
    if (status === "REFUNDED")
        return "Đã hoàn tiền";
    if (status === "PARTIALLY_REFUNDED")
        return "Đã hoàn một phần";
    return "Chưa thanh toán";
}
function OrderCard({ group, detail, previewLoading }) {
    const orders = detail?.orders || group.orders;
    const lines = detail?.orders.flatMap(order => (order.items || []).map(item => ({ item, store: order.store.name || "Cửa hàng" }))) || [];
    const itemCount = lines.reduce((sum, line) => sum + line.item.quantity, 0);
    const isSingleStore = group.orders.length === 1;
    const progress = isSingleStore ? progressFor(group.orders[0].status) : 0;
    const destination = `/orders/${group.id}`;
    return _jsxs("article", { className: "buyer-orders-card", children: [_jsxs("header", { className: "buyer-orders-card__header", children: [_jsxs("div", { children: [_jsxs("span", { className: "buyer-orders-card__id", children: [_jsx(ShoppingBag, { size: 17 }), " \u0110\u01A1n h\u00E0ng #", group.id.slice(0, 8).toUpperCase()] }), _jsxs("small", { children: [_jsx(CalendarDays, { size: 14 }), " ", new Date(group.createdAt).toLocaleString("vi-VN")] })] }), _jsx("span", { className: `buyer-orders-status ${statusTone(group.status)}`, children: orderStatusName(group.status) })] }), _jsxs("div", { className: "buyer-orders-card__body", children: [_jsxs("div", { className: "buyer-orders-card__products", children: [_jsxs("div", { className: "buyer-orders-card__store-row", children: [_jsx("strong", { children: orders.map(order => order.store.name || "Cửa hàng").join(" · ") }), _jsx("span", { children: isSingleStore ? "1 cửa hàng" : `${group.orders.length} cửa hàng` })] }), lines.length ? _jsxs(_Fragment, { children: [_jsx("div", { className: "buyer-orders-card__items", children: lines.slice(0, 2).map(({ item, store }) => _jsxs("div", { className: "buyer-orders-product", children: [_jsx(Link, { to: `/products/${item.productId}`, className: "buyer-orders-product__image", "aria-label": `Xem ${item.name}`, children: _jsx("img", { src: item.snapshot.imageUrl || "/visual-placeholder.svg", alt: item.name, loading: "lazy", onError: showImageFallback }) }), _jsxs("div", { children: [_jsx(Link, { to: `/products/${item.productId}`, children: item.name }), _jsxs("small", { children: [store, " \u00B7 S\u1ED1 l\u01B0\u1EE3ng: ", item.quantity] })] }), _jsx("strong", { children: vnd(item.lineTotalMinor) })] }, item.id)) }), lines.length > 2 && _jsxs(Link, { className: "buyer-orders-card__more", to: destination, children: ["Xem th\u00EAm ", lines.length - 2, " s\u1EA3n ph\u1EA9m ", _jsx(ArrowRight, { size: 14 })] }), _jsxs("span", { className: "buyer-orders-card__quantity", children: [itemCount, " s\u1EA3n ph\u1EA9m trong \u0111\u01A1n"] })] }) : _jsxs("div", { className: "buyer-orders-card__preview-empty", children: [_jsx(Package, { size: 20 }), _jsx("span", { children: previewLoading ? "Đang tải sản phẩm..." : "Xem sản phẩm trong chi tiết đơn hàng" })] })] }), _jsxs("div", { className: "buyer-orders-card__summary", children: [_jsx("p", { className: "buyer-orders-card__summary-label", children: "Tr\u1EA1ng th\u00E1i \u0111\u01A1n h\u00E0ng" }), isSingleStore ? _jsxs(_Fragment, { children: [_jsx("strong", { className: "buyer-orders-card__summary-status", children: orderStatusName(group.orders[0].status) }), _jsx("div", { className: "buyer-orders-card__progress", role: "progressbar", "aria-valuenow": progress, "aria-valuemin": 0, "aria-valuemax": 100, "aria-label": "Ti\u1EBFn tr\u00ECnh \u0111\u01A1n h\u00E0ng", children: _jsx("span", { style: { width: `${progress}%` } }) })] }) : _jsx("div", { className: "buyer-orders-card__shop-statuses", children: group.orders.map(order => _jsxs("span", { children: [order.store.name || "Cửa hàng", ": ", orderStatusName(order.status)] }, order.id)) }), _jsxs("p", { className: "buyer-orders-card__payment", children: [group.paymentMethod === "COD" ? "Thanh toán khi nhận hàng" : group.paymentMethod === "MOMO" ? "MoMo" : "VietQR", " \u00B7 ", paymentStatusName(group.paymentStatus)] }), _jsxs("div", { className: "buyer-orders-card__total", children: [_jsx("span", { children: group.cancelledTotalMinor > 0 ? "Tổng còn hiệu lực" : "Tổng cộng" }), _jsx("strong", { children: vnd(group.currentTotalMinor) })] }), group.cancelledTotalMinor > 0 && _jsxs("p", { className: "buyer-orders-card__cancelled-amount", children: ["\u0110\u00E3 h\u1EE7y: ", vnd(group.cancelledTotalMinor)] }), _jsxs(Link, { className: "buyer-orders-card__open", to: destination, children: ["Xem chi ti\u1EBFt \u0111\u01A1n h\u00E0ng ", _jsx(ArrowRight, { size: 16 })] })] })] })] });
}
export function BuyerOrdersV2() {
    const [params, setParams] = useSearchParams();
    const rawStatus = params.get("status") || "";
    const status = orderStatusOptions.some(([value]) => value === rawStatus) ? rawStatus : "";
    const rawPage = Number(params.get("page"));
    const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
    const [groups, setGroups] = useState([]);
    const [details, setDetails] = useState({});
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [previewsLoading, setPreviewsLoading] = useState(false);
    const [error, setError] = useState("");
    const [retry, setRetry] = useState(0);
    useEffect(() => {
        let active = true;
        setLoading(true);
        setPreviewsLoading(false);
        setDetails({});
        setError("");
        orderV2Api.buyerOrders({ page, limit: PAGE_SIZE, status: status || undefined })
            .then(result => {
            if (!active)
                return;
            const visible = result.groups || [];
            setGroups(visible);
            setTotal(result.total);
            setLoading(false);
            if (!visible.length)
                return;
            setPreviewsLoading(true);
            void Promise.allSettled(visible.map(group => orderV2Api.buyerOrder(group.id))).then(results => {
                if (!active)
                    return;
                const loaded = {};
                results.forEach((result, index) => { if (result.status === "fulfilled")
                    loaded[visible[index].id] = result.value.group; });
                setDetails(loaded);
                setPreviewsLoading(false);
            });
        })
            .catch(cause => { if (active) {
            setGroups([]);
            setTotal(0);
            setError(cause instanceof Error ? cause.message : "Không thể tải đơn hàng.");
            setLoading(false);
        } });
        return () => { active = false; };
    }, [page, status, retry]);
    function changeStatus(value) {
        const next = new URLSearchParams();
        if (value)
            next.set("status", value);
        setParams(next);
    }
    function changePage(value) {
        const next = new URLSearchParams(params);
        if (value <= 1)
            next.delete("page");
        else
            next.set("page", String(value));
        setParams(next);
        window.scrollTo({ top: 0, behavior: "smooth" });
    }
    const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const first = total ? (page - 1) * PAGE_SIZE + 1 : 0;
    const last = Math.min(page * PAGE_SIZE, total);
    return _jsxs("div", { className: "buyer-orders-page", children: [_jsx(ContentBreadcrumb, { items: [{ label: "Đơn hàng của tôi" }] }), _jsxs("header", { className: "buyer-orders-heading", children: [_jsxs("div", { children: [_jsx("span", { children: "THEO D\u00D5I MUA S\u1EAEM" }), _jsx("h1", { children: "\u0110\u01A1n h\u00E0ng c\u1EE7a t\u00F4i" }), _jsx("p", { children: "Xem s\u1EA3n ph\u1EA9m, tr\u1EA1ng th\u00E1i giao h\u00E0ng v\u00E0 thanh to\u00E1n c\u1EE7a t\u1EEBng \u0111\u01A1n." })] }), _jsxs("div", { className: "buyer-orders-heading__count", children: [_jsx(ShoppingBag, { size: 20 }), _jsx("strong", { children: total.toLocaleString("vi-VN") }), _jsxs("small", { children: ["\u0111\u01A1n h\u00E0ng", status ? " phù hợp" : ""] })] })] }), _jsxs("div", { className: "buyer-orders-filters", children: [_jsx("div", { className: "buyer-orders-tabs", role: "group", "aria-label": "L\u1ECDc \u0111\u01A1n theo tr\u1EA1ng th\u00E1i", children: tabs.map(tab => _jsx("button", { type: "button", className: status === tab.value ? "is-active" : "", "aria-pressed": status === tab.value, onClick: () => changeStatus(tab.value), children: tab.label }, tab.value)) }), _jsxs("label", { children: ["L\u1ECDc kh\u00E1c", _jsxs("select", { value: tabs.some(tab => tab.value === status) ? "" : status, onChange: event => changeStatus(event.target.value), "aria-label": "Tr\u1EA1ng th\u00E1i kh\u00E1c", children: [_jsx("option", { value: "", children: "Ch\u1ECDn tr\u1EA1ng th\u00E1i" }), orderStatusOptions.filter(([value]) => !tabs.some(tab => tab.value === value)).map(([value, label]) => _jsx("option", { value: value, children: label }, value))] })] })] }), error ? _jsxs("div", { className: "buyer-orders-state", children: [_jsx(Package, { size: 31 }), _jsx("h2", { children: "Kh\u00F4ng th\u1EC3 t\u1EA3i \u0111\u01A1n h\u00E0ng" }), _jsx("p", { children: error }), _jsx("button", { type: "button", onClick: () => setRetry(value => value + 1), children: "Th\u1EED l\u1EA1i" })] }) : loading ? _jsxs("div", { className: "buyer-orders-state", role: "status", children: [_jsx(Package, { size: 31 }), _jsx("p", { children: "\u0110ang t\u1EA3i \u0111\u01A1n h\u00E0ng..." })] }) : groups.length ? _jsxs(_Fragment, { children: [_jsx("div", { className: "buyer-orders-list", children: groups.map(group => _jsx(OrderCard, { group: group, detail: details[group.id], previewLoading: previewsLoading }, group.id)) }), _jsxs("nav", { className: "buyer-orders-pagination", "aria-label": "Ph\u00E2n trang \u0111\u01A1n h\u00E0ng", children: [_jsxs("span", { children: ["Hi\u1EC3n th\u1ECB ", first, "\u2013", last, " trong ", total.toLocaleString("vi-VN"), " \u0111\u01A1n h\u00E0ng"] }), pageCount > 1 && _jsxs("div", { children: [_jsx("button", { type: "button", disabled: page <= 1, onClick: () => changePage(page - 1), "aria-label": "Trang tr\u01B0\u1EDBc", children: _jsx(ChevronLeft, { size: 17 }) }), _jsxs("strong", { children: ["Trang ", page, " / ", pageCount] }), _jsx("button", { type: "button", disabled: page >= pageCount, onClick: () => changePage(page + 1), "aria-label": "Trang sau", children: _jsx(ChevronRight, { size: 17 }) })] })] })] }) : _jsxs("div", { className: "buyer-orders-state", children: [_jsx(Package, { size: 31 }), _jsx("h2", { children: status ? "Chưa có đơn ở trạng thái này" : "Bạn chưa có đơn hàng" }), _jsx("p", { children: status ? "Chọn trạng thái khác để xem các đơn đã đặt." : "Khám phá sản phẩm và bắt đầu mua sắm." }), status ? _jsx("button", { type: "button", onClick: () => changeStatus(""), children: "Xem t\u1EA5t c\u1EA3 \u0111\u01A1n h\u00E0ng" }) : _jsxs(Link, { to: "/products", children: ["Kh\u00E1m ph\u00E1 s\u1EA3n ph\u1EA9m ", _jsx(ArrowRight, { size: 16 })] })] })] });
}
