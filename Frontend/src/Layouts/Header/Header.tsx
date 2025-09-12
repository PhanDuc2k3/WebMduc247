import React from "react";
import styles from "./Header.module.css";

const Header: React.FC = () => {
  return (
    <header className={styles.headerWrapper}>
      {/* Top gradient bar */}
      <div className={styles.topBar}>
        <span className={styles.topBarLeft}>Miễn phí vận chuyển đơn từ 300k</span>
        <span className={styles.topBarRight}>Hotline: 1800 1234 &nbsp; Ứng dụng</span>
      </div>
      {/* Main header: logo, search, actions */}
      <div className={styles.headerMain}>
        <div className={styles.logoBox}>
          <span className={styles.logoGradient}>ShopMduc247</span>
        </div>
        <div className={styles.searchBox}>
          <input type="text" className={styles.searchInput} placeholder="Tìm kiếm sản phẩm, thương hiệu và loại sản phẩm..." />
          <button className={styles.searchBtn}>
            <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" stroke="#fff" strokeWidth="2"/><path stroke="#fff" strokeWidth="2" d="M21 21l-4.35-4.35"/></svg>
          </button>
        </div>
        <div className={styles.headerActions}>
          <span className={styles.actionItem}><svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c2.04 0 3.81 1.23 4.5 3.09C13.69 4.23 15.46 3 17.5 3 20.58 3 23 5.42 23 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" stroke="#16161a" strokeWidth="1.5"/></svg> Yêu thích</span>
          <span className={styles.actionItem}><svg width="22" height="22" fill="none" viewBox="0 0 24 24"><rect x="4" y="8" width="16" height="10" rx="2" stroke="#16161a" strokeWidth="1.5"/><path d="M8 8V6a4 4 0 118 0v2" stroke="#16161a" strokeWidth="1.5"/></svg> Voucher</span>
          <span className={styles.actionItem}><svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path d="M6 6h15l-1.5 9h-13z" stroke="#16161a" strokeWidth="1.5"/><circle cx="9" cy="20" r="1" stroke="#16161a" strokeWidth="1.5"/><circle cx="18" cy="20" r="1" stroke="#16161a" strokeWidth="1.5"/></svg> Giỏ hàng</span>
          <span className={styles.actionItem}><svg width="22" height="22" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" stroke="#16161a" strokeWidth="1.5"/><path d="M4 20v-2a4 4 0 014-4h8a4 4 0 014 4v2" stroke="#16161a" strokeWidth="1.5"/></svg> Đăng nhập</span>
        </div>
      </div>
      {/* Navbar */}
      <nav className={styles.navBar}>
        <span className={styles.navCategory}><svg width="20" height="20" fill="none" viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="2" rx="1" fill="#1976d2"/><rect x="3" y="11" width="18" height="2" rx="1" fill="#1976d2"/><rect x="3" y="16" width="18" height="2" rx="1" fill="#1976d2"/></svg> <span className={styles.navCategoryText}>Danh mục</span></span>
        <span>Trang chủ</span>
        <span>Cửa hàng</span>
        <span>Danh mục</span>
        <span>Khuyến mãi</span>
        <span>Thương hiệu</span>
        <span>Bán chạy</span>
        <span>Hỗ trợ</span>
      </nav>
      <div className={styles.headerDivider}></div>
    </header>
  );
};

export default Header;
