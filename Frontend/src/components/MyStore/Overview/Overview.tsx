import React from "react";

const recentOrders = [
  { id: "ORD-001", product: "iPhone 15 Pro Max", customer: "Nguyễn Văn A", value: "29.990.000₫", status: "Đã giao", date: "2024-09-08" },
  { id: "ORD-002", product: "AirPods Pro", customer: "Trần Thị B", value: "5.490.000₫", status: "Đang giao", date: "2024-09-07" },
  { id: "ORD-003", product: "MacBook Air M3", customer: "Lê Văn C", value: "25.990.000₫", status: "Đã xác nhận", date: "2024-09-07" },
];

const Overview: React.FC = () => (
  <div>
    {/* Stats */}
    <div className="grid grid-cols-4 gap-6 mb-8">
      <StatBox title="Doanh thu" value="245.600.000₫" percent="+12.5%" icon="💰" />
      <StatBox title="Đơn hàng" value="1234" percent="+8.2%" icon="🛒" />
      <StatBox title="Sản phẩm" value="89" percent="+5.3%" icon="📦" />
      <StatBox title="Lượt xem" value="45.670" percent="-2.1%" icon="👁️" />
    </div>

    {/* Orders */}
    <div className="bg-white rounded-xl shadow p-6">
      <div className="font-semibold text-lg mb-6">Đơn hàng gần đây</div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 border-b">
            <th className="px-4 py-3">Mã đơn hàng</th>
            <th className="px-4 py-3">Sản phẩm</th>
            <th className="px-4 py-3">Khách hàng</th>
            <th className="px-4 py-3">Giá trị</th>
            <th className="px-4 py-3">Trạng thái</th>
            <th className="px-4 py-3">Ngày</th>
          </tr>
        </thead>
        <tbody>
          {recentOrders.map(order => (
            <tr key={order.id} className="border-b hover:bg-gray-50">
              <td className="px-4 py-3">{order.id}</td>
              <td className="px-4 py-3">{order.product}</td>
              <td className="px-4 py-3">{order.customer}</td>
              <td className="px-4 py-3">{order.value}</td>
              <td className="px-4 py-3">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    order.status === "Đã giao"
                      ? "bg-black text-white"
                      : order.status === "Đang giao"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-gray-200 text-gray-800"
                  }`}
                >
                  {order.status}
                </span>
              </td>
              <td className="px-4 py-3">{order.date}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const StatBox: React.FC<{ title: string; value: string; percent: string; icon: string }> = ({ title, value, percent, icon }) => (
  <div className="bg-white rounded-lg shadow flex flex-col justify-between p-6 h-32">
    <div className="flex items-center gap-2 mb-2">
      <span className="text-2xl">{icon}</span>
      <span className="font-medium text-gray-600">{title}</span>
    </div>
    <div className="font-bold text-2xl">{value}</div>
    <div className={`text-sm ${percent.startsWith("-") ? "text-red-600" : "text-green-600"}`}>
      {percent}
    </div>
  </div>
);

export default Overview;
