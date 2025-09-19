import React, { useEffect, useState } from "react";
import styles from "./FeaturedProducts.module.css";
import ProductCard from "./ProductCard";

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
          setProducts([]);
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
        {products.map((prod) => (
          <ProductCard key={prod._id} product={prod} />
        ))}
      </div>
      <div className={styles.moreLink}>Xem thêm sản phẩm →</div>
    </section>
  );
};

export default FeaturedProducts;
