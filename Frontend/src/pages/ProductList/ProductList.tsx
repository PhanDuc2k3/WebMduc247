import { useEffect, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { Grid2X2, List, PackageSearch, Star } from "lucide-react";
import ContentBreadcrumb from "../../components/ui/ContentBreadcrumb";
import { catalogApi, type CatalogItem, type CatalogStore, type CategoryNode, type ProductQuery } from "../../api/catalogApi";
import { notifyCartChanged, orderV2Api, vnd } from "../../api/orderV2Api";
import { showImageFallback } from "../../utils/imageFallback";
import "./ProductList.css";
import "./ProductList.layout.css";

const PAGE_SIZE = 12;
const PRICE_CEILING = 20_000_000;

function flattenCategories(items: CategoryNode[]): CategoryNode[] {
  return items.flatMap(item => [item, ...flattenCategories(item.children)]);
}

function CatalogProductCard({ product }: { product: CatalogItem }) {
  const [adding, setAdding] = useState(false);
  const onSale = product.priceOriginalMinor > product.priceMinor;
  const discount = onSale ? Math.round((1 - product.priceMinor / product.priceOriginalMinor) * 100) : 0;

  async function addToCart() {
    setAdding(true);
    try {
      const detail = await catalogApi.product(product.id);
      const variant = detail.product.variants
        ?.filter(item => item.status === "active" && item.stock > 0)
        .sort((a, b) => a.priceMinor - b.priceMinor)[0];
      if (!variant) throw new Error("Sản phẩm hiện không còn hàng.");
      await orderV2Api.add(variant.id, 1);
      notifyCartChanged();
      toast.success(`Đã thêm ${product.name} vào giỏ.`, { containerId: "general-toast" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể thêm sản phẩm vào giỏ.", { containerId: "general-toast" });
    } finally {
      setAdding(false);
    }
  }

  return <article className="catalog-card">
    <div className="catalog-card__media">
      <Link to={`/products/${product.id}`} aria-label={`Xem ${product.name}`}>
        <img src={product.imageUrl || "/visual-placeholder.svg"} alt={product.name} loading="lazy" onError={showImageFallback} />
      </Link>
      {onSale && <span>-{discount}%</span>}
    </div>
    <div className="catalog-card__body">
      <small>{product.store?.name || product.brand || "MDUC247"}</small>
      <h2><Link to={`/products/${product.id}`}>{product.name}</Link></h2>
      <p className="catalog-card__rating">
        {product.rating != null ? <><Star aria-hidden="true" /> {product.rating.toFixed(1)}{product.reviewCount != null && product.reviewCount > 0 && <span>({product.reviewCount})</span>}</> : <span>Chưa có đánh giá</span>}
      </p>
      <p className="catalog-card__price"><strong>{vnd(product.priceMinor)}</strong>{onSale && <del>{vnd(product.priceOriginalMinor)}</del>}</p>
      <div className="catalog-card__meta"><span className={product.inStock ? "" : "is-out"}>{product.inStock ? "Còn hàng" : "Hết hàng"}</span>{product.soldCount != null && <small>Đã bán {product.soldCount.toLocaleString("vi-VN")}</small>}</div>
      <button type="button" disabled={!product.inStock || adding} onClick={() => void addToCart()}>{adding ? "Đang thêm..." : product.inStock ? "Thêm vào giỏ" : "Hết hàng"}</button>
    </div>
  </article>;
}

export default function ProductList() {
  const [params, setParams] = useSearchParams();
  const filterKey = params.toString();
  const page = Math.max(1, Number(params.get("page")) || 1);
  const [categories, setCategories] = useState<CategoryNode[]>([]);
  const [stores, setStores] = useState<CatalogStore[]>([]);
  const [products, setProducts] = useState<CatalogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState(params.get("search") || "");
  const [minPrice, setMinPrice] = useState(params.get("minPrice") || "");
  const [maxPrice, setMaxPrice] = useState(params.get("maxPrice") || "");
  const [storeSearch, setStoreSearch] = useState("");

  useEffect(() => {
    let active = true;
    catalogApi.categories()
      .then(tree => { if (active) setCategories(tree.categories); })
      .catch(() => { /* The product grid can still load when filter metadata is unavailable. */ });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      const search = storeSearch.trim();
      catalogApi.list(`?limit=${search ? 20 : 50}${search ? `&search=${encodeURIComponent(search)}` : ""}`, controller.signal)
        .then(result => { if (active) setStores(result.stores); })
        .catch(() => { if (active) setStores([]); });
    }, storeSearch ? 300 : 0);
    return () => { active = false; controller.abort(); window.clearTimeout(timer); };
  }, [storeSearch]);

  useEffect(() => {
    const current = new URLSearchParams(filterKey);
    setSearch(current.get("search") || "");
    setMinPrice(current.get("minPrice") || "");
    setMaxPrice(current.get("maxPrice") || "");
  }, [filterKey]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    const current = new URLSearchParams(filterKey);
    const options: ProductQuery = {
      page,
      limit: PAGE_SIZE,
      search: current.get("search") || undefined,
      category: current.get("category") || undefined,
      store: current.get("store") || undefined,
      minPrice: current.has("minPrice") ? Number(current.get("minPrice")) : undefined,
      maxPrice: current.has("maxPrice") ? Number(current.get("maxPrice")) : undefined,
      minRating: current.has("minRating") ? Number(current.get("minRating")) : undefined,
      inStock: current.get("inStock") === "true" ? true : undefined,
      sale: current.get("sale") === "true" ? true : undefined,
      sort: (current.get("sort") || "relevance") as ProductQuery["sort"],
    };
    const { search: keyword, ...filters } = options;
    (keyword
      ? catalogApi.searchProducts({ ...filters, q: keyword })
      : catalogApi.listProducts(options))
      .then(result => { if (active) { setProducts(result.products); setTotal(result.total); } })
      .catch(error => {
        if (active) {
          setProducts([]); setTotal(0);
          toast.error(error instanceof Error ? error.message : "Không thể tải sản phẩm.", { containerId: "general-toast", toastId: "catalog-list-error" });
        }
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [filterKey, page]);

  function updateFilters(changes: Record<string, string>) {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([key, value]) => {
      if (value) next.set(key, value);
      else next.delete(key);
    });
    next.delete("page");
    setParams(next);
  }

  function submitFilters(event: FormEvent) {
    event.preventDefault();
    const min = minPrice.trim() === "" ? "" : String(Math.max(0, Number(minPrice) || 0));
    const max = maxPrice.trim() === "" ? "" : String(Math.max(0, Number(maxPrice) || 0));
    if (min && max && Number(min) > Number(max)) {
      toast.error("Giá từ không được lớn hơn giá đến.", { containerId: "general-toast" });
      return;
    }
    updateFilters({ search: search.trim(), minPrice: min, maxPrice: max });
  }

  function selectPrice(min: string, max: string) {
    setMinPrice(min); setMaxPrice(max);
    updateFilters({ minPrice: min, maxPrice: max });
  }

  function goToPage(nextPage: number) {
    const next = new URLSearchParams(params);
    if (nextPage <= 1) next.delete("page");
    else next.set("page", String(nextPage));
    setParams(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const categoryOptions = flattenCategories(categories);
  const visibleStores = stores;
  const pageCount = Math.ceil(total / PAGE_SIZE);
  const firstPageButton = Math.max(1, Math.min(page - 2, pageCount - 4));
  const pageButtons = Array.from({ length: Math.min(pageCount, 5) }, (_, index) => firstPageButton + index);
  const first = total ? (page - 1) * PAGE_SIZE + 1 : 0;
  const last = Math.min(page * PAGE_SIZE, total);
  const hasFilters = ["search", "category", "store", "minPrice", "maxPrice", "minRating", "inStock", "sale"].some(key => params.has(key));

  return <div className="catalog-page">
    <ContentBreadcrumb items={[{ label: "Tất cả sản phẩm" }]} />
    <section className="catalog-promo" aria-labelledby="catalog-promo-title">
      <p>Gợi ý từ MDUC247</p>
      <h1 id="catalog-promo-title">Khám phá sản phẩm từ các gian hàng</h1>
      <a href="#catalog-results">Xem sản phẩm</a>
    </section>

    <div className="catalog-layout">
      <aside className="catalog-filter" aria-label="Bộ lọc sản phẩm">
        <h2>Bộ lọc</h2>
        <form onSubmit={submitFilters}>
          <section>
            <h3>Tìm kiếm</h3>
            <input className="catalog-brand-search" value={search} maxLength={100} onChange={event => setSearch(event.target.value)} placeholder="Tên sản phẩm, thương hiệu..." aria-label="Tìm kiếm sản phẩm" />
          </section>
          <section>
            <h3>Danh mục <span aria-hidden="true">⌄</span></h3>
            {categoryOptions.map(category => <label key={category.id}><input type="checkbox" checked={params.get("category") === category.slug} onChange={event => updateFilters({ category: event.target.checked ? category.slug : "" })} />{category.name}</label>)}
          </section>
          <section>
            <h3>Khoảng giá <span aria-hidden="true">⌄</span></h3>
            <input className="catalog-range" type="range" min="0" max={PRICE_CEILING} step="100000" value={maxPrice === "" ? PRICE_CEILING : Math.min(PRICE_CEILING, Number(maxPrice))} onChange={event => setMaxPrice(event.target.value)} onPointerUp={event => updateFilters({ maxPrice: event.currentTarget.value })} onKeyUp={event => updateFilters({ maxPrice: event.currentTarget.value })} aria-label="Giá tối đa" />
            <div className="catalog-price-inputs"><label>Từ giá<input type="number" min="0" value={minPrice} onChange={event => setMinPrice(event.target.value)} /></label><span>đ</span><label>Đến giá<input type="number" min="0" value={maxPrice} onChange={event => setMaxPrice(event.target.value)} /></label><span>đ</span></div>
            <div className="catalog-price-links"><button type="button" onClick={() => selectPrice("", "500000")}>Dưới 500.000đ</button><button type="button" onClick={() => selectPrice("500000", "2000000")}>500.000đ–2.000.000đ</button><button type="button" onClick={() => selectPrice("2000000", "5000000")}>2.000.000đ–5.000.000đ</button><button type="button" onClick={() => selectPrice("5000000", "")}>Trên 5.000.000đ</button></div>
          </section>
          <section>
            <h3>Cửa hàng <span aria-hidden="true">⌄</span></h3>
            <input className="catalog-brand-search" value={storeSearch} maxLength={100} onChange={event => setStoreSearch(event.target.value)} placeholder="Tìm cửa hàng..." aria-label="Tìm cửa hàng" />
            {visibleStores.map(store => <label key={store.id}><input type="checkbox" checked={params.get("store") === store.slug} onChange={event => updateFilters({ store: event.target.checked ? store.slug : "" })} />{store.name}{store.productCount != null && <small>{store.productCount}</small>}</label>)}
          </section>
          <section>
            <h3>Đánh giá <span aria-hidden="true">⌄</span></h3>
            {[5, 4, 3].map(stars => <label key={stars}><input type="radio" name="rating" checked={params.get("minRating") === String(stars)} onChange={() => updateFilters({ minRating: String(stars) })} /><span className="catalog-stars">{"★".repeat(stars)}</span> từ {stars} sao</label>)}
            {params.has("minRating") && <button className="catalog-text-action" type="button" onClick={() => updateFilters({ minRating: "" })}>Bỏ lọc đánh giá</button>}
          </section>
          <section>
            <h3>Tình trạng <span aria-hidden="true">⌄</span></h3>
            <label><input type="checkbox" checked={params.get("inStock") === "true"} onChange={event => updateFilters({ inStock: event.target.checked ? "true" : "" })} />Còn hàng</label>
            <label><input type="checkbox" checked={params.get("sale") === "true"} onChange={event => updateFilters({ sale: event.target.checked ? "true" : "" })} />Đang giảm giá</label>
          </section>
          <button className="catalog-apply" type="submit">Áp dụng tìm kiếm và giá</button>
          {hasFilters && <button className="catalog-clear" type="button" onClick={() => setParams(new URLSearchParams())}>Xóa tất cả</button>}
        </form>
      </aside>

      <main className="catalog-results" id="catalog-results">
        <div className="catalog-toolbar"><div><strong>{loading ? "Đang tải..." : `${total.toLocaleString("vi-VN")} sản phẩm`}</strong></div><div><span>Sắp xếp</span><select aria-label="Sắp xếp sản phẩm" value={params.get("sort") || "relevance"} onChange={event => updateFilters({ sort: event.target.value })}><option value="relevance">Liên quan nhất</option><option value="newest">Mới nhất</option><option value="price_asc">Giá tăng dần</option><option value="price_desc">Giá giảm dần</option></select><button type="button" className={view === "grid" ? "is-active" : ""} aria-label="Xem dạng lưới" aria-pressed={view === "grid"} onClick={() => setView("grid")}><Grid2X2 /></button><button type="button" className={view === "list" ? "is-active" : ""} aria-label="Xem dạng danh sách" aria-pressed={view === "list"} onClick={() => setView("list")}><List /></button></div></div>
        {loading ? <div className="catalog-loading" role="status"><PackageSearch /><span>Đang tải sản phẩm...</span></div> : products.length ? <div className={`catalog-grid${view === "list" ? " is-list" : ""}`}>{products.map(product => <CatalogProductCard key={product.id} product={product} />)}</div> : <div className="catalog-empty"><PackageSearch /><h2>Không có sản phẩm phù hợp</h2><p>Hãy thử điều chỉnh bộ lọc hoặc tìm kiếm khác.</p></div>}
        {!loading && <div className="catalog-pagination"><span>Hiển thị {first}–{last} trong {total.toLocaleString("vi-VN")} sản phẩm</span>{pageCount > 1 && <div>{pageButtons.map(number => <button type="button" key={number} className={number === page ? "is-active" : ""} aria-current={number === page ? "page" : undefined} onClick={() => goToPage(number)}>{number}</button>)}<button type="button" disabled={page >= pageCount} onClick={() => goToPage(page + 1)}>Tiếp theo →</button></div>}</div>}
      </main>
    </div>

    {categoryOptions.length > 0 && <section className="catalog-interests"><h2>Bạn có thể quan tâm</h2><div>{categoryOptions.slice(0, 6).map(category => <button type="button" key={category.id} onClick={() => { updateFilters({ category: category.slug }); document.getElementById("catalog-results")?.scrollIntoView({ behavior: "smooth" }); }}>{category.name}</button>)}</div></section>}
  </div>;
}
