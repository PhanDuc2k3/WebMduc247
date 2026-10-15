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
      <section className="mt-3 sm:mt-6 lg:mt-8">
        <div className="bg-white rounded-lg sm:rounded-xl md:rounded-2xl p-2 sm:p-3 md:p-5 shadow-sm border border-gray-100">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 sm:gap-2 md:gap-3 lg:gap-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="bg-gray-100 rounded-lg sm:rounded-xl p-2 sm:p-3 animate-pulse">
                <div className="bg-gray-200 h-28 sm:h-32 md:h-40 rounded-lg mb-1.5 sm:mb-2"></div>
                <div className="bg-gray-200 h-3 sm:h-4 rounded w-3/4 mb-1 sm:mb-1.5"></div>
                <div className="bg-gray-200 h-3 sm:h-4 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (products.length === 0) {
    return (
      <section className="mt-3 sm:mt-6 lg:mt-8">
        <div className="bg-white rounded-lg sm:rounded-xl md:rounded-2xl p-2 sm:p-3 md:p-5 shadow-sm border border-gray-100">
          <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-yellow-500" />
            <h3 className="text-sm sm:text-base md:text-lg lg:text-xl font-bold text-gray-900">
              Todays For You!
            </h3>
          </div>
          <div className="text-center py-6 sm:py-8 text-gray-500">
            <p className="text-xs sm:text-sm">Không có sản phẩm nào.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-3 sm:mt-6 lg:mt-8">
      <div className="bg-white rounded-lg sm:rounded-xl md:rounded-2xl p-2 sm:p-3 md:p-5 shadow-sm border border-gray-100">
        {/* Header */}
        <div className="flex items-center justify-between mb-2 sm:mb-3 md:mb-4">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-yellow-500" />
            <h3 className="text-sm sm:text-base md:text-lg lg:text-xl font-bold text-gray-900">
              Todays For You!
            </h3>
          </div>
          <Link
            to="/products"
            className="flex items-center gap-0.5 sm:gap-1 text-gray-600 font-semibold hover:text-gray-700 transition-colors text-[10px] sm:text-xs md:text-sm"
          >
            Xem tất cả <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4" />
          </Link>
        </div>

        {/* Products Grid - Mobile: 2 per row (max 5 rows), Desktop: 5 per row (max 2 rows) */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 sm:gap-2 md:gap-3 lg:gap-4">
          {products.slice(0, 10).map((prod, index) => {
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
      </div>
    </section>
  );
};

export default ForYou;
