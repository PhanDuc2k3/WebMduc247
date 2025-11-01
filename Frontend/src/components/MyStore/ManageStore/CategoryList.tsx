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
    <div className="bg-white p-4 rounded shadow">
      <h2 className="font-bold mb-2">Danh mục sản phẩm</h2>

      <div className="flex gap-2 mb-2">
        <input
          type="text"
          className="border p-2 flex-1"
          placeholder="Tên danh mục mới"
          value={newCategoryName}
          onChange={(e) => setNewCategoryName(e.target.value)}
        />
        <button
          className="px-4 py-2 bg-green-500 text-white rounded"
          onClick={handleAddCategory}
        >
          Thêm
        </button>
      </div>

      <ul>
        {categories.map((cat) => (
          <li key={cat._id} className="flex items-center gap-2 mb-1">
            <input
              type="text"
              className="border p-1 flex-1"
              value={editingNames[cat._id] ?? cat.name}
              onChange={(e) => handleChange(cat._id, e.target.value)}
            />
            <button
              className="px-2 py-1 bg-blue-500 text-white rounded"
              onClick={() => handleSave(cat._id)}
            >
              Lưu
            </button>
            <button
              className="px-2 py-1 bg-red-500 text-white rounded"
              onClick={() => handleDeleteCategory(cat._id)}
            >
              Xóa
            </button>
            <button
              className="px-2 py-1 bg-gray-200 text-black rounded"
              onClick={() => setSelectedCategory(cat._id)}
            >
              Quản lý sản phẩm
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default CategoryList;
