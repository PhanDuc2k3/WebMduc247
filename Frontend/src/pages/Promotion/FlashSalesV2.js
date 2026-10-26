import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { engagementApi } from "../../api/engagementApi";
import { vnd } from "../../api/orderV2Api";
function remainingText(milliseconds) {
    const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
    const hours = Math.floor(seconds / 3600), minutes = Math.floor((seconds % 3600) / 60);
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}
export default function FlashSalesV2() {
    const [items, setItems] = useState([]);
    const [anchor, setAnchor] = useState({ serverMs: 0, perfMs: 0 });
    const [tick, setTick] = useState(0);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        let active = true;
        engagementApi.flashSales().then(result => {
            if (!active)
                return;
            setItems(result.items);
            const perf = performance.now();
            setAnchor({ serverMs: Date.parse(result.serverTime), perfMs: perf });
            setTick(perf);
        }).catch(error => {
            if (active)
                toast.error(error instanceof Error ? error.message : "Không thể tải Flash Sale.", { containerId: "general-toast" });
        }).finally(() => { if (active)
            setLoading(false); });
        return () => { active = false; };
    }, []);
    useEffect(() => { const timer = setInterval(() => setTick(performance.now()), 1000); return () => clearInterval(timer); }, []);
    const serverNow = anchor.serverMs + Math.max(0, tick - anchor.perfMs);
    return _jsxs("div", { className: "py-8 pb-16", children: [_jsx("h1", { className: "text-3xl font-extrabold text-[#172a49]", children: "Flash Sale" }), _jsx("p", { className: "mt-2 text-[#70819d]", children: "Gi\u00E1 v\u00E0 th\u1EDDi gian \u0111\u01B0\u1EE3c x\u00E1c \u0111\u1ECBnh tr\u00EAn server. Quota \u0111\u01B0\u1EE3c ki\u1EC3m tra l\u1EA1i khi \u0111\u1EB7t \u0111\u01A1n." }), loading ? _jsx("p", { className: "mt-7", children: "\u0110ang t\u1EA3i Flash Sale..." }) : items.some(item => Date.parse(item.endsAt) > serverNow) ?
                _jsx("div", { className: "mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4", children: items.filter(item => Date.parse(item.endsAt) > serverNow).map(item => _jsxs(Link, { to: `/products/${item.productId}`, className: "rounded-2xl border border-[#e6ebf5] bg-white p-4 shadow-sm hover:border-[#476de4]", children: [_jsx("div", { className: "grid aspect-square place-items-center overflow-hidden rounded-xl bg-[#f2f5fb]", children: _jsx("img", { src: item.imageUrl || "/visual-placeholder.svg", alt: item.productName, className: "h-full w-full object-contain" }) }), _jsx("p", { className: "mt-3 text-sm font-bold text-[#476de4]", children: item.title }), _jsx("h2", { className: "mt-1 font-bold text-[#172a49]", children: item.productName }), _jsx("strong", { className: "mt-3 block text-xl text-red-600", children: vnd(item.salePriceMinor) }), _jsx("del", { className: "text-sm text-[#70819d]", children: vnd(item.regularPriceMinor) }), _jsxs("p", { className: "mt-3 text-sm", children: ["C\u00F2n ", Math.max(0, Math.min(item.availableStock, item.quota - item.soldCount - item.reservedCount)), " su\u1EA5t"] }), _jsxs("p", { className: "mt-1 text-sm font-bold text-[#476de4]", children: ["K\u1EBFt th\u00FAc sau ", remainingText(Date.parse(item.endsAt) - serverNow)] })] }, item.campaignId + item.variantId)) }) :
                _jsx("div", { className: "mt-6 rounded-2xl bg-white p-8 text-[#70819d]", children: "Hi\u1EC7n ch\u01B0a c\u00F3 Flash Sale \u0111ang di\u1EC5n ra." })] });
}
