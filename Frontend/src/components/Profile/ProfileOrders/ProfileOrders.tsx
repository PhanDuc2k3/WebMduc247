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

  if (loading)
    return <div className="p-6 text-lg">Đang tải đơn hàng...</div>;
  if (!orders.length)
    return (
      <div className="p-6 text-gray-500 text-lg">Chưa có đơn hàng nào</div>
    );

  return (
    <div className="bg-white rounded-xl shadow p-8">
      <h3 className="font-semibold text-xl mb-6">Lịch sử đơn hàng</h3>
      {orders.map((order) => (
        <div
          key={order.id}
          className="border rounded-xl p-6 mb-6 flex flex-col md:flex-row justify-between"
        >
          <div>
            <div className="font-medium text-lg mb-2">Đơn hàng #{order.id}</div>
            <div className="text-gray-500 text-base mb-4">
              Ngày đặt: {order.date}
            </div>
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              {order.items.map((item, idx) => (
                <div key={`${item.name}-${idx}`} className="flex items-center gap-4">
                  <img
                    src={
                      item.imgUrl.startsWith("/uploads")
                        ? `${serverHost}${item.imgUrl}`
                        : item.imgUrl
                    }
                    alt={item.name}
                    className="w-20 h-20 rounded object-cover"
                  />
                  <div>
                    <div className="text-lg font-medium">{item.name}</div>
                    <div className="text-sm text-gray-500">
                      Số lượng: {item.qty} x {item.price}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex flex-col items-end gap-3 mt-6 md:mt-0">
            <span className="font-bold text-lg">{order.total}</span>
            <span className="bg-black text-white px-4 py-1 rounded text-sm">
              {order.status}
            </span>
            <div className="flex gap-4">
              <button className="bg-gray-100 px-4 py-2 rounded text-base font-medium hover:bg-gray-200">
                Xem chi tiết
              </button>
              <button className="bg-gray-100 px-4 py-2 rounded text-base font-medium hover:bg-gray-200">
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
