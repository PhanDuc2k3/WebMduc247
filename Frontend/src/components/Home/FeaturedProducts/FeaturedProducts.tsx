import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ProductCard from "./ProductCard";
import productApi from "../../../api/productApi";
import type { ProductType } from "../../../types/product";

// ✅ Tạo kiểu mới cho ProductCard để đảm bảo tương thích store
interface ProductForCard extends Omit<ProductType, "store"> {
  store?: string | { name: string };
}

const FeaturedProducts: React.FC = () => {
  const [products, setProducts] = useState<ProductType[]>([]);
  const [loading, setLoading] = useState(true);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await productApi.getFeaturedProducts();
        setProducts(res.data || []);
      } catch (err) {
        console.error("❌ Lỗi tải sản phẩm:", err);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  if (loading)
    return <p className="p-4 sm:p-6 text-center text-gray-500 text-sm sm:text-base">⏳ Đang tải sản phẩm...</p>;
  if (!products.length)
    return <p className="p-4 sm:p-6 text-center text-gray-500 text-sm sm:text-base">❌ Chưa có sản phẩm nổi bật</p>;

  const isDesktop = windowWidth >= 1024;
  const itemsPerRow = Math.floor(windowWidth / 220);
  const visibleCount = isDesktop ? itemsPerRow * 2 : 8;
  const visibleProducts = products.slice(0, visibleCount);

  return (
    <section className="p-3 sm:p-4 md:p-6 bg-gradient-to-br from-gray-50 via-white to-gray-50 rounded-xl sm:rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300">
      <div className="mb-4 sm:mb-5 md:mb-6 animate-fade-in-down">
        <h3 className="text-lg sm:text-xl md:text-[24px] lg:text-[28px] font-bold mb-1 sm:mb-2 text-gray-900 gradient-text">
          ⭐ Sản phẩm nổi bật
        </h3>
        <p className="text-xs sm:text-sm text-gray-600">
          Những sản phẩm được yêu thích nhất hiện tại
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3 sm:gap-4 md:gap-6">
        {visibleProducts.map((prod, index) => {
          // ✅ Chuyển store về đúng kiểu
          const productForCard: ProductForCard = {
            ...prod,
            store:
              typeof prod.store === "string"
                ? prod.store
                : prod.store?.name
                ? { name: prod.store.name }
                : { name: "Unknown" },
          };
          return (
            <div
              key={prod._id}
              className="animate-slide-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <ProductCard product={productForCard} />
            </div>
          );
        })}
      </div>

      <div className="text-center mt-6 sm:mt-8">
        <Link
          to="/products"
          className="inline-block font-bold text-blue-600 hover:text-blue-700 hover:underline transition-all duration-300 transform hover:scale-105 text-sm sm:text-base md:text-lg"
        >
          Xem thêm sản phẩm →
        </Link>
      </div>
    </section>
  );
};

export default FeaturedProducts;
