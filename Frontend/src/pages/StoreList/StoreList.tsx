import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowDownAZ, CalendarDays, ChevronLeft, ChevronRight, MessageCircle, Package, Search, Store as StoreIcon, Tag } from "lucide-react";
import { toast } from "react-toastify";
import ContentBreadcrumb from "../../components/ui/ContentBreadcrumb";
import { catalogApi, type CatalogStore } from "../../api/catalogApi";
import { chatV2Api } from "../../api/chatV2Api";
import { showImageFallback } from "../../utils/imageFallback";
import "./StoreList.css";

const PAGE_SIZE = 9;

function StoreCard({ store, cover }: { store: CatalogStore; cover?: string | null }) {
  const navigate = useNavigate();
  const [openingChat, setOpeningChat] = useState(false);

  async function openChat() {
    setOpeningChat(true);
    try {
      const result = await chatV2Api.create(store.id);
      navigate(`/messages/${result.conversation.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể mở tin nhắn với cửa hàng.", { containerId: "general-toast" });
    } finally { setOpeningChat(false); }
  }

  return <article className="store-directory-card">
    <Link className="store-directory-card__banner" to={`/store/${store.slug}`} aria-label={`Xem ${store.name}`}>
      {store.bannerUrl || cover ? <img src={store.bannerUrl || cover || ""} alt="" loading="lazy" onError={showImageFallback} /> : <span><Package size={52} strokeWidth={1.5} /></span>}
    </Link>
    <div className="store-directory-card__body">
      <div className="store-directory-card__identity"><span className="store-directory-card__logo">{store.logoUrl ? <img src={store.logoUrl} alt="" loading="lazy" onError={showImageFallback} /> : <StoreIcon size={23} />}</span><div><Link to={`/store/${store.slug}`}>{store.name}</Link><small><CalendarDays size={13} /> Tham gia {new Date(store.createdAt).toLocaleDateString("vi-VN")}</small></div></div>
      <p className="store-directory-card__description">{store.description || "Khám phá sản phẩm đang bán tại cửa hàng."}</p>
      <div className="store-directory-card__tags">{store.category && <span>{store.category}</span>}{store.productCount != null && <span>{store.productCount} sản phẩm</span>}</div>
      <div className="store-directory-card__actions"><Link to={`/store/${store.slug}`}><StoreIcon size={16} /> Xem cửa hàng</Link><button type="button" disabled={openingChat} onClick={() => void openChat()}><MessageCircle size={16} /> {openingChat ? "Đang mở..." : "Chat"}</button></div>
    </div>
  </article>;
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
  const [categories, setCategories] = useState<string[]>([]);
  const [stores, setStores] = useState<CatalogStore[]>([]);
  const [covers, setCovers] = useState<Record<string, string | null>>({});
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => { setSearch(keyword); }, [keyword]);
  useEffect(() => {
    let active = true;
    catalogApi.storeCategories().then(result => { if (active) setCategories(result.categories); }).catch(() => {});
    return () => { active = false; };
  }, []);
  useEffect(() => {
    let active = true;
    setLoading(true); setError(""); setCovers({});
    const query = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE), sort });
    if (keyword) query.set("search", keyword);
    if (category) query.set("category", category);
    catalogApi.list(`?${query}`).then(result => {
      if (!active) return;
      setStores(result.stores); setTotal(result.total); setLoading(false);
      const missingCover = result.stores.filter(store => !store.bannerUrl && (store.productCount ?? 0) > 0);
      void Promise.allSettled(missingCover.map(store => catalogApi.listProducts({ store: store.slug, page: 1, limit: 1 }))).then(results => {
        if (!active) return;
        const next: Record<string, string | null> = {};
        results.forEach((item, index) => { if (item.status === "fulfilled") next[missingCover[index].id] = item.value.products[0]?.imageUrl || null; });
        setCovers(next);
      });
    }).catch(cause => {
      if (active) { setStores([]); setTotal(0); setError(cause instanceof Error ? cause.message : "Không thể tải cửa hàng."); setLoading(false); }
    });
    return () => { active = false; };
  }, [filterKey, page, sort, keyword, category, retry]);

  function updateFilters(changes: Record<string, string>) {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([key, value]) => { if (value) next.set(key, value); else next.delete(key); });
    next.delete("page");
    setParams(next);
  }
  function submitSearch(event: FormEvent) { event.preventDefault(); updateFilters({ search: search.trim() }); }
  function goToPage(nextPage: number) {
    const next = new URLSearchParams(params);
    if (nextPage <= 1) next.delete("page"); else next.set("page", String(nextPage));
    setParams(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const start = total ? (page - 1) * PAGE_SIZE + 1 : 0;
  const end = Math.min(page * PAGE_SIZE, total);
  const firstPageButton = Math.max(1, Math.min(page - 2, pageCount - 4));
  const pageButtons = Array.from({ length: Math.min(pageCount, 5) }, (_, index) => firstPageButton + index);

  return <div className="store-directory">
    <ContentBreadcrumb items={[{ label: "Cửa hàng" }]} />
    <h1 className="sr-only">Cửa hàng</h1>
    <div className="store-directory-filters">
      <label className="store-directory-filter"><ArrowDownAZ size={17} /><span>Sắp xếp</span><select value={sort} onChange={event => updateFilters({ sort: event.target.value === "newest" ? "" : event.target.value })} aria-label="Sắp xếp cửa hàng"><option value="newest">Mới nhất</option><option value="name">Tên A–Z</option></select></label>
      <form onSubmit={submitSearch} className="store-directory-filter store-directory-search"><Search size={17} /><input value={search} maxLength={100} onChange={event => setSearch(event.target.value)} placeholder="Tìm tên cửa hàng" aria-label="Tìm tên cửa hàng" /><button type="submit" aria-label="Tìm kiếm cửa hàng"><Search size={15} /></button></form>
      <label className="store-directory-filter"><Tag size={17} /><span>Ngành hàng</span><select value={category} onChange={event => updateFilters({ category: event.target.value })} aria-label="Lọc ngành hàng"><option value="">Tất cả ngành hàng</option>{categories.map(item => <option key={item} value={item}>{item}</option>)}</select></label>
    </div>
    <p className="store-directory-count">Tìm thấy <strong>{total.toLocaleString("vi-VN")}</strong> cửa hàng</p>
    {error ? <div className="store-directory-state"><StoreIcon size={32} /><h2>Không thể tải cửa hàng</h2><p>{error}</p><button type="button" onClick={() => setRetry(value => value + 1)}>Thử lại</button></div> : loading ? <div className="store-directory-state" role="status"><StoreIcon size={32} /><p>Đang tải cửa hàng...</p></div> : stores.length ? <><div className="store-directory-grid">{stores.map(store => <StoreCard key={store.id} store={store} cover={covers[store.id]} />)}</div><nav className="store-directory-pagination" aria-label="Phân trang cửa hàng"><span>Hiển thị <strong>{start} – {end}</strong> trong tổng số <strong>{total.toLocaleString("vi-VN")}</strong> cửa hàng</span>{pageCount > 1 && <div><span>Trang {page} / {pageCount}</span><button type="button" disabled={page <= 1} onClick={() => goToPage(page - 1)} aria-label="Trang trước"><ChevronLeft size={16} /></button>{pageButtons.map(number => <button type="button" key={number} className={number === page ? "is-active" : ""} aria-current={number === page ? "page" : undefined} onClick={() => goToPage(number)}>{number}</button>)}<button type="button" disabled={page >= pageCount} onClick={() => goToPage(page + 1)} aria-label="Trang sau"><ChevronRight size={16} /></button></div>}</nav></> : <div className="store-directory-state"><StoreIcon size={32} /><h2>Không tìm thấy cửa hàng</h2><p>Thử tìm tên khác hoặc chọn tất cả ngành hàng.</p><button type="button" onClick={() => setParams(new URLSearchParams())}>Xóa bộ lọc</button></div>}
  </div>;
}
