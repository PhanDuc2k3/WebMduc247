// components/Store/FeaturedProduct/FeaturedProduct.tsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ProductCard from "../../Home/FeaturedProducts/ProductCard";
import productApi from "../../../api/productApi";
import type { ProductType } from "../../../types/product";

interface FeaturedProductProps {
  storeId: string;
}

interface ProductForCard extends Omit<ProductType, "store"> {
  store?: string | { name: string };
}

const FeaturedProduct: React.FC<FeaturedProductProps> = ({ storeId }) => {
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
        const res = await productApi.getProductsByStore(storeId);
        let productsData: ProductType[] = res.data || [];

        // Sắp xếp theo số lượt bán giảm dần
        productsData.sort((a, b) => (b.soldCount || 0) - (a.soldCount || 0));

        setProducts(productsData);
      } catch (err) {
        console.error("❌ Lỗi tải sản phẩm:", err);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [storeId]);

  if (loading) {
    return (
      <div className="p-6 text-center animate-fade-in">
        <div className="text-4xl mb-4 animate-pulse">⏳</div>
        <p className="text-gray-500 text-lg font-medium">Đang tải sản phẩm...</p>
      </div>
    );
  }
  
  if (!products.length) {
    return (
      <div className="p-8 text-center animate-fade-in">
        <div className="text-6xl mb-4">📦</div>
        <p className="text-gray-500 text-lg font-medium mb-2">Chưa có sản phẩm nổi bật</p>
        <p className="text-gray-400 text-sm">Cửa hàng sẽ sớm cập nhật sản phẩm</p>
      </div>
    );
  }

  const isDesktop = windowWidth >= 1024;
  const itemsPerRow = Math.floor(windowWidth / 220);
  const visibleCount = isDesktop ? itemsPerRow * 2 : 8;
  const visibleProducts = products.slice(0, visibleCount);

  return (
    <section className="p-6 lg:p-8 rounded-2xl bg-gradient-to-br from-gray-50 via-white to-gray-50 shadow-lg border border-gray-200 animate-fade-in-up">
      {/* Tiêu đề sản phẩm bán chạy */}
      <div className="mb-6 animate-fade-in-down">
        <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 gradient-text flex items-center gap-3">
          <span>🔥</span> Sản phẩm bán chạy
        </h2>
        <p className="text-gray-600 text-sm mt-2">
          Những sản phẩm được yêu thích nhất từ cửa hàng này
        </p>
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-6">
        {visibleProducts.map((prod, index) => {
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

      <div className="text-center mt-8">
        <Link
          to={`/store/${storeId}/products`}
          className="inline-block font-bold text-blue-600 hover:text-blue-700 hover:underline transition-all duration-300 transform hover:scale-105 text-lg"
        >
          Xem thêm sản phẩm →
        </Link>
      </div>
    </section>
  );
};

export default FeaturedProduct;
