import React from "react";
import styles from "./FeaturedProducts.module.css";

const products = [
  {
    name: "iPhone 15 Pro Max 256GB - Chính hãng VNA",
    price: "29.990.000đ",
    oldPrice: "34.990.000đ",
    discount: "-14%",
    tag: "HOT",
    image: "https://cdn.tgdd.vn/Products/Images/42/305659/iphone-15-pro-max-blue-thumb-600x600.jpg",
    rating: "4.8 (1234)",
    sold: "Đã bán 800",
    location: "Hà Nội",
    shop: "TechZone Official",
    official: true,
  },
  {
    name: "Áo sơ mi nam công sở cao cấp",
    price: "299.000đ",
    oldPrice: "499.000đ",
    discount: "-40%",
    tag: "",
    image: "https://cdn.tgdd.vn/Products/Images/42/305659/ao-so-mi-nam.jpg",
    rating: "4.5 (567)",
    sold: "Đã bán 3200",
    location: "TP.HCM",
    shop: "Fashion Boutique",
    official: false,
  },
  {
    name: "MacBook Air M3 13 inch 256GB",
    price: "25.990.000đ",
    oldPrice: "28.990.000đ",
    discount: "-10%",
    tag: "HOT",
    image: "https://cdn.tgdd.vn/Products/Images/44/305659/macbook-air-m3.jpg",
    rating: "4.7 (789)",
    sold: "Đã bán 670",
    location: "Hà Nội",
    shop: "TechZone Official",
    official: true,
  },
  {
    name: "Set kem dưỡng da mặt Vitamin C",
    price: "450.000đ",
    oldPrice: "650.000đ",
    discount: "-31%",
    tag: "",
    image: "https://cdn.tgdd.vn/Products/Images/42/305659/set-kem-duong.jpg",
    rating: "4.7 (1657)",
    sold: "Đã bán 3200",
    location: "TP.HCM",
    shop: "Beauty World",
    official: true,
  },
  {
    name: "Giày thể thao Nike Air Force 1",
    price: "2.890.000đ",
    oldPrice: "3.299.000đ",
    discount: "-12%",
    tag: "",
    image: "https://cdn.tgdd.vn/Products/Images/42/305659/nike-air-force.jpg",
    rating: "4.6 (789)",
    sold: "Đã bán 1890",
    location: "Hà Nội",
    shop: "Sports Central",
    official: false,
  },
];

const FeaturedProducts: React.FC = () => (
  <section className={styles.productsSection}>
    <h3 className={styles.sectionTitle}>Sản phẩm nổi bật</h3>
    <p className={styles.sectionDesc}>Những sản phẩm được yêu thích nhất</p>
    <div className={styles.productList}>
      {products.map((prod, idx) => (
        <div key={idx} className={styles.productItem}>
          {prod.tag && <span className={styles.productTag}>{prod.tag}</span>}
          <span className={styles.productDiscount}>{prod.discount}</span>
          <img src={prod.image} alt={prod.name} className={styles.productImage} />
          <div className={styles.productName}>{prod.name}</div>
          <div className={styles.productPrice}>{prod.price} <span className={styles.productOldPrice}>{prod.oldPrice}</span></div>
          <div className={styles.productMeta}>
            <span>⭐ {prod.rating}</span>
            <span>{prod.sold}</span>
            <span>{prod.location}</span>
          </div>
          <div className={styles.productShop}>{prod.shop} {prod.official && <span className={styles.officialTag}>Official</span>}</div>
        </div>
      ))}
    </div>
    <div className={styles.moreLink}>Xem thêm sản phẩm →</div>
  </section>
);

export default FeaturedProducts;
