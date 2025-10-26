// src/Layouts/Header/Header.tsx
import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axiosClient from "../../api/axiosClient";
import {
  Heart,
  ShoppingCart,
  MessageCircle,
  User,
  Menu,
  Gift,
  LogOut,
  Store,
  UserCircle,
  Search,
} from "lucide-react";
import { getSocket } from "../../socket";

const Header: React.FC = () => {
  const [user, setUser] = useState<{ fullName?: string; avatarUrl?: string } | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const navigate = useNavigate();

  const socket = getSocket();

  // --- Fetch user info
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await axiosClient.get("/api/users/profile");
        setUser({
          fullName: res.data.fullName || res.data.user?.fullName,
          avatarUrl: res.data.avatarUrl || res.data.user?.avatarUrl,
        });
      } catch (err) {
        console.warn("⚠️ Header - fetch user failed", err);
        setUser(null);
      }
    };
    fetchUser();
    window.addEventListener("userUpdated", fetchUser);
    return () => window.removeEventListener("userUpdated", fetchUser);
  }, []);

  // --- Fetch initial cart count
  useEffect(() => {
    const fetchCart = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;
      try {
        const res = await axiosClient.get("/api/cart", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const totalCount = res.data.items.reduce((sum: number, i: any) => sum + i.quantity, 0);
        setCartCount(totalCount);
      } catch (err) {
        console.warn("⚠️ Header - fetch initial cart failed", err);
      }
    };
    fetchCart();
  }, []);

  // --- Socket realtime cartCount
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    let userId: string | null = null;
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      userId = payload.userId || payload.id || payload.sub;

    } catch (err) {
      console.warn(" Header - token parse error", err);
    }
    if (!userId) return;

    // --- Connect socket nếu chưa connect
    if (!socket.connected) {
      socket.connect();
    }

    socket.emit("joinUserCart", userId);

    socket.on("connect", () => console.log("Header - socket connected", socket.id));
    socket.on("disconnect", (reason) => console.log(" Header - socket disconnected", reason));

    socket.on("cartUpdated", (data: any) => {
      setCartCount(data.cartCount ?? 0);
    });

    return () => {
      socket.off("cartUpdated");
    };
  }, [socket]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setShowDropdown(false);
    navigate("/login");
  };

  return (
    <header className="bg-white shadow-sm">
      {/* Top bar */}
      <div className="bg-gradient-to-r from-[#3a5ef7] to-[#a259f7] text-white flex justify-between items-center px-4 sm:px-8 py-1 text-sm sm:text-base">
        <span>Miễn phí vận chuyển đơn từ 300k</span>
        <span>Hotline: 1800 1234 </span>
      </div>

      {/* Main header */}
      <div className="flex items-center justify-between px-4 sm:px-8 py-4">
        <div className="flex items-center gap-2">
          <span className="bg-gradient-to-r from-[#3a5ef7] to-[#a259f7] text-white text-xl sm:text-2xl font-bold rounded-xl px-5 py-2">
            ShopMduc247
          </span>
        </div>

        <div className="hidden md:flex items-center bg-[#f5f7fe] rounded-xl px-3 min-w-[400px] shadow-sm">
          <input
            type="text"
            className="border-none bg-transparent outline-none text-base w-full py-2 text-[#16161a] placeholder:text-[#bdbdbd]"
            placeholder="Tìm kiếm sản phẩm, thương hiệu..."
          />
          <button className="bg-gradient-to-r from-[#3a5ef7] to-[#a259f7] p-2 rounded-xl text-white">
            <Search size={20} />
          </button>
        </div>

        <div className="flex items-center gap-10">
          <Link to="/wishlist" className="hidden sm:flex items-center gap-1 hover:text-[#3a5ef7] transition">
            <Heart size={22} /> <span className="hidden lg:inline">Yêu thích</span>
          </Link>
          <Link to="/voucher" className="hidden sm:flex items-center gap-1 hover:text-[#3a5ef7] transition">
            <Gift size={22} /> <span className="hidden lg:inline">Voucher</span>
          </Link>

          {/* Giỏ hàng */}
<Link to="/cart" className="relative flex items-center gap-1 hover:text-[#3a5ef7] transition">
  {/* Icon */}
  <div className="relative">
    <ShoppingCart size={22} />
    {cartCount > 0 && (
      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
        {cartCount}
      </span>
    )}
  </div>

  {/* Text */}
  <span className="hidden lg:inline ml-1">Giỏ hàng</span>
</Link>


          <Link to="/message" className="hidden sm:flex items-center gap-1 hover:text-[#3a5ef7] transition">
            <MessageCircle size={22} /> <span className="hidden lg:inline">Tin nhắn</span>
          </Link>

          {user ? (
            <div className="relative">
              <span
                onClick={() => setShowDropdown((v) => !v)}
                className="w-9 h-9 rounded-full bg-[#f5f7fe] overflow-hidden cursor-pointer flex items-center justify-center"
              >
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="avatar" className="w-9 h-9 rounded-full object-cover" />
                ) : (
                  <User size={22} />
                )}
              </span>
              {showDropdown && (
                <div className="absolute right-0 mt-2 bg-white border rounded-xl shadow-md w-48 p-2 z-50">
                  <button
                    onClick={() => {
                      setShowDropdown(false);
                      navigate("/profile");
                    }}
                    className="flex items-center w-full px-3 py-2 rounded-md hover:bg-gray-100"
                  >
                    <UserCircle className="mr-2" size={18} /> Trang cá nhân
                  </button>
                  <button
                    onClick={() => {
                      setShowDropdown(false);
                      navigate("/mystore");
                    }}
                    className="flex items-center w-full px-3 py-2 rounded-md hover:bg-gray-100"
                  >
                    <Store className="mr-2" size={18} /> Cửa hàng của tôi
                  </button>
                  <button
                    onClick={handleLogout}
                    className="flex items-center w-full px-3 py-2 rounded-md hover:bg-gray-100"
                  >
                    <LogOut className="mr-2" size={18} /> Đăng xuất
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="flex items-center gap-1 hover:text-[#3a5ef7] transition">
              <User size={22} /> <span className="hidden lg:inline">Đăng nhập</span>
            </Link>
          )}

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition"
          >
            <Menu size={24} />
          </button>
        </div>
      </div>

      <nav
        className={`${
          menuOpen ? "flex" : "hidden"
        } md:flex flex-col md:flex-row gap-4 md:gap-8 px-4 sm:px-8 pb-4 md:pb-0 text-base md:text-lg text-[#16161a] font-medium`}
      >
        <Link to="/" className="hover:text-[#3a5ef7] transition">
          Trang chủ
        </Link>
        <Link to="/stores" className="hover:text-[#3a5ef7] transition">
          Cửa hàng
        </Link>
        <Link to="/categories" className="hover:text-[#3a5ef7] transition">
          Danh mục
        </Link>
        <Link to="/new" className="hover:text-[#3a5ef7] transition">
          Khuyến mãi
        </Link>
        <Link to="/support" className="hover:text-[#3a5ef7] transition">
          Hỗ trợ
        </Link>
        <Link to="/chatbot" className="hover:text-[#3a5ef7] transition">
          Chatbot
        </Link>
      </nav>

      <div className="border-b-2 border-[#f0f0f0] mx-4 sm:mx-8 mt-2"></div>
    </header>
  );
};

export default Header;
