// components/Store/FeaturedProduct/FeaturedProduct.tsx
import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
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
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState<ProductType[]>([]);
  const [loading, setLoading] = useState(true);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [searchTerm, setSearchTerm] = useState("");

  // Đọc search term từ URL query
  useEffect(() => {
    const search = searchParams.get("search");
    if (search) {
      setSearchTerm(search);
    }
  }, [searchParams]);

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
      <div className="p-4 md:p-6 text-center animate-fade-in">
        <div className="text-3xl md:text-4xl mb-3 md:mb-4 animate-pulse">⏳</div>
        <p className="text-gray-500 text-sm md:text-base lg:text-lg font-medium">Đang tải sản phẩm...</p>
      </div>
    );
  }
  
  if (!products.length) {
    return (
      <div className="p-6 md:p-8 text-center animate-fade-in">
        <div className="text-4xl md:text-6xl mb-3 md:mb-4">📦</div>
        <p className="text-gray-500 text-sm md:text-base lg:text-lg font-medium mb-1 md:mb-2">Chưa có sản phẩm nổi bật</p>
        <p className="text-gray-400 text-xs md:text-sm">Cửa hàng sẽ sớm cập nhật sản phẩm</p>
      </div>
    );
  }

  // Filter sản phẩm theo search term
  const filteredProducts = products.filter((p) => {
    if (!searchTerm) return true;
    return p.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  if (searchTerm && !filteredProducts.length) {
    return (
      <div className="p-6 md:p-8 text-center animate-fade-in">
        <div className="text-4xl md:text-6xl mb-3 md:mb-4">🔍</div>
        <p className="text-gray-500 text-sm md:text-base lg:text-lg font-medium mb-1 md:mb-2">Không tìm thấy sản phẩm nào</p>
        <p className="text-gray-400 text-xs md:text-sm">Hãy thử thay đổi từ khóa tìm kiếm</p>
      </div>
    );
  }

  const isDesktop = windowWidth >= 1024;
  const itemsPerRow = Math.floor(windowWidth / 220);
  const visibleCount = isDesktop ? itemsPerRow * 2 : 8;
  const visibleProducts = filteredProducts.slice(0, visibleCount);

  return (
    <section className="p-4 md:p-6 lg:p-8 rounded-xl md:rounded-2xl bg-gradient-to-br from-gray-50 via-white to-gray-50 shadow-lg border border-gray-200 animate-fade-in-up">
      {/* Tiêu đề sản phẩm bán chạy */}
      <div className="pb-4 md:pb-6 animate-fade-in-down">
        <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-2 md:gap-3">
          <span>🔥</span> Sản phẩm bán chạy
        </h2>
        <p className="text-gray-600 text-xs md:text-sm pt-2">
          Những sản phẩm được yêu thích nhất từ cửa hàng này
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3 lg:gap-4 xl:gap-6">
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

      <div className="text-center pt-6 md:pt-8">
        <Link
          to={`/store/${storeId}/products`}
          className="inline-block font-bold text-blue-600 hover:text-blue-700 hover:underline transition-all duration-300 transform hover:scale-105 text-sm md:text-base lg:text-lg"
        >
          Xem thêm sản phẩm →
        </Link>
      </div>
    </section>
  );
};

export default FeaturedProduct;
