import React from "react";
import type { Category, Product } from "../../../types/store";

interface Props {
  selectedCategory: string;
  categories: Category[];
  products: Product[];
  selectedProducts: Set<string>;
  setSelectedProducts: (set: Set<string>) => void;
  showProductModal: boolean;
  setShowProductModal: (show: boolean) => void;
  handleRemoveProductFromCategory: (productId: string) => void;
  handleAddProductsToCategory: () => void;
  setSelectedCategory: (id: string | null) => void;
  handleToggleProduct: (productId: string) => void;

}

const CategoryProducts: React.FC<Props> = ({
  selectedCategory,
  categories,
  products,
  selectedProducts,
  setSelectedProducts,
  showProductModal,
  setShowProductModal,
  handleRemoveProductFromCategory,
  handleAddProductsToCategory,
  setSelectedCategory,
}) => {
  const handleToggleProduct = (productId: string) => {
    const newSet = new Set(selectedProducts);
    if (newSet.has(productId)) newSet.delete(productId);
    else newSet.add(productId);
    setSelectedProducts(newSet);
  };

  const category = categories.find((c) => c._id === selectedCategory);

  if (!category) return null;

  return (
    <div className="bg-white p-4 rounded shadow">
      <h2 className="font-bold mb-2">
        Sản phẩm trong danh mục: {category.name}
      </h2>

      <ul>
        {category.products?.map((productId) => {
          const prod = products.find((p) => p._id === productId);
          if (!prod) return null;
          return (
            <li key={prod._id} className="flex items-center justify-between mb-1">
              <span>{prod.name}</span>
              <button
                className="px-2 py-1 bg-red-500 text-white rounded"
                onClick={() => handleRemoveProductFromCategory(prod._id)}
              >
                Xóa
              </button>
            </li>
          );
        }) || <li>Chưa có sản phẩm nào</li>}
      </ul>

      <button
        className="mt-2 px-4 py-2 bg-green-500 text-white rounded"
        onClick={() => setShowProductModal(true)}
      >
        Thêm sản phẩm
      </button>

      <button
        className="mt-2 px-4 py-2 bg-gray-300 rounded ml-2"
        onClick={() => setSelectedCategory(null)}
      >
        Đóng
      </button>

      {/* Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-4 rounded w-96 max-h-[80vh] overflow-y-auto">
            <h2 className="font-bold mb-2">Chọn sản phẩm để thêm</h2>
            <ul className="space-y-1">
              {products.map((p) => {
                const selected = category.products?.includes(p._id);
                return (
                  <li key={p._id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!selected || selectedProducts.has(p._id)}
                      onChange={() => handleToggleProduct(p._id)}
                    />
                    <span>{p.name}</span>
                  </li>
                );
              })}
            </ul>
            <div className="flex justify-end gap-2 mt-4">
              <button
                className="px-4 py-2 bg-gray-300 rounded"
                onClick={() => {
                  setShowProductModal(false);
                  setSelectedProducts(new Set());
                }}
              >
                Hủy
              </button>
              <button
                className="px-4 py-2 bg-blue-500 text-white rounded"
                onClick={handleAddProductsToCategory}
              >
                Thêm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryProducts;
