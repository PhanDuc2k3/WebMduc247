import React, { useEffect, useState } from "react";
import { Eye, Trash2, ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import orderApi from "../../../api/orderApi";

interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
}

interface Order {
  _id: string;
  orderCode: string;
  userId: { fullName: string; email: string; phone: string };
  items: OrderItem[];
  total: number;
  statusHistory: { status: string; timestamp: string }[];
  createdAt: string;
}

const OrderManagement: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await orderApi.getOrdersBySeller();
        setOrders(res.data || []);
      } catch (err: any) {
        setError(err.response?.data?.message || err.message || "Lỗi khi tải đơn hàng");
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const filteredOrders = orders.filter(
    (o) =>
      o.orderCode.toLowerCase().includes(search.toLowerCase()) ||
      o.userId.fullName.toLowerCase().includes(search.toLowerCase())
  );

  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
  const deliveredCount = orders.filter(
    (o) => o.statusHistory[o.statusHistory.length - 1]?.status === "delivered"
  ).length;
  const pendingCount = orders.filter(
    (o) => o.statusHistory[o.statusHistory.length - 1]?.status !== "delivered"
  ).length;

  if (loading) {
    return (
      <div className="p-8 text-center animate-fade-in">
        <div className="text-4xl mb-4 animate-pulse">🛒</div>
        <p className="text-gray-600 text-lg font-medium">Đang tải đơn hàng...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-8 text-center animate-fade-in">
        <div className="text-4xl mb-4">❌</div>
        <p className="text-red-500 text-lg font-medium">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* 4 ô thống kê */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatBox title="Tổng đơn hàng" value={totalOrders.toString()} percent="+0%" icon="📦" color="from-blue-500 to-cyan-600" />
        <StatBox title="Tổng doanh thu" value={totalRevenue.toLocaleString("vi-VN") + "₫"} percent="+0%" icon="💰" color="from-green-500 to-emerald-600" />
        <StatBox title="Đơn đã giao" value={deliveredCount.toString()} percent="+0%" icon="✅" color="from-purple-500 to-pink-600" />
        <StatBox title="Đơn đang xử lý" value={pendingCount.toString()} percent="-0%" icon="⏳" color="from-orange-500 to-red-600" />
      </div>

      {/* Thanh tìm kiếm */}
      <div className="flex justify-between items-center">
        <div className="relative w-full sm:max-w-md">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl blur-sm opacity-0 focus-within:opacity-100 transition-opacity duration-300"></div>
          <input
            type="text"
            placeholder="🔍 Tìm kiếm đơn hàng..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="relative w-full px-5 py-3 pl-12 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white transition-all duration-300"
          />
          <ShoppingCart className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        </div>
      </div>

      {/* Bảng đơn hàng */}
      <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 overflow-hidden animate-fade-in-up">
        <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-6 border-b-2 border-gray-200">
          <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <span>🛒</span> Danh sách đơn hàng
          </h3>
          <p className="text-gray-600 text-sm mt-1">{filteredOrders.length} đơn hàng</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-gray-600 border-b border-gray-200 bg-gray-50">
                <th className="px-6 py-4 font-bold">Mã đơn hàng</th>
                <th className="px-6 py-4 font-bold">Sản phẩm</th>
                <th className="px-6 py-4 font-bold">Khách hàng</th>
                <th className="px-6 py-4 font-bold">Giá trị</th>
                <th className="px-6 py-4 font-bold text-center">Trạng thái</th>
                <th className="px-6 py-4 font-bold">Ngày đặt</th>
                <th className="px-6 py-4 font-bold text-center">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length > 0 ? (
                filteredOrders.map((order, index) => {
                  const latestStatus =
                    order.statusHistory?.[order.statusHistory.length - 1]?.status || "pending";

                  return (
                    <tr key={order._id} className="border-b border-gray-100 hover:bg-blue-50 transition-all duration-200 animate-fade-in-up" style={{ animationDelay: `${index * 0.05}s` }}>
                      <td className="px-6 py-4">
                        <span className="font-bold text-gray-900">{order.orderCode}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {order.items.map((i) => (
                            <div key={i.productId} className="flex items-center gap-2 text-sm">
                              <span className="font-medium text-gray-900">{i.name}</span>
                              <span className="text-gray-500">x{i.quantity}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold text-gray-900">{order.userId?.fullName || "Ẩn danh"}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-green-600">{order.total?.toLocaleString("vi-VN")}₫</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span
                          className={`px-4 py-2 rounded-full text-xs font-bold border-2 ${
                            latestStatus === "delivered"
                              ? "bg-green-100 text-green-700 border-green-300"
                              : latestStatus === "shipped"
                              ? "bg-yellow-100 text-yellow-700 border-yellow-300"
                              : "bg-gray-100 text-gray-700 border-gray-300"
                          }`}
                        >
                          {latestStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {new Date(order.createdAt).toLocaleDateString("vi-VN")}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center gap-2">
                          <button
                            title="Xem chi tiết"
                            className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 hover:bg-blue-200 hover:text-blue-700 flex items-center justify-center transition-all duration-300 transform hover:scale-110"
                            onClick={() => navigate(`/order/${order._id}`)}
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            title="Xóa đơn hàng"
                            className="w-10 h-10 rounded-xl bg-red-100 text-red-600 hover:bg-red-200 hover:text-red-700 flex items-center justify-center transition-all duration-300 transform hover:scale-110"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-12">
                    <div className="text-6xl mb-4">🛒</div>
                    <p className="text-gray-500 text-lg font-medium mb-2">Chưa có đơn hàng nào</p>
                    <p className="text-gray-400 text-sm">Đơn hàng của khách sẽ hiển thị ở đây</p>
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

// Component thống kê nhỏ
const StatBox: React.FC<{ title: string; value: string; percent: string; icon: string; color: string }> = ({
  title,
  value,
  percent,
  icon,
  color,
}) => (
  <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:scale-105 animate-fade-in-up">
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white shadow-lg text-2xl`}>
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

export default OrderManagement;
