import React, { useEffect, useState } from "react";
import ProductCard from "./ProductCard";
import productApi from "../../../api/productApi";
import type { ProductType } from "../../../types/product";

const FeaturedProducts: React.FC = () => {
  const [products, setProducts] = useState<ProductType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await productApi.getFeaturedProducts();
        setProducts(res.data); // trả về mảng sản phẩm
      } catch (err) {
        console.error("❌ Lỗi tải sản phẩm:", err);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  if (loading) return <p>⏳ Đang tải sản phẩm...</p>;
  if (!products.length) return <p>❌ Chưa có sản phẩm nổi bật</p>;

  return (
    <section className="p-6 bg-gray-50">
      <h3 className="text-[22px] font-bold mb-1 text-gray-900">
        Sản phẩm nổi bật
      </h3>
      <p className="text-sm text-gray-600 mb-4">Những sản phẩm được yêu thích nhất</p>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
        {products.map((prod) => (
          <ProductCard key={prod._id} product={prod} />
        ))}
      </div>

      <div className="text-center mt-6 font-medium text-blue-600 cursor-pointer hover:underline">
        Xem thêm sản phẩm →
      </div>
    </section>
  );
};

export default FeaturedProducts;
