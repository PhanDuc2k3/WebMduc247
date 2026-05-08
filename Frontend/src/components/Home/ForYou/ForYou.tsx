import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, ChevronRight } from "lucide-react";
import ProductCard from "../FeaturedProducts/ProductCard";
import productApi from "../../../api/productApi";
import type { ProductType } from "../../../types/product";

interface ProductForCard extends Omit<ProductType, "store"> {
  store?: string | { name: string };
}

const ForYou: React.FC = () => {
  const [products, setProducts] = useState<ProductType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getProducts = async () => {
      try {
        const res = await productApi.getRecommendedProducts();
        // Backend trả về: { success: true, data: products[], pagination: {...} }
        const productsData = res.data?.data ?? res.data?.products ?? res.data ?? [];
        setProducts(Array.isArray(productsData) ? productsData : []);
      } catch (err) {
        console.error("Lỗi tải sản phẩm đề xuất:", err);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    getProducts();
  }, []);

  if (loading) {
    return (
      <section className="mt-4 sm:mt-6 lg:mt-8">
        <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-5 shadow-sm border border-gray-100">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2 sm:gap-3 md:gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-gray-100 rounded-lg sm:rounded-xl p-2 sm:p-3 animate-pulse">
                <div className="bg-gray-200 h-28 sm:h-36 md:h-44 rounded-lg mb-2 sm:mb-3"></div>
                <div className="bg-gray-200 h-4 rounded w-3/4 mb-1"></div>
                <div className="bg-gray-200 h-4 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (products.length === 0) {
    return (
      <section className="mt-4 sm:mt-6 lg:mt-8">
        <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-500" />
            <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-900">
              Todays For You!
            </h3>
          </div>
          <div className="text-center py-8 text-gray-500">
            <p>Không có sản phẩm nào.</p>
            <p className="text-sm mt-1">Vui lòng kiểm tra DevTools Console (F12) để xem chi tiết lỗi.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-4 sm:mt-6 lg:mt-8">
      <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 md:p-5 shadow-sm border border-gray-100">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-500" />
            <h3 className="text-base sm:text-lg md:text-xl font-bold text-gray-900">
              Todays For You!
            </h3>
          </div>
          <Link
            to="/products"
            className="flex items-center gap-1 text-gray-600 font-semibold hover:text-gray-700 transition-colors text-xs sm:text-sm"
          >
            Xem tất cả <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4" />
          </Link>
        </div>

        {/* Products Grid - Hàng 1: 5 sản phẩm */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4 mb-2 sm:mb-3 md:mb-4">
          {products.slice(0, 5).map((prod, index) => {
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
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <ProductCard product={productForCard} />
              </div>
            );
          })}
        </div>

        {/* Products Grid - Hàng 2: 5 sản phẩm */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4">
          {products.slice(5, 10).map((prod, index) => {
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
                style={{ animationDelay: `${(index + 5) * 0.05}s` }}
              >
                <ProductCard product={productForCard} />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ForYou;
