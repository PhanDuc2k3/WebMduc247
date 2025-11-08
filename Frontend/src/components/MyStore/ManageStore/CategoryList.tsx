import React, { useState } from "react";
import type { Category } from "../../../types/store";

interface Props {
  categories: Category[];
  newCategoryName: string;
  setNewCategoryName: (name: string) => void;
  selectedCategory: string | null;
  setSelectedCategory: (id: string | null) => void;
  handleAddCategory: () => void;
  handleEditCategory: (id: string, name: string) => void;
  handleDeleteCategory: (id: string) => void;
}

const CategoryList: React.FC<Props> = ({
  categories,
  newCategoryName,
  setNewCategoryName,
  selectedCategory,
  setSelectedCategory,
  handleAddCategory,
  handleEditCategory,
  handleDeleteCategory,
}) => {
  // Local state để lưu tạm tên khi sửa
  const [editingNames, setEditingNames] = useState<Record<string, string>>({});

  const handleChange = (id: string, value: string) => {
    setEditingNames({ ...editingNames, [id]: value });
  };

  const handleSave = (id: string) => {
    if (editingNames[id]?.trim()) {
      handleEditCategory(id, editingNames[id].trim());
      setEditingNames((prev) => {
        const newState = { ...prev };
        delete newState[id];
        return newState;
      });
    }
  };

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-6 lg:p-8 animate-fade-in-up delay-100">
      <div className="mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">Danh mục sản phẩm</h2>
        <p className="text-gray-600 text-xs sm:text-sm">Quản lý các danh mục sản phẩm của cửa hàng</p>
      </div>

      {/* Add Category Form */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-4 sm:mb-6 p-3 sm:p-4 bg-gray-50 rounded-lg sm:rounded-xl border border-gray-200">
        <input
          type="text"
          className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300 font-medium text-gray-900"
          placeholder="Nhập tên danh mục mới"
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
        />
        <button
          className="px-4 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg sm:rounded-xl font-bold shadow-lg hover:shadow-xl active:scale-95 sm:hover:scale-105 transition-all duration-300 whitespace-nowrap touch-manipulation"
          onClick={handleAddCategory}
        >
          Thêm danh mục
        </button>
      </div>

      {/* Categories List */}
      {categories.length === 0 ? (
        <div className="text-center py-8 sm:py-12 bg-gray-50 rounded-lg sm:rounded-xl border-2 border-dashed border-gray-300">
          <p className="text-gray-500 text-base sm:text-lg font-medium">Chưa có danh mục nào</p>
          <p className="text-gray-400 text-xs sm:text-sm mt-1">Thêm danh mục mới để bắt đầu</p>
        </div>
      ) : (
        <div className="space-y-2 sm:space-y-3">
          {categories.map((cat, index) => (
            <div
              key={cat._id}
              className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 p-3 sm:p-4 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg sm:rounded-xl border-2 border-gray-200 hover:border-blue-400 hover:shadow-md transition-all duration-300 animate-fade-in-up"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <input
                type="text"
                className="flex-1 w-full px-3 sm:px-4 py-2 sm:py-2.5 text-sm sm:text-base border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 font-medium text-gray-900 bg-white"
                value={editingNames[cat._id] ?? cat.name}
                onChange={(e) => handleChange(cat._id, e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSave(cat._id)}
              />
              
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                {editingNames[cat._id] !== undefined && editingNames[cat._id] !== cat.name && (
                  <button
                    className="flex-1 sm:flex-none px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 active:scale-95 sm:hover:scale-105 shadow-md transition-all duration-300 whitespace-nowrap touch-manipulation"
                    onClick={() => handleSave(cat._id)}
                  >
                    Lưu
                  </button>
                )}
                <button
                  className="flex-1 sm:flex-none px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold active:scale-95 sm:hover:scale-105 hover:shadow-lg transition-all duration-300 whitespace-nowrap touch-manipulation"
                  onClick={() => setSelectedCategory(cat._id)}
                >
                  Quản lý sản phẩm
                </button>
                <button
                  className="flex-1 sm:flex-none px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 active:scale-95 sm:hover:scale-105 shadow-md transition-all duration-300 whitespace-nowrap touch-manipulation"
                  onClick={() => {
                    if (window.confirm(`Bạn có chắc muốn xóa danh mục "${cat.name}"?`)) {
                      handleDeleteCategory(cat._id);
                    }
                  }}
                >
                  Xóa
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CategoryList;
