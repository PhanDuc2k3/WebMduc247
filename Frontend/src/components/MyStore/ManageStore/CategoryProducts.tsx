import React, { useState } from "react";
import ConfirmDialog from "../../ui/ConfirmDialog";
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
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; product: Product | null }>({ open: false, product: null });
  const category = categories.find((c) => c._id === selectedCategory);

  if (!category) return null;

  const categoryProducts = category.products?.map(productId => {
    const prod = products.find(p => p._id === productId);
    return prod;
  }).filter(Boolean) || [];

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-[#2F5FEB]/30 p-4 sm:p-6 lg:p-8 animate-fade-in-up delay-200">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
        <div className="flex-1 min-w-0">
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-[#2F5FEB] mb-1">
            Sản phẩm trong danh mục: <span className="break-words">{category.name}</span>
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
        <div className="text-center py-8 sm:py-12 bg-[#2F5FEB]/5 rounded-lg sm:rounded-xl border-2 border-dashed border-[#2F5FEB]/30 mb-4">
          <p className="text-gray-500 text-base sm:text-lg font-medium">Chưa có sản phẩm nào trong danh mục</p>
          <p className="text-gray-400 text-xs sm:text-sm mt-1">Thêm sản phẩm để hiển thị trong danh mục này</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
          {categoryProducts.map((prod, index) => (
            <div
              key={prod._id}
              className="p-3 sm:p-4 bg-gradient-to-br from-white to-gray-50 rounded-lg sm:rounded-xl border-2 border-gray-200 hover:border-[#2F5FEB] hover:shadow-lg transition-all duration-300 animate-fade-in-up flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0"
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
                onClick={() => setDeleteConfirm({ open: true, product: prod })}
              >
                Xóa
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Products Button */}
      <button
        className="w-full px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base bg-[#2F5FEB] text-white rounded-lg sm:rounded-xl font-bold shadow-lg hover:shadow-xl active:scale-95 sm:hover:scale-105 hover:bg-[#244ACC] transition-all duration-300 touch-manipulation"
        onClick={() => setShowProductModal(true)}
      >
        Thêm sản phẩm vào danh mục
      </button>

      {/* Modal */}
      {showProductModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4 animate-fade-in">
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] sm:max-h-[80vh] overflow-hidden animate-scale-in flex flex-col">
            <div className="p-4 sm:p-6 border-b-2 border-[#2F5FEB]/30 flex-shrink-0 bg-[#2F5FEB]/5">
              <div className="flex items-start sm:items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-[#2F5FEB]">Chọn sản phẩm để thêm</h2>
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
                            ? 'bg-[#2F5FEB]/5 border-[#2F5FEB] shadow-md'
                            : 'bg-white border-gray-200 active:border-[#2F5FEB]/60 active:bg-[#2F5FEB]/5'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => !disabled && handleToggleProduct(p._id)}
                          disabled={disabled}
                          className="w-4 h-4 sm:w-5 sm:h-5 text-[#2F5FEB] rounded focus:ring-2 focus:ring-[#2F5FEB] cursor-pointer flex-shrink-0"
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
                              <span className="text-xs text-[#2F5FEB] font-semibold">(Đã có trong danh mục)</span>
                            )}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-4 sm:p-6 border-t-2 border-[#2F5FEB]/30 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 flex-shrink-0 bg-gray-50">
              <button
                className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base bg-white text-gray-700 rounded-lg sm:rounded-xl font-semibold hover:bg-gray-100 active:scale-95 border border-gray-300 transition-all duration-300 touch-manipulation"
                onClick={() => {
                  setShowProductModal(false);
                  setSelectedProducts(new Set());
                }}
              >
                Hủy
              </button>
              <button
                className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base bg-[#2F5FEB] text-white rounded-lg sm:rounded-xl font-bold shadow-lg hover:shadow-xl active:scale-95 sm:hover:scale-105 hover:bg-[#244ACC] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                onClick={handleAddProductsToCategory}
                disabled={selectedProducts.size === 0}
              >
                Thêm {selectedProducts.size > 0 && `(${selectedProducts.size})`}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, product: null })}
        onConfirm={() => {
          if (deleteConfirm.product) {
            handleRemoveProductFromCategory(deleteConfirm.product._id);
            setDeleteConfirm({ open: false, product: null });
          }
        }}
        title="Xác nhận xóa sản phẩm"
        message={deleteConfirm.product ? `Bạn có chắc muốn xóa "${deleteConfirm.product.name}" khỏi danh mục?` : ""}
        type="danger"
        confirmText="Xóa"
      />
    </div>
  );
};

export default CategoryProducts;
