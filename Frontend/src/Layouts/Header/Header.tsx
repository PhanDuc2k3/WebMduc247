import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Boxes, ChevronDown, Menu, Search, Store, User, X } from "lucide-react";
import { useCart } from "../../context/CartContext";
import productApi from "../../api/productApi";
import storeApi from "../../api/storeApi";
import DropdownUser from "./DropdownUser";
import { HeaderIcons } from "./HeaderIcons";
import { useHeader } from "./useHeader";
import "./Header.css";
import { USE_MOCK_DATA } from "../../config/runtime";
import { showAvatarFallback } from "../../utils/imageFallback";

interface ProductSearchResult { _id: string; name: string; images?: string[]; price?: number; salePrice?: number; }
interface StoreSearchResult { _id: string; name: string; logoUrl?: string; category?: string; }
type SearchResult = ProductSearchResult | StoreSearchResult;

const categoryLinks = [
  { label: "Tất cả danh mục", to: "/products" },
  { label: "Điện thoại & Phụ kiện", to: "/category/phone" },
  { label: "Điện tử", to: "/category/electronics" },
  { label: "Thời trang", to: "/category/fashion" },
  { label: "Nhà cửa & Đời sống", to: "/category/home" },
  { label: "Làm đẹp", to: "/category/beauty" },
  { label: "Thể thao", to: "/category/sports" },
  { label: "Khuyến mãi", to: "/new" },
];

