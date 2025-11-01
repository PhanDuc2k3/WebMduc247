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

  if (loading) {
    return (
      <div className="p-8 text-center animate-fade-in">
        <div className="text-4xl mb-4 animate-pulse">📊</div>
        <p className="text-gray-600 text-lg font-medium">Đang tải tổng quan...</p>
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

  const revenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  const totalOrders = orders.length;
  const totalProducts = products.length;
  const totalViews = products.reduce((sum, p) => sum + (p.viewsCount || 0), 0);
  const recentOrders = orders.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Thống kê */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatBox title="Doanh thu" value={`${revenue.toLocaleString("vi-VN")}₫`} percent="+12.5%" icon={<DollarSign className="w-6 h-6" />} color="from-green-500 to-emerald-600" />
        <StatBox title="Đơn hàng" value={totalOrders.toString()} percent="+8.2%" icon={<ShoppingCart className="w-6 h-6" />} color="from-blue-500 to-cyan-600" />
        <StatBox title="Sản phẩm" value={totalProducts.toString()} percent="+5.3%" icon={<Package className="w-6 h-6" />} color="from-purple-500 to-pink-600" />
        <StatBox title="Lượt xem" value={totalViews.toString()} percent="-2.1%" icon={<Eye className="w-6 h-6" />} color="from-orange-500 to-red-600" />
      </div>

      {/* Đơn hàng gần đây */}
      <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 overflow-hidden animate-fade-in-up">
        <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-6 border-b-2 border-gray-200">
          <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <span>📋</span> Đơn hàng gần đây
          </h3>
          <p className="text-gray-600 text-sm mt-1">Các đơn hàng mới nhất từ cửa hàng của bạn</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-gray-600 border-b border-gray-200 bg-gray-50">
                <th className="px-6 py-4 font-bold">Mã đơn hàng</th>
                <th className="px-6 py-4 font-bold">Giá trị</th>
                <th className="px-6 py-4 font-bold">Trạng thái</th>
                <th className="px-6 py-4 font-bold">Ngày</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.length > 0 ? recentOrders.map((order, index) => {
                const latestStatus = order.statusHistory?.[order.statusHistory.length - 1]?.status || "pending";
                return (
                  <tr key={order._id} className="border-b border-gray-100 hover:bg-blue-50 transition-all duration-200 animate-fade-in-up" style={{ animationDelay: `${index * 0.05}s` }}>
                    <td className="px-6 py-4 font-semibold text-gray-900">{order.orderCode}</td>
                    <td className="px-6 py-4 font-bold text-green-600">{(order.total || 0).toLocaleString("vi-VN")}₫</td>
                    <td className="px-6 py-4">
                      <span className={`px-4 py-2 rounded-full text-xs font-bold ${
                        latestStatus === "delivered" 
                          ? "bg-green-100 text-green-700 border-2 border-green-300" 
                          : latestStatus === "shipped" 
                          ? "bg-yellow-100 text-yellow-700 border-2 border-yellow-300" 
                          : "bg-gray-100 text-gray-700 border-2 border-gray-300"
                      }`}>
                        {latestStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{new Date(order.createdAt).toLocaleDateString("vi-VN")}</td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={4} className="text-center py-12">
                    <div className="text-6xl mb-4">📦</div>
                    <p className="text-gray-500 text-lg font-medium">Chưa có đơn hàng nào</p>
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

export default Overview;
