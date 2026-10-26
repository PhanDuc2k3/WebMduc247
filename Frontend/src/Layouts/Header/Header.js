import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
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
import { storefrontApi } from '../../api/storefrontApi';
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
const isStoreResult = (result) => "logoUrl" in result;
const Header = ({ navigationOverride } = {}) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, online, lastSeen, showDropdown, setShowDropdown, handleLogout, handleLogoutAll } = useHeader();
    const { cartCount } = useCart();
    const [mobileNavOpen, setMobileNavOpen] = useState(false);
    const [navigation, setNavigation] = useState(null);
    useEffect(() => {
        if (navigationOverride)
            return;
        let active = true;
        const load = () => { void storefrontApi.publicConfig().then(result => { if (active)
            setNavigation(result.layout.navigation); }).catch(() => { }); };
        const storage = (event) => { if (event.key === 'mduc247.storefrontVersion')
            load(); };
        load();
        window.addEventListener('storefrontPublished', load);
        window.addEventListener('storage', storage);
        return () => { active = false; window.removeEventListener('storefrontPublished', load); window.removeEventListener('storage', storage); };
    }, [navigationOverride]);
    const navigationItems = navigationOverride || navigation || [...categoryLinks.map((item, index) => ({ id: 'nav-' + index, label: item.label, targetUrl: item.to, enabled: true })), { id: 'nav-store', label: 'Cửa hàng', targetUrl: '/store', enabled: true }];
    const [searchTerm, setSearchTerm] = useState("");
    const [searchType, setSearchType] = useState("product");
    const [typeMenuOpen, setTypeMenuOpen] = useState(false);
    const [resultsOpen, setResultsOpen] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const [totalResults, setTotalResults] = useState(0);
    const [searching, setSearching] = useState(false);
    const [searchError, setSearchError] = useState(false);
    const [activeResult, setActiveResult] = useState(-1);
    const searchRef = useRef(null);
    const searchFocused = useRef(false);
    useEffect(() => {
        const closeMenus = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
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
        return scheduleAutocomplete(async (signal) => {
            if (searchType === "store") {
                const response = await catalogApi.list(`?search=${encodeURIComponent(searchTerm.trim())}&limit=10`, signal);
                const stores = response.stores.map(store => ({ _id: store.slug, name: store.name, logoUrl: store.logoUrl || undefined, category: store.category || undefined }));
                return { results: stores.slice(0, 5), total: response.total };
            }
            const response = await catalogApi.searchProducts({ q: searchTerm.trim(), limit: 6 }, signal);
            const products = response.products.map(product => ({ _id: product.id, name: product.name,
                images: product.imageUrl ? [product.imageUrl] : [], price: product.priceOriginalMinor,
                salePrice: product.priceOriginalMinor > product.priceMinor ? product.priceMinor : undefined }));
            return { results: products.slice(0, 6), total: response.total };
        }, ({ results, total }) => {
            setSearchResults(results);
            setTotalResults(total);
            setSearching(false);
            if (searchFocused.current)
                setResultsOpen(true);
        }, () => {
            setSearchResults([]);
            setTotalResults(0);
            setSearchError(true);
            setSearching(false);
            if (searchFocused.current)
                setResultsOpen(true);
        });
    }, [searchTerm, searchType]);
    useEffect(() => {
        setMobileNavOpen(false);
        setShowDropdown(false);
    }, [location.pathname, setShowDropdown]);
    const searchPath = () => searchType === "store" ? "/store" : "/products";
    const submitSearch = (event) => {
        event.preventDefault();
        const value = searchTerm.trim();
        if (!value)
            return;
        navigate(`${searchPath()}?search=${encodeURIComponent(value)}`);
        searchFocused.current = false;
        setResultsOpen(false);
    };
    const selectResult = (result) => {
        navigate(isStoreResult(result) ? `/store/${result._id}` : `/products/${result._id}`);
        searchFocused.current = false;
        setSearchTerm("");
        setResultsOpen(false);
    };
    const onSearchKeyDown = (event) => {
        if (event.key === "Escape") {
            searchFocused.current = false;
            setResultsOpen(false);
            setTypeMenuOpen(false);
            setActiveResult(-1);
            return;
        }
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            if (searching || !searchResults.length)
                return;
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
    return (_jsxs("header", { className: "canva-header", children: [_jsxs("div", { className: "canva-header__main", children: [_jsx("button", { type: "button", className: "canva-header__icon-button canva-header__menu-button", onClick: () => setMobileNavOpen((open) => !open), "aria-label": "M\u1EDF danh m\u1EE5c", "aria-expanded": mobileNavOpen, children: mobileNavOpen ? _jsx(X, {}) : _jsx(Menu, {}) }), _jsxs(Link, { to: "/", className: "canva-header__brand", "aria-label": "MDUC247 - Trang ch\u1EE7", children: [_jsx("span", { children: _jsx(Boxes, {}) }), _jsx("strong", { children: "MDUC247" })] }), _jsxs("div", { className: "canva-header__search-wrap", ref: searchRef, children: [_jsxs("form", { className: "canva-header__search", role: "search", onSubmit: submitSearch, children: [_jsxs("button", { type: "button", className: "canva-header__search-type", onClick: () => setTypeMenuOpen((open) => !open), "aria-expanded": typeMenuOpen, children: [searchType === "product" ? "Sản phẩm" : "Cửa hàng", _jsx(ChevronDown, {})] }), _jsx(Search, { className: "canva-header__search-icon", "aria-hidden": "true" }), _jsx("label", { className: "sr-only", htmlFor: "site-search", children: "T\u00ECm ki\u1EBFm" }), _jsx("input", { id: "site-search", value: searchTerm, maxLength: 100, onChange: (event) => { searchFocused.current = true; setSearchTerm(event.target.value); }, onFocus: () => { searchFocused.current = true; if (searchTerm.trim().length >= 2)
                                            setResultsOpen(true); }, onKeyDown: onSearchKeyDown, placeholder: searchType === "store" ? "Tìm kiếm cửa hàng..." : "Tìm kiếm sản phẩm, thương hiệu...", autoComplete: "off", role: "combobox", "aria-autocomplete": "list", "aria-expanded": resultsOpen, "aria-controls": "site-search-results", "aria-activedescendant": resultsOpen && activeResult >= 0 ? `site-search-option-${activeResult}` : undefined }), _jsx("button", { type: "submit", className: "canva-header__search-submit", "aria-label": "T\u00ECm ki\u1EBFm", children: _jsx(Search, {}) })] }), typeMenuOpen && _jsxs("div", { className: "canva-header__type-menu", children: [_jsx("button", { type: "button", onClick: () => { setSearchType("product"); setTypeMenuOpen(false); }, children: "S\u1EA3n ph\u1EA9m" }), _jsx("button", { type: "button", onClick: () => { setSearchType("store"); setTypeMenuOpen(false); }, children: "C\u1EEDa h\u00E0ng" })] }), resultsOpen && (_jsxs("div", { className: "canva-header__results", children: [_jsx("div", { className: "canva-header__results-title", children: searching ? "Đang tìm kiếm..." : `Kết quả ${searchType === "store" ? "cửa hàng" : "sản phẩm"}` }), !searching && searchError && _jsx("p", { role: "status", children: "Kh\u00F4ng th\u1EC3 t\u1EA3i g\u1EE3i \u00FD. Vui l\u00F2ng th\u1EED l\u1EA1i." }), !searching && !searchError && searchResults.length === 0 && _jsx("p", { children: "Kh\u00F4ng t\u00ECm th\u1EA5y k\u1EBFt qu\u1EA3 ph\u00F9 h\u1EE3p." }), _jsx("div", { id: "site-search-results", className: "canva-header__result-options", role: "listbox", "aria-label": "G\u1EE3i \u00FD t\u00ECm ki\u1EBFm", children: !searching && !searchError && searchResults.map((result, index) => (_jsx("button", { type: "button", id: `site-search-option-${index}`, role: "option", "aria-selected": index === activeResult, onMouseEnter: () => setActiveResult(index), onClick: () => selectResult(result), children: isStoreResult(result) ? _jsxs(_Fragment, { children: [_jsx("img", { src: result.logoUrl || "/image.png", alt: "" }), _jsxs("span", { children: [_jsx("strong", { children: result.name }), _jsx("small", { children: result.category || "Cửa hàng" })] })] }) : _jsxs(_Fragment, { children: [_jsx("img", { src: result.images?.[0] || "/image.png", alt: "" }), _jsxs("span", { children: [_jsx("strong", { children: result.name }), _jsxs("small", { children: [(result.salePrice || result.price || 0).toLocaleString("vi-VN"), "\u20AB"] })] })] }) }, result._id))) }), !searching && !searchError && totalResults > searchResults.length && _jsxs("button", { type: "button", className: "canva-header__view-all", onClick: submitSearch, children: ["Xem th\u00EAm ", totalResults - searchResults.length, " k\u1EBFt qu\u1EA3"] })] }))] }), _jsxs("div", { className: "canva-header__actions", children: [_jsx(HeaderIcons, { cartCount: cartCount, userId: user._id }), user._id ? (_jsxs("div", { className: "canva-header__account-wrap", children: [_jsxs("button", { type: "button", className: "canva-header__account", onClick: () => setShowDropdown((open) => !open), "aria-expanded": showDropdown, children: [_jsxs("span", { className: "canva-header__avatar", children: [user.avatarUrl ? _jsx("img", { src: user.avatarUrl, alt: "", onError: showAvatarFallback }) : _jsx(User, {}), online && _jsx("i", {})] }), _jsxs("span", { children: [_jsx("small", { children: "T\u00E0i kho\u1EA3n" }), _jsx("strong", { children: user.fullName })] })] }), showDropdown && _jsx(DropdownUser, { userId: user._id, online: online, lastSeen: lastSeen, handleLogout: handleLogout, handleLogoutAll: handleLogoutAll, setShowDropdown: setShowDropdown, userRole: user.role })] })) : _jsxs("button", { type: "button", className: "canva-header__account", onClick: () => navigate("/login"), children: [_jsx("span", { className: "canva-header__avatar", children: _jsx(User, {}) }), _jsxs("span", { children: [_jsx("small", { children: "T\u00E0i kho\u1EA3n" }), _jsx("strong", { children: "\u0110\u0103ng nh\u1EADp" })] })] })] })] }), _jsxs("nav", { className: `canva-header__nav ${mobileNavOpen ? "is-open" : ""}`, "aria-label": "Danh m\u1EE5c s\u1EA3n ph\u1EA9m", children: [navigationItems.filter(item => item.enabled).map((link, index) => _jsxs(Link, { to: link.targetUrl, className: `${location.pathname === link.targetUrl ? 'is-active' : ''} ${link.targetUrl === '/store' && index === navigationItems.length - 1 ? 'canva-header__stores-link' : ''}`, children: [link.targetUrl === '/products' && _jsx(Menu, {}), link.targetUrl === '/store' && _jsx(Store, {}), " ", link.label] }, link.id)), USE_MOCK_DATA && _jsx("span", { className: "canva-header__mock-badge", children: "D\u1EEF li\u1EC7u minh h\u1ECDa" })] })] }));
};
export default Header;
