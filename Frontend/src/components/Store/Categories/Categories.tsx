import React, { useEffect, useState } from "react";
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
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);

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

  if (loading) return <div>Đang tải danh mục...</div>;
  if (!categories.length) return <div>Chưa có danh mục nào</div>;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Danh mục sản phẩm</h2>

      {/* Danh sách category */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 text-center">
        {categories.map((category) => (
          <div
            key={category._id}
            onClick={() => setSelectedCategoryId(category._id)}
            className={`border rounded-lg p-4 cursor-pointer transition duration-200 ease-in-out shadow-sm hover:shadow-md
              ${selectedCategoryId === category._id ? "bg-blue-100 border-blue-400" : "bg-white"}`}
          >
            <span className="text-sm font-medium text-gray-700">{category.name}</span>
          </div>
        ))}
      </div>

      {/* Sản phẩm trong category */}
      {selectedCategoryId && (
        <div className="mt-6">
          <h3 className="text-md font-semibold mb-4">Sản phẩm trong danh mục</h3>
          {productsLoading ? (
            <div>Đang tải sản phẩm...</div>
          ) : products.length ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {products.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          ) : (
            <div>Chưa có sản phẩm nào</div>
          )}
        </div>
      )}
    </div>
  );
};

export default Categories;
