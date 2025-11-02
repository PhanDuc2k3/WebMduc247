import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, Menu, Search } from "lucide-react";
import { useHeader } from "./useHeader";
import DropdownUser from "./DropdownUser";
import { HeaderIcons } from "./HeaderIcons";
import { useCart } from "../../context/CartContext";

const Header: React.FC = () => {
  const navigate = useNavigate();
  const { user, online, lastSeen, showDropdown, setShowDropdown, handleLogout } = useHeader();
  const { cartCount } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLoginClick = () => {
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl shadow-xl border-b-2 border-gray-200">
      {/* Top bar */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white hidden md:block">
        <div className="flex justify-between items-center px-4 sm:px-8 py-2 text-xs font-semibold">
          <div className="flex items-center gap-2">
            <span className="text-base animate-pulse"></span>
            <span>Miễn phí vận chuyển đơn từ 300k</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-base">📞</span>
            <span>Hotline: 1800-1234</span>
          </div>
        </div>
      </div>

      {/* Main header */}
      <div className="flex items-center justify-between px-4 sm:px-8 py-3 bg-gradient-to-r from-gray-50 to-white">
        {/* Logo */}
        <Link
          to="/"
          className="relative group animate-fade-in-left"
        >
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 rounded-xl flex items-center justify-center shadow-xl group-hover:shadow-purple-500/50 transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-300">
                <span className="text-2xl md:text-3xl font-black text-white">MĐ</span>
              </div>
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
          <div className="relative w-full group">
            <input
              type="text"
              placeholder="Tìm kiếm sản phẩm..."
              className="w-full pl-4 pr-12 py-2.5 bg-white border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500/30 focus:border-purple-600 transition-all duration-300 placeholder:text-gray-400 font-semibold text-gray-900 text-sm shadow-md hover:shadow-lg"
            />
            <button className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-2.5 rounded-lg hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-300 group-hover:rotate-12">
              <Search size={18} className="drop-shadow-lg" />
            </button>
          </div>
        </div>

        {/* Icons + User */}
        <div className="flex items-center gap-2 sm:gap-3 animate-fade-in-right delay-300">
          <HeaderIcons cartCount={cartCount} />

          {/* User avatar / login */}
          <div className="relative">
            {user._id ? (
              // Đã login: avatar + dropdown
              <>
                <button
                  className="relative group"
                  onClick={() => setShowDropdown((v) => !v)}
                  title={user.fullName}
                >
                  <div className="w-10 h-10 md:w-11 md:h-11 rounded-full overflow-hidden shadow-xl ring-2 md:ring-3 ring-purple-500/20 group-hover:ring-purple-500/40 transition-all duration-300 transform group-hover:scale-110">
                    {user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt="avatar"
                        className="w-full h-full object-cover"
                      />
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
              // Chưa login: giống HeaderIcons style
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

          {/* Mobile menu button */}
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
          { to: '/', label: 'Trang chủ' },
          { to: '/stores', label: ' Cửa hàng' },
          { to: '/products', label: ' Sản phẩm' },
          { to: '/new', label: ' Khuyến mãi' },
          { to: '/support', label: ' Hỗ trợ' }
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
