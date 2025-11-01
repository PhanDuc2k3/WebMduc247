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

  if (loading)
    return <p className="p-6 text-center text-gray-500">⏳ Đang tải sản phẩm...</p>;
  if (!products.length)
    return <p className="p-6 text-center text-gray-500">❌ Chưa có sản phẩm nổi bật</p>;

  const isDesktop = windowWidth >= 1024;
  const itemsPerRow = Math.floor(windowWidth / 220);
  const visibleCount = isDesktop ? itemsPerRow * 2 : 8;
  const visibleProducts = products.slice(0, visibleCount);

  return (
    <section className="p-4 rounded-lg">
      {/* Tiêu đề sản phẩm bán chạy */}
      <h2 className="text-lg font-semibold mb-4">Sản phẩm bán chạy</h2>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
        {visibleProducts.map((prod) => {
          const productForCard: ProductForCard = {
            ...prod,
            store:
              typeof prod.store === "string"
                ? prod.store
                : prod.store?.name
                ? { name: prod.store.name }
                : { name: "Unknown" },
          };
          return <ProductCard key={prod._id} product={productForCard} />;
        })}
      </div>

      <div className="text-center mt-4">
        <Link
          to={`/store/${storeId}/products`}
          className="font-medium text-blue-600 hover:underline transition-all"
        >
          Xem thêm sản phẩm →
        </Link>
      </div>
    </section>
  );
};

export default FeaturedProduct;
