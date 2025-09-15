import React from "react";
import styles from "./SellerBox.module.css";

const SellerBox: React.FC = () => (
  <section className={styles.sellerSection}>
    <div className={styles.sellerBox}>
      <div>
        <h3 className={styles.sellerTitle}>Bán hàng cùng ShopMduc247</h3>
        <p className={styles.sellerDesc}>Mở cửa hàng online miễn phí, tiếp cận hàng triệu khách hàng trên toàn quốc</p>
        <div className={styles.sellerStats}>
          <span>50M+ Người mua</span>
          <span>500K+ Sản phẩm</span>
          <span>Tăng trưởng 200%</span>
        </div>
        <div className={styles.sellerActions}>
          <button className={styles.sellerBtn}>Đăng ký bán hàng</button>
          <button className={styles.sellerInfoBtn}>Tìm hiểu thêm</button>
        </div>
      </div>
      <div className={styles.sellerIconBox}>
        <span className={styles.sellerIcon}>🏬</span>
      </div>
    </div>
  </section>
);

export default SellerBox;
