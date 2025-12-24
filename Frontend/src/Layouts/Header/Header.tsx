import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  User,
  Menu,
  Search,
  ChevronDown,
  Store,
  Package,
  ShoppingCart,
  Gift,
  MessageCircle,
  Wallet as WalletIconLucide,
  Home,
  Tag,
  Headset,
  X,
  ChevronRight,
} from "lucide-react";
import { useHeader } from "./useHeader";
import DropdownUser from "./DropdownUser";
import { HeaderIcons } from "./HeaderIcons";
import { useCart } from "../../context/CartContext";
import { useChat } from "../../context/chatContext";
import storeApi from "../../api/storeApi";
import productApi from "../../api/productApi";

const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, online, lastSeen, showDropdown, setShowDropdown, handleLogout } = useHeader();
  const { cartCount } = useCart();
  const { unreadMessages } = useChat();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchType, setSearchType] = useState<"product" | "store">("product");
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [totalSearchResults, setTotalSearchResults] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const searchDropdownRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const navLinks = [
    { to: "/", label: "Trang chủ", icon: Home },
    { to: "/store", label: "Cửa hàng", icon: Store },
    { to: "/products", label: "Sản phẩm", icon: Package },
    { to: "/new", label: "Khuyến mãi", icon: Tag },
    { to: "/support", label: "Hỗ trợ", icon: Headset },
  ];

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchDropdownRef.current && !searchDropdownRef.current.contains(e.target as Node)) {
        setShowSearchDropdown(false);
        setShowSearchResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Tìm kiếm real-time cho stores và products
  useEffect(() => {
    if (searchTerm.trim().length >= 2) {
      // Clear timeout trước đó
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      // Debounce search
      searchTimeoutRef.current = setTimeout(async () => {
        setIsSearching(true);
        try {
          if (searchType === "store") {
            const res = await storeApi.searchStores(searchTerm.trim(), 10); // Lấy 10 để biết có nhiều hơn 5 không
            const stores = res.data.stores || [];
            setTotalSearchResults(stores.length);
            setSearchResults(stores.slice(0, 5)); // Chỉ hiển thị 5 kết quả đầu
            setShowSearchResults(true);
          } else if (searchType === "product") {
            const res = await productApi.searchProducts(searchTerm.trim(), 10); // Lấy 10 để biết có nhiều hơn 5 không
            const products = res.data.products || [];
            setTotalSearchResults(products.length);
            setSearchResults(products.slice(0, 5)); // Chỉ hiển thị 5 kết quả đầu
            setShowSearchResults(true);
          }
        } catch (error) {
          console.error("Search error:", error);
          setSearchResults([]);
          setTotalSearchResults(0);
        } finally {
          setIsSearching(false);
        }
      }, 300);
    } else {
      setShowSearchResults(false);
      setSearchResults([]);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm, searchType]);

  // Đóng các menu khi thay đổi route
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  // Khóa scroll khi mở sidebar trên mobile
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.overflow = isSidebarOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isSidebarOpen]);

  // Xử lý tìm kiếm
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      if (searchType === "store") {
        navigate(`/store?search=${encodeURIComponent(searchTerm.trim())}`);
      } else {
        navigate(`/products?search=${encodeURIComponent(searchTerm.trim())}`);
      }
      setSearchTerm("");
      setShowSearchResults(false);
    }
  };

  // Xử lý click vào kết quả tìm kiếm
  const handleStoreClick = (storeId: string) => {
    navigate(`/store/${storeId}`);
    setSearchTerm("");
    setShowSearchResults(false);
  };

  // Xử lý xem thêm kết quả
  const handleViewMore = () => {
    if (searchTerm.trim()) {
      navigate(`/store?search=${encodeURIComponent(searchTerm.trim())}`);
      setSearchTerm("");
      setShowSearchResults(false);
    }
  };

  // Xử lý login
  const handleLoginClick = () => {
    navigate("/login");
  };

  const handleProductClick = (productId: string) => {
    navigate(`/products/${productId}`);
    setSearchTerm("");
    setShowSearchResults(false);
  };

  return (
    <header className="sticky top-0 z-[100] bg-white/95 backdrop-blur-xl shadow-xl border-b-2 border-gray-200">
      {/* Top bar */}
      <div className="bg-[#2F5FEB] text-white hidden md:block">
        <div className="flex justify-between items-center px-4 sm:px-8 py-2 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <span>🚚</span>
            <span>Miễn phí vận chuyển đơn từ 300k</span>
          </div>
          <div className="flex items-center gap-2">
            <span>📞</span>
            <span>Hotline: 1800-1234</span>
          </div>
        </div>
      </div>

      {/* Main header - Row 1: Logo, Search, Icons, Avatar */}
      <div className="flex items-center justify-between px-2 sm:px-4 md:px-8 py-2 sm:py-3 bg-white gap-1 sm:gap-2">
        {/* Logo */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">

          <Link to="/" className="relative group animate-fade-in-left flex-shrink-0">
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-[#2F5FEB] rounded-lg sm:rounded-xl flex items-center justify-center shadow-xl group-hover:shadow-[#2F5FEB]/50 transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                <span className="text-lg sm:text-2xl md:text-3xl font-black text-white">MĐ</span>
              </div>
              <div className="hidden xs:block">
                <h1 className="text-sm sm:text-xl md:text-2xl font-black text-[#2F5FEB]">
                  ShopMduc247
                </h1>
                <p className="text-[10px] sm:text-xs text-gray-500 font-bold">Shopping Mall</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Mobile Search - Compact */}
        <div className="md:hidden flex-1 min-w-0 mx-1 sm:mx-2">
          <form onSubmit={handleSearch} className="relative w-full group">
            <div className="relative flex items-center" ref={searchDropdownRef}>
              {/* Nút chọn loại tìm kiếm - Mobile Compact */}
              <button
                type="button"
                onClick={() => setShowSearchDropdown(!showSearchDropdown)}
                className="absolute left-[2px] top-[2px] bottom-[2px] z-20 flex items-center justify-center px-1.5 sm:px-2 py-1.5 
                           bg-[#2F5FEB] text-white 
                           rounded-l-md sm:rounded-l-lg hover:bg-[#244ACC] 
                           transition-all duration-300 shadow-md hover:shadow-lg 
                           transform hover:scale-[1.02] text-[10px] sm:text-xs font-bold border border-r-0 border-white"
              >
                {searchType === "product" ? (
                  <Package size={10} className="sm:w-3 sm:h-3" />
                ) : (
                  <Store size={10} className="sm:w-3 sm:h-3" />
                )}
                <ChevronDown
                  size={8}
                  className={`sm:w-2.5 sm:h-2.5 transition-transform duration-300 ${showSearchDropdown ? "rotate-180" : ""}`}
                />
              </button>

              {/* Dropdown loại tìm kiếm - Mobile */}
              {showSearchDropdown && (
                <div
                  className="absolute left-0 top-[calc(100%+4px)] w-36 sm:w-40 
                             bg-white border border-gray-200 rounded-xl shadow-xl 
                             overflow-hidden animate-fade-in z-[10000]"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setSearchType("product");
                      setShowSearchDropdown(false);
                    }}
                    className={`w-full px-3 py-2 text-xs font-medium flex items-center gap-2 transition-all duration-200 
                      ${searchType === "product"
                        ? "bg-[#2F5FEB]/10 text-[#2F5FEB]"
                        : "text-gray-700 hover:bg-gray-50"
                      }`}
                  >
                    <Package size={14} />
                    Tìm sản phẩm
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchType("store");
                      setShowSearchDropdown(false);
                    }}
                    className={`w-full px-3 py-2 text-xs font-medium flex items-center gap-2 transition-all duration-200 border-t border-gray-100 
                      ${searchType === "store"
                        ? "bg-[#2F5FEB]/10 text-[#2F5FEB]"
                        : "text-gray-700 hover:bg-gray-50"
                      }`}
                  >
                    <Store size={14} />
                    Tìm cửa hàng
                  </button>
                </div>
              )}

              {/* Input tìm kiếm - Mobile Compact */}
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => {
                  if (searchType === "store" && searchResults.length > 0) {
                    setShowSearchResults(true);
                  }
                }}
                placeholder={searchType === "product" ? "Tìm sản phẩm..." : "Tìm cửa hàng..."}
                className="w-full pl-[42px] sm:pl-[50px] pr-8 sm:pr-10 py-1.5 sm:py-2 text-[11px] sm:text-xs border-2 border-gray-300 rounded-md sm:rounded-lg 
                           shadow-md focus:outline-none focus:ring-2 focus:ring-[#2F5FEB] 
                           transition-all duration-200 bg-white/90 backdrop-blur-sm placeholder-gray-400"
              />

              {/* Kết quả tìm kiếm - Mobile */}
              {showSearchResults && searchType === "store" && (
                <div className="absolute left-0 top-[calc(100%+4px)] w-full bg-white border border-gray-200 rounded-xl shadow-xl max-h-80 overflow-y-auto z-[10000]">
                  {isSearching ? (
                    <div className="px-4 py-3 text-sm text-gray-500 text-center">Đang tìm kiếm...</div>
                  ) : searchResults.length > 0 ? (
                    <>
                      {searchResults.map((store) => (
                        <button
                          key={store._id}
                          onClick={() => handleStoreClick(store._id)}
                          className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors border-b border-gray-100"
                        >
                          {store.logoUrl ? (
                            <img src={store.logoUrl} alt={store.name} className="w-10 h-10 rounded-lg object-cover" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                              <Store size={20} className="text-white" />
                            </div>
                          )}
                          <div className="flex-1 text-left">
                            <div className="font-semibold text-sm text-gray-900">{store.name}</div>
                            <div className="text-xs text-gray-500 line-clamp-1">{store.description}</div>
                            {store.rating > 0 && (
                              <div className="text-xs text-yellow-500 mt-1">⭐ {store.rating.toFixed(1)}</div>
                            )}
                          </div>
                          <ChevronRight size={16} className="text-gray-400" />
                        </button>
                      ))}
                      {totalSearchResults > 5 && (
                        <button
                          onClick={handleViewMore}
                          className="w-full px-4 py-3 text-sm font-semibold text-[#2F5FEB] hover:bg-[#2F5FEB]/5 transition-colors border-t border-gray-200"
                        >
                          Xem thêm {totalSearchResults - 5} kết quả
                        </button>
                      )}
                    </>
                  ) : searchTerm.trim().length >= 2 ? (
                    <div className="px-4 py-3 text-sm text-gray-500 text-center">Không tìm thấy cửa hàng</div>
                  ) : null}
                </div>
              )}

              {/* Nút search - Mobile Compact */}
              <button
                type="submit"
                className="absolute right-[2px] top-[2px] bottom-[2px] flex items-center justify-center 
                           bg-[#2F5FEB] text-white 
                           px-1.5 sm:px-2.5 rounded-r-md sm:rounded-r-lg hover:bg-[#244ACC] 
                           transition-all duration-300 shadow-md hover:shadow-lg"
              >
                <Search size={12} className="sm:w-3.5 sm:h-3.5" />
              </button>
            </div>
          </form>
        </div>

        {/* Search - Desktop */}
        <div className="hidden md:flex items-center flex-1 max-w-xl mx-4">
          <form onSubmit={handleSearch} className="relative w-full group">
            <div className="relative flex items-center" ref={searchDropdownRef}>
              {/* Nút chọn loại tìm kiếm */}
              <button
                type="button"
                onClick={() => setShowSearchDropdown(!showSearchDropdown)}
                className="absolute left-[2px] top-[2px] bottom-[2px] z-20 flex items-center justify-center gap-1 px-3 py-2.5 
                           bg-[#2F5FEB] text-white 
                           rounded-l-xl hover:bg-[#244ACC] 
                           transition-all duration-300 shadow-md hover:shadow-lg 
                           transform hover:scale-[1.02] text-xs sm:text-sm font-bold border-2 border-r-0 border-white"
              >
                {searchType === "product" ? (
                  <>
                    <Package size={14} />
                    <span className="hidden sm:inline">Sản phẩm</span>
                  </>
                ) : (
                  <>
                    <Store size={14} />
                    <span className="hidden sm:inline">Cửa hàng</span>
                  </>
                )}
                <ChevronDown
                  size={12}
                  className={`transition-transform duration-300 ${showSearchDropdown ? "rotate-180" : ""}`}
                />
              </button>

              {/* Dropdown loại tìm kiếm */}
              {showSearchDropdown && (
                <div
                  className="absolute left-0 top-[calc(100%+6px)] w-44 
                             bg-white border border-gray-200 rounded-xl shadow-xl 
                             overflow-hidden animate-fade-in z-[10000]"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setSearchType("product");
                      setShowSearchDropdown(false);
                    }}
                    className={`w-full px-4 py-3 text-sm font-medium flex items-center gap-2 transition-all duration-200 
                      ${searchType === "product"
                        ? "bg-[#2F5FEB]/10 text-[#2F5FEB]"
                        : "text-gray-700 hover:bg-gray-50"
                      }`}
                  >
                    <Package size={16} />
                    Tìm sản phẩm
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchType("store");
                      setShowSearchDropdown(false);
                    }}
                    className={`w-full px-4 py-3 text-sm font-medium flex items-center gap-2 transition-all duration-200 border-t border-gray-100 
                      ${searchType === "store"
                        ? "bg-[#2F5FEB]/10 text-[#2F5FEB]"
                        : "text-gray-700 hover:bg-gray-50"
                      }`}
                  >
                    <Store size={16} />
                    Tìm cửa hàng
                  </button>
                </div>
              )}

              {/* Input tìm kiếm */}
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => {
                  if (searchResults.length > 0) {
                    setShowSearchResults(true);
                  }
                }}
                placeholder={searchType === "product" ? "Tìm kiếm sản phẩm..." : "Tìm kiếm cửa hàng..."}
                className="w-full pl-[130px] pr-12 py-2.5 text-sm border-2 border-gray-300 rounded-xl 
                           shadow-md focus:outline-none focus:ring-2 focus:ring-[#2F5FEB] 
                           transition-all duration-200 bg-white/90 backdrop-blur-sm placeholder-gray-400"
              />

              {/* Kết quả tìm kiếm - Desktop */}
              {showSearchResults && (
                <div className="absolute left-0 top-[calc(100%+6px)] w-full bg-white border border-gray-200 rounded-xl shadow-xl max-h-96 overflow-y-auto z-[10000]">
                  {isSearching ? (
                    <div className="px-4 py-3 text-sm text-gray-500 text-center">Đang tìm kiếm...</div>
                  ) : searchResults.length > 0 ? (
                    <>
                      <div className="px-4 py-2 text-xs font-semibold text-gray-500 bg-gray-50 border-b">
                        Kết quả tìm kiếm ({totalSearchResults > 5 ? `5/${totalSearchResults}` : searchResults.length})
                      </div>
                      {searchResults.map((item) => (
                        <button
                          key={item._id}
                          onClick={() => searchType === "store" ? handleStoreClick(item._id) : handleProductClick(item._id)}
                          className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors border-b border-gray-100"
                        >
                          {searchType === "store" ? (
                            <>
                              {item.logoUrl ? (
                                <img src={item.logoUrl} alt={item.name} className="w-12 h-12 rounded-lg object-cover" />
                              ) : (
                                <div className="w-12 h-12 rounded-lg bg-[#2F5FEB] flex items-center justify-center">
                                  <Store size={24} className="text-white" />
                                </div>
                              )}
                              <div className="flex-1 text-left">
                                <div className="font-semibold text-sm text-gray-900">{item.name}</div>
                                <div className="text-xs text-gray-500 line-clamp-1 mt-1">{item.description}</div>
                                <div className="flex items-center gap-3 mt-1">
                                  {item.rating > 0 && (
                                    <div className="text-xs text-yellow-500">⭐ {item.rating.toFixed(1)}</div>
                                  )}
                                  {item.productsCount > 0 && (
                                    <div className="text-xs text-gray-400">{item.productsCount} sản phẩm</div>
                                  )}
                                </div>
                              </div>
                            </>
                          ) : (
                            <>
                              {item.images && item.images.length > 0 ? (
                                <img src={item.images[0]} alt={item.name} className="w-12 h-12 rounded-lg object-cover" />
                              ) : (
                                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                                  <Package size={24} className="text-white" />
                                </div>
                              )}
                              <div className="flex-1 text-left">
                                <div className="font-semibold text-sm text-gray-900">{item.name}</div>
                                <div className="text-xs text-gray-500 line-clamp-1 mt-1">{item.brand || item.category}</div>
                                <div className="flex items-center gap-3 mt-1">
                                  <div className="text-xs font-semibold text-[#2F5FEB]">
                                    {item.salePrice ? (
                                      <>
                                        <span className="line-through text-gray-400 mr-2">{item.price?.toLocaleString()}đ</span>
                                        <span>{item.salePrice?.toLocaleString()}đ</span>
                                      </>
                                    ) : (
                                      <span>{item.price?.toLocaleString()}đ</span>
                                    )}
                                  </div>
                                  {item.rating > 0 && (
                                    <div className="text-xs text-yellow-500">⭐ {item.rating.toFixed(1)}</div>
                                  )}
                                </div>
                              </div>
                            </>
                          )}
                          <ChevronRight size={18} className="text-gray-400" />
                        </button>
                      ))}
                      {totalSearchResults > 5 && (
                        <button
                          onClick={handleViewMore}
                          className="w-full px-4 py-3 text-sm font-semibold text-[#2F5FEB] hover:bg-[#2F5FEB]/5 transition-colors border-t border-gray-200"
                        >
                          Xem thêm {totalSearchResults - 5} kết quả
                        </button>
                      )}
                    </>
                  ) : searchTerm.trim().length >= 2 ? (
                    <div className="px-4 py-3 text-sm text-gray-500 text-center">
                      Không tìm thấy {searchType === "store" ? "cửa hàng" : "sản phẩm"}
                    </div>
                  ) : null}
                </div>
              )}

              {/* Nút search */}
              <button
                type="submit"
                className="absolute right-[2px] top-[2px] bottom-[2px] flex items-center justify-center 
                           bg-[#2F5FEB] text-white 
                           px-3 rounded-r-xl hover:bg-[#244ACC] 
                           transition-all duration-300 shadow-md hover:shadow-lg"
              >
                <Search size={18} />
              </button>
            </div>
          </form>
        </div>

        {/* Icons + User - Row 1: Cart, Notifications, Messages, Avatar */}
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          {/* Mobile Icons: Cart, Notifications, Messages, Avatar */}
          <div className="md:hidden flex items-center gap-1">
            <HeaderIcons cartCount={cartCount} userId={user._id} />
            <div className="relative">
              {user._id ? (
                <>
                  <button
                    className="relative group"
                    onClick={() => setShowDropdown((v) => !v)}
                    title={user.fullName}
                  >
                          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full overflow-hidden shadow-xl ring-2 ring-[#2F5FEB]/20 group-hover:ring-[#2F5FEB]/40 transition-all duration-300 transform group-hover:scale-110">
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-[#2F5FEB] flex items-center justify-center">
                          <User size={14} className="sm:w-4 sm:h-4 text-white" />
                        </div>
                      )}
                    </div>
                    {online && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-gradient-to-br from-green-400 to-green-600 border-2 border-white rounded-full animate-pulse shadow-md"></span>
                    )}
                  </button>
                  {showDropdown && (
                    <DropdownUser
                      userId={user._id}
                      online={online}
                      lastSeen={lastSeen}
                      handleLogout={handleLogout}
                      setShowDropdown={setShowDropdown}
                      userRole={user.role}
                    />
                  )}
                </>
              ) : (
                <button
                  onClick={handleLoginClick}
                  className="p-1.5 sm:p-2 bg-[#2F5FEB] text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 hover:bg-[#244ACC]"
                  title="Đăng nhập"
                >
                  <User size={14} className="sm:w-4 sm:h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Desktop Icons */}
          <div className="hidden md:flex items-center gap-2 sm:gap-3">
            <HeaderIcons cartCount={cartCount} userId={user._id} />
            <div className="relative">
              {user._id ? (
                <>
                  <button
                    className="relative group"
                    onClick={() => setShowDropdown((v) => !v)}
                    title={user.fullName}
                  >
                    <div className="w-10 h-10 md:w-11 md:h-11 rounded-full overflow-hidden shadow-xl ring-2 md:ring-3 ring-[#2F5FEB]/20 group-hover:ring-[#2F5FEB]/40 transition-all duration-300 transform group-hover:scale-110">
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-[#2F5FEB] flex items-center justify-center">
                          <User size={20} className="text-white" />
                        </div>
                      )}
                    </div>
                    {online && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 md:w-3.5 md:h-3.5 bg-gradient-to-br from-green-400 to-green-600 border-2 md:border-3 border-white rounded-full animate-pulse shadow-md"></span>
                    )}
                  </button>
                  {showDropdown && (
                    <DropdownUser
                      userId={user._id}
                      online={online}
                      lastSeen={lastSeen}
                      handleLogout={handleLogout}
                      setShowDropdown={setShowDropdown}
                      userRole={user.role}
                    />
                  )}
                </>
              ) : (
                <button
                  onClick={handleLoginClick}
                  className="hidden sm:flex items-center gap-2 bg-[#2F5FEB] text-white px-4 py-2 md:px-6 md:py-2.5 rounded-xl font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 group text-sm md:text-base hover:bg-[#244ACC]"
                  title="Đăng nhập"
                >
                  <User size={18} className="group-hover:scale-125 transition-transform" />
                  <span className="hidden lg:inline">Đăng nhập</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>




      {/* Navigation - Row 2: Horizontal scroll on mobile */}
      <nav className="flex flex-row gap-2 sm:gap-4 px-2 sm:px-4 md:px-8 py-2 sm:py-3 text-sm sm:text-base font-bold text-gray-700 border-t-2 border-gray-200 bg-white overflow-x-auto no-scrollbar">
        {navLinks.map(({ to, label, icon: Icon }, index) => (
          <Link
            key={`${label}-${index}`}
            to={to}
            className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 hover:text-[#2F5FEB] transition-all duration-300 relative group rounded-lg hover:bg-transparent whitespace-nowrap flex-shrink-0"
          >
            <Icon size={16} className="sm:w-5 sm:h-5 md:hidden" />
            <span>{label}</span>
            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-[#2F5FEB] group-hover:w-full transition-all duration-300 rounded-full hidden md:block"></span>
          </Link>
        ))}
      </nav>

      {/* Mobile sidebar */}

    </header>
  );
};

export default Header;