const isStoreResult = (result: SearchResult): result is StoreSearchResult => "logoUrl" in result;

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, online, lastSeen, showDropdown, setShowDropdown, handleLogout } = useHeader();
  const { cartCount } = useCart();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchType, setSearchType] = useState<"product" | "store">("product");
  const [typeMenuOpen, setTypeMenuOpen] = useState(false);
  const [resultsOpen, setResultsOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [searching, setSearching] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const closeMenus = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setTypeMenuOpen(false);
        setResultsOpen(false);
      }
    };
    document.addEventListener("mousedown", closeMenus);
    return () => document.removeEventListener("mousedown", closeMenus);
  }, []);

  useEffect(() => {
    if (searchTerm.trim().length < 2) {
      setSearchResults([]);
      setResultsOpen(false);
      return;
    }
    let active = true;
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        if (searchType === "store") {
          const response = await storeApi.searchStores(searchTerm.trim(), 10);
          const stores = Array.isArray(response.data?.stores) ? response.data.stores as StoreSearchResult[] : [];
          if (active) { setTotalResults(stores.length); setSearchResults(stores.slice(0, 5)); }
        } else {
          const response = await productApi.searchProducts(searchTerm.trim(), 10);
          const products = Array.isArray(response.data?.products) ? response.data.products as ProductSearchResult[] : [];
          if (active) { setTotalResults(products.length); setSearchResults(products.slice(0, 5)); }
        }
        if (active) setResultsOpen(true);
      } catch {
        if (active) { setSearchResults([]); setTotalResults(0); setResultsOpen(true); }
      } finally {
        if (active) setSearching(false);
      }
    }, 300);
    return () => { active = false; window.clearTimeout(timer); };
  }, [searchTerm, searchType]);

  useEffect(() => {
    setMobileNavOpen(false);
    setShowDropdown(false);
  }, [location.pathname, setShowDropdown]);

  const searchPath = () => searchType === "store" ? "/store" : "/products";
  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    const value = searchTerm.trim();
    if (!value) return;
    navigate(`${searchPath()}?search=${encodeURIComponent(value)}`);
    setResultsOpen(false);
  };
  const selectResult = (result: SearchResult) => {
    navigate(isStoreResult(result) ? `/store/${result._id}` : `/products/${result._id}`);
    setSearchTerm("");
    setResultsOpen(false);
  };

  return (
    <header className="canva-header">
      <div className="canva-header__main">
        <button type="button" className="canva-header__icon-button canva-header__menu-button" onClick={() => setMobileNavOpen((open) => !open)} aria-label="Mở danh mục" aria-expanded={mobileNavOpen}>{mobileNavOpen ? <X /> : <Menu />}</button>
        <Link to="/" className="canva-header__brand" aria-label="MDUC247 - Trang chủ"><span><Boxes /></span><strong>MDUC247</strong></Link>

        <div className="canva-header__search-wrap" ref={searchRef}>
          <form className="canva-header__search" role="search" onSubmit={submitSearch}>
            <button type="button" className="canva-header__search-type" onClick={() => setTypeMenuOpen((open) => !open)} aria-expanded={typeMenuOpen}>{searchType === "product" ? "Sản phẩm" : "Cửa hàng"}<ChevronDown /></button>
            <Search className="canva-header__search-icon" aria-hidden="true" />
            <label className="sr-only" htmlFor="site-search">Tìm kiếm</label>
            <input id="site-search" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} onFocus={() => searchTerm.trim().length >= 2 && setResultsOpen(true)} placeholder={searchType === "store" ? "Tìm kiếm cửa hàng..." : "Tìm kiếm sản phẩm, thương hiệu..."} autoComplete="off" />
            <button type="submit" className="canva-header__search-submit" aria-label="Tìm kiếm"><Search /></button>
          </form>
          {typeMenuOpen && <div className="canva-header__type-menu"><button type="button" onClick={() => { setSearchType("product"); setTypeMenuOpen(false); }}>Sản phẩm</button><button type="button" onClick={() => { setSearchType("store"); setTypeMenuOpen(false); }}>Cửa hàng</button></div>}
          {resultsOpen && (
            <div className="canva-header__results">
              <div className="canva-header__results-title">{searching ? "Đang tìm kiếm..." : `Kết quả ${searchType === "store" ? "cửa hàng" : "sản phẩm"}`}</div>
              {!searching && searchResults.length === 0 && <p>Không tìm thấy kết quả phù hợp.</p>}
              {!searching && searchResults.map((result) => (
                <button type="button" key={result._id} onClick={() => selectResult(result)}>
                  {isStoreResult(result) ? <><img src={result.logoUrl || "/image.png"} alt="" /><span><strong>{result.name}</strong><small>{result.category || "Cửa hàng"}</small></span></> : <><img src={result.images?.[0] || "/image.png"} alt="" /><span><strong>{result.name}</strong><small>{(result.salePrice || result.price || 0).toLocaleString("vi-VN")}₫</small></span></>}
                </button>
              ))}
              {!searching && totalResults > 5 && <button type="button" className="canva-header__view-all" onClick={submitSearch}>Xem thêm {totalResults - 5} kết quả</button>}
            </div>
          )}
        </div>

        <div className="canva-header__actions">
          <HeaderIcons cartCount={cartCount} userId={user._id} />
          {user._id ? (
            <div className="canva-header__account-wrap">
              <button type="button" className="canva-header__account" onClick={() => setShowDropdown((open) => !open)} aria-expanded={showDropdown}>
                <span className="canva-header__avatar">{user.avatarUrl ? <img src={user.avatarUrl} alt="" onError={showAvatarFallback} /> : <User />}{online && <i />}</span><span><small>Tài khoản</small><strong>{user.fullName}</strong></span>
              </button>
              {showDropdown && <DropdownUser userId={user._id} online={online} lastSeen={lastSeen} handleLogout={handleLogout} setShowDropdown={setShowDropdown} userRole={user.role} />}
            </div>
          ) : <button type="button" className="canva-header__account" onClick={() => navigate("/login")}><span className="canva-header__avatar"><User /></span><span><small>Tài khoản</small><strong>Đăng nhập</strong></span></button>}
        </div>
      </div>

      <nav className={`canva-header__nav ${mobileNavOpen ? "is-open" : ""}`} aria-label="Danh mục sản phẩm">
        {categoryLinks.map((link, index) => <Link key={`${link.label}-${link.to}`} to={link.to} className={location.pathname === link.to || (index === 0 && location.pathname === "/products") ? "is-active" : ""}>{index === 0 && <Menu />} {link.label}</Link>)}
        {USE_MOCK_DATA && <span className="canva-header__mock-badge">Dữ liệu minh họa</span>}
        <Link to="/store" className="canva-header__stores-link"><Store /> Cửa hàng</Link>
      </nav>
    </header>
  );
};

export default Header;
