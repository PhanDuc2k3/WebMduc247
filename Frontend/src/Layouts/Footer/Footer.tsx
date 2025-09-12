import React from "react";
import styles from "./Footer.module.css";

const Footer: React.FC = () => {
  return (
    <footer className={styles.footerWrapper}>
      <div className={styles.footerTop}>
        <div className={styles.footerBrand}>
          <span className={styles.logoGradient}>ShopMduc247</span>
          <p className={styles.brandDesc}>Sàn thương mại điện tử hàng đầu Việt Nam với hàng triệu sản phẩm chất lượng và dịch vụ tốt nhất.</p>
          <div className={styles.socials}>
            <a href="#"><i className="fab fa-facebook-f" /></a>
            <a href="#"><i className="fab fa-instagram" /></a>
            <a href="#"><i className="fab fa-twitter" /></a>
            <a href="#"><i className="fab fa-youtube" /></a>
          </div>
        </div>
        <div className={styles.footerCol}>
          <h4>Chăm sóc khách hàng</h4>
          <ul>
            <li>Trung tâm trợ giúp</li>
            <li>Hướng dẫn mua hàng</li>
            <li>Hướng dẫn bán hàng</li>
            <li>Thanh toán</li>
            <li>Vận chuyển</li>
            <li>Trả hàng & Hoàn tiền</li>
          </ul>
        </div>
        <div className={styles.footerCol}>
          <h4>Về ShopMduc247</h4>
          <ul>
            <li>Giới thiệu</li>
            <li>Tuyển dụng</li>
            <li>Điều khoản</li>
            <li>Chính sách bảo mật</li>
            <li>Chính hãng</li>
            <li>Kênh người bán</li>
          </ul>
        </div>
        <div className={styles.footerCol}>
          <h4>Liên hệ</h4>
          <ul>
            <li><span className={styles.contactIcon}>📞</span> Hotline: 1800 1234</li>
            <li><span className={styles.contactIcon}>✉️</span> support@shopmduc247.vn</li>
            <li><span className={styles.contactIcon}>📍</span> Tầng 4-5-6, Tòa nhà Capital Place, số 29 Liễu Giai, Ba Đình, Hà Nội</li>
          </ul>
        </div>
      </div>
      <div className={styles.footerBottom}>
        <span>© 2024 ShopMduc247. Tất cả quyền được bảo lưu.</span>
        <span className={styles.paymentIcons}>
          <span className={styles.visa}>VISA</span>
          <span className={styles.mc}>MC</span>
          <span className={styles.jcb}>JCB</span>
        </span>
      </div>
    </footer>
  );
};

export default Footer;
