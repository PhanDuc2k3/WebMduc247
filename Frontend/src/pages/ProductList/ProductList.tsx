import React, { useEffect, useState } from "react";
import ProductFilters from "../../components/ProductList/ProductFilters";
import ProductLoading from "../../components/ProductList/ProductLoading";
import ProductCard from "../../components/Home/FeaturedProducts/ProductCard";
import PriceFilter from "../../components/ProductList/PriceFilter";
import type { ProductType } from "../../types/product";

const ProductList: React.FC = () => {
  const [products, setProducts] = useState<ProductType[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPrice, setSelectedPrice] = useState<string>("");

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/products");
        const data = await res.json();

        console.log("Dữ liệu trả về:", data);

        const list = data.data || data.products || [];
        if (!Array.isArray(list)) {
          console.error("API không trả về mảng hợp lệ:", list);
          setProducts([]);
          return;
        }

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

  // ✅ Lọc theo giá được chọn
const filteredProducts = products.filter((p) => {
  if (!selectedPrice) return true;

  const range = selectedPrice.split("-");
  if (range.length === 2) {
    const [min, max] = range.map(Number);
    return p.price >= min && p.price <= max;
  }

  if (selectedPrice === "duoi1tr") return p.price < 1_000_000;
  if (selectedPrice === "1-5tr") return p.price >= 1_000_000 && p.price <= 5_000_000;
  if (selectedPrice === "5-10tr") return p.price > 5_000_000 && p.price <= 10_000_000;
  if (selectedPrice === "tren10tr") return p.price > 10_000_000;

  return true;
});

  if (loading) return <ProductLoading />;

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <h1 className="text-2xl font-bold mb-2">Danh sách sản phẩm</h1>
      <p className="text-gray-600 mb-6">
        Khám phá các sản phẩm nổi bật được nhiều người yêu thích
      </p>

      {/* 🔍 Thanh tìm kiếm (giữ nguyên) */}
      <ProductFilters />

      {/* 🧩 Bố cục 2 cột: 20% bộ lọc - 80% danh sách */}
      <div className="flex flex-col lg:flex-row gap-6 mt-6">
        {/* ✅ Bộ lọc giá */}
        <div className="lg:w-1/5 bg-white p-4 rounded-xl shadow-sm border h-fit">
          <h2 className="text-lg font-semibold mb-3 text-gray-800">
            Lọc theo giá
          </h2>
          <PriceFilter
            selectedPrice={selectedPrice}
            setSelectedPrice={setSelectedPrice}
          />
        </div>

        {/* ✅ Danh sách sản phẩm */}

<div className="lg:w-4/5">
  <div
    className="
      grid gap-6 
      grid-cols-[repeat(auto-fit,minmax(250px,1fr))]
    "
  >
    {filteredProducts.length > 0 ? (
      filteredProducts.map((p) => (
        <div
          key={p._id}
          className="w-full max-w-xs" // giữ card không quá to
        >
          <ProductCard product={p} />
        </div>
      ))
    ) : (
      <p className="text-gray-500 col-span-full text-center">
        Không có sản phẩm nào để hiển thị.
      </p>
    )}
  </div>
</div>

      </div>
    </div>
  );
};

export default ProductList;
