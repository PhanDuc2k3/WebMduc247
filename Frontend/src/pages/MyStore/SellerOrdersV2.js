import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { orderV2Api, vnd } from "../../api/orderV2Api";
import { orderStatusName } from "../Order/orderStatus";
import ReturnPanel from "../../components/ReviewReturn/ReturnPanel";
import SellerReviewPanel from "../../components/ReviewReturn/SellerReviewPanel";
import { formatAddress } from "../../utils/formatAddress";
const card = "rounded-2xl border border-[#e6ebf5] bg-white p-5 shadow-sm";
export function SellerOrdersV2() {
    const { storeId = "" } = useParams();
    const [orders, setOrders] = useState([]);
    const [status, setStatus] = useState("");
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        let active = true;
        setLoading(true);
        orderV2Api.sellerOrders(storeId, { page, limit: 10, status }).then(result => {
            if (active) {
                setOrders(result.orders || []);
                setTotal(result.total);
            }
        }).catch(error => { if (active)
            toast.error(error instanceof Error ? error.message : "Không thể tải đơn của shop.", { containerId: "general-toast" }); })
            .finally(() => { if (active)
            setLoading(false); });
        return () => { active = false; };
    }, [storeId, page, status]);
    return _jsxs("div", { className: "py-8 pb-16", children: [_jsx(Link, { to: "/mystore", className: "font-semibold text-[#476de4]", children: "\u2190 C\u1EEDa h\u00E0ng c\u1EE7a t\u00F4i" }), _jsx("h1", { className: "mt-5 text-3xl font-extrabold", children: "\u0110\u01A1n h\u00E0ng c\u1EE7a shop" }), _jsxs("select", { value: status, onChange: event => { setStatus(event.target.value); setPage(1); }, className: "mt-5 rounded-xl border bg-white px-3 py-2", children: [_jsx("option", { value: "", children: "M\u1ECDi tr\u1EA1ng th\u00E1i" }), ["PLACED", "CONFIRMED", "PREPARING", "READY_TO_SHIP", "SHIPPING", "DELIVERED", "COMPLETED", "CANCELLED"].map(item => _jsx("option", { value: item, children: orderStatusName(item) }, item))] }), loading ? _jsx("p", { className: "mt-5", children: "\u0110ang t\u1EA3i..." }) : orders.length ? _jsx("div", { className: "mt-5 space-y-4", children: orders.map(order => _jsxs(Link, { to: `/mystore/orders/${order.id}`, className: `${card} block hover:border-[#476de4]`, children: [_jsxs("div", { className: "flex justify-between gap-3", children: [_jsxs("strong", { children: ["\u0110\u01A1n #", order.id.slice(0, 8)] }), _jsx("span", { className: "text-[#476de4]", children: orderStatusName(order.status) })] }), _jsxs("p", { className: "mt-2 text-sm text-[#70819d]", children: [new Date(order.createdAt).toLocaleString("vi-VN"), " \u00B7 ", order.address.receiverName] }), _jsx("strong", { className: "mt-3 block text-right", children: vnd(order.totalMinor) })] }, order.id)) }) :
                _jsx("div", { className: `${card} mt-5`, children: "Ch\u01B0a c\u00F3 \u0111\u01A1n h\u00E0ng." }), _jsxs("div", { className: "mt-5 flex gap-3", children: [_jsx("button", { disabled: page <= 1, onClick: () => setPage(value => value - 1), className: "rounded-lg border bg-white px-3 py-2 disabled:opacity-50", children: "Tr\u01B0\u1EDBc" }), _jsxs("span", { children: ["Trang ", page, " / ", Math.max(1, Math.ceil(total / 10))] }), _jsx("button", { disabled: page * 10 >= total, onClick: () => setPage(value => value + 1), className: "rounded-lg border bg-white px-3 py-2 disabled:opacity-50", children: "Sau" })] })] });
}
export function SellerOrderDetailV2() {
    const { id = "" } = useParams();
    const [order, setOrder] = useState(null);
    const [busy, setBusy] = useState(false);
    const [loading, setLoading] = useState(true);
    const [reason, setReason] = useState("CANNOT_FULFILL");
    const keys = useRef(new Map());
    async function reload() { setOrder((await orderV2Api.sellerOrder(id)).order); }
    useEffect(() => {
        let active = true;
        orderV2Api.sellerOrder(id).then(result => { if (active)
            setOrder(result.order); })
            .catch(error => { if (active)
            toast.error(error instanceof Error ? error.message : "Không thể tải đơn shop.", { containerId: "general-toast" }); })
            .finally(() => { if (active)
            setLoading(false); });
        return () => { active = false; };
    }, [id]);
    async function command(action) {
        if (!order)
            return;
        const token = `${order.id}:${order.version}:${action}`;
        if (!keys.current.has(token))
            keys.current.set(token, crypto.randomUUID());
        setBusy(true);
        try {
            await orderV2Api.sellerCommand(order.id, action, { expectedVersion: order.version,
                idempotencyKey: keys.current.get(token), ...(action === "reject" ? { reason } : {}) });
            keys.current.delete(token);
            await reload();
            toast.success("Đã cập nhật trạng thái đơn.", { containerId: "general-toast" });
        }
        catch (error) {
            toast.error(error instanceof Error ? error.message : "Không thể cập nhật đơn.", { containerId: "general-toast" });
            void reload().catch(() => { });
        }
        finally {
            setBusy(false);
        }
    }
    if (loading)
        return _jsx("div", { className: "py-12", children: "\u0110ang t\u1EA3i \u0111\u01A1n h\u00E0ng..." });
    if (!order)
        return _jsx("div", { className: "py-12", children: "Kh\u00F4ng t\u00ECm th\u1EA5y \u0111\u01A1n h\u00E0ng." });
    return _jsxs("div", { className: "py-8 pb-16", children: [_jsx(Link, { to: `/mystore/${order.storeId}/orders`, className: "font-semibold text-[#476de4]", children: "\u2190 \u0110\u01A1n h\u00E0ng c\u1EE7a shop" }), _jsxs("div", { className: "mt-5 flex flex-wrap justify-between gap-3", children: [_jsxs("div", { children: [_jsxs("h1", { className: "text-3xl font-extrabold", children: ["\u0110\u01A1n #", order.id.slice(0, 8)] }), _jsx("p", { className: "mt-1 text-[#476de4]", children: orderStatusName(order.status) })] }), _jsx("strong", { className: "text-2xl", children: vnd(order.totalMinor) })] }), _jsxs("section", { className: `${card} mt-6`, children: [_jsx("h2", { className: "text-xl font-bold", children: "S\u1EA3n ph\u1EA9m" }), order.items?.map(item => _jsxs("div", { className: "mt-3 flex justify-between gap-4 border-t pt-3", children: [_jsxs("div", { children: [_jsxs("strong", { children: [item.name, " \u00D7 ", item.quantity] }), _jsx("p", { className: "text-sm text-[#70819d]", children: item.sku })] }), _jsx("span", { children: vnd(item.lineTotalMinor) })] }, item.id)), _jsxs("p", { className: "mt-4 border-t pt-3", children: ["Gi\u00E1 g\u1ED1c ", vnd(order.subtotalMinor), " \u00B7 Gi\u1EA3m ", vnd(order.discountMinor), " \u00B7 Giao h\u00E0ng ", vnd(order.shippingMinor)] })] }), _jsxs("section", { className: `${card} mt-5`, children: [_jsx("h2", { className: "text-xl font-bold", children: "Giao cho" }), _jsxs("p", { className: "mt-2", children: [order.address.receiverName, " \u00B7 ", order.address.receiverPhone] }), _jsx("p", { children: formatAddress(order.address) }), order.shipmentRef && _jsxs("p", { className: "mt-2", children: ["M\u00E3 v\u1EADn \u0111\u01A1n: ", order.shipmentRef] })] }), _jsxs("section", { className: `${card} mt-5`, children: [_jsx("h2", { className: "text-xl font-bold", children: "Thao t\u00E1c" }), _jsxs("div", { className: "mt-4 flex flex-wrap gap-3", children: [order.status === "PLACED" && _jsx("button", { disabled: busy, onClick: () => void command("confirm"), className: "rounded-xl bg-[#476de4] px-4 py-2 font-bold text-white disabled:opacity-50", children: "X\u00E1c nh\u1EADn \u0111\u01A1n" }), order.status === "CONFIRMED" && _jsx("button", { disabled: busy, onClick: () => void command("prepare"), className: "rounded-xl bg-[#476de4] px-4 py-2 font-bold text-white disabled:opacity-50", children: "B\u1EAFt \u0111\u1EA7u chu\u1EA9n b\u1ECB" }), order.status === "PREPARING" && _jsx("button", { disabled: busy, onClick: () => void command("ready-to-ship"), className: "rounded-xl bg-[#476de4] px-4 py-2 font-bold text-white disabled:opacity-50", children: "S\u1EB5n s\u00E0ng giao" }), ["PLACED", "CONFIRMED"].includes(order.status) && _jsxs("div", { className: "flex gap-2", children: [_jsxs("select", { value: reason, onChange: event => setReason(event.target.value), className: "rounded-xl border px-3 py-2", children: [_jsx("option", { value: "CANNOT_FULFILL", children: "Kh\u00F4ng th\u1EC3 x\u1EED l\u00FD" }), _jsx("option", { value: "OUT_OF_STOCK", children: "H\u1EBFt h\u00E0ng th\u1EF1c t\u1EBF" }), _jsx("option", { value: "STORE_CLOSED", children: "Shop t\u1EA1m \u0111\u00F3ng" })] }), _jsx("button", { disabled: busy, onClick: () => void command("reject"), className: "rounded-xl border border-red-300 px-4 py-2 font-semibold text-red-600 disabled:opacity-50", children: "T\u1EEB ch\u1ED1i" })] }), ["READY_TO_SHIP", "SHIPPING", "DELIVERED"].includes(order.status) && _jsx("p", { className: "text-sm text-[#70819d]", children: "Tr\u1EA1ng th\u00E1i giao h\u00E0ng \u0111\u01B0\u1EE3c c\u1EADp nh\u1EADt t\u1EEB d\u1ECBch v\u1EE5 giao h\u00E0ng." })] })] }), _jsx(ReturnPanel, { order: order, seller: true }), _jsx(SellerReviewPanel, { storeId: order.storeId }), _jsxs("section", { className: `${card} mt-5`, children: [_jsx("h2", { className: "text-xl font-bold", children: "L\u1ECBch s\u1EED" }), order.history?.map((item, index) => _jsxs("p", { className: "mt-2 text-sm text-[#70819d]", children: [new Date(item.occurredAt).toLocaleString("vi-VN"), " \u00B7 ", orderStatusName(item.toStatus), " \u00B7 ", item.actorType, item.reason ? ` · ${item.reason}` : ""] }, index))] })] });
}
