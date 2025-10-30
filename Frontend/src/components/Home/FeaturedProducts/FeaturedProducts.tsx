import React, { useEffect, useState } from "react";
import ProductCard from "../../Home/FeaturedProducts/ProductCard";
import productApi from "../../../api/productApi"; // đường dẫn đúng tới folder api
import type { ProductType } from "../../../types/product"; // <-- DÒNG MỚI: Import kiểu dữ liệu đầy đủ

// XÓA interface Product cũ bị thiếu thuộc tính (dòng 7-16)

// Định nghĩa interface mới bao gồm tất cả thuộc tính của ProductType 
// và trường 'image' mà logic của bạn đang tạo ra.
interface ProductWithFeaturedImage extends ProductType {
  image: string;
}

interface FeaturedProductProps {
  storeId: string;
}

const FeaturedProduct: React.FC<FeaturedProductProps> = ({ storeId }) => {
  // Cập nhật kiểu dữ liệu state
  const [products, setProducts] = useState<ProductWithFeaturedImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        // Dùng axios từ productApi
        const res = await productApi.getProductsByStore(storeId);
        // Sử dụng ProductType cho dữ liệu trả về từ API
        const data: ProductType[] = res.data;

        // Ép kiểu data.map sang ProductWithFeaturedImage[]
        const mappedProducts = data.map(p => ({
          ...p,
          image: p.images?.[0] || "/fallback-image.png"
        })) as ProductWithFeaturedImage[];

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
        // product đã có đủ type (ProductWithFeaturedImage) để đáp ứng ProductCard
        <ProductCard key={product._id} product={product} />
      ))}
    </div>
  );
};

export default FeaturedProduct;