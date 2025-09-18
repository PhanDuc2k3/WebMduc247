import React, { useState } from "react";
import AddProductPopup from "./AddProductPopup";

const products = [
  { id: "PRD-001", name: "iPhone 15 Pro Max 256GB", price: "29.990.000₫", stock: 45, sold: 123, status: "Hoạt động", views: 2340, img: "/iphone.png" },
  { id: "PRD-002", name: "AirPods Pro 2nd Gen", price: "5.490.000₫", stock: 78, sold: 89, status: "Hoạt động", views: 1567, img: "/airpods.png" },
  { id: "PRD-003", name: "MacBook Air M3 13 inch", price: "25.990.000₫", stock: 12, sold: 34, status: "Sắp hết", views: 987, img: "/macbook.png" },
];

const ProductManagement: React.FC = () => {
  const [showPopup, setShowPopup] = useState(false);

  return (
    <div>
      {/* Nút thêm sản phẩm */}
      <div className="flex justify-end mb-6">
        <button
          className="bg-black text-white px-5 py-2.5 rounded-lg font-semibold flex items-center gap-2 hover:bg-gray-800"
          onClick={() => setShowPopup(true)}
        >
          <span className="text-xl">+</span> Thêm sản phẩm mới
        </button>
      </div>

      {/* Bảng sản phẩm */}
      <div className="bg-white rounded-xl shadow p-6">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b">
              <th className="px-4 py-3">Sản phẩm</th>
              <th className="px-4 py-3">Giá</th>
              <th className="px-4 py-3">Tồn kho</th>
              <th className="px-4 py-3">Đã bán</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3">Lượt xem</th>
              <th className="px-4 py-3">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="border-b hover:bg-gray-50">
                <td className="flex items-center gap-3 px-4 py-3">
                  <img src={p.img} alt={p.name} className="w-12 h-12 rounded object-cover border" />
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-gray-500">{p.id}</div>
                  </div>
                </td>
                <td className="px-4 py-3">{p.price}</td>
                <td className={`px-4 py-3 ${p.stock < 15 ? "text-red-600 font-bold" : ""}`}>{p.stock}</td>
                <td className="px-4 py-3">{p.sold}</td>
                <td className="px-4 py-3">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      p.status === "Hoạt động"
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {p.status}
                  </span>
                </td>
                <td className="px-4 py-3">{p.views}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-3 text-lg">
                    <button title="Xem" className="hover:text-blue-600 transition-colors">👁️</button>
                    <button title="Sửa" className="hover:text-green-600 transition-colors">✏️</button>
                    <button title="Xóa" className="hover:text-red-600 transition-colors">🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Popup */}
      {showPopup && <AddProductPopup onClose={() => setShowPopup(false)} />}
    </div>
  );
};

export default ProductManagement;
