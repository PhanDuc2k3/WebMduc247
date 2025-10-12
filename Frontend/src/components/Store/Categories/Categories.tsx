import React from "react";

interface CategoriesProps {
  categories?: string[]; // danh mục từ backend, optional
}

const Categories: React.FC<CategoriesProps> = ({ categories }) => {
  const categoryList = categories && categories.length > 0 ? categories : [
    "Điện thoại",
    "Laptop",
    "Tablet",
    "Phụ kiện",
    "Đồng hồ thông minh",
  ];

  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">Danh mục sản phẩm</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 text-center">
        {categoryList.map((category) => (
          <div
            key={category}
            className="border rounded-lg p-4 hover:bg-blue-50 cursor-pointer transition duration-200 ease-in-out shadow-sm hover:shadow-md"
          >
            <span className="text-sm font-medium text-gray-700">{category}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Categories;
