import React, { useState, useEffect } from "react";
import AddProductPopup from "./AddProductPopup";
import type { ProductType } from "../../../types/product";

const ProductManagement: React.FC = () => {
  const [products, setProducts] = useState<ProductType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPopup, setShowPopup] = useState(false);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:5000/api/products", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      // map quantity -> stock
      const mapped = (data.data || []).map((p: any) => ({
        ...p,
        stock: p.quantity ?? 0,
      }));
      setProducts(mapped);
    } catch (err) {
      console.error("❌ Lỗi fetch sản phẩm:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleAddProduct = (newProduct: ProductType) => {
    setProducts((prev) => [newProduct, ...prev]);
  };

  if (loading) return <div className="p-6">Đang tải sản phẩm...</div>;

  return (
    <div className="p-6">
      {/* Nút thêm sản phẩm */}
      <div className="flex justify-end mb-6">
        <button
          onClick={() => setShowPopup(true)}
          className="bg-black text-white px-5 py-2.5 rounded-lg font-semibold flex items-center gap-2 hover:bg-gray-800 transition"
        >
          <span className="text-xl">+</span> Thêm sản phẩm mới
        </button>
      </div>

      {/* Bảng sản phẩm */}
      <div className="bg-white rounded-xl shadow p-6 overflow-x-auto">
        <table className="w-full text-sm table-auto">
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
              <tr key={p._id} className="border-b hover:bg-gray-50 transition">
                <td className="flex items-center gap-3 px-4 py-3">
                  <img
                    src={p.images[0] || "/placeholder.png"}
                    alt={p.name}
                    className="w-12 h-12 rounded object-cover border"
                  />
                  <div>
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-gray-500">{p._id}</div>
                  </div>
                </td>
                <td className="px-4 py-3">{p.price.toLocaleString()}₫</td>
                <td className={`px-4 py-3 ${p.stock! < 15 ? "text-red-600 font-bold" : ""}`}>
                  {p.stock}
                </td>
                <td className="px-4 py-3">{p.soldCount}</td>
                <td className="px-4 py-3">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      p.isActive ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {p.isActive ? "Hoạt động" : "Ngừng hoạt động"}
                  </span>
                </td>
                <td className="px-4 py-3">{p.viewsCount}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-3 text-lg">
                    <button title="Xem" className="hover:text-blue-600 transition-colors">
                      👁️
                    </button>
                    <button title="Sửa" className="hover:text-green-600 transition-colors">
                      ✏️
                    </button>
                    <button title="Xóa" className="hover:text-red-600 transition-colors">
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Popup thêm sản phẩm */}
      {showPopup && (
        <AddProductPopup onClose={() => setShowPopup(false)} onAddProduct={handleAddProduct} />
      )}
    </div>
  );
};

export default ProductManagement;
