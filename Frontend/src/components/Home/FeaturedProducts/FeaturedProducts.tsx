import React, { useEffect, useState } from "react";
import ProductCard from "../../Home/FeaturedProducts/ProductCard";
import productApi from "../../../api/productApi";
import type { ProductType } from "../../../types/product";

interface FeaturedProductProps {
  storeId: string;
}

// Nếu API trả thiếu images, thêm fallback
interface ProductWithFeaturedImage extends ProductType {
  image: string;
}

const FeaturedProduct: React.FC<FeaturedProductProps> = ({ storeId }) => {
  const [products, setProducts] = useState<ProductWithFeaturedImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const res = await productApi.getProductsByStore(storeId);
        const data: ProductType[] = res.data || [];

        // map data + fallback cho tất cả field bắt buộc
        const mappedProducts: ProductWithFeaturedImage[] = data.map(p => ({
          _id: p._id || "no-id",
          name: p.name || "Sản phẩm chưa có tên",
          description: p.description || "",
          price: p.price || 0,
          salePrice: p.salePrice,
          brand: p.brand || "",
          category: p.category || "",
          subCategory: p.subCategory || "",
          quantity: p.quantity || 0,
          soldCount: p.soldCount || 0,
          model: p.model || "",
          sku: p.sku,
          variations: p.variations || [],
          images: p.images || ["/fallback-image.png"],
          specifications: p.specifications || [],
          rating: p.rating || 0,
          reviewsCount: p.reviewsCount || 0,
          tags: p.tags || [],
          seoTitle: p.seoTitle || "",
          seoDescription: p.seoDescription || "",
          keywords: p.keywords || [],
          isFeatured: p.isFeatured || false,
          viewsCount: p.viewsCount || 0,
          isActive: p.isActive || true,
          store: p.store || "VN",
          features: p.features || [],
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

  if (loading) return <p>⏳ Đang tải sản phẩm...</p>;
  if (error) return <p className="text-red-500">❌ {error}</p>;
  if (!products.length) return <p>❌ Chưa có sản phẩm nổi bật nào</p>;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
      {products.map(product => (
        <ProductCard key={product._id} product={product} />
      ))}
    </div>
  );
};

export default FeaturedProduct;
