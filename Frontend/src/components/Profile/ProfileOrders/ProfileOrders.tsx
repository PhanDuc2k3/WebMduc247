import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import reviewApi from "../../../api/apiReview";

interface OrderItem {
  name: string;
  qty: number;
  price: string;
  imgUrl: string;
  productId: string;
}

interface StatusHistory {
  status: string;
  note?: string;
  timestamp: string;
}

interface Order {
  _id: string;
  date: string;
  statusHistory: StatusHistory[];
  total: string;
  items: OrderItem[];
}

interface Review {
  _id: string;
  userInfo: { fullName: string; avatarUrl: string };
  rating: number;
  comment: string;
  images: string[];
  createdAt: string;
}

interface ProfileOrdersProps {
  orders: Order[];
  loading: boolean;
  onReview: (productId: string, orderId: string) => void;
}

const ProfileOrders: React.FC<ProfileOrdersProps> = ({
  orders,
  loading,
  onReview,
}) => {
  const navigate = useNavigate();

  // state chứa reviews theo productId
  const [reviews, setReviews] = useState<Record<string, Review[]>>({});

  // fetch reviews theo productId
  const fetchReviews = async (productId: string) => {
    try {
      const res = await reviewApi.getReviewsByProduct(productId);
      setReviews((prev) => ({ ...prev, [productId]: res.data }));
    } catch (err) {
      console.error("❌ Lỗi fetch reviews:", err);
    }
  };

  // khi có orders thì fetch review cho từng product
  useEffect(() => {
    orders.forEach((order) =>
      order.items.forEach((item) => {
        if (!reviews[item.productId]) {
          fetchReviews(item.productId);
        }
      })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders]);

  const getShippingStatus = (history: StatusHistory[]) => {
    if (!history || history.length === 0) return "Chờ xác nhận";
    const latest = history[history.length - 1].status;
    const map: Record<string, string> = {
      pending: "Chờ xác nhận",
      confirmed: "Đã xác nhận",
      packed: "Đã đóng gói",
      shipped: "Đang giao hàng",
      delivered: "Đã giao hàng",
      cancelled: "Đã hủy đơn",
    };
    return map[latest] || latest;
  };

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
          key={order._id}
          className="border rounded-xl p-6 mb-6 flex flex-col md:flex-row justify-between"
        >
          {/* Bên trái */}
          <div className="flex-1">
            <div className="font-medium text-lg mb-2">
              Đơn hàng #{order._id}
            </div>
            <div className="text-gray-500 text-base mb-4">
              Ngày đặt: {order.date}
            </div>

            {/* Danh sách sản phẩm */}
            {order.items.map((item, idx) => (
              <div key={`${item.productId}-${idx}`} className="mb-6">
                <div className="flex items-center gap-4">
                  <img
                    src={item.imgUrl || "/default-avatar.png"}
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


              </div>
            ))}
          </div>

          {/* Bên phải */}
          <div className="flex flex-col items-end gap-3 mt-6 md:mt-0 min-w-[200px]">
            <span className="font-bold text-lg">{order.total}</span>
            <span className="bg-black text-white px-4 py-1 rounded text-sm">
              {getShippingStatus(order.statusHistory)}
            </span>

            <div className="flex gap-4 flex-wrap justify-end">
              {getShippingStatus(order.statusHistory) === "Đã giao hàng" ? (
                <>
                  {order.items.map((item) => (
                    <button
                      key={item.productId}
                      onClick={() => onReview(item.productId, order._id)}
                      className="bg-blue-500 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-600"
                    >
                      Đánh giá {item.name}
                    </button>
                  ))}
                </>
              ) : (
                <button
                  onClick={() => navigate(`/order/${order._id}`)}
                  className="bg-gray-100 px-4 py-2 rounded text-sm font-medium hover:bg-gray-200"
                >
                  Xem chi tiết
                </button>
              )}

              {order.items[0]?.productId && (
                <button
                  onClick={() =>
                    navigate(`/products/${order.items[0].productId}`)
                  }
                  className="bg-gray-100 px-4 py-2 rounded text-sm font-medium hover:bg-gray-200"
                >
                  Mua lại
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProfileOrders;
