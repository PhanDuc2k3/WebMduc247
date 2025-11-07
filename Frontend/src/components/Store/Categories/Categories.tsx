import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import storeApi from "../../../api/storeApi";
import type { Product } from "../../../types/store";
import ProductCard from "../../Home/FeaturedProducts/ProductCard"; // giả sử bạn đã có component này

interface Category {
  _id: string;
  name: string;
  products?: string[]; // optional: danh sách productIds
}

interface CategoriesProps {
  storeId: string; // cần storeId để fetch
}

const Categories: React.FC<CategoriesProps> = ({ storeId }) => {
  const [searchParams] = useSearchParams();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Đọc search term từ URL query
  useEffect(() => {
    const search = searchParams.get("search");
    if (search) {
      setSearchTerm(search);
    }
  }, [searchParams]);

  // ========================
  // Lấy danh sách category của store
  // ========================
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await storeApi.getCategories(storeId);
        setCategories(res.data.categories || []);
      } catch (err) {
        console.error("Lỗi fetch categories:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, [storeId]);

  // ========================
  // Fetch sản phẩm khi chọn category
  // ========================
  useEffect(() => {
    if (!selectedCategoryId) return;

    const fetchProducts = async () => {
      setProductsLoading(true);
      try {
        // backend route: /stores/:storeId/categories/:categoryId/products
        const res = await storeApi.getProductsByCategory(storeId, selectedCategoryId);
        setProducts(res.data.products || []);
      } catch (err) {
        console.error("Lỗi fetch products:", err);
      } finally {
        setProductsLoading(false);
      }
    };

    fetchProducts();
  }, [selectedCategoryId, storeId]);

  if (loading) {
    return (
      <div className="p-4 md:p-6 text-center animate-fade-in">
        <div className="text-3xl md:text-4xl mb-3 md:mb-4 animate-pulse">⏳</div>
        <p className="text-gray-500 text-sm md:text-base lg:text-lg font-medium">Đang tải danh mục...</p>
      </div>
    );
  }
  
  if (!categories.length) {
    return (
      <div className="p-6 md:p-8 text-center animate-fade-in">
        <div className="text-4xl md:text-6xl mb-3 md:mb-4">📁</div>
        <p className="text-gray-500 text-sm md:text-base lg:text-lg font-medium mb-1 md:mb-2">Chưa có danh mục nào</p>
        <p className="text-gray-400 text-xs md:text-sm">Cửa hàng sẽ sớm cập nhật danh mục</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 rounded-xl md:rounded-2xl bg-gradient-to-br from-gray-50 via-white to-gray-50 shadow-lg border border-gray-200 animate-fade-in-up">
      <div className="pb-4 md:pb-6 animate-fade-in-down">
        <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-2 md:gap-3">
          <span>📂</span> Danh mục sản phẩm
        </h2>
        <p className="text-gray-600 text-xs md:text-sm pt-2">
          Chọn danh mục để xem sản phẩm
        </p>
      </div>

      {/* Danh sách category */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-3 lg:gap-4 pb-6 md:pb-8">
        {categories.map((category, index) => (
          <div
            key={category._id}
            onClick={() => setSelectedCategoryId(category._id)}
            className={`rounded-lg md:rounded-xl p-3 md:p-4 lg:p-5 cursor-pointer transition-all duration-300 transform hover:scale-105 border-2 text-center animate-scale-in
              ${
                selectedCategoryId === category._id
                  ? "bg-gradient-to-br from-blue-50 to-purple-50 border-blue-500 shadow-lg scale-105"
                  : "bg-white border-gray-200 hover:border-blue-300 hover:shadow-md"
              }`}
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <div className="text-2xl md:text-3xl mb-1 md:mb-2">📁</div>
            <span className={`text-xs md:text-sm font-bold line-clamp-2 ${
              selectedCategoryId === category._id ? "text-blue-600" : "text-gray-700"
            }`}>
              {category.name}
            </span>
          </div>
        ))}
      </div>

      {/* Sản phẩm trong category */}
      {selectedCategoryId && (
        <div className="pt-6 md:pt-8 border-t border-gray-200 animate-fade-in-up">
          <div className="pb-4 md:pb-6">
            <h3 className="text-lg md:text-xl font-bold text-gray-900 flex items-center gap-2">
              <span>🛍️</span> Sản phẩm trong danh mục
            </h3>
            <p className="text-gray-600 text-xs md:text-sm pt-1">
              {products.length} sản phẩm
            </p>
          </div>
          
          {productsLoading ? (
            <div className="text-center py-8 md:py-12 animate-fade-in">
              <div className="text-3xl md:text-4xl mb-3 md:mb-4 animate-pulse">⏳</div>
              <p className="text-gray-500 text-sm md:text-base font-medium">Đang tải sản phẩm...</p>
            </div>
          ) : (() => {
            // Filter sản phẩm theo search term
            const filteredProducts = products.filter((p) => {
              if (!searchTerm) return true;
              return p.name?.toLowerCase().includes(searchTerm.toLowerCase());
            });

            return filteredProducts.length ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3 lg:gap-4 xl:gap-6">
                {filteredProducts.map((product, index) => (
                  <div
                    key={product._id}
                    className="animate-slide-up"
                    style={{ animationDelay: `${index * 0.05}s` }}
                  >
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 md:py-12 animate-fade-in">
                <div className="text-4xl md:text-6xl mb-3 md:mb-4">{searchTerm ? "🔍" : "📦"}</div>
                <p className="text-gray-500 text-base md:text-lg font-medium mb-1 md:mb-2">
                  {searchTerm ? "Không tìm thấy sản phẩm nào" : "Chưa có sản phẩm nào"}
                </p>
                <p className="text-gray-400 text-xs md:text-sm">
                  {searchTerm ? "Hãy thử thay đổi từ khóa tìm kiếm" : "Danh mục này chưa có sản phẩm"}
                </p>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export default Categories;
