import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const Header: React.FC = () => {
  const [user, setUser] = useState<{ fullName?: string; avatarUrl?: string } | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();

useEffect(() => {
  const fetchUser = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setUser(null);
        return;
      }

      // Gọi API lấy user từ DB
      const res = await fetch("http://localhost:5000/api/users/profile", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error("Không thể lấy thông tin user");
      }

      const data = await res.json();
      setUser({
        fullName: data.fullName || data.user?.fullName,
        avatarUrl: data.avatarUrl || data.user?.avatarUrl, // field avatar từ DB
      });
    } catch (error) {
      console.error("Fetch user error:", error);
      setUser(null);
    }
  };

  fetchUser();

  // 🟢 Lắng nghe sự kiện update avatar
  window.addEventListener("userUpdated", fetchUser);
  return () => window.removeEventListener("userUpdated", fetchUser);
}, []);


  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setShowDropdown(false);
    navigate("/login");
  };

  return (
    <header className="bg-white shadow-[0_2px_8px_rgba(127,90,240,0.08)]">
      {/* Top gradient bar */}
      <div className="bg-gradient-to-r from-[#3a5ef7] to-[#a259f7] text-white flex justify-between items-center px-8 py-1 text-base">
        <span className="font-medium">Miễn phí vận chuyển đơn từ 300k</span>
        <span className="font-normal">Hotline: 1800 1234 &nbsp; Ứng dụng</span>
      </div>

      {/* Main header: logo, search, actions */}
      <div className="flex items-center justify-between px-8 pt-5">
        <div className="flex items-center">
          <span className="bg-gradient-to-r from-[#3a5ef7] to-[#a259f7] text-white text-2xl font-bold rounded-xl px-8 py-2 shadow-[0_2px_8px_rgba(127,90,240,0.12)]">
            ShopMduc247
          </span>
        </div>

        <div className="flex items-center bg-[#f5f7fe] rounded-xl px-3 min-w-[480px] shadow-[0_2px_8px_rgba(127,90,240,0.04)]">
          <input
            type="text"
            className="border-none bg-transparent outline-none text-lg w-full py-3 text-[#16161a] placeholder:text-[#bdbdbd]"
            placeholder="Tìm kiếm sản phẩm, thương hiệu và loại sản phẩm..."
          />
          <button className="bg-gradient-to-r from-[#3a5ef7] to-[#a259f7] border-none rounded-xl px-4 py-2 ml-2 flex items-center">
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" stroke="#fff" strokeWidth="2" />
              <path stroke="#fff" strokeWidth="2" d="M21 21l-4.35-4.35" />
            </svg>
          </button>
        </div>

        <div className="flex gap-8 text-lg text-[#16161a]">
          {/* Yêu thích */}
          <Link to="/wishlist" className="flex items-center gap-1 font-medium cursor-pointer px-2 py-1 rounded transition hover:bg-gray-100">
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
              <path
                d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 
                   2 5.42 4.42 3 7.5 3c2.04 0 3.81 1.23 4.5 3.09C13.69 
                   4.23 15.46 3 17.5 3 20.58 3 23 5.42 23 
                   8.5c0 3.78-3.4 6.86-8.55 
                   11.54L12 21.35z"
                stroke="#16161a"
                strokeWidth="1.5"
              />
            </svg>
            Yêu thích
          </Link>

          {/* Voucher */}
          <Link to="/voucher" className="flex items-center gap-1 font-medium cursor-pointer px-2 py-1 rounded transition hover:bg-gray-100">
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
              <rect
                x="4"
                y="8"
                width="16"
                height="10"
                rx="2"
                stroke="#16161a"
                strokeWidth="1.5"
              />
              <path
                d="M8 8V6a4 4 0 118 0v2"
                stroke="#16161a"
                strokeWidth="1.5"
              />
            </svg>
            Voucher
          </Link>

          {/* Giỏ hàng */}
          <Link to="/cart" className="flex items-center gap-1 font-medium cursor-pointer px-2 py-1 rounded transition hover:bg-gray-100">
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
              <path
                d="M6 6h15l-1.5 9h-13z"
                stroke="#16161a"
                strokeWidth="1.5"
              />
              <circle
                cx="9"
                cy="20"
                r="1"
                stroke="#16161a"
                strokeWidth="1.5"
              />
              <circle
                cx="18"
                cy="20"
                r="1"
                stroke="#16161a"
                strokeWidth="1.5"
              />
            </svg>
            Giỏ hàng
          </Link>

          {/* Tin nhắn */}
          <Link to="/message/:id" className="flex items-center gap-1 font-medium cursor-pointer px-2 py-1 rounded transition hover:bg-gray-100">
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
              <path
                d="M21 11.5a8.38 8.38 0 01-.9 3.8c-.6 1.2-1.6 2.2-2.8 
                   2.9l-4.3 2.3V18h-.5A8.5 8.5 0 1121 11.5z"
                stroke="#16161a"
                strokeWidth="1.5"
              />
            </svg>
            Tin nhắn
          </Link>

          {/* Nếu đã đăng nhập thì chỉ hiện avatar, bấm vào hiện dropdown */}
          {user ? (
            <div className="relative flex items-center">
              <span
                className="w-9 h-9 rounded-full overflow-hidden bg-[#f5f7fe] flex items-center justify-center cursor-pointer"
                onClick={() => setShowDropdown(v => !v)}
              >
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="avatar" className="w-9 h-9 rounded-full object-cover" />
                ) : (
                  <svg width="36" height="36" fill="none" viewBox="0 0 24 24">
                    <circle cx="12" cy="8" r="4" stroke="#16161a" strokeWidth="1.5"/>
                    <path d="M4 20v-2a4 4 0 014-4h8a4 4 0 014 4v2" stroke="#16161a" strokeWidth="1.5"/>
                  </svg>
                )}
              </span>
              {showDropdown && (
                <div className="absolute top-12 right-0 bg-white text-[#16161a] min-w-[220px] rounded-xl shadow-lg p-5 z-50">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="w-8 h-8 rounded-full overflow-hidden bg-[#f5f7fe] flex items-center justify-center">
                      {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt="avatar" className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <svg width="32" height="32" fill="none" viewBox="0 0 24 24">
                          <circle cx="12" cy="8" r="4" stroke="#16161a" strokeWidth="1.5"/>
                          <path d="M4 20v-2a4 4 0 014-4h8a4 4 0 014 4v2" stroke="#16161a" strokeWidth="1.5"/>
                        </svg>
                      )}
                    </span>
                    <span className="text-base font-semibold">{user.fullName}</span>
                  </div>
                  <button
                    className="w-full bg-white text-[#16161a] rounded-lg py-3 text-base font-medium mb-2 flex items-center px-2 hover:bg-[#f5f7fe] transition"
                    onClick={() => { setShowDropdown(false); navigate("/profile"); }}
                  >
                    <span className="mr-2"></span> Trang cá nhân
                  </button>
                  <button
                    className="w-full bg-white text-[#16161a] rounded-lg py-3 text-base font-medium mb-2 flex items-center px-2 hover:bg-[#f5f7fe] transition"
                    onClick={() => { setShowDropdown(false); navigate("/mystore"); }}
                  >
                    <span className="mr-2"></span> Cửa hàng của tôi
                  </button>
                  <button
                    className="w-full bg-white text-[#16161a] rounded-lg py-3 text-base font-medium flex items-center px-2 hover:bg-[#f5f7fe] transition"
                    onClick={handleLogout}
                  >
                    <span className="mr-2"></span> Đăng xuất
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="flex items-center gap-1 font-medium cursor-pointer px-2 py-1 rounded transition hover:bg-gray-100">
              <svg
                width="22"
                height="22"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  cx="12"
                  cy="8"
                  r="4"
                  stroke="#16161a"
                  strokeWidth="1.5"
                />
                <path
                  d="M4 20v-2a4 4 0 014-4h8a4 4 0 014 4v2"
                  stroke="#16161a"
                  strokeWidth="1.5"
                />
              </svg>
              Đăng nhập
            </Link>
          )}
        </div>
      </div>

      {/* Navbar */}
      <nav className="flex gap-8 px-8 pt-5 text-lg text-[#16161a] font-medium items-center">
        <span className="flex items-center gap-1 text-[#1976d2] font-semibold">
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
            <rect x="3" y="6" width="18" height="2" rx="1" fill="#1976d2" />
            <rect x="3" y="11" width="18" height="2" rx="1" fill="#1976d2" />
            <rect x="3" y="16" width="18" height="2" rx="1" fill="#1976d2" />
          </svg>
          <span className="text-[#1976d2]">Danh mục</span>
        </span>
        <Link to="/" className="hover:text-[#1976d2] transition-colors">Trang chủ</Link>
        <Link to="/stores" className="hover:text-[#1976d2] transition-colors">Cửa hàng</Link>
        <Link to="/categories" className="hover:text-[#1976d2] transition-colors">Danh mục</Link>
        <Link to="/promotions" className="hover:text-[#1976d2] transition-colors">Khuyến mãi</Link>
        <Link to="/brands" className="hover:text-[#1976d2] transition-colors">Thương hiệu</Link>
        <Link to="/bestsellers" className="hover:text-[#1976d2] transition-colors">Bán chạy</Link>
        <Link to="/support" className="hover:text-[#1976d2] transition-colors">Hỗ trợ</Link>
      </nav>

      <div className="border-b-2 border-[#f0f0f0] mx-8 mt-2"></div>
    </header>
  );
};

export default Header;