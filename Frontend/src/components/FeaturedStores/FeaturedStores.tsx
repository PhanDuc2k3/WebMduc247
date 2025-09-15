import React from "react";
import styles from "./FeaturedStores.module.css";

const stores = [
  {
    name: "TechZone Official Store",
    desc: "Chuyên cung cấp các sản phẩm công nghệ chính hãng, bảo hành toàn quốc",
    rating: "4.8 (1260 đánh giá)",
    products: "1250 sản phẩm",
    join: "Tham gia từ 2020",
    status: "Đang online",
    tags: ["Mall", "Chính hãng"],
  },
  {
    name: "Fashion Boutique",
    desc: "Thời trang nữ cao cấp, xu hướng mới nhất từ các thương hiệu nổi tiếng",
    rating: "4.7 (820 đánh giá)",
    products: "890 sản phẩm",
    join: "Tham gia từ 2021",
    status: "Đang online",
    tags: ["Preferred", "Nhanh"],
  },
  {
    name: "HomeLife Store",
    desc: "Gia dụng, nội thất và thiết bị nhà bếp chất lượng cao",
    rating: "4.6 (670 đánh giá)",
    products: "2100 sản phẩm",
    join: "Tham gia từ 2019",
    status: "Offline",
    tags: ["Tin cậy"],
  },
  {
    name: "Beauty World",
    desc: "Mỹ phẩm chính hãng từ Hàn Quốc, Nhật Bản và châu Âu",
    rating: "4.9 (1500 đánh giá)",
    products: "650 sản phẩm",
    join: "Tham gia từ 2022",
    status: "Đang online",
    tags: ["Mall", "Chính hãng"],
  },
  {
    name: "Sports Central",
    desc: "Đồ thể thao, dụng cụ và thiết bị thể thao chính hãng",
    rating: "4.7 (900 đánh giá)",
    products: "780 sản phẩm",
    join: "Tham gia từ 2021",
    status: "Đang online",
    tags: ["Preferred"],
  },
  {
    name: "Baby Care Shop",
    desc: "Đồ cho mẹ và bé an toàn, chất lượng cao",
    rating: "4.8 (650 đánh giá)",
    products: "320 sản phẩm",
    join: "Tham gia từ 2020",
    status: "Đang online",
    tags: ["An toàn"],
  },
];

const FeaturedStores: React.FC = () => (
  <section className={styles.storesSection}>
    <h3 className={styles.sectionTitle}>Cửa hàng nổi bật</h3>
    <p className={styles.sectionDesc}>Những cửa hàng uy tín và chất lượng nhất</p>
    <div className={styles.storeList}>
      {stores.map((store, idx) => (
        <div key={idx} className={styles.storeItem}>
          <div className={styles.storeTags}>
            {store.tags.map((tag, i) => (
              <span key={i} className={styles.storeTag}>{tag}</span>
            ))}
            <span className={store.status === "Đang online" ? styles.onlineTag : styles.offlineTag}>{store.status}</span>
          </div>
          <div className={styles.storeName}>{store.name}</div>
          <div className={styles.storeDesc}>{store.desc}</div>
          <div className={styles.storeMeta}>
            <span>⭐ {store.rating}</span>
            <span>{store.products}</span>
            <span>{store.join}</span>
          </div>
          <div className={styles.storeActions}>
            <button className={styles.storeBtn}>Xem cửa hàng</button>
            <button className={styles.storeChatBtn}>Chat ngay</button>
          </div>
        </div>
      ))}
    </div>
    <div className={styles.moreLink}>Xem tất cả cửa hàng →</div>
  </section>
);

export default FeaturedStores;
