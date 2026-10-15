import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Grid2X2, Heart, List, PackageSearch, Star } from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import cartApi from "../../api/cartApi";
import productApi from "../../api/productApi";
import { useCart } from "../../context/CartContext";
import type { ProductType } from "../../types/product";
import "./ProductList.css";
import { showImageFallback } from "../../utils/imageFallback";

const categoryOptions = [
  ["electronics", "Điện tử", "electronics"],
  ["fashion", "Thời trang", "fashion"],
  ["home", "Nhà cửa & Đời sống", "home"],
  ["beauty", "Làm đẹp", "beauty"],
  ["sports", "Thể thao", "sports"],
  ["food", "Thực phẩm", "food"],
  ["books", "Sách & Văn phòng phẩm", "books"],
] as const;

const categoryNames: Record<string, string> = {
  electronics: "Điện tử",
  fashion: "Thời trang",
  home: "Nhà cửa & Đời sống",
  beauty: "Làm đẹp",
  sports: "Thể thao",
  food: "Thực phẩm",
  books: "Sách & Văn phòng phẩm",
};

const ProductList = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { fetchCart } = useCart();
  const [products, setProducts] = useState<ProductType[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [brandQuery, setBrandQuery] = useState("");
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(30000000);
  const [minRating, setMinRating] = useState(0);
  const [saleOnly, setSaleOnly] = useState(searchParams.get("sale") === "true");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [freeShipOnly, setFreeShipOnly] = useState(false);
  const [sort, setSort] = useState("relevant");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  const urlCategory = searchParams.get("category") || "";
  const searchTerm = searchParams.get("search") || "";
  const saleParam = searchParams.get("sale") === "true";

  useEffect(() => setSaleOnly(saleParam), [saleParam]);

  useEffect(() => {
    let active = true;
    const loadProducts = async () => {
      setLoading(true);
      try {
        const response = searchTerm
          ? await productApi.searchProducts(searchTerm, 100)
          : await productApi.getProducts({ limit: 100, ...(urlCategory ? { category: urlCategory } : {}) });
        const payload = response.data as { data?: ProductType[]; products?: ProductType[] } | ProductType[];
        const list = Array.isArray(payload) ? payload : payload.data || payload.products || [];
        if (active) setProducts(list);
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadProducts();
    return () => { active = false; };
  }, [searchTerm, urlCategory]);

  useEffect(() => {
      if (urlCategory) setSelectedCategories([urlCategory]);
      else setSelectedCategories([]);
  }, [urlCategory]);

  const getBrand = (product: ProductType) => typeof product.store === "object" ? product.store.name || product.brand : product.brand;
  const brands = useMemo(() => Array.from(new Set(products.map(getBrand).filter(Boolean))), [products]);

  const filteredProducts = useMemo(() => {
    const result = products.filter((product) => {
      const price = product.salePrice ?? product.price;
      const categoryMatch = selectedCategories.length === 0 || selectedCategories.some((selected) => (categoryOptions.find((option) => option[0] === selected)?.[2] || selected) === product.category);
      const brandMatch = selectedBrands.length === 0 || selectedBrands.includes(getBrand(product));
      return categoryMatch && brandMatch && price >= minPrice && price <= maxPrice && (product.rating || 0) >= minRating && (!saleOnly || Boolean(product.salePrice && product.salePrice < product.price)) && (!inStockOnly || product.quantity > 0);
    });
    return [...result].sort((a, b) => {
      if (sort === "price-low") return (a.salePrice ?? a.price) - (b.salePrice ?? b.price);
      if (sort === "price-high") return (b.salePrice ?? b.price) - (a.salePrice ?? a.price);
      if (sort === "newest") return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      if (sort === "bestselling") return (b.soldCount || 0) - (a.soldCount || 0);
      return Number(b.isFeatured) - Number(a.isFeatured) || (b.rating || 0) - (a.rating || 0);
    });
  }, [inStockOnly, maxPrice, minPrice, minRating, products, saleOnly, selectedBrands, selectedCategories, sort]);

  const pageSize = 12;
  const pageCount = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const visibleProducts = filteredProducts.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => setPage(1), [selectedCategories, selectedBrands, minPrice, maxPrice, minRating, saleOnly, inStockOnly, freeShipOnly, sort]);

  const toggleValue = (value: string, setter: React.Dispatch<React.SetStateAction<string[]>>) => setter((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  const clearFilters = () => { setSelectedCategories([]); setSelectedBrands([]); setMinPrice(0); setMaxPrice(30000000); setMinRating(0); setSaleOnly(false); setInStockOnly(false); setFreeShipOnly(false); };

  const addToCart = async (product: ProductType) => {
    await cartApi.addToCart({ productId: product._id, quantity: 1, variation: { color: "Đen", size: "Tiêu chuẩn", additionalPrice: 0 } });
    await fetchCart();
    toast.success(`Đã thêm ${product.name} vào giỏ`, { containerId: "general-toast" });
  };

  const title = searchTerm ? `Kết quả cho “${searchTerm}”` : urlCategory ? categoryNames[urlCategory] || urlCategory : "Tất cả sản phẩm";
  return (
    <div className="catalog-page">
      <nav className="catalog-breadcrumb"><Link to="/">Trang chủ</Link><span>/</span><strong>{title}</strong></nav>
      <section className="catalog-promo"><div><p>Gợi ý từ MDUC247</p><h2>Khám phá sản phẩm đang giảm giá</h2><Link to="/products?sale=true">Xem sản phẩm</Link></div></section>

      <div className="catalog-layout">
        <aside className={`catalog-filter ${filtersOpen ? "is-open" : ""}`}>
          <h2>Bộ lọc</h2>
          <button className="catalog-filter-toggle" type="button" aria-expanded={filtersOpen} onClick={() => setFiltersOpen((open) => !open)}>Bộ lọc sản phẩm <ChevronDown size={18} /></button>
          <section><h3>Danh mục <span>⌄</span></h3>{categoryOptions.map(([value, label]) => <label key={value}><input type="checkbox" checked={selectedCategories.includes(value)} onChange={() => toggleValue(value, setSelectedCategories)} />{label}</label>)}</section>
          <section><h3>Khoảng giá <span>⌄</span></h3><input className="catalog-range" type="range" min="0" max="30000000" step="100000" value={maxPrice} onChange={(event) => setMaxPrice(Number(event.target.value))} /><div className="catalog-price-inputs"><label>Từ giá<input type="number" value={minPrice} onChange={(event) => setMinPrice(Number(event.target.value))} /></label><span>đ</span><label>Đến giá<input type="number" value={maxPrice} onChange={(event) => setMaxPrice(Number(event.target.value))} /></label><span>đ</span></div><div className="catalog-price-links"><button type="button" onClick={() => { setMinPrice(0); setMaxPrice(500000); }}>Dưới 500.000đ</button><button type="button" onClick={() => { setMinPrice(500000); setMaxPrice(2000000); }}>500.000đ–2.000.000đ</button><button type="button" onClick={() => { setMinPrice(2000000); setMaxPrice(5000000); }}>2.000.000đ–5.000.000đ</button><button type="button" onClick={() => { setMinPrice(5000000); setMaxPrice(30000000); }}>Trên 5.000.000đ</button></div></section>
          <section><h3>Thương hiệu <span>⌄</span></h3><input className="catalog-brand-search" value={brandQuery} onChange={(event) => setBrandQuery(event.target.value)} placeholder="Tìm thương hiệu..." />{brands.filter((brand) => brand.toLowerCase().includes(brandQuery.toLowerCase())).map((brand) => <label key={brand}><input type="checkbox" checked={selectedBrands.includes(brand)} onChange={() => toggleValue(brand, setSelectedBrands)} />{brand}<small>{products.filter((product) => getBrand(product) === brand).length}</small></label>)}</section>
          <section><h3>Đánh giá <span>⌄</span></h3>{[5, 4, 3].map((rating) => <label key={rating}><input type="radio" name="rating" checked={minRating === rating} onChange={() => setMinRating(rating)} /><span className="catalog-stars">{"★".repeat(rating)}{"☆".repeat(5 - rating)}</span> từ {rating} sao</label>)}</section>
          <section><h3>Tình trạng <span>⌄</span></h3><label><input type="checkbox" checked={inStockOnly} onChange={(event) => setInStockOnly(event.target.checked)} />Còn hàng</label><label><input type="checkbox" checked={saleOnly} onChange={(event) => setSaleOnly(event.target.checked)} />Đang giảm giá</label><label><input type="checkbox" checked={freeShipOnly} onChange={(event) => setFreeShipOnly(event.target.checked)} />Miễn phí vận chuyển</label></section>
          <button className="catalog-clear" type="button" onClick={clearFilters}>Xóa tất cả</button>
        </aside>

        <main className="catalog-results">
          <div className="catalog-toolbar"><div><strong>{filteredProducts.length} sản phẩm</strong>{(selectedCategories.length > 0 || selectedBrands.length > 0 || minRating > 0 || saleOnly) && <button type="button" onClick={clearFilters}>Xóa tất cả</button>}</div><div><span>Sắp xếp</span><select value={sort} onChange={(event) => setSort(event.target.value)}><option value="relevant">Liên quan nhất</option><option value="newest">Mới nhất</option><option value="bestselling">Bán chạy</option><option value="price-low">Giá thấp đến cao</option><option value="price-high">Giá cao đến thấp</option></select><button type="button" className={view === "grid" ? "is-active" : ""} onClick={() => setView("grid")} aria-label="Dạng lưới"><Grid2X2 /></button><button type="button" className={view === "list" ? "is-active" : ""} onClick={() => setView("list")} aria-label="Dạng danh sách"><List /></button></div></div>
          {loading ? <div className="catalog-loading"><PackageSearch /><span>Đang tải sản phẩm...</span></div> : visibleProducts.length ? <div className={`catalog-grid is-${view}`}>{visibleProducts.map((product) => {
            const currentPrice = product.salePrice ?? product.price;
            const discount = product.salePrice ? Math.round((1 - product.salePrice / product.price) * 100) : 0;
            const favorite = favorites.has(product._id);
            return <article className="catalog-card" key={product._id}><div className="catalog-card__media" onClick={() => navigate(`/products/${product._id}`)}><img src={product.images?.[0] || "/visual-placeholder.svg"} alt={product.name} onError={showImageFallback} />{discount > 0 && <span>-{discount}%</span>}<button type="button" className={favorite ? "is-active" : ""} onClick={(event) => { event.stopPropagation(); setFavorites((current) => { const next = new Set(current); if (next.has(product._id)) next.delete(product._id); else next.add(product._id); return next; }); }} aria-label="Yêu thích"><Heart /></button></div><div className="catalog-card__body"><small>{getBrand(product)}</small><h2 onClick={() => navigate(`/products/${product._id}`)}>{product.name}</h2><p className="catalog-card__rating"><Star /> {typeof product.rating === "number" ? product.rating.toFixed(1) : "Chưa có đánh giá"} {typeof product.rating === "number" && <span>({product.reviewsCount || 0})</span>}</p><p className="catalog-card__price"><strong>{currentPrice.toLocaleString("vi-VN")}₫</strong>{product.salePrice && <del>{product.price.toLocaleString("vi-VN")}₫</del>}</p><div className="catalog-card__meta"><span>Ưu đãi vận chuyển</span><small>Đã bán {(product.soldCount || 0).toLocaleString("vi-VN")}</small></div><button type="button" onClick={() => void addToCart(product)}>Thêm vào giỏ</button></div></article>;
          })}</div> : <div className="catalog-empty"><PackageSearch /><h2>Không tìm thấy sản phẩm</h2><p>Hãy thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.</p></div>}
          {pageCount > 1 && <footer className="catalog-pagination"><span>Hiển thị {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filteredProducts.length)} trong {filteredProducts.length} sản phẩm</span><div>{Array.from({ length: pageCount }, (_, index) => index + 1).slice(0, 4).map((number) => <button type="button" key={number} className={page === number ? "is-active" : ""} onClick={() => setPage(number)}>{number}</button>)}<button type="button" disabled={page === pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}>Tiếp theo →</button></div></footer>}
        </main>
      </div>

      <section className="catalog-interests"><h2>Bạn có thể quan tâm</h2><div>{["Âm thanh", "Laptop", "Thiết bị thông minh", "Phụ kiện máy tính"].map((item) => <button type="button" key={item} onClick={() => navigate(`/products?search=${encodeURIComponent(item)}`)}>{item}</button>)}</div></section>
    </div>
  );
};

export default ProductList;
