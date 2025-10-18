import React, { useEffect, useState } from "react";
import { Eye, Trash2 } from "lucide-react";
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

  if (loading) return <div className="p-6">Đang tải đơn hàng...</div>;
  if (error) return <div className="p-6 text-red-500">{error}</div>;

  return (
    <div className="p-6 bg-gray-50 min-h-screen font-sans relative">
      {/* 4 ô thống kê */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
        <StatBox title="Tổng đơn hàng" value={totalOrders.toString()} percent="+0%" />
        <StatBox title="Tổng doanh thu" value={totalRevenue.toLocaleString("vi-VN") + "₫"} percent="+0%" />
        <StatBox title="Đơn đã giao" value={deliveredCount.toString()} percent="+0%" />
        <StatBox title="Đơn đang xử lý" value={pendingCount.toString()} percent="-0%" />
      </div>

      {/* Thanh tìm kiếm */}
      <div className="flex justify-between items-center mb-4">
        <input
          type="text"
          placeholder="Tìm kiếm đơn hàng..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md px-4 py-2 border rounded shadow-sm focus:outline-none focus:ring"
        />
      </div>

      {/* Bảng đơn hàng */}
      <div className="bg-white rounded-xl shadow p-6 overflow-x-auto">
        <table className="w-full table-auto text-base">
          <thead>
            <tr className="text-left text-gray-500 border-b">
              <th className="px-4 py-3">Mã đơn hàng</th>
              <th className="px-4 py-3">Sản phẩm</th>
              <th className="px-4 py-3">Khách hàng</th>
              <th className="px-4 py-3">Giá trị</th>
              <th className="px-4 py-3 text-center">Trạng thái</th>
              <th className="px-4 py-3">Ngày đặt</th>
              <th className="px-4 py-3 text-center">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.length > 0 ? (
              filteredOrders.map((order) => {
                const latestStatus =
                  order.statusHistory?.[order.statusHistory.length - 1]?.status || "pending";

                return (
                  <tr key={order._id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3">{order.orderCode}</td>
                    <td className="px-4 py-3">
                      {order.items.map((i) => (
                        <div key={i.productId}>
                          {i.name} x{i.quantity}
                        </div>
                      ))}
                    </td>
                    <td className="px-4 py-3">{order.userId?.fullName || "Ẩn danh"}</td>
                    <td className="px-4 py-3">{order.total?.toLocaleString("vi-VN")}₫</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          latestStatus === "delivered"
                            ? "bg-black text-white"
                            : latestStatus === "shipped"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-gray-100 text-black"
                        }`}
                      >
                        {latestStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {new Date(order.createdAt).toLocaleDateString("vi-VN")}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center gap-3">
                        <button
                          title="Xem chi tiết"
                          className="text-blue-600 hover:text-blue-800 transition"
                          onClick={() => navigate(`/order/${order._id}`)}
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          title="Xóa đơn hàng"
                          className="text-red-600 hover:text-red-800 transition"
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
                <td colSpan={7} className="text-center py-4 text-gray-500 font-medium">
                  Chưa có đơn hàng nào
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Component thống kê nhỏ
const StatBox: React.FC<{ title: string; value: string; percent: string }> = ({
  title,
  value,
  percent,
}) => (
  <div className="bg-white rounded-lg shadow flex flex-col justify-between p-6 h-32">
    <div className="font-medium text-gray-600">{title}</div>
    <div className="font-bold text-2xl">{value}</div>
    <div className={`text-sm ${percent.startsWith("-") ? "text-red-600" : "text-green-600"}`}>
      {percent}
    </div>
  </div>
);

export default OrderManagement;
