import React, { useEffect, useState } from "react";
import ProductCard from "./ProductCard";

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

const FeaturedProducts: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/products/featured");
        const data = await res.json();

        if (Array.isArray(data)) {
          setProducts(data);
        } else if (Array.isArray(data.data)) {
          setProducts(data.data);
        } else {
          setProducts([]);
        }
      } catch (err) {
        console.error("❌ Lỗi fetch API:", err);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  if (loading) return <p>⏳ Đang tải sản phẩm...</p>;

  return (
    <section className="p-6 bg-gray-50">
      <h3 className="text-[22px] font-bold mb-1 text-gray-900">Sản phẩm nổi bật</h3>
      <p className="text-sm text-gray-600 mb-4">
        Những sản phẩm được yêu thích nhất
      </p>

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
