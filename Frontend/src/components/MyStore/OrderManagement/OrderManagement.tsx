import React, { useEffect, useState } from "react";
import { Eye, Trash2, ShoppingCart, Package, DollarSign, CheckCircle, Clock, Search } from "lucide-react";
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

  // Hàm chuyển đổi trạng thái sang tiếng Việt
  const getStatusLabel = (status: string): string => {
    const statusMap: { [key: string]: string } = {
      "pending": "Chờ xử lý",
      "processing": "Đang xử lý",
      "confirmed": "Đã xác nhận",
      "shipped": "Đang giao hàng",
      "delivered": "Đã giao hàng",
      "cancelled": "Đã hủy",
      "completed": "Hoàn thành",
      "return_requested": "Chờ hoàn trả",
      "returned": "Đã hoàn trả",
    };
    return statusMap[status.toLowerCase()] || status;
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-8 text-center animate-fade-in">
        <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-t-4 border-b-4 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600 text-sm sm:text-lg font-medium">Đang tải đơn hàng...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="p-4 sm:p-8 text-center animate-fade-in">
        <div className="bg-red-50 rounded-full w-16 h-16 sm:w-20 sm:h-20 flex items-center justify-center mx-auto mb-4">
          <span className="text-red-500 text-2xl sm:text-3xl">✕</span>
        </div>
        <p className="text-red-500 text-sm sm:text-lg font-medium">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in-up">
      {/* 4 ô thống kê */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatBox title="Tổng đơn hàng" value={totalOrders.toString()} percent="+0%" icon={<Package className="w-5 h-5 sm:w-6 sm:h-6" />} color="from-blue-500 to-cyan-600" />
        <StatBox title="Tổng doanh thu" value={totalRevenue.toLocaleString("vi-VN") + "₫"} percent="+0%" icon={<DollarSign className="w-5 h-5 sm:w-6 sm:h-6" />} color="from-green-500 to-emerald-600" />
        <StatBox title="Đơn đã giao" value={deliveredCount.toString()} percent="+0%" icon={<CheckCircle className="w-5 h-5 sm:w-6 sm:h-6" />} color="from-purple-500 to-pink-600" />
        <StatBox title="Đơn đang xử lý" value={pendingCount.toString()} percent="-0%" icon={<Clock className="w-5 h-5 sm:w-6 sm:h-6" />} color="from-orange-500 to-red-600" />
      </div>

      {/* Thanh tìm kiếm */}
      <div className="flex justify-between items-center">
        <div className="relative w-full sm:max-w-md">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-xl blur-sm opacity-0 focus-within:opacity-100 transition-opacity duration-300"></div>
          <input
            type="text"
            placeholder="Tìm kiếm đơn hàng..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="relative w-full px-4 sm:px-5 py-2.5 sm:py-3 pl-10 sm:pl-12 text-sm sm:text-base border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white transition-all duration-300"
          />
          <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
        </div>
      </div>

      {/* Bảng đơn hàng */}
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border-2 border-gray-100 overflow-hidden animate-fade-in-up">
        <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-4 sm:p-6 border-b-2 border-gray-200">
          <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
            <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            <span>Danh sách đơn hàng</span>
          </h3>
          <p className="text-gray-600 text-xs sm:text-sm mt-1">{filteredOrders.length} đơn hàng</p>
        </div>
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="text-left text-gray-600 border-b border-gray-200 bg-gray-50">
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold">Mã đơn hàng</th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold">Sản phẩm</th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold">Khách hàng</th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold">Giá trị</th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold text-center">Trạng thái</th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold">Ngày đặt</th>
                <th className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-bold text-center">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length > 0 ? (
                filteredOrders.map((order, index) => {
                  const latestStatus =
                    order.statusHistory?.[order.statusHistory.length - 1]?.status || "pending";
                  const statusLabel = getStatusLabel(latestStatus);

                  return (
                    <tr key={order._id} className="border-b border-gray-100 hover:bg-blue-50 transition-all duration-200 animate-fade-in-up" style={{ animationDelay: `${index * 0.05}s` }}>
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <span className="font-bold text-xs sm:text-sm text-gray-900">{order.orderCode}</span>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <div className="space-y-1">
                          {order.items.slice(0, 2).map((i) => (
                            <div key={i.productId} className="flex items-center gap-2 text-xs sm:text-sm">
                              <span className="font-medium text-gray-900 truncate max-w-[150px] sm:max-w-none">{i.name}</span>
                              <span className="text-gray-500 flex-shrink-0">x{i.quantity}</span>
                            </div>
                          ))}
                          {order.items.length > 2 && (
                            <div className="text-xs text-gray-500">+{order.items.length - 2} sản phẩm khác</div>
                          )}
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <span className="font-semibold text-xs sm:text-sm text-gray-900">{order.userId?.fullName || "Ẩn danh"}</span>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <span className="font-bold text-xs sm:text-sm text-green-600">{order.total?.toLocaleString("vi-VN")}₫</span>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 text-center">
                        <span
                          className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-bold border-2 whitespace-nowrap ${
                            latestStatus === "delivered" || latestStatus === "completed"
                              ? "bg-green-100 text-green-700 border-green-300"
                              : latestStatus === "shipped"
                              ? "bg-blue-100 text-blue-700 border-blue-300"
                              : latestStatus === "confirmed" || latestStatus === "processing"
                              ? "bg-yellow-100 text-yellow-700 border-yellow-300"
                              : latestStatus === "cancelled"
                              ? "bg-red-100 text-red-700 border-red-300"
                              : "bg-gray-100 text-gray-700 border-gray-300"
                          }`}
                        >
                          {statusLabel}
                        </span>
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-600">
                        {new Date(order.createdAt).toLocaleDateString("vi-VN")}
                      </td>
                      <td className="px-3 sm:px-6 py-3 sm:py-4">
                        <div className="flex justify-center gap-1 sm:gap-2">
                          <button
                            title="Xem chi tiết"
                            className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-blue-100 text-blue-600 hover:bg-blue-200 hover:text-blue-700 active:scale-95 sm:hover:scale-110 flex items-center justify-center transition-all duration-300 touch-manipulation"
                            onClick={() => navigate(`/order/${order._id}`)}
                          >
                            <Eye className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
                          </button>
                          <button
                            title="Xóa đơn hàng"
                            className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-red-100 text-red-600 hover:bg-red-200 hover:text-red-700 active:scale-95 sm:hover:scale-110 flex items-center justify-center transition-all duration-300 touch-manipulation"
                          >
                            <Trash2 className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-8 sm:py-12">
                    <div className="flex justify-center mb-4">
                      <ShoppingCart className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400" />
                    </div>
                    <p className="text-gray-500 text-sm sm:text-lg font-medium mb-2">Chưa có đơn hàng nào</p>
                    <p className="text-gray-400 text-xs sm:text-sm">Đơn hàng của khách sẽ hiển thị ở đây</p>
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
const StatBox: React.FC<{ title: string; value: string; percent: string; icon: React.ReactNode; color: string }> = ({
  title,
  value,
  percent,
  icon,
  color,
}) => (
  <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border-2 border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95 sm:active:scale-100 animate-fade-in-up touch-manipulation">
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div className={`w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-lg sm:rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white shadow-lg`}>
          {icon}
        </div>
        <span className={`text-xs font-bold px-2 sm:px-3 py-1 rounded-full whitespace-nowrap ${percent.startsWith("-") ? "bg-red-100 text-red-600 border-2 border-red-300" : "bg-green-100 text-green-600 border-2 border-green-300"}`}>
          {percent}
        </span>
      </div>
      <div className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-gray-900 mb-1 break-words">{value}</div>
      <div className="text-xs sm:text-sm font-semibold text-gray-600">{title}</div>
    </div>
  </div>
);

export default OrderManagement;
