import React from "react";

const orders = [
  {
    id: "ORD-2024-001",
    date: "2024-09-05",
    status: "Đã giao",
    total: "29.990.000₫",
    items: [
      {
        name: "iPhone 15 Pro Max 256GB",
        qty: 1,
        price: "29.990.000₫",
        img: "https://i.imgur.com/iphone.png",
      },
    ],
  },
  {
    id: "ORD-2024-002",
    date: "2024-08-28",
    status: "Đã giao",
    total: "5.490.000₫",
    items: [
      {
        name: "AirPods Pro 2nd Gen",
        qty: 1,
        price: "5.490.000₫",
        img: "https://i.imgur.com/airpods.png",
      },
    ],
  },
];

const ProfileOrders: React.FC = () => (
  <div className="bg-white rounded-xl shadow p-6">
    <h3 className="font-semibold text-lg mb-4">Lịch sử đơn hàng</h3>
    {orders.map(order => (
      <div
        key={order.id}
        className="border rounded-lg p-4 mb-4 flex items-center justify-between"
      >
        <div>
          <div className="font-medium mb-1">
            Đơn hàng #{order.id}
          </div>
          <div className="text-gray-500 text-sm mb-2">Ngày đặt: {order.date}</div>
          <div className="flex items-center gap-4">
            {order.items.map(item => (
              <div key={item.name} className="flex items-center gap-2">
                <img
                  src={item.img}
                  alt={item.name}
                  className="w-12 h-12 rounded object-cover"
                />
                <div>
                  <div className="font-medium">{item.name}</div>
                  <div className="text-xs text-gray-500">
                    Số lượng: {item.qty} x {item.price}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="font-bold text-base">{order.total}</span>
          <span className="bg-black text-white px-3 py-1 rounded text-xs">{order.status}</span>
          <div className="flex gap-2">
            <button className="bg-gray-100 px-3 py-1 rounded text-sm hover:bg-gray-200">Xem chi tiết</button>
            <button className="bg-gray-100 px-3 py-1 rounded text-sm hover:bg-gray-200">Mua lại</button>
          </div>
        </div>
      </div>
    ))}
  </div>
);

export default ProfileOrders;