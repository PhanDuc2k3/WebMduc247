import React, { useEffect, useState } from "react";
import ProductCard from "../../Home/FeaturedProducts/ProductCard";
import productApi from "../../../api/productApi"; // đường dẫn đúng tới folder api

interface Product {
  _id: string;
  name: string;
  image: string;
  price: number;
  salePrice?: number;
  images?: string[];
  rating?: number;
  reviewsCount?: number;
  soldCount?: number;
  store?: string | { name: string; logoUrl?: string };
}

interface FeaturedProductProps {
  storeId: string;
}

const FeaturedProduct: React.FC<FeaturedProductProps> = ({ storeId }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        // Dùng axios từ productApi
        const res = await productApi.getProductsByStore(storeId);
        const data: Product[] = res.data;

        const mappedProducts = data.map(p => ({
          ...p,
          image: p.images?.[0] || "/fallback-image.png"
        }));

        setProducts(mappedProducts);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [storeId]);

  if (loading) return <p>Đang tải sản phẩm...</p>;
  if (error) return <p className="text-red-500">{error}</p>;
  if (!products.length) return <p>Chưa có sản phẩm nổi bật nào</p>;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
      {products.map(product => (
        <ProductCard key={product._id} product={product} />
      ))}
    </div>
  );
};

export default FeaturedProduct;
