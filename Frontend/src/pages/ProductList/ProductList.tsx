import React, { useEffect, useState } from "react";
import ProductFilters from "../../components/ProductList/ProductFilters";
import ProductLoading from "../../components/ProductList/ProductLoading";
import ProductCard from "../../components/Home/FeaturedProducts/ProductCard";
import PriceFilter from "../../components/ProductList/PriceFilter";
import type { ProductType } from "../../types/product";
import productApi from "../../api/productApi";

const ProductList: React.FC = () => {
  const [products, setProducts] = useState<ProductType[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPrice, setSelectedPrice] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await productApi.getProducts();
        const list = res.data.data || res.data.products || [];

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

  // 🔎 Lọc sản phẩm theo giá + tên
  const filteredProducts = products
    .filter((p) => {
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
    })
    .filter((p) => !searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  if (loading) return <ProductLoading />;

  return (
    <div className="w-full py-8 md:py-12">
      <div className="mb-8 animate-fade-in-down">
        <h1 className="text-3xl lg:text-4xl font-bold mb-3 text-gray-900 gradient-text">
          🛍️ Danh sách sản phẩm
        </h1>
        <p className="text-gray-600 text-lg">
          Khám phá các sản phẩm nổi bật được nhiều người yêu thích
        </p>
      </div>

      <div className="mb-6 animate-fade-in-up delay-200">
        <ProductFilters searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
      </div>

      <div className="flex flex-col lg:flex-row gap-6 mt-8">
        {/* Bộ lọc giá */}
        <div className="lg:w-1/5 bg-white p-6 rounded-2xl shadow-md border border-gray-100 h-fit sticky top-[180px] animate-fade-in-left delay-300">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">💰</span>
            <h2 className="text-xl font-bold text-gray-900">Lọc theo giá</h2>
          </div>
          <PriceFilter selectedPrice={selectedPrice} setSelectedPrice={setSelectedPrice} />
        </div>

        {/* Danh sách sản phẩm */}
        <div className="lg:w-4/5 animate-fade-in-right delay-300">
          {filteredProducts.length > 0 && (
            <div className="mb-4 flex items-center justify-between">
              <p className="text-gray-600 font-medium">
                Tìm thấy <span className="text-blue-600 font-bold">{filteredProducts.length}</span> sản phẩm
              </p>
            </div>
          )}
          
          <div className="grid grid-cols-[repeat(auto-fill,minmax(250px,1fr))] gap-6">
            {filteredProducts.length > 0 ? (
              filteredProducts.map((p, index) => (
                <div 
                  key={p._id} 
                  className="w-full animate-slide-up"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <ProductCard product={p} />
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-16 animate-fade-in">
                <div className="text-6xl mb-4">😔</div>
                <p className="text-gray-500 text-lg font-medium mb-2">
                  Không có sản phẩm nào để hiển thị
                </p>
                <p className="text-gray-400 text-sm">
                  Hãy thử thay đổi bộ lọc hoặc từ khóa tìm kiếm
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductList;
