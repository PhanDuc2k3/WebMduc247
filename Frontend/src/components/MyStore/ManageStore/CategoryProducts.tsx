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
  handleToggleProduct,
}) => {
  const category = categories.find((c) => c._id === selectedCategory);

  if (!category) return null;

  const categoryProducts = category.products?.map(productId => {
    const prod = products.find(p => p._id === productId);
    return prod;
  }).filter(Boolean) || [];

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-6 lg:p-8 animate-fade-in-up delay-200">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-1">
            Sản phẩm trong danh mục: <span className="text-blue-600 break-words">{category.name}</span>
          </h2>
          <p className="text-gray-600 text-xs sm:text-sm">
            {categoryProducts.length} sản phẩm trong danh mục này
          </p>
        </div>
        <button
          className="px-3 sm:px-4 py-2 text-xs sm:text-sm bg-gray-200 text-gray-700 rounded-lg sm:rounded-xl font-semibold hover:bg-gray-300 active:scale-95 transition-all duration-300 touch-manipulation self-start sm:self-auto"
          onClick={() => setSelectedCategory(null)}
        >
          Đóng
        </button>
      </div>

      {/* Products List */}
      {categoryProducts.length === 0 ? (
        <div className="text-center py-8 sm:py-12 bg-gray-50 rounded-lg sm:rounded-xl border-2 border-dashed border-gray-300 mb-4">
          <p className="text-gray-500 text-base sm:text-lg font-medium">Chưa có sản phẩm nào trong danh mục</p>
          <p className="text-gray-400 text-xs sm:text-sm mt-1">Thêm sản phẩm để hiển thị trong danh mục này</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
          {categoryProducts.map((prod, index) => (
            <div
              key={prod._id}
              className="p-3 sm:p-4 bg-gradient-to-br from-white to-gray-50 rounded-lg sm:rounded-xl border-2 border-gray-200 hover:border-blue-400 hover:shadow-lg transition-all duration-300 animate-fade-in-up flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm sm:text-base text-gray-900 truncate">{prod.name}</h3>
                {prod.price && (
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">
                    {new Intl.NumberFormat('vi-VN').format(prod.price)}₫
                  </p>
                )}
              </div>
              <button
                className="w-full sm:w-auto sm:ml-3 px-3 py-2 text-xs sm:text-sm bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 active:scale-95 sm:hover:scale-105 shadow-md transition-all duration-300 whitespace-nowrap touch-manipulation"
                onClick={() => {
                  if (window.confirm(`Bạn có chắc muốn xóa "${prod.name}" khỏi danh mục?`)) {
                    handleRemoveProductFromCategory(prod._id);
                  }
                }}
              >
                Xóa
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Products Button */}
      <button
        className="w-full px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg sm:rounded-xl font-bold shadow-lg hover:shadow-xl active:scale-95 sm:hover:scale-105 transition-all duration-300 touch-manipulation"
        onClick={() => setShowProductModal(true)}
      >
        Thêm sản phẩm vào danh mục
      </button>

      {/* Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4 animate-fade-in">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] sm:max-h-[80vh] overflow-hidden animate-scale-in flex flex-col">
            <div className="p-4 sm:p-6 border-b-2 border-gray-200 flex-shrink-0">
              <div className="flex items-start sm:items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">Chọn sản phẩm để thêm</h2>
                  <p className="text-gray-600 text-xs sm:text-sm mt-1 break-words">
                    Chọn các sản phẩm bạn muốn thêm vào danh mục "{category.name}"
                  </p>
                </div>
                <button
                  className="text-gray-500 hover:text-gray-700 text-2xl font-bold w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors touch-manipulation flex-shrink-0"
                  onClick={() => {
                    setShowProductModal(false);
                    setSelectedProducts(new Set());
                  }}
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto flex-1 min-h-0">
              {products.length === 0 ? (
                <div className="text-center py-8 sm:py-12">
                  <p className="text-gray-500 text-base sm:text-lg font-medium">Chưa có sản phẩm nào</p>
                  <p className="text-gray-400 text-xs sm:text-sm mt-1">Tạo sản phẩm mới trước khi thêm vào danh mục</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {products.map((p) => {
                    const alreadyInCategory = category.products?.includes(p._id);
                    const isSelected = selectedProducts.has(p._id);
                    const disabled = alreadyInCategory;
                    
                    return (
                      <label
                        key={p._id}
                        className={`flex items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-lg sm:rounded-xl border-2 cursor-pointer transition-all duration-300 touch-manipulation ${
                          disabled
                            ? 'bg-gray-100 border-gray-300 cursor-not-allowed opacity-60'
                            : isSelected
                            ? 'bg-blue-50 border-blue-500 shadow-md'
                            : 'bg-white border-gray-200 active:border-blue-300 active:bg-gray-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => !disabled && handleToggleProduct(p._id)}
                          disabled={disabled}
                          className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500 cursor-pointer flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <span className={`font-medium text-sm sm:text-base block truncate ${disabled ? 'text-gray-500' : 'text-gray-900'}`}>
                            {p.name}
                          </span>
                          <div className="flex flex-wrap items-center gap-1 sm:gap-2 mt-1">
                            {p.price && (
                              <span className="text-xs sm:text-sm text-gray-600">
                                {new Intl.NumberFormat('vi-VN').format(p.price)}₫
                              </span>
                            )}
                            {disabled && (
                              <span className="text-xs text-blue-600 font-semibold">(Đã có trong danh mục)</span>
                            )}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-4 sm:p-6 border-t-2 border-gray-200 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 flex-shrink-0">
              <button
                className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base bg-gray-200 text-gray-700 rounded-lg sm:rounded-xl font-semibold hover:bg-gray-300 active:scale-95 transition-all duration-300 touch-manipulation"
                onClick={() => {
                  setShowProductModal(false);
                  setSelectedProducts(new Set());
                }}
              >
                Hủy
              </button>
              <button
                className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg sm:rounded-xl font-bold shadow-lg hover:shadow-xl active:scale-95 sm:hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                onClick={handleAddProductsToCategory}
                disabled={selectedProducts.size === 0}
              >
                Thêm {selectedProducts.size > 0 && `(${selectedProducts.size})`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryProducts;
