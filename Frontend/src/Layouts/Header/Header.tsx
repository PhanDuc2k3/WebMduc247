import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Boxes, ChevronDown, Menu, Search, Store, User, X } from "lucide-react";
import { useCart } from "../../context/CartContext";
import { catalogApi } from "../../api/catalogApi";
import DropdownUser from "./DropdownUser";
import { HeaderIcons } from "./HeaderIcons";
import { useHeader } from "./userContext";
import { scheduleAutocomplete } from "./searchAutocomplete";
import "./Header.css";
import { USE_MOCK_DATA } from "../../config/runtime";
import { showAvatarFallback } from "../../utils/imageFallback";
import { storefrontApi,type NavigationItem } from '../../api/storefrontApi';

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
  { label: "Flash Sale", to: "/flash-sale" },
];

const isStoreResult = (result: SearchResult): result is StoreSearchResult => "logoUrl" in result;

const Header = ({navigationOverride}:{navigationOverride?:NavigationItem[]} = {}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, online, lastSeen, showDropdown, setShowDropdown, handleLogout, handleLogoutAll } = useHeader();
  const { cartCount } = useCart();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [navigation,setNavigation]=useState<NavigationItem[]|null>(null);
  useEffect(()=>{
    if(navigationOverride)return;
    let active=true;
    const load=()=>{void storefrontApi.publicConfig().then(result=>{if(active)setNavigation(result.layout.navigation);}).catch(()=>{});};
    const storage=(event:StorageEvent)=>{if(event.key==='mduc247.storefrontVersion')load();};
    load();window.addEventListener('storefrontPublished',load);window.addEventListener('storage',storage);
    return()=>{active=false;window.removeEventListener('storefrontPublished',load);window.removeEventListener('storage',storage);};
  },[navigationOverride]);
  const navigationItems=navigationOverride||navigation||[...categoryLinks.map((item,index)=>({id:'nav-'+index,label:item.label,targetUrl:item.to,enabled:true})),{id:'nav-store',label:'Cửa hàng',targetUrl:'/store',enabled:true}];
  const [searchTerm, setSearchTerm] = useState("");
  const [searchType, setSearchType] = useState<"product" | "store">("product");
  const [typeMenuOpen, setTypeMenuOpen] = useState(false);
  const [resultsOpen, setResultsOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [activeResult, setActiveResult] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchFocused = useRef(false);

  useEffect(() => {
    const closeMenus = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        searchFocused.current = false;
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
      setSearching(false);
      setSearchError(false);
      return;
    }
    setSearching(true);
    setSearchError(false);
    setSearchResults([]);
    setTotalResults(0);
    setActiveResult(-1);
    return scheduleAutocomplete<{ results: SearchResult[]; total: number }>(
      async signal => {
        if (searchType === "store") {
          const response = await catalogApi.list(`?search=${encodeURIComponent(searchTerm.trim())}&limit=10`, signal);
          const stores: StoreSearchResult[] = response.stores.map(store => ({ _id: store.slug, name: store.name, logoUrl: store.logoUrl || undefined, category: store.category || undefined }));
          return { results: stores.slice(0, 5), total: response.total };
        }
        const response = await catalogApi.searchProducts({ q: searchTerm.trim(), limit: 6 }, signal);
        const products: ProductSearchResult[] = response.products.map(product => ({ _id: product.id, name: product.name,
          images: product.imageUrl ? [product.imageUrl] : [], price: product.priceOriginalMinor,
          salePrice: product.priceOriginalMinor > product.priceMinor ? product.priceMinor : undefined }));
        return { results: products.slice(0, 6), total: response.total };
      },
      ({ results, total }) => { setSearchResults(results); setTotalResults(total); setSearching(false);
        if (searchFocused.current) setResultsOpen(true); },
      () => { setSearchResults([]); setTotalResults(0); setSearchError(true); setSearching(false);
        if (searchFocused.current) setResultsOpen(true); },
    );
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
    searchFocused.current = false;
    setResultsOpen(false);
  };
  const selectResult = (result: SearchResult) => {
    navigate(isStoreResult(result) ? `/store/${result._id}` : `/products/${result._id}`);
    searchFocused.current = false;
    setSearchTerm("");
    setResultsOpen(false);
  };
  const onSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") { searchFocused.current = false; setResultsOpen(false); setTypeMenuOpen(false); setActiveResult(-1); return; }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (searching || !searchResults.length) return;
      event.preventDefault();
      searchFocused.current = true;
      setResultsOpen(true);
      setActiveResult(current => event.key === "ArrowDown"
        ? (current + 1) % searchResults.length
        : (current - 1 + searchResults.length) % searchResults.length);
    }
    if (event.key === "Enter" && resultsOpen && !searching && activeResult >= 0 && searchResults[activeResult]) {
      event.preventDefault();
      selectResult(searchResults[activeResult]);
    }
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
            <input id="site-search" value={searchTerm} maxLength={100} onChange={(event) => { searchFocused.current = true; setSearchTerm(event.target.value); }} onFocus={() => { searchFocused.current = true; if (searchTerm.trim().length >= 2) setResultsOpen(true); }} onKeyDown={onSearchKeyDown} placeholder={searchType === "store" ? "Tìm kiếm cửa hàng..." : "Tìm kiếm sản phẩm, thương hiệu..."} autoComplete="off" role="combobox" aria-autocomplete="list" aria-expanded={resultsOpen} aria-controls="site-search-results" aria-activedescendant={resultsOpen && activeResult >= 0 ? `site-search-option-${activeResult}` : undefined} />
            <button type="submit" className="canva-header__search-submit" aria-label="Tìm kiếm"><Search /></button>
          </form>
          {typeMenuOpen && <div className="canva-header__type-menu"><button type="button" onClick={() => { setSearchType("product"); setTypeMenuOpen(false); }}>Sản phẩm</button><button type="button" onClick={() => { setSearchType("store"); setTypeMenuOpen(false); }}>Cửa hàng</button></div>}
          {resultsOpen && (
            <div className="canva-header__results">
              <div className="canva-header__results-title">{searching ? "Đang tìm kiếm..." : `Kết quả ${searchType === "store" ? "cửa hàng" : "sản phẩm"}`}</div>
              {!searching && searchError && <p role="status">Không thể tải gợi ý. Vui lòng thử lại.</p>}
              {!searching && !searchError && searchResults.length === 0 && <p>Không tìm thấy kết quả phù hợp.</p>}
              <div id="site-search-results" className="canva-header__result-options" role="listbox" aria-label="Gợi ý tìm kiếm">
                {!searching && !searchError && searchResults.map((result, index) => (
                  <button type="button" key={result._id} id={`site-search-option-${index}`} role="option" aria-selected={index === activeResult} onMouseEnter={() => setActiveResult(index)} onClick={() => selectResult(result)}>
                    {isStoreResult(result) ? <><img src={result.logoUrl || "/image.png"} alt="" /><span><strong>{result.name}</strong><small>{result.category || "Cửa hàng"}</small></span></> : <><img src={result.images?.[0] || "/image.png"} alt="" /><span><strong>{result.name}</strong><small>{(result.salePrice || result.price || 0).toLocaleString("vi-VN")}₫</small></span></>}
                  </button>
                ))}
              </div>
              {!searching && !searchError && totalResults > searchResults.length && <button type="button" className="canva-header__view-all" onClick={submitSearch}>Xem thêm {totalResults - searchResults.length} kết quả</button>}
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
              {showDropdown && <DropdownUser userId={user._id} online={online} lastSeen={lastSeen} handleLogout={handleLogout} handleLogoutAll={handleLogoutAll} setShowDropdown={setShowDropdown} userRole={user.role} />}
            </div>
          ) : <button type="button" className="canva-header__account" onClick={() => navigate("/login")}><span className="canva-header__avatar"><User /></span><span><small>Tài khoản</small><strong>Đăng nhập</strong></span></button>}
        </div>
      </div>

      <nav className={`canva-header__nav ${mobileNavOpen ? "is-open" : ""}`} aria-label="Danh mục sản phẩm">
        {navigationItems.filter(item=>item.enabled).map((link,index) => <Link key={link.id} to={link.targetUrl} className={`${location.pathname===link.targetUrl?'is-active':''} ${link.targetUrl==='/store'&&index===navigationItems.length-1?'canva-header__stores-link':''}`}>{link.targetUrl==='/products'&&<Menu/>}{link.targetUrl==='/store'&&<Store/>} {link.label}</Link>)}
        {USE_MOCK_DATA && <span className="canva-header__mock-badge">Dữ liệu minh họa</span>}
      </nav>
    </header>
  );
};

export default Header;
