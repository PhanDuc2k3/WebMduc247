import React, { useEffect, useState } from "react";
import { DollarSign, ShoppingCart, Package, Eye } from "lucide-react";
import storeApi from "../../../api/storeApi";
import orderApi from "../../../api/orderApi";
import productApi from "../../../api/productApi";

interface Order {
  _id: string;
  orderCode: string;
  total: number;
  statusHistory: { status: string; timestamp: string }[];
  createdAt: string;
}

interface Product {
  _id: string;
  name: string;
  quantity: number;
  viewsCount: number;
}

const Overview: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log("📦 Bắt đầu lấy thông tin cửa hàng...");
        const storeRes = await storeApi.getMyStore();
        console.log("📦 storeRes:", storeRes.data);

        const storeId = storeRes.data.store?._id;
        if (!storeId) {
          setError("Bạn chưa có cửa hàng.");
          setLoading(false);
          return;
        }
        console.log("👉 storeId:", storeId);

        // Lấy đơn hàng
        try {
          console.log("📦 Bắt đầu lấy đơn hàng...");
          const ordersRes = await orderApi.getOrdersBySeller();
          console.log("📦 ordersRes:", ordersRes.data);
          setOrders(ordersRes.data || []);
        } catch (err: any) {
          console.error("🔥 Lỗi lấy đơn hàng:", err.response?.data || err.message);
          setOrders([]);
        }

        // Lấy sản phẩm
        try {
          console.log("📦 Bắt đầu lấy sản phẩm...");
          const productsRes = await productApi.getProductsByStore(storeId);
          console.log("📦 productsRes:", productsRes.data);
          setProducts(productsRes.data || []);
        } catch (err: any) {
          console.error("🔥 Lỗi lấy sản phẩm:", err.response?.data || err.message);
          setProducts([]);
        }

      } catch (err: any) {
        console.error("🔥 Lỗi lấy store:", err.response?.data || err.message || err);
        setError("Bạn chưa có cửa hàng hoặc API lỗi.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <p className="p-6">Đang tải...</p>;
  if (error) return <p className="p-6 text-red-500">{error}</p>;

  const revenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  const totalOrders = orders.length;
  const totalProducts = products.length;
  const totalViews = products.reduce((sum, p) => sum + (p.viewsCount || 0), 0);
  const recentOrders = orders.slice(0, 5);

  return (
    <div>
      {/* Thống kê */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <StatBox title="Doanh thu" value={`${revenue.toLocaleString("vi-VN")}₫`} percent="+12.5%" icon={<DollarSign className="w-6 h-6 text-gray-700" />} />
        <StatBox title="Đơn hàng" value={totalOrders.toString()} percent="+8.2%" icon={<ShoppingCart className="w-6 h-6 text-gray-700" />} />
        <StatBox title="Sản phẩm" value={totalProducts.toString()} percent="+5.3%" icon={<Package className="w-6 h-6 text-gray-700" />} />
        <StatBox title="Lượt xem" value={totalViews.toString()} percent="-2.1%" icon={<Eye className="w-6 h-6 text-gray-700" />} />
      </div>

      {/* Đơn hàng gần đây */}
      <div className="bg-white rounded-xl shadow p-6">
        <div className="font-semibold text-lg mb-6">Đơn hàng gần đây</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b">
              <th className="px-4 py-3">Mã đơn hàng</th>
              <th className="px-4 py-3">Giá trị</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3">Ngày</th>
            </tr>
          </thead>
          <tbody>
            {recentOrders.length > 0 ? recentOrders.map(order => {
              const latestStatus = order.statusHistory?.[order.statusHistory.length - 1]?.status || "pending";
              return (
                <tr key={order._id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3">{order.orderCode}</td>
                  <td className="px-4 py-3">{(order.total || 0).toLocaleString("vi-VN")}₫</td>
                  <td className="px-4 py-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${latestStatus === "delivered" ? "bg-black text-white" : latestStatus === "shipped" ? "bg-yellow-100 text-yellow-800" : "bg-gray-200 text-gray-800"}`}>
                      {latestStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3">{new Date(order.createdAt).toLocaleDateString("vi-VN")}</td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan={4} className="text-center py-4">Chưa có đơn hàng nào</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const StatBox: React.FC<{ title: string; value: string; percent: string; icon: React.ReactNode }> = ({ title, value, percent, icon }) => (
  <div className="bg-white rounded-lg shadow flex flex-col justify-between p-6 h-32">
    <div className="flex items-center gap-2 mb-2">{icon}<span className="font-medium text-gray-600">{title}</span></div>
    <div className="font-bold text-2xl">{value}</div>
    <div className={`text-sm ${percent.startsWith("-") ? "text-red-600" : "text-green-600"}`}>{percent}</div>
  </div>
);

export default Overview;
