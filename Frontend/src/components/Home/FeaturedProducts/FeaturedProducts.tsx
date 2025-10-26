import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom"; // 👈 import thêm
import ProductCard from "./ProductCard";
import productApi from "../../../api/productApi";
import type { ProductType } from "../../../types/product";

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
    return <p className="p-6 text-center text-gray-500">⏳ Đang tải sản phẩm...</p>;
  if (!products.length)
    return <p className="p-6 text-center text-gray-500">❌ Chưa có sản phẩm nổi bật</p>;

  const isDesktop = windowWidth >= 1024;
  const itemsPerRow = Math.floor(windowWidth / 220);
  const visibleCount = isDesktop ? itemsPerRow * 2 : 8;
  const visibleProducts = products.slice(0, visibleCount);

  return (
    <section className="p-6 bg-gray-50 rounded-lg">
      <h3 className="text-[22px] font-bold mb-1 text-gray-900">
        Sản phẩm nổi bật
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        Những sản phẩm được yêu thích nhất
      </p>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
        {visibleProducts.map((prod) => (
          <ProductCard key={prod._id} product={prod} />
        ))}
      </div>

      {/* 👇 Link sang trang /store */}
      <div className="text-center mt-6">
        <Link
          to="/categories"
          className="font-medium text-blue-600 hover:underline transition-all"
        >
          Xem thêm sản phẩm →
        </Link>
      </div>
    </section>
  );
};

export default FeaturedProducts;
