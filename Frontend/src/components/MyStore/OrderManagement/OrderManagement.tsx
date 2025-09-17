import React from "react";

const orders = [
  { id: "ORD-001", product: "iPhone 15 Pro Max", customer: "Nguyễn Văn A", value: "29.990.000₫", status: "Đã giao", date: "2024-09-08" },
  { id: "ORD-002", product: "AirPods Pro", customer: "Trần Thị B", value: "5.490.000₫", status: "Đang giao", date: "2024-09-07" },
  { id: "ORD-003", product: "MacBook Air M3", customer: "Lê Văn C", value: "25.990.000₫", status: "Đã xác nhận", date: "2024-09-07" },
];

const OrderManagement: React.FC = () => (
  <div>
    <div className="flex justify-end mb-4 gap-2">
      <button className="bg-black text-white px-5 py-2 rounded-lg font-semibold">Xuất báo cáo</button>
      <button className="bg-gray-100 text-black px-5 py-2 rounded-lg font-semibold">Lọc đơn hàng</button>
    </div>

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
          {orders.map(order => (
            <tr key={order.id} className="border-b hover:bg-gray-50">
              <td className="px-4 py-3">{order.id}</td>
              <td className="px-4 py-3">{order.product}</td>
              <td className="px-4 py-3">{order.customer}</td>
              <td className="px-4 py-3">{order.value}</td>
              <td className="px-4 py-3 text-center">
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    order.status === "Đã giao"
                      ? "bg-black text-white"
                      : order.status === "Đang giao"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-gray-100 text-black"
                  }`}
                >
                  {order.status}
                </span>
              </td>
              <td className="px-4 py-3">{order.date}</td>
              <td className="px-4 py-3 text-center">
                <div className="flex justify-center gap-3">
                  <button title="Xem" className="hover:text-blue-600">
                    <span role="img" aria-label="eye">👁️</span>
                  </button>
                  <button title="Xóa" className="hover:text-red-600">
                    <span role="img" aria-label="delete">🗑️</span>
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export default OrderManagement;
