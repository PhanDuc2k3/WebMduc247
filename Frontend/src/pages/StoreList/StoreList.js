import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowDownAZ, CalendarDays, ChevronLeft, ChevronRight, MessageCircle, Package, Search, Store as StoreIcon, Tag } from "lucide-react";
import { toast } from "react-toastify";
import ContentBreadcrumb from "../../components/ui/ContentBreadcrumb";
import { catalogApi } from "../../api/catalogApi";
import { chatV2Api } from "../../api/chatV2Api";
import { showImageFallback } from "../../utils/imageFallback";
import "./StoreList.css";
const PAGE_SIZE = 9;
function StoreCard({ store, cover }) {
    const navigate = useNavigate();
    const [openingChat, setOpeningChat] = useState(false);
    async function openChat() {
        setOpeningChat(true);
        try {
            const result = await chatV2Api.create(store.id);
            navigate(`/messages/${result.conversation.id}`);
        }
        catch (error) {
            toast.error(error instanceof Error ? error.message : "Không thể mở tin nhắn với cửa hàng.", { containerId: "general-toast" });
        }
        finally {
            setOpeningChat(false);
        }
    }
    return _jsxs("article", { className: "store-directory-card", children: [_jsx(Link, { className: "store-directory-card__banner", to: `/store/${store.slug}`, "aria-label": `Xem ${store.name}`, children: store.bannerUrl || cover ? _jsx("img", { src: store.bannerUrl || cover || "", alt: "", loading: "lazy", onError: showImageFallback }) : _jsx("span", { children: _jsx(Package, { size: 52, strokeWidth: 1.5 }) }) }), _jsxs("div", { className: "store-directory-card__body", children: [_jsxs("div", { className: "store-directory-card__identity", children: [_jsx("span", { className: "store-directory-card__logo", children: store.logoUrl ? _jsx("img", { src: store.logoUrl, alt: "", loading: "lazy", onError: showImageFallback }) : _jsx(StoreIcon, { size: 23 }) }), _jsxs("div", { children: [_jsx(Link, { to: `/store/${store.slug}`, children: store.name }), _jsxs("small", { children: [_jsx(CalendarDays, { size: 13 }), " Tham gia ", new Date(store.createdAt).toLocaleDateString("vi-VN")] })] })] }), _jsx("p", { className: "store-directory-card__description", children: store.description || "Khám phá sản phẩm đang bán tại cửa hàng." }), _jsxs("div", { className: "store-directory-card__tags", children: [store.category && _jsx("span", { children: store.category }), store.productCount != null && _jsxs("span", { children: [store.productCount, " s\u1EA3n ph\u1EA9m"] })] }), _jsxs("div", { className: "store-directory-card__actions", children: [_jsxs(Link, { to: `/store/${store.slug}`, children: [_jsx(StoreIcon, { size: 16 }), " Xem c\u1EEDa h\u00E0ng"] }), _jsxs("button", { type: "button", disabled: openingChat, onClick: () => void openChat(), children: [_jsx(MessageCircle, { size: 16 }), " ", openingChat ? "Đang mở..." : "Chat"] })] })] })] });
}
export default function StoreList() {
    const [params, setParams] = useSearchParams();
    const filterKey = params.toString();
    const rawPage = Number(params.get("page"));
    const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
    const keyword = params.get("search") || "";
    const category = params.get("category") || "";
    const sort = params.get("sort") === "name" ? "name" : "newest";
    const [search, setSearch] = useState(keyword);
    const [categories, setCategories] = useState([]);
    const [stores, setStores] = useState([]);
    const [covers, setCovers] = useState({});
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [retry, setRetry] = useState(0);
    useEffect(() => { setSearch(keyword); }, [keyword]);
    useEffect(() => {
        let active = true;
        catalogApi.storeCategories().then(result => { if (active)
            setCategories(result.categories); }).catch(() => { });
        return () => { active = false; };
    }, []);
    useEffect(() => {
        let active = true;
        setLoading(true);
        setError("");
        setCovers({});
        const query = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE), sort });
        if (keyword)
            query.set("search", keyword);
        if (category)
            query.set("category", category);
        catalogApi.list(`?${query}`).then(result => {
            if (!active)
                return;
            setStores(result.stores);
            setTotal(result.total);
            setLoading(false);
            const missingCover = result.stores.filter(store => !store.bannerUrl && (store.productCount ?? 0) > 0);
            void Promise.allSettled(missingCover.map(store => catalogApi.listProducts({ store: store.slug, page: 1, limit: 1 }))).then(results => {
                if (!active)
                    return;
                const next = {};
                results.forEach((item, index) => { if (item.status === "fulfilled")
                    next[missingCover[index].id] = item.value.products[0]?.imageUrl || null; });
                setCovers(next);
            });
        }).catch(cause => {
            if (active) {
                setStores([]);
                setTotal(0);
                setError(cause instanceof Error ? cause.message : "Không thể tải cửa hàng.");
                setLoading(false);
            }
        });
        return () => { active = false; };
    }, [filterKey, page, sort, keyword, category, retry]);
    function updateFilters(changes) {
        const next = new URLSearchParams(params);
        Object.entries(changes).forEach(([key, value]) => { if (value)
            next.set(key, value);
        else
            next.delete(key); });
        next.delete("page");
        setParams(next);
    }
    function submitSearch(event) { event.preventDefault(); updateFilters({ search: search.trim() }); }
    function goToPage(nextPage) {
        const next = new URLSearchParams(params);
        if (nextPage <= 1)
            next.delete("page");
        else
            next.set("page", String(nextPage));
        setParams(next);
        window.scrollTo({ top: 0, behavior: "smooth" });
    }
    const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const start = total ? (page - 1) * PAGE_SIZE + 1 : 0;
    const end = Math.min(page * PAGE_SIZE, total);
    const firstPageButton = Math.max(1, Math.min(page - 2, pageCount - 4));
    const pageButtons = Array.from({ length: Math.min(pageCount, 5) }, (_, index) => firstPageButton + index);
    return _jsxs("div", { className: "store-directory", children: [_jsx(ContentBreadcrumb, { items: [{ label: "Cửa hàng" }] }), _jsx("h1", { className: "sr-only", children: "C\u1EEDa h\u00E0ng" }), _jsxs("div", { className: "store-directory-filters", children: [_jsxs("label", { className: "store-directory-filter", children: [_jsx(ArrowDownAZ, { size: 17 }), _jsx("span", { children: "S\u1EAFp x\u1EBFp" }), _jsxs("select", { value: sort, onChange: event => updateFilters({ sort: event.target.value === "newest" ? "" : event.target.value }), "aria-label": "S\u1EAFp x\u1EBFp c\u1EEDa h\u00E0ng", children: [_jsx("option", { value: "newest", children: "M\u1EDBi nh\u1EA5t" }), _jsx("option", { value: "name", children: "T\u00EAn A\u2013Z" })] })] }), _jsxs("form", { onSubmit: submitSearch, className: "store-directory-filter store-directory-search", children: [_jsx(Search, { size: 17 }), _jsx("input", { value: search, maxLength: 100, onChange: event => setSearch(event.target.value), placeholder: "T\u00ECm t\u00EAn c\u1EEDa h\u00E0ng", "aria-label": "T\u00ECm t\u00EAn c\u1EEDa h\u00E0ng" }), _jsx("button", { type: "submit", "aria-label": "T\u00ECm ki\u1EBFm c\u1EEDa h\u00E0ng", children: _jsx(Search, { size: 15 }) })] }), _jsxs("label", { className: "store-directory-filter", children: [_jsx(Tag, { size: 17 }), _jsx("span", { children: "Ng\u00E0nh h\u00E0ng" }), _jsxs("select", { value: category, onChange: event => updateFilters({ category: event.target.value }), "aria-label": "L\u1ECDc ng\u00E0nh h\u00E0ng", children: [_jsx("option", { value: "", children: "T\u1EA5t c\u1EA3 ng\u00E0nh h\u00E0ng" }), categories.map(item => _jsx("option", { value: item, children: item }, item))] })] })] }), _jsxs("p", { className: "store-directory-count", children: ["T\u00ECm th\u1EA5y ", _jsx("strong", { children: total.toLocaleString("vi-VN") }), " c\u1EEDa h\u00E0ng"] }), error ? _jsxs("div", { className: "store-directory-state", children: [_jsx(StoreIcon, { size: 32 }), _jsx("h2", { children: "Kh\u00F4ng th\u1EC3 t\u1EA3i c\u1EEDa h\u00E0ng" }), _jsx("p", { children: error }), _jsx("button", { type: "button", onClick: () => setRetry(value => value + 1), children: "Th\u1EED l\u1EA1i" })] }) : loading ? _jsxs("div", { className: "store-directory-state", role: "status", children: [_jsx(StoreIcon, { size: 32 }), _jsx("p", { children: "\u0110ang t\u1EA3i c\u1EEDa h\u00E0ng..." })] }) : stores.length ? _jsxs(_Fragment, { children: [_jsx("div", { className: "store-directory-grid", children: stores.map(store => _jsx(StoreCard, { store: store, cover: covers[store.id] }, store.id)) }), _jsxs("nav", { className: "store-directory-pagination", "aria-label": "Ph\u00E2n trang c\u1EEDa h\u00E0ng", children: [_jsxs("span", { children: ["Hi\u1EC3n th\u1ECB ", _jsxs("strong", { children: [start, " \u2013 ", end] }), " trong t\u1ED5ng s\u1ED1 ", _jsx("strong", { children: total.toLocaleString("vi-VN") }), " c\u1EEDa h\u00E0ng"] }), pageCount > 1 && _jsxs("div", { children: [_jsxs("span", { children: ["Trang ", page, " / ", pageCount] }), _jsx("button", { type: "button", disabled: page <= 1, onClick: () => goToPage(page - 1), "aria-label": "Trang tr\u01B0\u1EDBc", children: _jsx(ChevronLeft, { size: 16 }) }), pageButtons.map(number => _jsx("button", { type: "button", className: number === page ? "is-active" : "", "aria-current": number === page ? "page" : undefined, onClick: () => goToPage(number), children: number }, number)), _jsx("button", { type: "button", disabled: page >= pageCount, onClick: () => goToPage(page + 1), "aria-label": "Trang sau", children: _jsx(ChevronRight, { size: 16 }) })] })] })] }) : _jsxs("div", { className: "store-directory-state", children: [_jsx(StoreIcon, { size: 32 }), _jsx("h2", { children: "Kh\u00F4ng t\u00ECm th\u1EA5y c\u1EEDa h\u00E0ng" }), _jsx("p", { children: "Th\u1EED t\u00ECm t\u00EAn kh\u00E1c ho\u1EB7c ch\u1ECDn t\u1EA5t c\u1EA3 ng\u00E0nh h\u00E0ng." }), _jsx("button", { type: "button", onClick: () => setParams(new URLSearchParams()), children: "X\u00F3a b\u1ED9 l\u1ECDc" })] })] });
}
