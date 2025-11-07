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
  Heart,
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
import NotificationButton from "../../components/Notification/NotificationButton";

const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, online, lastSeen, showDropdown, setShowDropdown, handleLogout } = useHeader();
  const { cartCount } = useCart();
  const { unreadMessages } = useChat();

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchType, setSearchType] = useState<"product" | "store">("product");
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchDropdownRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  const totalUnreadMessages = Object.values(unreadMessages).reduce((sum, count) => sum + count, 0);

  const navLinks = [
    { to: "/", label: "Trang chủ", icon: Home },
    { to: "/stores", label: "Cửa hàng", icon: Store },
    { to: "/products", label: "Sản phẩm", icon: Package },
    { to: "/new", label: "Khuyến mãi", icon: Tag },
    { to: "/support", label: "Hỗ trợ", icon: Headset },
  ];

  const mobileSecondaryMenuItems = [
    { to: "/voucher", label: "Voucher", icon: Gift },
    { to: "/Whitelist", label: "Yêu thích", icon: Heart },
    { to: "/message", label: "Tin nhắn", icon: MessageCircle, badge: totalUnreadMessages },
    { to: "/wallet", label: "Ví của tôi", icon: WalletIconLucide },
  ];

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchDropdownRef.current && !searchDropdownRef.current.contains(e.target as Node)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Đóng menu hành động trên mobile khi click ra ngoài
  useEffect(() => {
    if (!isMobileMenuOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMobileMenuOpen]);

  // Đóng các menu khi thay đổi route
  useEffect(() => {
    setIsSidebarOpen(false);
    setIsMobileMenuOpen(false);
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
        navigate(`/stores?search=${encodeURIComponent(searchTerm.trim())}`);
      } else {
        navigate(`/products?search=${encodeURIComponent(searchTerm.trim())}`);
      }
      setSearchTerm("");
    }
  };

  // Xử lý login
  const handleLoginClick = () => {
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl shadow-xl border-b-2 border-gray-200">
      {/* Top bar */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white hidden md:block">
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

      {/* Main header */}
      <div className="flex items-center justify-between px-4 sm:px-8 py-3 bg-white">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="md:hidden p-2 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg hover:from-gray-200 hover:to-gray-300 transition-all duration-300 transform hover:scale-110 shadow-md"
            aria-label="Mở menu"
          >
            <ChevronRight size={20} className="text-gray-700" />
          </button>
          <Link to="/" className="relative group animate-fade-in-left">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 rounded-xl flex items-center justify-center shadow-xl group-hover:shadow-purple-500/50 transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                <span className="text-2xl md:text-3xl font-black text-white">MĐ</span>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl md:text-2xl font-black bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  ShopMduc247
                </h1>
                <p className="text-xs text-gray-500 font-bold">Shopping Mall</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Search */}
        <div className="hidden md:flex items-center flex-1 max-w-xl mx-4">
          <form onSubmit={handleSearch} className="relative w-full group">
            <div className="relative flex items-center" ref={searchDropdownRef}>
              {/* Nút chọn loại tìm kiếm */}
              <button
                type="button"
                onClick={() => setShowSearchDropdown(!showSearchDropdown)}
                className="absolute left-[2px] top-[2px] bottom-[2px] z-20 flex items-center justify-center gap-1 px-3 py-2.5 
                           bg-gradient-to-r from-blue-600 to-purple-600 text-white 
                           rounded-l-xl hover:from-blue-700 hover:to-purple-700 
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
                             overflow-hidden animate-fade-in z-[9999]"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setSearchType("product");
                      setShowSearchDropdown(false);
                    }}
                    className={`w-full px-4 py-3 text-sm font-medium flex items-center gap-2 transition-all duration-200 
                      ${searchType === "product"
                        ? "bg-gradient-to-r from-blue-50 to-purple-50 text-blue-600"
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
                        ? "bg-gradient-to-r from-blue-50 to-purple-50 text-blue-600"
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
                placeholder={searchType === "product" ? "Tìm kiếm sản phẩm..." : "Tìm kiếm cửa hàng..."}
                className="w-full pl-[130px] pr-12 py-2.5 text-sm border-2 border-gray-300 rounded-xl 
                           shadow-md focus:outline-none focus:ring-2 focus:ring-purple-400 
                           transition-all duration-200 bg-white/90 backdrop-blur-sm placeholder-gray-400"
              />

              {/* Nút search */}
              <button
                type="submit"
                className="absolute right-[2px] top-[2px] bottom-[2px] flex items-center justify-center 
                           bg-gradient-to-r from-purple-600 to-blue-600 text-white 
                           px-3 rounded-r-xl hover:from-purple-700 hover:to-blue-700 
                           transition-all duration-300 shadow-md hover:shadow-lg"
              >
                <Search size={18} />
              </button>
            </div>
          </form>
        </div>

        {/* Icons + User */}
        <div className="flex items-center gap-2 sm:gap-3 animate-fade-in-right delay-300">
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
                    <div className="w-10 h-10 md:w-11 md:h-11 rounded-full overflow-hidden shadow-xl ring-2 md:ring-3 ring-purple-500/20 group-hover:ring-purple-500/40 transition-all duration-300 transform group-hover:scale-110">
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
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
                    />
                  )}
                </>
              ) : (
                <button
                  onClick={handleLoginClick}
                  className="hidden sm:flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 md:px-6 md:py-2.5 rounded-xl font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 group text-sm md:text-base"
                  title="Đăng nhập"
                >
                  <User size={18} className="group-hover:scale-125 transition-transform" />
                  <span className="hidden lg:inline">Đăng nhập</span>
                </button>
              )}
            </div>
          </div>

          <div className="md:hidden flex items-center gap-2">
            <NotificationButton userId={user._id} />
            <div className="relative">
              {user._id ? (
                <>
                  <button
                    className="relative group"
                    onClick={() => setShowDropdown((v) => !v)}
                    title={user.fullName}
                  >
                    <div className="w-10 h-10 rounded-full overflow-hidden shadow-xl ring-2 ring-purple-500/20 group-hover:ring-purple-500/40 transition-all duration-300 transform group-hover:scale-110">
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                          <User size={18} className="text-white" />
                        </div>
                      )}
                    </div>
                    {online && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-gradient-to-br from-green-400 to-green-600 border-2 border-white rounded-full animate-pulse shadow-md"></span>
                    )}
                  </button>
                  {showDropdown && (
                    <DropdownUser
                      userId={user._id}
                      online={online}
                      lastSeen={lastSeen}
                      handleLogout={handleLogout}
                      setShowDropdown={setShowDropdown}
                    />
                  )}
                </>
              ) : (
                <button
                  onClick={handleLoginClick}
                  className="p-2 bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300"
                  title="Đăng nhập"
                >
                  <User size={18} />
                </button>
              )}
            </div>

            <div className="relative" ref={mobileMenuRef}>
                <button
                  onClick={() => setIsMobileMenuOpen((prev) => !prev)}
                  className="p-2 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg hover:from-gray-200 hover:to-gray-300 transition-all duration-300 transform hover:scale-110 shadow-md"
                  aria-label="Mở menu nhanh"
                >
                  <Menu size={20} className="text-gray-700" />
                </button>
              <div
                className={`absolute right-0 top-full mt-2 w-60 max-w-[85vw] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden transition-all duration-200 origin-top-right transform ${
                  isMobileMenuOpen ? "scale-100 opacity-100" : "scale-95 opacity-0 pointer-events-none"
                }`}
              >
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-3">
                  <p className="text-white font-bold text-base">Menu nhanh</p>
                </div>
                <div className="flex flex-col py-2">
                  {mobileSecondaryMenuItems.map(({ to, label, icon: Icon, badge }, index) => (
                    <Link
                      key={`${label}-${index}`}
                      to={to}
                      className="flex items-center gap-3 px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-blue-50 to-purple-50 text-purple-600">
                        <Icon size={18} />
                      </div>
                      <span className="flex-1">{label}</span>
                      {badge && badge > 0 && (
                        <span className="text-xs font-bold text-white bg-gradient-to-r from-red-500 to-pink-600 px-2 py-0.5 rounded-full">
                          {badge > 99 ? "99+" : badge}
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="hidden md:flex flex-row gap-4 px-4 sm:px-8 py-3 text-base font-bold text-gray-700 border-t-2 border-gray-200 bg-white">
        {navLinks.map(({ to, label }, index) => (
          <Link
            key={`${label}-${index}`}
            to={to}
            className="px-4 py-2.5 hover:text-purple-600 transition-all duration-300 relative group rounded-lg hover:bg-transparent"
          >
            {label}
            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 group-hover:w-full transition-all duration-300 rounded-full"></span>
          </Link>
        ))}
      </nav>

      {/* Mobile sidebar */}
      <div
        className={`fixed inset-0 z-[9998] md:hidden transition-all duration-300 ${
          isSidebarOpen ? "visible opacity-100" : "invisible opacity-0 pointer-events-none"
        }`}
      >
        <div
          className={`fixed inset-0 bg-black/40 transition-opacity duration-300 ${
            isSidebarOpen ? "opacity-100" : "opacity-0"
          }`}
          onClick={() => setIsSidebarOpen(false)}
        ></div>
        <div
          className={`fixed top-0 left-0 h-screen w-full bg-white shadow-2xl border-r border-gray-200 transform transition-transform duration-300 ${
            isSidebarOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex flex-col h-full bg-white">
            <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200 bg-white">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold">
                  MĐ
                </div>
                <span className="font-bold text-lg text-gray-800">Danh mục</span>
              </div>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Đóng menu"
              >
                <X size={18} className="text-gray-600" />
              </button>
            </div>
            <nav className="flex flex-col py-4 px-2 overflow-y-auto flex-1 bg-white">
              {navLinks.map(({ to, label, icon: Icon }, index) => (
                <Link
                  key={`${label}-sidebar-${index}`}
                  to={to}
                  className="flex items-center gap-3 px-4 py-3 mx-2 my-1 text-base font-semibold text-gray-700 bg-white rounded-lg border border-gray-100 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 hover:border-purple-200 hover:shadow-sm transition-all"
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center text-purple-600 flex-shrink-0">
                    <Icon size={20} />
                  </div>
                  <span>{label}</span>
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
