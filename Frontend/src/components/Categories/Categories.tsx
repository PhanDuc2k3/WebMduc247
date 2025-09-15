import React from "react";
import styles from "./Categories.module.css";

const categories = [
  { name: "Điện thoại", icon: "📱", count: "12k+ sản phẩm", color: "#b3d4fc" },
  { name: "Thời trang", icon: "👗", count: "25k+ sản phẩm", color: "#f9c2ff" },
  { name: "Laptop", icon: "💻", count: "8k+ sản phẩm", color: "#d1c4e9" },
  { name: "Làm đẹp", icon: "💄", count: "15k+ sản phẩm", color: "#fff9c4" },
  { name: "Thể thao", icon: "🏀", count: "18k+ sản phẩm", color: "#c8e6c9" },
  { name: "Nhà cửa", icon: "🏠", count: "10k+ sản phẩm", color: "#ffe0b2" },
  { name: "Mẹ & Bé", icon: "👶", count: "7k+ sản phẩm", color: "#ffcdd2" },
  { name: "Ô tô", icon: "🚗", count: "5k+ sản phẩm", color: "#e0e0e0" },
];

const Categories: React.FC = () => (
  <section className={styles.categoriesSection}>
    <h3 className={styles.sectionTitle}>Danh mục nổi bật</h3>
    <p className={styles.sectionDesc}>Khám phá các danh mục sản phẩm phổ biến</p>
    <div className={styles.categoryList}>
      {categories.map((cat, idx) => (
        <div key={idx} className={styles.categoryItem} style={{ background: cat.color }}>
          <div className={styles.categoryIcon}>{cat.icon}</div>
          <div className={styles.categoryName}>{cat.name}</div>
          <div className={styles.categoryCount}>{cat.count}</div>
        </div>
      ))}
    </div>
  </section>
);

export default Categories;
