import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUp, CalendarDays, Eye, Flame, Gift, Star, Tag, TicketPercent, Wallet, Zap } from "lucide-react";
import ContentBreadcrumb from "../../components/ui/ContentBreadcrumb";
import { catalogApi } from "../../api/catalogApi";
import { engagementApi } from "../../api/engagementApi";
import promotionApi, {} from "../../api/promotionApi";
import { vnd } from "../../api/orderV2Api";
import { USE_MOCK_DATA } from "../../config/runtime";
import { showImageFallback } from "../../utils/imageFallback";
import "./NewPage.css";
const tabs = [
    { value: "all", label: "Tất cả", icon: Tag },
    { value: "sale", label: "Sale lớn", icon: Flame },
    { value: "flash", label: "Flash Sale", icon: Zap },
    { value: "shipping", label: "Freeship", icon: ArrowUp },
    { value: "cashback", label: "Hoàn tiền", icon: Wallet },
    { value: "special", label: "Đặc biệt", icon: Star },
    { value: "newcomer", label: "Tân thủ", icon: Gift },
];
const date = (value) => new Date(value).toLocaleDateString("vi-VN");
function fromPreview(item, index) {
    const text = `${item.category} ${item.tags?.join(" ") || ""}`.toLocaleLowerCase("vi-VN");
    const categories = [];
    if (text.includes("sale lớn"))
        categories.push("sale");
    if (text.includes("flash"))
        categories.push("flash");
    if (text.includes("freeship") || text.includes("vận chuyển"))
        categories.push("shipping");
    if (text.includes("hoàn tiền"))
        categories.push("cashback");
    if (text.includes("đặc biệt"))
        categories.push("special");
    if (text.includes("tân thủ") || text.includes("thành viên mới"))
        categories.push("newcomer");
    return { id: item._id || `preview-${index}`, title: item.title, description: item.description,
        categories: categories.length ? categories : ["special"], tags: item.tags || [],
        imageUrl: item.imageUrl, startsAt: item.startDate, endsAt: item.endDate,
        views: item.views, href: item._id ? `/promotion/${item._id}` : "/flash-sale", preview: true };
}
function fromVoucher(item, storeSlug) {
    const { campaign, voucher } = item;
    const text = `${campaign.title} ${voucher.code}`.toLocaleLowerCase("vi-VN");
    const categories = ["special"];
    if (/ship|vận chuyển/.test(text))
        categories.push("shipping");
    if (voucher.segment === "FIRST_ORDER")
        categories.push("newcomer");
    if (/hoàn tiền|cashback/.test(text))
        categories.push("cashback");
    const discount = voucher.discountType === "FIXED" ? vnd(voucher.discountValue) : `${voucher.discountValue / 100}%`;
    return { id: campaign.id, title: campaign.title,
        description: `Giảm ${discount} cho đơn đủ điều kiện. Áp dụng mã ${voucher.code} khi thanh toán.`,
        categories, tags: [campaign.storeId ? "Voucher shop" : "Voucher sàn"],
        startsAt: campaign.startsAt, endsAt: campaign.endsAt,
        href: campaign.storeId && storeSlug ? `/store/${storeSlug}` : campaign.storeId ? "/store" : "/voucher",
        preview: false };
}
function fromFlash(item) {
    return { id: item.campaignId, title: item.title,
        description: `${item.productName} đang có giá Flash Sale ${vnd(item.salePriceMinor)}. Giá và tồn kho được xác nhận khi đặt hàng.`,
        categories: ["flash", "sale"], tags: ["Flash Sale"], imageUrl: item.imageUrl || undefined,
        startsAt: item.startsAt, endsAt: item.endsAt, href: "/flash-sales/products", preview: false };
}
export default function NewPage() {
    const [activeTab, setActiveTab] = useState("all");
    const [cards, setCards] = useState([]);
    const [preview, setPreview] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [retry, setRetry] = useState(0);
    useEffect(() => {
        let active = true;
        setLoading(true);
        setError("");
        async function load() {
            const [campaignResult, flashResult, storeResult] = await Promise.allSettled([
                engagementApi.active(), engagementApi.flashSales(), catalogApi.list("?limit=50"),
            ]);
            if (!active)
                return;
            if (campaignResult.status === "rejected" && flashResult.status === "rejected") {
                setError("Không thể tải chương trình khuyến mãi. Vui lòng thử lại.");
                setCards([]);
                return;
            }
            const storeSlugs = storeResult.status === "fulfilled"
                ? new Map(storeResult.value.stores.map(store => [store.id, store.slug])) : new Map();
            const real = [
                ...(campaignResult.status === "fulfilled" ? campaignResult.value.promotions.map(item => fromVoucher(item, storeSlugs.get(item.campaign.storeId || ""))) : []),
                ...(flashResult.status === "fulfilled" ? flashResult.value.items.map(fromFlash) : []),
            ];
            const unique = [...new Map(real.map(item => [item.id, item])).values()];
            if (unique.length || !USE_MOCK_DATA) {
                setCards(unique);
                setPreview(false);
                return;
            }
            try {
                const result = await promotionApi.getAllPromotions({ isActive: true });
                if (active) {
                    setCards(result.data.map(fromPreview));
                    setPreview(true);
                }
            }
            catch {
                if (active) {
                    setCards([]);
                    setError("Không thể tải chương trình mẫu.");
                }
            }
        }
        void load().finally(() => { if (active)
            setLoading(false); });
        return () => { active = false; };
    }, [retry]);
    const visible = cards.filter(item => activeTab === "all" || item.categories.includes(activeTab));
    return _jsxs("div", { className: "promotion-list-page", children: [_jsx(ContentBreadcrumb, { items: [{ label: "Khuyến mãi" }] }), preview && _jsx("p", { className: "promotion-list-preview", children: "B\u1EA3n xem tr\u01B0\u1EDBc giao di\u1EC7n \u00B7 C\u00E1c ch\u01B0\u01A1ng tr\u00ECnh b\u00EAn d\u01B0\u1EDBi l\u00E0 d\u1EEF li\u1EC7u minh h\u1ECDa, kh\u00F4ng ph\u1EA3i \u01B0u \u0111\u00E3i \u0111ang ho\u1EA1t \u0111\u1ED9ng." }), _jsx("div", { className: "promotion-list-tabs", role: "group", "aria-label": "L\u1ECDc ch\u01B0\u01A1ng tr\u00ECnh khuy\u1EBFn m\u00E3i", children: tabs.map(tab => {
                    const Icon = tab.icon;
                    return _jsxs("button", { type: "button", className: activeTab === tab.value ? "is-active" : "", "aria-pressed": activeTab === tab.value, onClick: () => setActiveTab(tab.value), children: [_jsx(Icon, { size: 16 }), " ", tab.label] }, tab.value);
                }) }), error ? _jsxs("div", { className: "promotion-list-state", children: [_jsx("h2", { children: "Kh\u00F4ng th\u1EC3 t\u1EA3i khuy\u1EBFn m\u00E3i" }), _jsx("p", { children: error }), _jsx("button", { type: "button", onClick: () => setRetry(value => value + 1), children: "Th\u1EED l\u1EA1i" })] }) : loading ? _jsx("div", { className: "promotion-list-state", role: "status", children: "\u0110ang t\u1EA3i khuy\u1EBFn m\u00E3i..." }) : visible.length ? _jsx("div", { className: "promotion-list-grid", children: visible.map(item => _jsxs("article", { className: "promotion-list-card", children: [_jsx(Link, { className: "promotion-list-card__media", to: item.href, "aria-label": `Xem ${item.title}`, children: item.imageUrl ? _jsx("img", { src: item.imageUrl, alt: item.title, loading: "lazy", onError: showImageFallback }) : _jsx("span", { children: _jsx(TicketPercent, { size: 58 }) }) }), _jsxs("div", { className: "promotion-list-card__body", children: [_jsxs("div", { className: "promotion-list-card__tags", children: [item.tags.map(tag => _jsx("span", { children: tag }, tag)), item.preview && _jsx("span", { children: "D\u1EEF li\u1EC7u m\u1EABu" })] }), _jsx("h2", { children: item.title }), _jsx("p", { children: item.description }), _jsxs("div", { className: "promotion-list-card__meta", children: [_jsxs("span", { children: [_jsx(CalendarDays, { size: 16 }), " ", date(item.startsAt), " \u2013 ", date(item.endsAt)] }), item.views != null && _jsxs("span", { children: [_jsx(Eye, { size: 16 }), " ", item.views.toLocaleString("vi-VN"), " l\u01B0\u1EE3t xem"] })] }), _jsxs(Link, { className: "promotion-list-card__action", to: item.href, children: [item.preview ? "Xem nội dung mẫu" : "Xem chi tiết", " \u2192"] })] })] }, item.id)) }) : _jsxs("div", { className: "promotion-list-state", children: [_jsx("h2", { children: "Ch\u01B0a c\u00F3 ch\u01B0\u01A1ng tr\u00ECnh ph\u00F9 h\u1EE3p" }), _jsx("p", { children: cards.length ? "Hãy chọn một loại khuyến mãi khác." : "Hiện chưa có chương trình khuyến mãi đang diễn ra." })] })] });
}
