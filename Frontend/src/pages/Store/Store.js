import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CalendarDays, FolderOpen, Heart, MessageCircle, Package, Star, Store as StoreIcon, Tag, TicketPercent } from "lucide-react";
import { toast } from "react-toastify";
import ContentBreadcrumb from "../../components/ui/ContentBreadcrumb";
import LiveProductCard from "../../components/Home/CanvaHome/LiveProductCard";
import { catalogApi } from "../../api/catalogApi";
import { chatV2Api } from "../../api/chatV2Api";
import { engagementApi } from "../../api/engagementApi";
import { vnd } from "../../api/orderV2Api";
import { showImageFallback } from "../../utils/imageFallback";
import "../../components/Home/CanvaHome/CanvaHome.css";
import "./Store.css";
const flatten = (items) => items.flatMap(item => [item, ...flatten(item.children)]);
export default function StorePage() {
    const { id = "" } = useParams();
    const navigate = useNavigate();
    const [store, setStore] = useState(null);
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [vouchers, setVouchers] = useState([]);
    const [tab, setTab] = useState("categories");
    const [loading, setLoading] = useState(true);
    const [openingChat, setOpeningChat] = useState(false);
    const [error, setError] = useState("");
    useEffect(() => {
        let active = true;
        setLoading(true);
        setError("");
        setStore(null);
        setProducts([]);
        setVouchers([]);
        Promise.all([catalogApi.store(id), catalogApi.publicProducts(id)]).then(([result, listing]) => {
            if (active) {
                setStore(result.store);
                setProducts(listing.products);
            }
        }).catch(cause => {
            if (active)
                setError(cause instanceof Error ? cause.message : "Không thể tải cửa hàng.");
        }).finally(() => { if (active)
            setLoading(false); });
        catalogApi.categories().then(result => { if (active)
            setCategories(flatten(result.categories)); }).catch(() => { });
        return () => { active = false; };
    }, [id]);
    useEffect(() => {
        if (!store?.id)
            return;
        let active = true;
        engagementApi.active().then(result => {
            if (active)
                setVouchers(result.promotions.filter(item => item.campaign.storeId === store.id));
        }).catch(() => { });
        return () => { active = false; };
    }, [store?.id]);
    async function openChat() {
        if (!store)
            return;
        setOpeningChat(true);
        try {
            const result = await chatV2Api.create(store.id);
            navigate(`/messages/${result.conversation.id}`);
        }
        catch (cause) {
            toast.error(cause instanceof Error ? cause.message : "Không thể mở hội thoại.", { containerId: "general-toast" });
        }
        finally {
            setOpeningChat(false);
        }
    }
    async function copy(code) {
        try {
            await navigator.clipboard.writeText(code);
            toast.success("Đã sao chép mã voucher shop.", { containerId: "general-toast" });
        }
        catch {
            toast.error("Không thể sao chép mã.", { containerId: "general-toast" });
        }
    }
    function save(code) {
        sessionStorage.setItem("cartStoreVoucherCode", code);
        toast.success("Đã lưu mã shop. Chọn sản phẩm của cửa hàng và áp dụng khi thanh toán.", { containerId: "general-toast" });
    }
    const banner = store?.bannerUrl;
    const logo = store?.logoUrl || products.find(item => item.imageUrl)?.imageUrl;
    const productCategories = categories.filter(category => products.some(product => product.categoryId === category.id));
    const tabs = [
        { value: "info", label: "Thông tin cửa hàng" },
        { value: "products", label: "Sản phẩm nổi bật" },
        { value: "categories", label: "Danh mục" },
        { value: "vouchers", label: `Voucher${vouchers.length ? ` (${vouchers.length})` : ""}` },
    ];
    return _jsxs("div", { className: "store-detail-page", children: [_jsx(ContentBreadcrumb, { items: [{ label: "Cửa hàng", to: "/store" }, { label: store?.name || "Chi tiết cửa hàng" }] }), loading ? _jsx("div", { className: "store-detail-state", role: "status", children: "\u0110ang t\u1EA3i c\u1EEDa h\u00E0ng..." }) : !store ? _jsxs("div", { className: "store-detail-state", children: [_jsx("h1", { children: "Kh\u00F4ng th\u1EC3 hi\u1EC3n th\u1ECB c\u1EEDa h\u00E0ng" }), _jsx("p", { children: error || "Không tìm thấy cửa hàng." }), _jsx(Link, { to: "/store", children: "Xem c\u00E1c c\u1EEDa h\u00E0ng kh\u00E1c" })] }) : _jsxs(_Fragment, { children: [_jsxs("section", { className: "store-detail-hero", "aria-labelledby": "store-detail-name", children: [_jsx("div", { className: "store-detail-hero__banner", children: banner ? _jsx("img", { src: banner, alt: "", onError: showImageFallback }) : _jsx(Package, { size: 120, strokeWidth: 1.4 }) }), _jsxs("div", { className: "store-detail-hero__content", children: [_jsxs("div", { className: "store-detail-hero__identity", children: [_jsx("span", { className: "store-detail-hero__logo", children: logo ? _jsx("img", { src: logo, alt: "", onError: showImageFallback }) : _jsx(StoreIcon, { size: 38 }) }), _jsxs("div", { children: [_jsxs("div", { className: "store-detail-hero__name", children: [_jsx("h1", { id: "store-detail-name", children: store.name }), _jsxs("span", { children: [_jsx(StoreIcon, { size: 13 }), " ", store.category || "Gian hàng"] })] }), _jsx("p", { children: store.description || "Khám phá sản phẩm của cửa hàng này." })] }), _jsxs("div", { className: "store-detail-hero__actions", children: [_jsxs("button", { type: "button", disabled: openingChat, onClick: () => void openChat(), children: [_jsx(MessageCircle, { size: 18 }), " ", openingChat ? "Đang mở..." : "Chat ngay"] }), _jsxs("button", { type: "button", disabled: true, title: "Theo d\u00F5i c\u1EEDa h\u00E0ng ch\u01B0a kh\u1EA3 d\u1EE5ng", children: [_jsx(Heart, { size: 17 }), " Y\u00EAu th\u00EDch"] })] })] }), _jsxs("div", { className: "store-detail-stats", children: [_jsxs("div", { children: [_jsx("strong", { children: store.rating != null ? _jsxs(_Fragment, { children: [_jsx(Star, { size: 16 }), " ", store.rating.toFixed(1)] }) : "—" }), _jsx("span", { children: "\u0110\u00E1nh gi\u00E1" })] }), _jsxs("div", { children: [_jsx("strong", { children: store.productCount ?? products.length }), _jsxs("span", { children: [_jsx(Package, { size: 13 }), " S\u1EA3n ph\u1EA9m"] })] }), _jsxs("div", { children: [_jsx("strong", { children: store.followers ?? "—" }), _jsxs("span", { children: [_jsx(Heart, { size: 13 }), " Ng\u01B0\u1EDDi theo d\u00F5i"] })] }), _jsxs("div", { children: [_jsx("strong", { children: new Date(store.createdAt).toLocaleDateString("vi-VN") }), _jsxs("span", { children: [_jsx(CalendarDays, { size: 13 }), " Ng\u00E0y t\u1EA1o"] })] })] })] })] }), _jsx("nav", { className: "store-detail-tabs", role: "tablist", "aria-label": "N\u1ED9i dung c\u1EEDa h\u00E0ng", children: tabs.map(item => _jsx("button", { type: "button", role: "tab", className: tab === item.value ? "is-active" : "", "aria-selected": tab === item.value, onClick: () => setTab(item.value), children: item.label }, item.value)) }), _jsxs("section", { className: "store-detail-content", role: "tabpanel", children: [tab === "categories" && _jsxs("div", { className: "store-detail-category-panel", children: [_jsxs("header", { children: [_jsxs("h2", { children: [_jsx(FolderOpen, { size: 26 }), " Danh m\u1EE5c s\u1EA3n ph\u1EA9m"] }), _jsx("p", { children: "Ch\u1ECDn danh m\u1EE5c \u0111\u1EC3 xem s\u1EA3n ph\u1EA9m \u0111ang b\u00E1n t\u1EA1i c\u1EEDa h\u00E0ng." })] }), productCategories.length ? _jsx("div", { className: "store-detail-categories", children: productCategories.map(category => _jsxs(Link, { to: `/products?store=${encodeURIComponent(store.slug)}&category=${encodeURIComponent(category.slug)}`, children: [_jsx(FolderOpen, { size: 27 }), _jsx("strong", { children: category.name }), _jsxs("small", { children: [products.filter(product => product.categoryId === category.id).length, " s\u1EA3n ph\u1EA9m"] })] }, category.id)) }) : _jsx("p", { className: "store-detail-empty", children: "C\u1EEDa h\u00E0ng ch\u01B0a c\u00F3 danh m\u1EE5c s\u1EA3n ph\u1EA9m \u0111ang b\u00E1n." })] }), tab === "products" && _jsxs("div", { className: "store-detail-products", children: [_jsxs("header", { children: [_jsx("h2", { children: "S\u1EA3n ph\u1EA9m \u0111ang b\u00E1n" }), _jsx(Link, { to: `/products?store=${encodeURIComponent(store.slug)}`, children: "Xem t\u1EA5t c\u1EA3 \u2192" })] }), products.length ? _jsx("div", { className: "store-detail-products__grid", children: products.map(product => _jsx(LiveProductCard, { product: product }, product.id)) }) : _jsx("p", { className: "store-detail-empty", children: "C\u1EEDa h\u00E0ng ch\u01B0a c\u00F3 s\u1EA3n ph\u1EA9m \u0111ang b\u00E1n." })] }), tab === "info" && _jsxs("div", { className: "store-detail-info", children: [_jsx("h2", { children: "Th\u00F4ng tin c\u1EEDa h\u00E0ng" }), _jsx("p", { children: store.description || "Cửa hàng chưa cập nhật giới thiệu." }), _jsxs("div", { children: [_jsxs("span", { children: ["Ng\u00E0nh h\u00E0ng", _jsx("strong", { children: store.category || "Chưa cập nhật" })] }), _jsxs("span", { children: ["Tham gia", _jsx("strong", { children: new Date(store.createdAt).toLocaleDateString("vi-VN") })] }), _jsxs("span", { children: ["S\u1EA3n ph\u1EA9m \u0111ang b\u00E1n", _jsx("strong", { children: store.productCount ?? products.length })] })] }), store.contactInfo?.email && _jsxs("p", { children: ["Email: ", _jsx("a", { href: `mailto:${store.contactInfo.email}`, children: store.contactInfo.email })] }), store.contactInfo?.phone && _jsxs("p", { children: ["\u0110i\u1EC7n tho\u1EA1i: ", store.contactInfo.phone] }), typeof store.businessHours?.text === "string" && store.businessHours.text && _jsxs("p", { children: ["Gi\u1EDD ho\u1EA1t \u0111\u1ED9ng: ", store.businessHours.text] })] }), tab === "vouchers" && _jsxs("div", { className: "store-detail-vouchers", children: [_jsxs("header", { children: [_jsxs("h2", { children: [_jsx(TicketPercent, { size: 25 }), " Voucher c\u1EE7a c\u1EEDa h\u00E0ng"] }), _jsx("p", { children: "Voucher shop c\u00F3 th\u1EC3 d\u00F9ng c\u00F9ng m\u1ED9t voucher s\u00E0n; s\u1ED1 ti\u1EC1n gi\u1EA3m \u0111\u01B0\u1EE3c x\u00E1c nh\u1EADn t\u1EA1i checkout." })] }), vouchers.length ? _jsx("div", { className: "store-detail-vouchers__grid", children: vouchers.map(({ campaign, voucher }) => _jsxs("article", { children: [_jsxs("div", { children: [_jsx("h3", { children: campaign.title }), _jsx("span", { children: voucher.code })] }), _jsx("strong", { children: voucher.discountType === "FIXED" ? `Giảm ${vnd(voucher.discountValue)}` : `Giảm ${voucher.discountValue / 100}%` }), _jsxs("p", { children: ["\u0110\u01A1n t\u1EEB ", vnd(voucher.minSpendMinor), " \u00B7 H\u1EBFt h\u1EA1n ", new Date(campaign.endsAt).toLocaleDateString("vi-VN")] }), _jsxs("small", { children: ["C\u00F2n ", Math.max(0, voucher.totalLimit - voucher.usedCount - voucher.reservedCount), " l\u01B0\u1EE3t"] }), _jsxs("footer", { children: [_jsx("button", { type: "button", onClick: () => void copy(voucher.code), children: "Sao ch\u00E9p m\u00E3" }), _jsx("button", { type: "button", onClick: () => save(voucher.code), children: "L\u01B0u \u0111\u1EC3 thanh to\u00E1n" })] })] }, voucher.id)) }) : _jsx("p", { className: "store-detail-empty", children: "C\u1EEDa h\u00E0ng ch\u01B0a c\u00F3 voucher \u0111ang ho\u1EA1t \u0111\u1ED9ng." }), _jsxs(Link, { className: "store-detail-vouchers__platform", to: "/voucher", children: [_jsx(Tag, { size: 16 }), " Xem voucher s\u00E0n"] })] })] })] })] });
}
