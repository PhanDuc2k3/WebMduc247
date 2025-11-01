import React, { useState, useEffect } from "react";
import AddProductPopup from "./AddProductPopup";
import productApi from "../../../api/productApi";
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

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const ProductManagement: React.FC = () => {
  const [products, setProducts] = useState<ProductType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPopup, setShowPopup] = useState(false);
  const [editProduct, setEditProduct] = useState<ProductType | null>(null);

  // 🔹 Lấy danh sách sản phẩm
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const res = await productApi.getMyProducts();

      const productsArray: any[] = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data.data)
        ? res.data.data
        : [];

      const mapped: ProductType[] = productsArray.map((p: any) => ({
        ...p,
        quantity: p.quantity ?? 0,
        images: (p.images || []).map((img: string) =>
          img.startsWith("http") ? img : `${BASE_URL}${img.startsWith("/") ? img : "/" + img}`
        ),
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

  // 🔹 Thêm / sửa sản phẩm
  const handleAddOrUpdateProduct = (newProduct: ProductType, isEdit: boolean) => {
    const mapped: ProductType = {
      ...newProduct,
      images: (newProduct.images || []).map((img: string) =>
        img.startsWith("http") ? img : `${BASE_URL}${img.startsWith("/") ? img : "/" + img}`
      ),
    };
    if (isEdit) {
      setProducts((prev) => prev.map((p) => (p._id === mapped._id ? mapped : p)));
    } else {
      setProducts((prev) => [mapped, ...prev]);
    }
  };

  // 🔹 Mở popup sửa
  const handleEditClick = (product: ProductType) => {
    setEditProduct(product);
    setShowPopup(true);
  };

  // 🔹 Xóa sản phẩm
  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm("Bạn có chắc muốn xóa sản phẩm này không?")) return;
    try {
      await productApi.deleteProduct(id);
      setProducts((prev) => prev.filter((p) => p._id !== id));
    } catch (err) {
      console.error("❌ Xóa thất bại:", err);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center animate-fade-in">
        <div className="text-4xl mb-4 animate-pulse">📦</div>
        <p className="text-gray-600 text-lg font-medium">Đang tải sản phẩm...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatBox
          title="Tổng sản phẩm"
          value={products.length.toString()}
          percent="+0%"
          icon={<Package className="w-6 h-6" />}
          color="from-blue-500 to-cyan-600"
        />
        <StatBox
          title="Tồn kho thấp"
          value={products.filter((p) => p.quantity < 15).length.toString()}
          percent="-5%"
          icon={<Warehouse className="w-6 h-6" />}
          color="from-orange-500 to-red-600"
        />
        <StatBox
          title="Tổng đã bán"
          value={products.reduce((sum, p) => sum + (p.soldCount || 0), 0).toString()}
          percent="+12%"
          icon={<TrendingUp className="w-6 h-6" />}
          color="from-green-500 to-emerald-600"
        />
        <StatBox
          title="Tổng lượt xem"
          value={products.reduce((sum, p) => sum + (p.viewsCount || 0), 0).toString()}
          percent="+8%"
          icon={<CircleDollarSign className="w-6 h-6" />}
          color="from-purple-500 to-pink-600"
        />
      </div>

      {/* Thanh tìm kiếm + nút thêm */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full sm:max-w-md">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl blur-sm opacity-0 focus-within:opacity-100 transition-opacity duration-300"></div>
          <input
            type="text"
            placeholder="🔍 Tìm kiếm sản phẩm..."
            className="relative w-full px-5 py-3 pl-12 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white transition-all duration-300"
          />
          <Package className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        </div>
        <button
          onClick={() => {
            setEditProduct(null);
            setShowPopup(true);
          }}
          className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-bold flex items-center gap-2 hover:from-blue-600 hover:to-purple-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 whitespace-nowrap"
        >
          <Plus size={20} /> Thêm sản phẩm mới
        </button>
      </div>

      {/* Bảng sản phẩm */}
      <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 overflow-hidden animate-fade-in-up">
        <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-6 border-b-2 border-gray-200">
          <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <span>📦</span> Danh sách sản phẩm
          </h3>
          <p className="text-gray-600 text-sm mt-1">{products.length} sản phẩm</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-gray-600 border-b border-gray-200 bg-gray-50">
                <th className="px-6 py-4 font-bold">Sản phẩm</th>
                <th className="px-6 py-4 font-bold">Giá</th>
                <th className="px-6 py-4 font-bold">Tồn kho</th>
                <th className="px-6 py-4 font-bold">Đã bán</th>
                <th className="px-6 py-4 font-bold">Trạng thái</th>
                <th className="px-6 py-4 font-bold">Lượt xem</th>
                <th className="px-6 py-4 font-bold text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {products.length > 0 ? (
                products.map((p, index) => (
                  <tr key={p._id} className="border-b border-gray-100 hover:bg-blue-50 transition-all duration-200 animate-fade-in-up" style={{ animationDelay: `${index * 0.05}s` }}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <img
                            src={p.images[0] || "/placeholder.png"}
                            alt={p.name}
                            className="w-16 h-16 rounded-xl object-cover border-2 border-gray-200 shadow-md"
                            loading="lazy"
                          />
                          {p.quantity < 15 && (
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full border-2 border-white">
                              ⚠️
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-gray-900 line-clamp-2">{p.name}</div>
                          <div className="text-xs text-gray-500 mt-1">{p._id.slice(-8).toUpperCase()}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-green-600">{p.price.toLocaleString("vi-VN")}₫</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`font-bold px-3 py-1 rounded-lg ${p.quantity < 15 ? "bg-red-100 text-red-700 border-2 border-red-300" : "text-gray-700"}`}>
                        {p.quantity}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-gray-700">{p.soldCount || 0}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-4 py-2 rounded-full text-xs font-bold border-2 ${p.isActive ? "bg-green-100 text-green-700 border-green-300" : "bg-yellow-100 text-yellow-700 border-yellow-300"}`}>
                        {p.isActive ? "✓ Hoạt động" : "⚠ Ngừng"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-blue-600">{p.viewsCount || 0}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          title="Xem chi tiết" 
                          className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 hover:bg-blue-200 hover:text-blue-700 flex items-center justify-center transition-all duration-300 transform hover:scale-110"
                        >
                          <Eye size={18} />
                        </button>
                        <button 
                          title="Chỉnh sửa"
                          className="w-10 h-10 rounded-xl bg-green-100 text-green-600 hover:bg-green-200 hover:text-green-700 flex items-center justify-center transition-all duration-300 transform hover:scale-110"
                          onClick={() => handleEditClick(p)}
                        >
                          <Edit size={18} />
                        </button>
                        <button 
                          title="Xóa sản phẩm"
                          className="w-10 h-10 rounded-xl bg-red-100 text-red-600 hover:bg-red-200 hover:text-red-700 flex items-center justify-center transition-all duration-300 transform hover:scale-110"
                          onClick={() => handleDeleteProduct(p._id)}
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <div className="text-6xl mb-4">📦</div>
                    <p className="text-gray-500 text-lg font-medium mb-2">Chưa có sản phẩm nào</p>
                    <p className="text-gray-400 text-sm">Hãy thêm sản phẩm đầu tiên của bạn</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// 🔹 Component thống kê nhỏ
const StatBox: React.FC<{ title: string; value: string; percent: string; icon: React.ReactNode; color: string }> = ({ title, value, percent, icon, color }) => (
  <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:scale-105 animate-fade-in-up">
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white shadow-lg`}>
          {icon}
        </div>
        <span className={`text-xs font-bold px-3 py-1 rounded-full ${percent.startsWith("-") ? "bg-red-100 text-red-600 border-2 border-red-300" : "bg-green-100 text-green-600 border-2 border-green-300"}`}>
          {percent}
        </span>
      </div>
      <div className="text-2xl lg:text-3xl font-extrabold text-gray-900 mb-1">{value}</div>
      <div className="text-sm font-semibold text-gray-600">{title}</div>
    </div>
  </div>
);

export default ProductManagement;
