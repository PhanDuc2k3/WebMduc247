import React, { useEffect, useState } from "react";
import ProductFilters from "../../components/ProductList/ProductFilters";
import ProductLoading from "../../components/ProductList/ProductLoading";
import ProductCard from "../../components/Home/FeaturedProducts/ProductCard"; // ✅ Dùng card sẵn có
import type { ProductType } from "../../types/product";

const ProductList: React.FC = () => {
  const [products, setProducts] = useState<ProductType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/products");
        const data = await res.json();

        console.log("Dữ liệu trả về:", data);

        // ✅ Đảm bảo có mảng để map
        const list = data.data || data.products || [];
        if (!Array.isArray(list)) {
          console.error("API không trả về mảng hợp lệ:", list);
          setProducts([]);
          return;
        }

        // ✅ Chuyển đổi dữ liệu đúng kiểu
        const mapped: ProductType[] = list.map((p: any) => ({
          _id: p._id,
          name: p.name,
          description: p.description,
          price: p.price,
          salePrice: p.salePrice,
          brand: p.brand,
          category: p.category,
          subCategory: p.subCategory,
          quantity: p.quantity,
          soldCount: p.soldCount,
          model: p.model,
          images: p.images || [],
          specifications: p.specifications || [],
          rating: p.rating || 0,
          reviewsCount: p.reviewsCount || 0,
          tags: p.tags || [],
          seoTitle: p.seoTitle || "",
          seoDescription: p.seoDescription || "",
          keywords: p.keywords || [],
          isFeatured: p.isFeatured || false,
          viewsCount: p.viewsCount || 0,
          isActive: p.isActive ?? true,
          store: p.store || "",
        }));

        setProducts(mapped);
      } catch (err) {
        console.error("Lỗi khi fetch products:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  if (loading) return <ProductLoading />;

  return (
    <div className="p-6 max-w-8xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Danh sách sản phẩm</h1>
      <p className="text-gray-600 mb-6">
        Khám phá các sản phẩm nổi bật được nhiều người yêu thích
      </p>

      <ProductFilters />

      {/* ✅ Hiển thị danh sách bằng ProductCard */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6 mt-6">
        {products.length > 0 ? (
          products.map((p) => <ProductCard key={p._id} product={p} />)
        ) : (
          <p className="text-gray-500 col-span-full text-center">
            Không có sản phẩm nào để hiển thị.
          </p>
        )}
      </div>
    </div>
  );
};

export default ProductList;
