import React, { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, Menu, Search, ChevronDown, Store, Package } from "lucide-react";
import { useHeader } from "./useHeader";
import DropdownUser from "./DropdownUser";
import { HeaderIcons } from "./HeaderIcons";
import { useCart } from "../../context/CartContext";

const Header: React.FC = () => {
  const navigate = useNavigate();
  const { user, online, lastSeen, showDropdown, setShowDropdown, handleLogout } = useHeader();
  const { cartCount } = useCart();

  const [menuOpen, setMenuOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchType, setSearchType] = useState<"product" | "store">("product");
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchDropdownRef = useRef<HTMLDivElement>(null);

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
      <div className="flex items-center justify-between px-4 sm:px-8 py-3 bg-gradient-to-r from-gray-50 to-white">
        {/* Logo */}
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
          <HeaderIcons cartCount={cartCount} />
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

          {/* Nút mở menu mobile */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg hover:from-gray-200 hover:to-gray-300 transition-all duration-300 transform hover:scale-110 shadow-md"
          >
            <Menu size={20} className="text-gray-700" />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav
        className={`${
          menuOpen ? "flex" : "hidden md:flex"
        } flex-col md:flex-row gap-1 md:gap-4 px-4 sm:px-8 py-2 md:py-3 text-sm md:text-base font-bold text-gray-700 border-t-2 border-gray-200 bg-gradient-to-r from-gray-50 via-white to-gray-50 md:bg-white`}
      >
        {[
          { to: "/", label: "Trang chủ" },
          { to: "/stores", label: "Cửa hàng" },
          { to: "/products", label: "Sản phẩm" },
          { to: "/new", label: "Khuyến mãi" },
          { to: "/support", label: "Hỗ trợ" },
        ].map((item, index) => (
          <Link
            key={index}
            to={item.to}
            className="px-4 py-2 md:py-2.5 hover:text-purple-600 transition-all duration-300 relative group rounded-lg md:rounded-lg hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 md:hover:bg-transparent"
          >
            {item.label}
            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 group-hover:w-full transition-all duration-300 rounded-full hidden md:block"></span>
          </Link>
        ))}
      </nav>
    </header>
  );
};

export default Header;
