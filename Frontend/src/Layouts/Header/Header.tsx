import React, { useEffect, useState } from "react";
import styles from "./Header.module.css";
import { Link, useNavigate } from "react-router-dom";

const Header: React.FC = () => {
  const [user, setUser] = useState<{ fullName?: string; avatarUrl?: string } | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      setUser(JSON.parse(userData));
    } else {
      setUser(null);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setShowDropdown(false);
    navigate("/login");
  };

  return (
    <header className={styles.headerWrapper}>
      {/* Top gradient bar */}
      <div className={styles.topBar}>
        <span className={styles.topBarLeft}>
          Miễn phí vận chuyển đơn từ 300k
        </span>
        <span className={styles.topBarRight}>
          Hotline: 1800 1234 &nbsp; Ứng dụng
        </span>
      </div>

      {/* Main header: logo, search, actions */}
      <div className={styles.headerMain}>
        <div className={styles.logoBox}>
          <span className={styles.logoGradient}>ShopMduc247</span>
        </div>

        <div className={styles.searchBox}>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Tìm kiếm sản phẩm, thương hiệu và loại sản phẩm..."
          />
          <button className={styles.searchBtn}>
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8" stroke="#fff" strokeWidth="2" />
              <path stroke="#fff" strokeWidth="2" d="M21 21l-4.35-4.35" />
            </svg>
          </button>
        </div>

        <div className={styles.headerActions}>
          {/* Yêu thích */}
          <Link to="/wishlist" className={styles.actionItem}>
            <svg
              width="22"
              height="22"
              fill="none"
              viewBox="0 0 24 24"
            >
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
          <Link to="/voucher" className={styles.actionItem}>
            <svg
              width="22"
              height="22"
              fill="none"
              viewBox="0 0 24 24"
            >
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
          <Link to="/cart" className={styles.actionItem}>
            <svg
              width="22"
              height="22"
              fill="none"
              viewBox="0 0 24 24"
            >
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
          <Link to="/messages" className={styles.actionItem}>
            <svg
              width="22"
              height="22"
              fill="none"
              viewBox="0 0 24 24"
            >
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
            <div className={styles.userDropdownWrapper}>
              <span className={styles.userAvatar} onClick={() => setShowDropdown(v => !v)} style={{ cursor: "pointer" }}>
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="avatar" style={{ width: 36, height: 36, borderRadius: "50%" }} />
                ) : (
                  <svg width="36" height="36" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" stroke="#16161a" strokeWidth="1.5"/><path d="M4 20v-2a4 4 0 014-4h8a4 4 0 014 4v2" stroke="#16161a" strokeWidth="1.5"/></svg>
                )}
              </span>
{showDropdown && (
  <div className={styles.userDropdown}>
    <div className={styles.userDropdownRow}>
      <span className={styles.userDropdownAvatar}>
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt="avatar" style={{ width: 32, height: 32, borderRadius: "50%" }} />
        ) : (
          <svg width="32" height="32" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" stroke="#16161a" strokeWidth="1.5"/><path d="M4 20v-2a4 4 0 014-4h8a4 4 0 014 4v2" stroke="#16161a" strokeWidth="1.5"/></svg>
        )}
      </span>
      <span className={styles.userDropdownName}>{user.fullName}</span>
    </div>
    <button className={styles.userDropdownBtn} onClick={() => { setShowDropdown(false); navigate("/profile"); }}>
      <span style={{ marginRight: 8 }}>👤</span> Trang cá nhân
    </button>
    <button className={styles.userDropdownBtn} onClick={() => { setShowDropdown(false); navigate("/mystore"); }}>
      <span style={{ marginRight: 8 }}>🏬</span> Cửa hàng của tôi
    </button>
    <button className={styles.userDropdownBtn} onClick={handleLogout}>
      <span style={{ marginRight: 8 }}>🚪</span> Đăng xuất
    </button>
  </div>
)}
            </div>
          ) : (
            <Link to="/login" className={styles.actionItem}>
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
      <nav className={styles.navBar}>
  <span className={styles.navCategory}>
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
      <rect x="3" y="6" width="18" height="2" rx="1" fill="#1976d2" />
      <rect x="3" y="11" width="18" height="2" rx="1" fill="#1976d2" />
      <rect x="3" y="16" width="18" height="2" rx="1" fill="#1976d2" />
    </svg>
    <span className={styles.navCategoryText}>Danh mục</span>
  </span>

  <Link to="/" className={styles.navLink}>Trang chủ</Link>
  <Link to="/shop" className={styles.navLink}>Cửa hàng</Link>
  <Link to="/categories" className={styles.navLink}>Danh mục</Link>
  <Link to="/promotions" className={styles.navLink}>Khuyến mãi</Link>
  <Link to="/brands" className={styles.navLink}>Thương hiệu</Link>
  <Link to="/bestsellers" className={styles.navLink}>Bán chạy</Link>
  <Link to="/support" className={styles.navLink}>Hỗ trợ</Link>
</nav>

      <div className={styles.headerDivider}></div>
    </header>
  );
};

export default Header;
