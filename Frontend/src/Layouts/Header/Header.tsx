// Header.tsx
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { User, Menu, Search } from "lucide-react";
import { useHeader } from "./useHeader";
import DropdownUser from "./DropdownUser";
import { HeaderIcons } from "./HeaderIcons";
import { useCart } from "../../context/CartContext"; // Thêm import useCart

const Header: React.FC = () => {
  const {
    user,
    showDropdown,
    setShowDropdown,
    // cartCount, // Đã loại bỏ
    online,
    lastSeen,
    handleLogout,
  } = useHeader();

  const { cartCount } = useCart(); // Lấy cartCount trực tiếp từ CartContext

  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="bg-white shadow-sm">
      {/* Top bar */}
      <div className="bg-gradient-to-r from-[#3a5ef7] to-[#a259f7] text-white flex justify-between items-center px-4 sm:px-8 py-1 text-sm sm:text-base">
        <span>Miễn phí vận chuyển đơn từ 300k</span>
        <span>Hotline: 1800 1234</span>
      </div>

      {/* Main header */}
      <div className="flex items-center justify-between px-4 sm:px-8 py-4">
        {/* Logo */}
        <Link to="/" className="bg-gradient-to-r from-[#3a5ef7] to-[#a259f7] text-white text-xl sm:text-2xl font-bold rounded-xl px-5 py-2">
          ShopMduc247
        </Link>

        {/* Search */}
        <div className="hidden md:flex items-center bg-[#f5f7fe] rounded-xl px-3 min-w-[400px] shadow-sm">
          <input
            type="text"
            placeholder="Tìm kiếm sản phẩm, thương hiệu..."
            className="border-none bg-transparent outline-none w-full py-2 text-[#16161a] placeholder:text-[#bdbdbd]"
          />
          <button className="bg-gradient-to-r from-[#3a5ef7] to-[#a259f7] p-2 rounded-xl text-white">
            <Search size={20} />
          </button>
        </div>

        {/* Icons + User */}
        <div className="flex items-center gap-6">
          <HeaderIcons cartCount={cartCount} />

          {/* User avatar */}
          <div className="relative">
            <span
              className="w-9 h-9 rounded-full bg-[#f5f7fe] overflow-hidden cursor-pointer flex items-center justify-center"
              onClick={() => setShowDropdown(v => !v)}
            >
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt="avatar" className="w-9 h-9 rounded-full object-cover" />
              ) : (
                <User size={22} />
              )}
            </span>

            {/* Online status dot */}
            {online && (
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full" />
            )}

            {/* Dropdown */}
            {showDropdown && (
              <DropdownUser
                userId=""
                online={online}
                lastSeen={lastSeen}
                handleLogout={handleLogout}
                setShowDropdown={setShowDropdown}
              />
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition"
          >
            <Menu size={24} />
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav
        className={`${
          menuOpen ? "flex" : "hidden"
        } flex-col md:flex-row md:flex gap-4 md:gap-8 px-4 sm:px-8 pb-4 md:pb-0 text-base md:text-lg font-medium text-[#16161a]`}
      >
        <Link to="/" className="hover:text-[#3a5ef7] transition">Trang chủ</Link>
        <Link to="/stores" className="hover:text-[#3a5ef7] transition">Cửa hàng</Link>
        <Link to="/categories" className="hover:text-[#3a5ef7] transition">Danh mục</Link>
        <Link to="/new" className="hover:text-[#3a5ef7] transition">Khuyến mãi</Link>
        <Link to="/support" className="hover:text-[#3a5ef7] transition">Hỗ trợ</Link>
        <Link to="/chatbot" className="hover:text-[#3a5ef7] transition">Chatbot</Link>
      </nav>

      <div className="border-b-2 border-[#f0f0f0] mx-4 sm:mx-8 mt-2"></div>
    </header>
  );
};

export default Header;