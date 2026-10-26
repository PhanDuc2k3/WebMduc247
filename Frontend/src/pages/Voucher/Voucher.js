import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import ContentBreadcrumb from "../../components/ui/ContentBreadcrumb";
import { catalogApi } from "../../api/catalogApi";
import { engagementApi } from "../../api/engagementApi";
import { vnd } from "../../api/orderV2Api";
import { USE_MOCK_DATA } from "../../config/runtime";
import "./Voucher.css";
const tabs = [
    { value: "all", label: "Tất cả" }, { value: "tech", label: "Công nghệ" },
    { value: "fashion", label: "Thời trang" }, { value: "home", label: "Nhà cửa" },
    { value: "books", label: "Sách" }, { value: "shipping", label: "Miễn ship" },
];
const flatten = (items) => items.flatMap(item => [item, ...flatten(item.children)]);
const formatDate = (value) => new Date(value).toLocaleDateString("vi-VN");
function previewEntries() {
    const startsAt = new Date(Date.now() - 86_400_000).toISOString();
    const endsAt = new Date(Date.now() + 30 * 86_400_000).toISOString();
    const campaign = (id, title) => ({ id, storeId: null, type: "VOUCHER",
        status: "ACTIVE", fundingSource: "PLATFORM", title, startsAt, endsAt, createdAt: startsAt });
    const voucher = (id, code, discountValue, minSpendMinor, usedCount) => ({
        id, code, discountType: "FIXED", discountValue, maxDiscountMinor: null, minSpendMinor,
        totalLimit: 100, perUserLimit: 1, usedCount, reservedCount: 0, scopeType: "PLATFORM",
        scopeId: null, segment: code === "WELCOME50" ? "FIRST_ORDER" : "ALL", stackable: false,
    });
    return [
        { campaign: campaign("preview-welcome", "Chào thành viên mới"), voucher: voucher("preview-welcome", "WELCOME50", 50_000, 299_000, 13) },
        { campaign: campaign("preview-shipping", "Miễn phí vận chuyển"), voucher: voucher("preview-shipping", "FREESHIP", 30_000, 199_000, 15) },
    ];
}
function VoucherCard({ entry, preview, scopeLabel, onCopy }) {
    const { campaign, voucher } = entry;
    const available = Math.max(0, voucher.totalLimit - voucher.usedCount - voucher.reservedCount);
    const usedPercent = voucher.totalLimit ? Math.min(100, Math.round((voucher.usedCount / voucher.totalLimit) * 100)) : 0;
    const remainingPercent = voucher.totalLimit ? Math.round((available / voucher.totalLimit) * 100) : 0;
    const summary = voucher.discountType === "FIXED" ? `Giảm tối đa ${vnd(voucher.discountValue)}` :
        `Giảm ${voucher.discountValue / 100}%${voucher.maxDiscountMinor != null ? `, tối đa ${vnd(voucher.maxDiscountMinor)}` : ""}`;
    return _jsxs("article", { className: `voucher-card${preview ? " is-preview" : ""}`, children: [_jsxs("header", { children: [_jsx("h2", { children: campaign.title }), preview ? _jsx("span", { className: "voucher-card__code", title: "M\u00E3 m\u1EABu, ch\u01B0a \u00E1p d\u1EE5ng \u0111\u01B0\u1EE3c", children: voucher.code }) : _jsx("button", { type: "button", className: "voucher-card__code", onClick: () => onCopy(voucher.code), title: "Sao ch\u00E9p m\u00E3 voucher", "aria-label": `Sao chép mã ${voucher.code}`, children: voucher.code })] }), _jsx("p", { className: "voucher-card__summary", children: summary }), _jsxs("div", { className: "voucher-card__details", children: [_jsxs("p", { children: [_jsx("strong", { children: "\u0110i\u1EC1u ki\u1EC7n:" }), " ", voucher.minSpendMinor ? `Đơn từ ${vnd(voucher.minSpendMinor)}` : "Không yêu cầu giá trị đơn tối thiểu"] }), _jsxs("p", { children: [_jsx("strong", { children: "Ng\u00E0y \u00E1p d\u1EE5ng:" }), " ", formatDate(campaign.startsAt), " \u2192 ", formatDate(campaign.endsAt)] }), _jsxs("p", { children: [scopeLabel, voucher.segment === "FIRST_ORDER" ? " · Chỉ áp dụng cho đơn đầu tiên" : ""] })] }), _jsxs("div", { className: "voucher-card__usage", children: [_jsxs("span", { children: ["\u0110\u00E3 s\u1EED d\u1EE5ng: ", usedPercent, "%"] }), _jsxs("span", { children: ["C\u00F2n l\u1EA1i: ", remainingPercent, "%"] })] }), _jsx("div", { className: "voucher-card__progress", role: "progressbar", "aria-label": `Đã sử dụng ${usedPercent}%`, "aria-valuenow": usedPercent, "aria-valuemin": 0, "aria-valuemax": 100, children: _jsx("span", { style: { width: `${usedPercent}%` } }) }), preview && _jsx("p", { className: "voucher-card__preview-note", children: "M\u1EABu giao di\u1EC7n \u00B7 Kh\u00F4ng th\u1EC3 \u00E1p d\u1EE5ng t\u1EA1i thanh to\u00E1n" })] });
}
export default function VoucherPage() {
    const [items, setItems] = useState([]);
    const [categoryNames, setCategoryNames] = useState({});
    const [storeCategories, setStoreCategories] = useState({});
    const [storeNames, setStoreNames] = useState({});
    const [activeTab, setActiveTab] = useState("all");
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [retry, setRetry] = useState(0);
    const [examples] = useState(previewEntries);
    useEffect(() => {
        let active = true;
        setLoading(true);
        setError("");
        engagementApi.active().then(result => {
            if (active)
                setItems(result.promotions.filter(item => item.campaign.storeId === null));
        })
            .catch(cause => { if (active)
            setError(cause instanceof Error ? cause.message : "Không thể tải voucher."); })
            .finally(() => { if (active)
            setLoading(false); });
        return () => { active = false; };
    }, [retry]);
    useEffect(() => {
        let active = true;
        Promise.allSettled([catalogApi.categories(), catalogApi.list("?limit=50")]).then(results => {
            if (!active)
                return;
            if (results[0].status === "fulfilled")
                setCategoryNames(Object.fromEntries(flatten(results[0].value.categories).map(item => [item.id, item.name])));
            if (results[1].status === "fulfilled") {
                setStoreCategories(Object.fromEntries(results[1].value.stores.map(item => [item.id, item.category || ""])));
                setStoreNames(Object.fromEntries(results[1].value.stores.map(item => [item.id, item.name])));
            }
        });
        return () => { active = false; };
    }, []);
    const preview = USE_MOCK_DATA && !loading && !error && !items.length;
    const source = preview ? examples : items;
    const classify = (entry) => {
        const text = `${entry.campaign.title} ${entry.voucher.code}`.toLocaleLowerCase("vi-VN");
        if (/miễn.*ship|free.*ship|vận chuyển/.test(text))
            return "shipping";
        const scope = entry.voucher.scopeType === "CATEGORY" ? categoryNames[entry.voucher.scopeId || ""] :
            entry.voucher.scopeType === "STORE" ? storeCategories[entry.campaign.storeId || ""] : "";
        if (/điện tử|công nghệ|thiết bị/.test(scope.toLocaleLowerCase("vi-VN")))
            return "tech";
        if (/thời trang/.test(scope.toLocaleLowerCase("vi-VN")))
            return "fashion";
        if (/nhà cửa|gia dụng/.test(scope.toLocaleLowerCase("vi-VN")))
            return "home";
        if (/sách|văn phòng phẩm/.test(scope.toLocaleLowerCase("vi-VN")))
            return "books";
        return "other";
    };
    const counts = Object.fromEntries(tabs.map(tab => [tab.value, tab.value === "all" ? source.length : source.filter(entry => classify(entry) === tab.value).length]));
    const visible = source.filter(entry => {
        if (activeTab !== "all" && classify(entry) !== activeTab)
            return false;
        const keyword = search.trim().toLocaleLowerCase("vi-VN");
        return !keyword || `${entry.campaign.title} ${entry.voucher.code}`.toLocaleLowerCase("vi-VN").includes(keyword);
    });
    function scopeLabel(entry) {
        const { campaign, voucher } = entry;
        if (voucher.scopeType === "PLATFORM")
            return "Áp dụng toàn hệ thống";
        if (voucher.scopeType === "CATEGORY")
            return `Áp dụng cho ${categoryNames[voucher.scopeId || ""] || "danh mục phù hợp"}`;
        if (voucher.scopeType === "STORE")
            return `Áp dụng tại ${storeNames[campaign.storeId || ""] || "cửa hàng phát hành"}`;
        return "Áp dụng cho sản phẩm phù hợp";
    }
    async function copy(code) {
        try {
            await navigator.clipboard.writeText(code);
            toast.success("Đã sao chép mã voucher.", { containerId: "general-toast" });
        }
        catch {
            toast.error("Không thể sao chép mã.", { containerId: "general-toast" });
        }
    }
    return _jsxs("div", { className: "voucher-page", children: [_jsx(ContentBreadcrumb, { items: [{ label: "Kho voucher" }] }), _jsx("h1", { className: "sr-only", children: "Kho voucher" }), preview && _jsx("p", { className: "voucher-preview-banner", children: "B\u1EA3n xem tr\u01B0\u1EDBc giao di\u1EC7n \u00B7 Hi\u1EC7n ch\u01B0a c\u00F3 voucher \u0111ang ho\u1EA1t \u0111\u1ED9ng \u0111\u1EC3 s\u1EED d\u1EE5ng." }), _jsx("div", { className: "voucher-tabs", role: "group", "aria-label": "L\u1ECDc voucher theo ng\u00E0nh h\u00E0ng", children: tabs.map(tab => _jsxs("button", { type: "button", className: activeTab === tab.value ? "is-active" : "", "aria-pressed": activeTab === tab.value, onClick: () => setActiveTab(tab.value), children: [tab.label, " (", counts[tab.value], ")"] }, tab.value)) }), _jsx("input", { className: "voucher-search", value: search, onChange: event => setSearch(event.target.value), placeholder: "T\u00ECm ki\u1EBFm voucher...", "aria-label": "T\u00ECm ki\u1EBFm voucher" }), error ? _jsxs("div", { className: "voucher-state", children: [_jsx("h2", { children: "Kh\u00F4ng th\u1EC3 t\u1EA3i voucher" }), _jsx("p", { children: error }), _jsx("button", { type: "button", onClick: () => setRetry(value => value + 1), children: "Th\u1EED l\u1EA1i" })] }) : loading ? _jsx("div", { className: "voucher-state", role: "status", children: "\u0110ang t\u1EA3i voucher..." }) : visible.length ? _jsx("div", { className: "voucher-grid", children: visible.map(entry => _jsx(VoucherCard, { entry: entry, preview: preview, scopeLabel: scopeLabel(entry), onCopy: code => void copy(code) }, entry.voucher.id)) }) : _jsxs("div", { className: "voucher-state", children: [_jsx("h2", { children: "Ch\u01B0a c\u00F3 voucher ph\u00F9 h\u1EE3p" }), _jsx("p", { children: source.length ? "Thử tìm tên hoặc chọn danh mục khác." : "Hiện chưa có voucher đang hoạt động." })] }), !preview && items.length > 0 && _jsx("p", { className: "voucher-footnote", children: "\u0110i\u1EC1u ki\u1EC7n v\u00E0 s\u1ED1 l\u01B0\u1EE3t s\u1EED d\u1EE5ng s\u1EBD \u0111\u01B0\u1EE3c ki\u1EC3m tra l\u1EA1i khi thanh to\u00E1n." })] });
}
