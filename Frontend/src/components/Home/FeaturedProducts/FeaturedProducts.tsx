import React, { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import styles from "./FeaturedProducts.module.css";

interface Product {
  _id: string;
  name: string;
  price: number;
  salePrice?: number;
  images?: string[];
  rating?: number;
  reviewsCount?: number;
  soldCount?: number;
  location?: string;
  store?: string | { name: string };
}

const FeaturedProducts: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/products/featured");
        const data = await res.json();

        if (Array.isArray(data)) {
          setProducts(data);
        } else if (Array.isArray(data.data)) {
          setProducts(data.data);
        } else {
          setProducts([]); // fallback
        }
      } catch (err) {
        console.error("❌ Lỗi fetch API:", err);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  if (loading) return <p>⏳ Đang tải sản phẩm...</p>;

  return (
    <section className={styles.productsSection}>
      <h3 className={styles.sectionTitle}>Sản phẩm nổi bật</h3>
      <p className={styles.sectionDesc}>Những sản phẩm được yêu thích nhất</p>
      <div className={styles.productList}>
        {products.map((prod, index) => (
          <div key={prod._id || prod._id || index} className={styles.productItem}>
            <div className={styles.imageWrapper}>
              <img
  src={`http://localhost:5000${prod.images?.[0] || "/no-image.png"}`}
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
              {(prod.salePrice || prod.price).toLocaleString("vi-VN")}₫{" "}
              {prod.salePrice && (
                <span className={styles.productOldPrice}>
                  {prod.price.toLocaleString("vi-VN")}₫
                </span>
              )}
            </div>

            <div className={styles.productMetaSplit}>
              <div className={styles.metaLeft}>
                <span>⭐ {prod.rating || 0}</span>
                <span>({prod.reviewsCount || 0})</span>
              </div>
              <div className={styles.metaRight}>
                <span>Đã bán {prod.soldCount || 0}</span>
              </div>
            </div>

            <div className={styles.productMetaSplit}>
              <div className={styles.metaLeft}>
                <span>
                  {typeof prod.store === "string"
                    ? prod.store
                    : prod.store?.name}
                </span>
              </div>
              <div className={styles.metaRight}>
                <span>{prod.location || "VN"}</span>
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
