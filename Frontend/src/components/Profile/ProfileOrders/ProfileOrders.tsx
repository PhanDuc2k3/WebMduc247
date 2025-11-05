import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Package, Star, Eye, ShoppingBag, Calendar, CheckCircle } from "lucide-react";
import reviewApi from "../../../api/apiReview";
import orderApi from "../../../api/orderApi";

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

  // LOG debug props nhận được (chỉ trong dev mode)
  if (import.meta.env.DEV) {
    console.group("[ProfileOrders] Render Component");
    console.log("Props.orders:", orders);
    console.log("Props.loading:", loading);
    console.log("Số lượng orders:", orders?.length || 0);
    console.groupEnd();
  }

  // state chứa reviews theo productId
  const [reviews, setReviews] = useState<Record<string, Review[]>>({});
  
  // Track các productId đã fetch để tránh fetch trùng lặp
  const fetchedProductIdsRef = useRef<Set<string>>(new Set());

  // fetch reviews theo productId
  const fetchReviews = async (productId: string) => {
    if (!productId || fetchedProductIdsRef.current.has(productId)) return;
    
    // Đánh dấu đã fetch
    fetchedProductIdsRef.current.add(productId);
    
    try {
      if (import.meta.env.DEV) {
        console.log("Gọi API review cho productId:", productId);
      }
      const res = await reviewApi.getReviewsByProduct(productId);
      if (import.meta.env.DEV) {
        console.log("Review data:", res.data);
      }
      setReviews((prev) => ({ ...prev, [productId]: res.data }));
    } catch (err: any) {
      // Chỉ log lỗi thực sự, không log 404 hoặc lỗi không quan trọng
      if (err.response?.status !== 404) {
        console.error("Lỗi fetch reviews:", err);
      }
      // Nếu lỗi, remove khỏi set để có thể retry sau
      fetchedProductIdsRef.current.delete(productId);
    }
  };

  // khi có orders thì fetch review cho từng product
  useEffect(() => {
    // Chỉ xử lý khi không đang loading và có orders
    if (loading || !orders || orders.length === 0) {
      return;
    }

    if (import.meta.env.DEV) {
      console.log("useEffect chạy — orders thay đổi:", orders);
    }

    // Collect unique product IDs để tránh fetch trùng lặp
    const productIds = new Set<string>();
    
    orders.forEach((order) => {
      if (order.items && order.items.length > 0) {
        order.items.forEach((item) => {
          if (item.productId) {
            productIds.add(item.productId);
          }
        });
      }
    });

    // Fetch reviews cho các product chưa fetch
    productIds.forEach((productId) => {
      fetchReviews(productId);
    });
  }, [orders, loading]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // LOG logic hiển thị
  if (loading) {
    return (
      <div className="p-8 text-center animate-fade-in">
        <Package size={48} className="mx-auto mb-4 animate-pulse text-gray-400" />
        <p className="text-gray-600 text-lg font-medium">Đang tải đơn hàng...</p>
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 p-12 text-center animate-fade-in">
        <Package size={64} className="mx-auto mb-4 text-gray-300" />
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Chưa có đơn hàng nào</h3>
        <p className="text-gray-500 mb-6">Bắt đầu mua sắm ngay hôm nay!</p>
        <button
          onClick={() => navigate("/products")}
          className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-bold hover:from-blue-600 hover:to-purple-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center gap-2 mx-auto"
        >
          <ShoppingBag size={18} /> Mua sắm ngay
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-200 p-6 lg:p-8 animate-fade-in-up">
        <h3 className="text-2xl font-bold text-gray-900 gradient-text flex items-center gap-3 mb-6">
          <span>📦</span> Lịch sử đơn hàng
        </h3>

        {orders.map((order, index) => (
          <div
            key={order._id || index}
            className="border-2 border-gray-200 rounded-xl p-6 mb-6 bg-gradient-to-br from-white to-gray-50 hover:shadow-lg transition-all duration-300 animate-fade-in-up last:mb-0"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="flex flex-col md:flex-row justify-between gap-6">
              {/* Bên trái */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-lg font-bold text-gray-900">
                    Đơn hàng #{order._id.slice(-8).toUpperCase()}
                  </span>
                  <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full flex items-center gap-2">
                    <Calendar size={14} /> {order.date}
                  </span>
                </div>

                {/* Danh sách sản phẩm */}
                <div className="space-y-4">
                  {order.items.map((item, idx) => (
                    <div key={`${item.productId}-${idx}`} className="flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200 hover:border-blue-300 transition-all duration-300">
                      <div className="relative">
                        <img
                          src={item.imgUrl || "/default-avatar.png"}
                          alt={item.name}
                          className="w-20 h-20 rounded-xl object-cover border-2 border-gray-200"
                          loading="lazy"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="text-base font-bold text-gray-900 mb-1 line-clamp-2">{item.name}</div>
                        <div className="text-sm text-gray-600">
                          Số lượng: <span className="font-bold text-blue-600">{item.qty}</span> x <span className="font-bold">{item.price}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bên phải */}
              <div className="flex flex-col items-end gap-4 min-w-[250px]">
                <div className="text-2xl font-extrabold text-blue-600 mb-2">
                  {order.total}
                </div>
                <span className="px-4 py-2 bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 rounded-full text-sm font-bold border-2 border-green-300">
                  ✓ {getShippingStatus(order.statusHistory)}
                </span>

                <div className="flex flex-col gap-2 w-full">
                  {getShippingStatus(order.statusHistory) === "Đã giao hàng" ? (
                    <>
                      {order.items.map((item) => (
                        <button
                          key={item.productId}
                          onClick={() => onReview(item.productId, order._id)}
                          className="w-full px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl text-sm font-bold hover:from-blue-600 hover:to-purple-600 transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2"
                        >
                          <Star size={16} /> Đánh giá
                        </button>
                      ))}
                    </>
                  ) : getShippingStatus(order.statusHistory) === "Đang giao hàng" ? (
                    <button
                      onClick={async () => {
                        if (window.confirm("Bạn đã nhận được hàng? Xác nhận sẽ chuyển đơn hàng sang trạng thái 'Đã giao hàng'.")) {
                          try {
                            await orderApi.confirmDelivery(order._id);
                            alert("Xác nhận nhận hàng thành công!");
                            window.location.reload();
                          } catch (err: any) {
                            console.error("Lỗi xác nhận nhận hàng:", err);
                            alert(err.response?.data?.message || "Lỗi khi xác nhận nhận hàng!");
                          }
                        }
                      }}
                      className="w-full px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl text-sm font-bold hover:from-green-600 hover:to-emerald-700 transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2"
                    >
                      <CheckCircle size={16} /> Đã nhận hàng
                    </button>
                  ) : (
                    <button
                      onClick={() => navigate(`/order/${order._id}`)}
                      className="w-full px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-50 hover:border-gray-400 transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-2"
                    >
                      <Eye size={16} /> Xem chi tiết
                    </button>
                  )}

                  {order.items[0]?.productId && (
                    <button
                      onClick={() =>
                        navigate(`/products/${order.items[0].productId}`)
                      }
                      className="w-full px-4 py-2 bg-white border-2 border-blue-300 text-blue-600 rounded-xl text-sm font-bold hover:bg-blue-50 transition-all duration-300 transform hover:scale-105"
                    >
                      🛒 Mua lại
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProfileOrders;
