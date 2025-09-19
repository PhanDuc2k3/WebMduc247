import React from "react";
import { Heart } from "lucide-react";
import styles from "./FeaturedProducts.module.css";

const sampleProducts = [
  {
    _id: "1",
    name: "iPhone 15 Pro Max 256GB - Chính hãng VNA",
    price: 34990000,
    salePrice: 29990000,
    images: [
      "https://tse3.mm.bing.net/th/id/OIP.XT4Vj_yVgU9j52LK0rOHrgHaI3?pid=Api&P=0&h=220",
    ],
    rating: 4.8,
    reviewsCount: 1234,
    soldCount: 670,
    location: "Hà Nội",
    store: { name: "HanoiStore" },
  },

   {
    _id: "1",
    name: "iPhone 15 Pro Max 256GB - Chính hãng VNA",
    price: 34990000,
    salePrice: 29990000,
    images: [
      "https://tse3.mm.bing.net/th/id/OIP.XT4Vj_yVgU9j52LK0rOHrgHaI3?pid=Api&P=0&h=220",
    ],
    rating: 4.8,
    reviewsCount: 1234,
    soldCount: 670,
    location: "Hà Nội",
    store: { name: "HanoiStore" },
  },
   
    {
    _id: "1",
    name: "iPhone 15 Pro Max 256GB - Chính hãng VNA",
    price: 34990000,
    salePrice: 29990000,
    images: [
      "https://tse3.mm.bing.net/th/id/OIP.XT4Vj_yVgU9j52LK0rOHrgHaI3?pid=Api&P=0&h=220",
    ],
    rating: 4.8,
    reviewsCount: 1234,
    soldCount: 670,
    location: "Hà Nội",
    store: { name: "HanoiStore" },
  },
    
     {
    _id: "1",
    name: "iPhone 15 Pro Max 256GB - Chính hãng VNA",
    price: 34990000,
    salePrice: 29990000,
    images: [
      "https://tse3.mm.bing.net/th/id/OIP.XT4Vj_yVgU9j52LK0rOHrgHaI3?pid=Api&P=0&h=220",
    ],
    rating: 4.8,
    reviewsCount: 1234,
    soldCount: 670,
    location: "Hà Nội",
    store: { name: "HanoiStore" },
  },
     
      {
    _id: "1",
    name: "iPhone 15 Pro Max 256GB - Chính hãng VNA",
    price: 34990000,
    salePrice: 29990000,
    images: [
      "https://tse3.mm.bing.net/th/id/OIP.XT4Vj_yVgU9j52LK0rOHrgHaI3?pid=Api&P=0&h=220",
    ],
    rating: 4.8,
    reviewsCount: 1234,
    soldCount: 670,
    location: "Hà Nội",
    store: { name: "HanoiStore" },
  },
];

const FeaturedProducts: React.FC = () => {
  return (
    <section className={styles.productsSection}>
      <h3 className={styles.sectionTitle}>Sản phẩm nổi bật</h3>
      <p className={styles.sectionDesc}>Những sản phẩm được yêu thích nhất</p>
      <div className={styles.productList}>
        {sampleProducts.map((prod) => (
          <div key={prod._id} className={styles.productItem}>
            <div className={styles.imageWrapper}>
              <img
                src={prod.images?.[0] || "/no-image.png"}
                alt={prod.name}
                className={styles.productImage}
              />

              {prod.salePrice && (
                <>
                  <span className={styles.productDiscount}>
                    -{Math.round((1 - prod.salePrice / prod.price) * 100)}%
                  </span>
                  <span className={styles.hotTag}>HOT</span>
                </>
              )}

              <button className={styles.favoriteBtn}>
                <Heart size={18} />
              </button>

              <button className={styles.addToCartBtn}>Thêm vào giỏ</button>
            </div>

            <div className={styles.productName}>{prod.name}</div>

            <div className={styles.productPrice}>
              {prod.salePrice?.toLocaleString("vi-VN")}₫{" "}
              {prod.salePrice && (
                <span className={styles.productOldPrice}>
                  {prod.price.toLocaleString("vi-VN")}₫
                </span>
              )}
            </div>

            <div className={styles.productMetaSplit}>
              <div className={styles.metaLeft}>
                <span>⭐ {prod.rating}</span>
                <span>({prod.reviewsCount})</span>
              </div>
              <div className={styles.metaRight}>
                <span>Đã bán ({prod.soldCount})</span>
              </div>
            </div>

            <div className={styles.productMetaSplit}>
              <div className={styles.metaLeft}>
                <span>{prod.store?.name}</span>
              </div>
              <div className={styles.metaRight}>
                <span>{prod.location}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className={styles.moreLink}>Xem thêm sản phẩm →</div>
    </section>
  );
};

export default FeaturedProducts;
