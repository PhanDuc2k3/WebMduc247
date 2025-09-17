import React from "react";
import styles from "./Banner.module.css";

const Banner: React.FC = () => (
  <div className={styles.bannerWrapper}>
    <div className={styles.bannerBox}>
      <h2 className={styles.bannerTitle}>Siêu Sale Cuối Năm</h2>
      <p className={styles.bannerDesc}>Giảm giá lên đến 70% cho tất cả sản phẩm</p>
      <button className={styles.bannerBtn}>Mua ngay</button>
    </div>
    <div className={styles.bannerSide}>
      <div className={styles.flashSaleBox}>
        <div className={styles.flashTitle}>Flash Sale</div>
        <div className={styles.flashTime}>Kết thúc trong 2h:15p</div>
        <button className={styles.flashBtn}>Xem ngay</button>
      </div>
      <div className={styles.shipBox}>
        <div className={styles.shipTitle}>Miễn phí ship</div>
        <div className={styles.shipDesc}>Đơn từ 300k</div>
        <button className={styles.shipBtn}>Mua sắm</button>
      </div>
    </div>
  </div>
);

export default Banner;
