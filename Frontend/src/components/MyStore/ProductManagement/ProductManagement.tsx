import React, { useState, useEffect } from "react";
import AddProductPopup from "./AddProductPopup";
import type { ProductType } from "../../../types/product";
import {
  Eye,
  Edit,
  Trash2,
  Plus,
  Package,
  TrendingUp,
  Warehouse,
  CircleDollarSign,
} from "lucide-react";

const ProductManagement: React.FC = () => {
  const [products, setProducts] = useState<ProductType[]>([]);
  const [loading, setLoading] = useState(true);

  // Popup thêm / sửa
  const [showPopup, setShowPopup] = useState(false);
  const [editProduct, setEditProduct] = useState<ProductType | null>(null);

  // 🔹 Lấy danh sách sản phẩm
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:5000/api/products/my-products", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      const mapped = (data.data || []).map((p: any) => ({
        ...p,
        quantity: p.quantity ?? 0,
        images: (p.images || []).map((img: string) => `http://localhost:5000${img}`),
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

  // 🔹 Xử lý thêm / sửa sản phẩm từ backend trả về
  const handleAddOrUpdateProduct = (newProduct: ProductType, isEdit: boolean) => {
    const mapped = {
      ...newProduct,
      images: (newProduct.images || []).map((img: string) => `http://localhost:5000${img}`),
    };
    if (isEdit) {
      setProducts((prev) =>
        prev.map((p) => (p._id === mapped._id ? mapped : p))
      );
    } else {
      setProducts((prev) => [mapped, ...prev]);
    }
  };

  // 🔹 Xử lý mở popup sửa
  const handleEditClick = (product: ProductType) => {
    setEditProduct(product);
    setShowPopup(true);
  };

  // 🔹 Xử lý xóa sản phẩm
  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm("Bạn có chắc muốn xóa sản phẩm này không?")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`http://localhost:5000/api/products/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Lỗi xóa sản phẩm");
      setProducts((prev) => prev.filter((p) => p._id !== id));
    } catch (err) {
      console.error("❌ Xóa thất bại:", err);
    }
  };

  if (loading) return <div className="p-6">Đang tải sản phẩm...</div>;

  return (
    <div className="p-6 bg-gray-50 min-h-screen font-sans relative">
      {/* Popup thêm / sửa sản phẩm */}
      {showPopup && (
        <AddProductPopup
          open={showPopup}
          onClose={() => {
            setShowPopup(false);
            setEditProduct(null);
          }}
          onSubmit={(newProduct) => {
            const isEdit = Boolean(editProduct?._id);
            handleAddOrUpdateProduct(newProduct, isEdit);
            setShowPopup(false);
            setEditProduct(null);
          }}
          editProduct={editProduct}
        />
      )}

      {/* Ô thống kê */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        <StatBox
          title="Tổng sản phẩm"
          value={products.length.toString()}
          percent="+0%"
          icon={<Package className="w-6 h-6 text-gray-700" />}
        />
        <StatBox
          title="Tồn kho thấp"
          value={products.filter((p) => p.quantity < 15).length.toString()}
          percent="-5%"
          icon={<Warehouse className="w-6 h-6 text-gray-700" />}
        />
        <StatBox
          title="Tổng đã bán"
          value={products
            .reduce((sum, p) => sum + (p.soldCount || 0), 0)
            .toString()}
          percent="+12%"
          icon={<TrendingUp className="w-6 h-6 text-gray-700" />}
        />
        <StatBox
          title="Tổng lượt xem"
          value={products
            .reduce((sum, p) => sum + (p.viewsCount || 0), 0)
            .toString()}
          percent="+8%"
          icon={<CircleDollarSign className="w-6 h-6 text-gray-700" />}
        />
      </div>

      {/* Thanh tìm kiếm + nút thêm */}
      <div className="flex justify-between items-center mb-6">
        <input
          type="text"
          placeholder="Tìm kiếm sản phẩm..."
          className="w-full max-w-md px-4 py-2 border rounded shadow-sm focus:outline-none focus:ring"
        />
        <button
          onClick={() => {
            setEditProduct(null);
            setShowPopup(true);
          }}
          className="bg-black text-white px-5 py-2.5 rounded-lg font-semibold flex items-center gap-2 hover:bg-gray-800 transition"
        >
          <Plus size={18} /> Thêm sản phẩm mới
        </button>
      </div>

      {/* Bảng sản phẩm */}
      <div className="bg-white rounded-xl shadow p-6">
        <div className="font-semibold text-lg mb-6">Danh sách sản phẩm</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b">
              <th className="px-4 py-3">Sản phẩm</th>
              <th className="px-4 py-3">Giá</th>
              <th className="px-4 py-3">Tồn kho</th>
              <th className="px-4 py-3">Đã bán</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3">Lượt xem</th>
              <th className="px-4 py-3">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {products.length > 0 ? (
              products.map((p) => (
                <tr key={p._id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3 flex items-center gap-3">
                    <img
                      src={p.images[0] || "/placeholder.png"}
                      alt={p.name}
                      className="w-12 h-12 rounded object-cover border"
                    />
                    <div>
                      <div className="font-medium text-gray-800">{p.name}</div>
                      <div className="text-xs text-gray-500">{p._id}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3">{p.price.toLocaleString("vi-VN")}₫</td>
                  <td
                    className={`px-4 py-3 ${
                      p.quantity < 15 ? "text-red-600 font-semibold" : "text-gray-800"
                    }`}
                  >
                    {p.quantity}
                  </td>
                  <td className="px-4 py-3 text-gray-800">{p.soldCount}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        p.isActive ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {p.isActive ? "Hoạt động" : "Ngừng hoạt động"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-800">{p.viewsCount}</td>
                  <td className="px-4 py-3 flex items-center gap-3">
                    <button className="text-blue-600 hover:text-blue-800">
                      <Eye size={18} />
                    </button>
                    <button
                      className="text-green-600 hover:text-green-800"
                      onClick={() => handleEditClick(p)}
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      className="text-red-600 hover:text-red-800"
                      onClick={() => handleDeleteProduct(p._id)}
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="text-center py-6 text-gray-500 font-medium">
                  Chưa có sản phẩm nào
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// 🔹 Component thống kê nhỏ
const StatBox: React.FC<{
  title: string;
  value: string;
  percent: string;
  icon: React.ReactNode;
}> = ({ title, value, percent, icon }) => (
  <div className="bg-white rounded-lg shadow flex flex-col justify-between p-6 h-32">
    <div className="flex items-center gap-2 mb-2">
      {icon}
      <span className="font-medium text-gray-600">{title}</span>
    </div>
    <div className="font-bold text-2xl">{value}</div>
    <div className={`text-sm ${percent.startsWith("-") ? "text-red-600" : "text-green-600"}`}>
      {percent}
    </div>
  </div>
);

export default ProductManagement;
