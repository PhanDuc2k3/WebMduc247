import React, { useEffect, useState } from "react";

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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;

        const profileRes = await fetch("http://localhost:5000/api/users/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const profile = await profileRes.json();
        const storeId = profile.store?._id || profile.user?.store?._id;
        if (!storeId) return;

        const ordersRes = await fetch("http://localhost:5000/api/orders/seller", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const ordersData = await ordersRes.json();
        setOrders(ordersData);

        const productsRes = await fetch(
          `http://localhost:5000/api/products/store/${storeId}/products`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const productsData = await productsRes.json();
        setProducts(productsData);
      } catch (err) {
        console.error("Lỗi khi lấy dữ liệu:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <p>Đang tải...</p>;

  const revenue = orders.reduce((sum, o) => sum + o.total, 0);
  const totalOrders = orders.length;
  const totalProducts = products.length;
  const totalViews = products.reduce((sum, p) => sum + (p.viewsCount || 0), 0);
  const recentOrders = orders.slice(0, 5);

  return (
    <div>
      <div className="grid grid-cols-4 gap-6 mb-8">
        <StatBox
          title="Doanh thu"
          value={`${revenue.toLocaleString("vi-VN")}₫`}
          percent="+12.5%"
          icon="💰"
        />
        <StatBox
          title="Đơn hàng"
          value={totalOrders.toString()}
          percent="+8.2%"
          icon="🛒"
        />
        <StatBox
          title="Sản phẩm"
          value={totalProducts.toString()}
          percent="+5.3%"
          icon="📦"
        />
        <StatBox
          title="Lượt xem"
          value={totalViews.toString()}
          percent="-2.1%"
          icon="👁️"
        />
      </div>

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
            {recentOrders.map((order) => {
              const latestStatus =
                order.statusHistory?.[order.statusHistory.length - 1]?.status ||
                "pending";
              return (
                <tr key={order._id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3">{order.orderCode}</td>
                  <td className="px-4 py-3">
                    {order.total.toLocaleString("vi-VN")}₫
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        latestStatus === "delivered"
                          ? "bg-black text-white"
                          : latestStatus === "shipped"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-gray-200 text-gray-800"
                      }`}
                    >
                      {latestStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {new Date(order.createdAt).toLocaleDateString("vi-VN")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const StatBox: React.FC<{
  title: string;
  value: string;
  percent: string;
  icon: string;
}> = ({ title, value, percent, icon }) => (
  <div className="bg-white rounded-lg shadow flex flex-col justify-between p-6 h-32">
    <div className="flex items-center gap-2 mb-2">
      <span className="text-2xl">{icon}</span>
      <span className="font-medium text-gray-600">{title}</span>
    </div>
    <div className="font-bold text-2xl">{value}</div>
    <div
      className={`text-sm ${
        percent.startsWith("-") ? "text-red-600" : "text-green-600"
      }`}
    >
      {percent}
    </div>
  </div>
);

export default Overview;
