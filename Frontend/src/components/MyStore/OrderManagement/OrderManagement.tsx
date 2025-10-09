import React, { useEffect, useState } from "react";
import { Eye, Trash2 } from "lucide-react";

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

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          setError("Bạn chưa đăng nhập");
          setLoading(false);
          return;
        }

        const res = await fetch("http://localhost:5000/api/orders/seller", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          throw new Error("Không thể tải đơn hàng");
        }

        const data = await res.json();
        setOrders(Array.isArray(data) ? data : data.data || []);
      } catch (err: any) {
        setError(err.message || "Lỗi khi tải đơn hàng");
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  if (loading) return <p className="p-6">Đang tải đơn hàng...</p>;
  if (error) return <p className="p-6 text-red-500">{error}</p>;

  return (
    <div>
      {/* Thanh công cụ */}
      <div className="flex justify-end mb-4 gap-2">
        <button className="bg-black text-white px-5 py-2 rounded-lg font-semibold">
          Xuất báo cáo
        </button>
        <button className="bg-gray-100 text-black px-5 py-2 rounded-lg font-semibold">
          Lọc đơn hàng
        </button>
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
            {orders.length > 0 ? (
              orders.map((order) => {
                const latestStatus =
                  order.statusHistory?.[order.statusHistory.length - 1]
                    ?.status || "pending";

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
                    <td className="px-4 py-3">
                      {order.userId?.fullName || "Ẩn danh"}
                    </td>
                    <td className="px-4 py-3">
                      {order.total?.toLocaleString("vi-VN")}₫
                    </td>
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
                <td colSpan={7} className="text-center py-4">
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

export default OrderManagement;
