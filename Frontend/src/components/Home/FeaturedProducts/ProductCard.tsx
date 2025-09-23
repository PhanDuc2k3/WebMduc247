import React from "react";
import { Heart } from "lucide-react";
import styles from "./FeaturedProducts.module.css";
import { Link } from "react-router-dom"; 

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

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  return (
    <div className={styles.productItem}>
      <div className={styles.imageWrapper}>
        <img
          src={`http://localhost:5000${product.images?.[0] || "/no-image.png"}`}
          alt={product.name}
          className={styles.productImage}
        />

        {product.salePrice && (
          <>
            <span className={styles.productDiscount}>
              -{Math.round((1 - product.salePrice / product.price) * 100)}%
            </span>
            <span className={styles.hotTag}>HOT</span>
          </>
        )}

        <button className={styles.favoriteBtn}>
          <Heart size={18} />
        </button>

<Link to={`/products/${product._id}`} className={styles.addToCartBtn}>
  Xem chi tiết
</Link>

      </div>

      <div className={styles.productName}>{product.name}</div>

      <div className={styles.productPrice}>
        {(product.salePrice || product.price).toLocaleString("vi-VN")}₫{" "}
        {product.salePrice && (
          <span className={styles.productOldPrice}>
            {product.price.toLocaleString("vi-VN")}₫
          </span>
        )}
      </div>

      <div className={styles.productMetaSplit}>
        <div className={styles.metaLeft}>
          <span>⭐ {product.rating || 0}</span>
          <span>({product.reviewsCount || 0})</span>
        </div>
        <div className={styles.metaRight}>
          <span>Đã bán {product.soldCount || 0}</span>
        </div>
      </div>

      <div className={styles.productMetaSplit}>
        <div className={styles.metaLeft}>
          <span>
            {typeof product.store === "string"
              ? product.store
              : product.store?.name}
          </span>
        </div>
        <div className={styles.metaRight}>
          <span>{product.location || "VN"}</span>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
