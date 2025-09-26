import React from "react";

interface OrderItem {
  name: string;
  qty: number;
  price: string;
  imgUrl: string;
}

interface Order {
  id: string;
  date: string;
  status: string;
  total: string;
  items: OrderItem[];
}

interface ProfileOrdersProps {
  orders: Order[];
  loading: boolean;
}

const ProfileOrders: React.FC<ProfileOrdersProps> = ({ orders, loading }) => {
  const serverHost = "http://localhost:5000";

  if (loading) return <div className="p-6">Đang tải đơn hàng...</div>;
  if (!orders.length) return <div className="p-6 text-gray-500">Chưa có đơn hàng nào</div>;

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h3 className="font-semibold text-lg mb-4">Lịch sử đơn hàng</h3>
      {orders.map((order) => (
        <div
          key={order.id}
          className="border rounded-lg p-4 mb-4 flex flex-col md:flex-row justify-between"
        >
          <div>
            <div className="font-medium mb-1">Đơn hàng #{order.id}</div>
            <div className="text-gray-500 text-sm mb-2">Ngày đặt: {order.date}</div>
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
              {order.items.map((item, idx) => (
                <div key={`${item.name}-${idx}`} className="flex items-center gap-2">
                  <img
                    src={
                      item.imgUrl.startsWith("/uploads")
                        ? `${serverHost}${item.imgUrl}`
                        : item.imgUrl
                    }
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
          <div className="flex flex-col items-end gap-2 mt-4 md:mt-0">
            <span className="font-bold text-base">{order.total}</span>
            <span className="bg-black text-white px-3 py-1 rounded text-xs">{order.status}</span>
            <div className="flex gap-2">
              <button className="bg-gray-100 px-3 py-1 rounded text-sm hover:bg-gray-200">
                Xem chi tiết
              </button>
              <button className="bg-gray-100 px-3 py-1 rounded text-sm hover:bg-gray-200">
                Mua lại
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProfileOrders;
