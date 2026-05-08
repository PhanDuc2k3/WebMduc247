import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Package, Star, Eye, ShoppingBag, Calendar, CheckCircle, RotateCcw, XCircle } from "lucide-react";
import ConfirmDialog from "../../ui/ConfirmDialog";
import reviewApi from "../../../api/apiReview";
import orderApi from "../../../api/orderApi";
import { toast } from "react-toastify";

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

interface ReturnRequest {
  requestedAt?: string | Date;
  reason?: string;
  status?: string;
  processedAt?: string | Date;
}

interface Order {
  _id: string;
  date: string;
  statusHistory: StatusHistory[];
  total: string;
  items: OrderItem[];
  returnRequest?: ReturnRequest;
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

  // State cho modal trả lại hàng
  const [showReturnModal, setShowReturnModal] = useState<string | null>(null);
  const [returnReason, setReturnReason] = useState("");
  const [processingReturn, setProcessingReturn] = useState<string | null>(null);
  
  // State cho confirm dialogs
  const [cancelConfirm, setCancelConfirm] = useState<{ open: boolean; orderId: string | null }>({ open: false, orderId: null });
  const [receiveConfirm, setReceiveConfirm] = useState<{ open: boolean; orderId: string | null }>({ open: false, orderId: null });

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
      received: "Đã nhận hàng",
      cancelled: "Đã hủy đơn",
      return_requested: "Đã yêu cầu trả lại",
      returned: "Đã trả lại",
    };
    return map[latest] || latest;
  };

  // Kiểm tra xem có thể yêu cầu trả lại không
  const canRequestReturn = (order: Order) => {
    const currentStatus = order.statusHistory && order.statusHistory.length > 0
      ? order.statusHistory[order.statusHistory.length - 1]?.status
      : null;

    // Chỉ cho phép khi đã nhận hàng và chưa có yêu cầu trả lại
    if (currentStatus !== "received") return false;
    if (order.returnRequest && order.returnRequest.status) return false;

    // Kiểm tra trong vòng 3 ngày
    const receivedStatus = order.statusHistory.find(s => s.status === "received");
    if (!receivedStatus) return false;

    const receivedDate = new Date(receivedStatus.timestamp);
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - receivedDate.getTime()) / (1000 * 60 * 60 * 24));

    return daysDiff <= 3;
  };

  // Kiểm tra xem có thể hủy đơn không
  const canCancelOrder = (order: Order) => {
    const currentStatus = order.statusHistory && order.statusHistory.length > 0
      ? order.statusHistory[order.statusHistory.length - 1]?.status
      : null;
    
    // Chỉ cho phép hủy khi status là pending, confirmed, packed
    return ["pending", "confirmed", "packed"].includes(currentStatus || "");
  };

  // Xử lý hủy đơn hàng
  const handleCancelOrderClick = (orderId: string) => {
    setCancelConfirm({ open: true, orderId });
  };

  const handleCancelOrder = async () => {
    if (!cancelConfirm.orderId) return;
    const orderId = cancelConfirm.orderId;
    setCancelConfirm({ open: false, orderId: null });

    try {
      await orderApi.cancelOrder(orderId, "Khách hàng yêu cầu hủy đơn hàng");
      toast.success(
        <div className="flex items-center gap-2">
          <CheckCircle className="text-green-500" size={18} />
          <span>Đơn hàng đã được hủy thành công!</span>
        </div>
      );
      window.location.reload(); // Reload để cập nhật trạng thái
    } catch (err: any) {
      console.error("Lỗi hủy đơn hàng:", err);
      const errorMessage = err.response?.data?.message 
        || err.message 
        || "Lỗi khi hủy đơn hàng!";
      toast.error(
        <div className="flex items-center gap-2">
          <CheckCircle className="text-red-500" size={18} />
          <span>{errorMessage}</span>
        </div>
      );
    }
  };

  // Xử lý yêu cầu trả lại hàng
  const handleRequestReturn = async (orderId: string) => {
    const trimmedReason = returnReason.trim();
    
    if (!trimmedReason) {
      toast.error("Vui lòng nhập lý do trả lại hàng", {
        containerId: "general-toast",
      });
      return;
    }

    if (trimmedReason.length < 10) {
      toast.error("Lý do trả lại hàng phải có ít nhất 10 ký tự", {
        containerId: "general-toast",
      });
      return;
    }

    if (trimmedReason.length > 500) {
      toast.error("Lý do trả lại hàng không được vượt quá 500 ký tự", {
        containerId: "general-toast",
      });
      return;
    }

    setProcessingReturn(orderId);
    try {
      await orderApi.requestReturn(orderId, trimmedReason);
      toast.success(
        <div className="flex items-center gap-2">
          <CheckCircle className="text-green-500" size={18} />
          <span>Yêu cầu trả lại hàng đã được gửi thành công!</span>
        </div>,
        {
          containerId: "general-toast",
        }
      );
      setShowReturnModal(null);
      setReturnReason("");
      window.location.reload(); // Reload để cập nhật trạng thái
    } catch (err: any) {
      console.error("Lỗi yêu cầu trả lại hàng:", err);
      const errorMessage = err.response?.data?.message 
        || err.message 
        || "Lỗi khi yêu cầu trả lại hàng!";
      toast.error(
        <div className="flex items-center gap-2">
          <XCircle className="text-red-500" size={18} />
          <span>{errorMessage}</span>
        </div>,
        {
          containerId: "general-toast",
        }
      );
    } finally {
      setProcessingReturn(null);
    }
  };

  // LOG logic hiển thị
  if (loading) {
    return (
      <div className="p-6 md:p-8 text-center animate-fade-in">
        <Package size={40} className="mx-auto mb-3 md:mb-4 animate-pulse text-[#4B5563]" />
        <p className="text-gray-600 text-sm md:text-base lg:text-lg font-medium">Đang tải đơn hàng...</p>
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="bg-white rounded-xl md:rounded-2xl shadow-lg border-2 border-gray-200 p-6 md:p-8 lg:p-12 text-center animate-fade-in">
        <Package size={48} className="mx-auto mb-3 md:mb-4 text-[#4B5563]" />
        <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 mb-2">Chưa có đơn hàng nào</h3>
        <p className="text-gray-500 text-sm md:text-base mb-4 md:mb-6">Bắt đầu mua sắm ngay hôm nay!</p>
        <button
          onClick={() => navigate("/products")}
          className="px-6 md:px-8 py-2.5 md:py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg md:rounded-xl font-bold text-xs sm:text-sm md:text-base hover:from-blue-600 hover:to-purple-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center gap-2 mx-auto"
        >
          <ShoppingBag size={16} className="md:w-[18px] md:h-[18px]" /> Mua sắm ngay
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="bg-white rounded-xl md:rounded-2xl shadow-lg border-2 border-gray-200 p-4 md:p-6 lg:p-8 animate-fade-in-up">
        <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-[#4B5563] flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
          <Package size={20} className="text-[#4B5563]" /> Lịch sử đơn hàng
        </h3>

        {orders.map((order, index) => (
          <div
            key={order._id || index}
            className="border-2 border-gray-200 rounded-lg md:rounded-xl p-4 md:p-6 mb-4 md:mb-6 bg-gradient-to-br from-white to-gray-50 hover:shadow-lg transition-all duration-300 animate-fade-in-up last:mb-0"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="flex flex-col md:flex-row justify-between gap-4 md:gap-6">
              {/* Bên trái */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 md:gap-3 mb-3 md:mb-4">
                  <span className="text-sm sm:text-base md:text-lg font-bold text-gray-900 truncate">
                    Đơn hàng #{order._id.slice(-8).toUpperCase()}
                  </span>
                  <span className="text-xs md:text-sm text-gray-500 bg-gray-100 px-2 md:px-3 py-1 rounded-full flex items-center gap-1.5 md:gap-2 flex-shrink-0">
                    <Calendar size={12} className="md:w-3.5 md:h-3.5" /> {order.date}
                  </span>
                </div>

                {/* Danh sách sản phẩm */}
                <div className="space-y-2 md:space-y-4">
                  {order.items.map((item, idx) => (
                    <div key={`${item.productId}-${idx}`} className="flex items-center gap-2 md:gap-4 p-3 md:p-4 bg-white rounded-lg md:rounded-xl border border-gray-200 hover:border-[#4B5563] transition-all duration-300">
                      <div className="relative flex-shrink-0">
                        <img
                          src={item.imgUrl || "/default-avatar.png"}
                          alt={item.name}
                          className="w-16 h-16 md:w-20 md:h-20 rounded-lg md:rounded-xl object-cover border-2 border-gray-200"
                          loading="lazy"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs sm:text-sm md:text-base font-bold text-gray-900 mb-1 line-clamp-2">{item.name}</div>
                        <div className="text-[10px] sm:text-xs md:text-sm text-gray-600">
                          Số lượng: <span className="font-bold text-[#4B5563]">{item.qty}</span> x <span className="font-bold">{item.price}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bên phải */}
              <div className="flex flex-col sm:flex-row md:flex-col items-start sm:items-end md:items-end gap-3 md:gap-4 sm:min-w-[200px] md:min-w-[250px]">
                <div className="text-xl sm:text-2xl font-extrabold text-[#4B5563] mb-1 md:mb-2">
                  {order.total}
                </div>
                <span className="px-3 md:px-4 py-1.5 md:py-2 bg-[#4B5563]/10 text-[#4B5563] rounded-full text-xs md:text-sm font-bold border-2 border-[#4B5563]/40 whitespace-nowrap">
                  ✓ {getShippingStatus(order.statusHistory)}
                </span>

                <div className="flex flex-col gap-2 w-full sm:w-auto md:w-full">
                  {getShippingStatus(order.statusHistory) === "Đã nhận hàng" ? (
                    <>
                      {order.items.map((item) => (
                        <button
                          key={item.productId}
                          onClick={() => onReview(item.productId, order._id)}
                          className="w-full px-3 md:px-4 py-1.5 md:py-2 bg-[#4B5563] text-white rounded-lg md:rounded-xl text-xs md:text-sm font-bold hover:bg-[#374151] transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-1.5 md:gap-2"
                        >
                          <Star size={14} className="md:w-4 md:h-4" /> Đánh giá
                        </button>
                      ))}
                      {canRequestReturn(order) && (
                        <button
                          onClick={() => setShowReturnModal(order._id)}
                          className="w-full px-3 md:px-4 py-1.5 md:py-2 bg-[#4B5563] text-white rounded-lg md:rounded-xl text-xs md:text-sm font-bold hover:bg-[#374151] transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-1.5 md:gap-2"
                        >
                          <RotateCcw size={14} className="md:w-4 md:h-4" /> Yêu cầu trả lại hàng
                        </button>
                      )}
                      {order.returnRequest && order.returnRequest.status && (
                        <div className="w-full px-3 md:px-4 py-1.5 md:py-2 bg-gray-100 border-2 border-gray-300 rounded-lg md:rounded-xl text-xs md:text-sm font-semibold text-gray-700 text-center">
                          {order.returnRequest.status === "pending" && "⏳ Đang chờ xử lý"}
                          {order.returnRequest.status === "approved" && "✅ Đã được phê duyệt"}
                          {order.returnRequest.status === "rejected" && "❌ Đã bị từ chối"}
                          {order.returnRequest.status === "completed" && "✅ Đã hoàn tất"}
                        </div>
                      )}
                    </>
                  ) : getShippingStatus(order.statusHistory) === "Đã giao hàng" ? (
                    <button
                      onClick={() => setReceiveConfirm({ open: true, orderId: order._id })}
                      className="w-full px-3 md:px-4 py-1.5 md:py-2 bg-[#4B5563] text-white rounded-lg md:rounded-xl text-xs md:text-sm font-bold hover:bg-[#374151] transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-1.5 md:gap-2"
                    >
                      <CheckCircle size={14} className="md:w-4 md:h-4" /> Đã nhận hàng
                    </button>
                  ) : canCancelOrder(order) ? (
                    <>
                      <button
                        onClick={() => handleCancelOrderClick(order._id)}
                        className="w-full px-3 md:px-4 py-1.5 md:py-2 bg-[#4B5563] text-white rounded-lg md:rounded-xl text-xs md:text-sm font-bold hover:bg-[#374151] transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-1.5 md:gap-2"
                      >
                        <XCircle size={14} className="md:w-4 md:h-4" /> Hủy đơn hàng
                      </button>
                      <button
                        onClick={() => navigate(`/order/${order._id}`)}
                        className="w-full px-3 md:px-4 py-1.5 md:py-2 border-2 border-gray-300 text-gray-700 rounded-lg md:rounded-xl text-xs md:text-sm font-bold hover:bg-gray-50 hover:border-gray-400 transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-1.5 md:gap-2"
                      >
                        <Eye size={14} className="md:w-4 md:h-4" /> Xem chi tiết
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => navigate(`/order/${order._id}`)}
                      className="w-full px-3 md:px-4 py-1.5 md:py-2 border-2 border-gray-300 text-gray-700 rounded-lg md:rounded-xl text-xs md:text-sm font-bold hover:bg-gray-50 hover:border-gray-400 transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-1.5 md:gap-2"
                    >
                      <Eye size={14} className="md:w-4 md:h-4" /> Xem chi tiết
                    </button>
                  )}

                  {order.items[0]?.productId && (
                    <button
                      onClick={() =>
                        navigate(`/products/${order.items[0].productId}`)
                      }
                      className="w-full px-3 md:px-4 py-1.5 md:py-2 bg-white border-2 border-[#4B5563]/60 text-[#4B5563] rounded-lg md:rounded-xl text-xs md:text-sm font-bold hover:bg-[#4B5563]/5 transition-all duration-300 transform hover:scale-105"
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

      {/* Modal yêu cầu trả lại hàng */}
      {showReturnModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-md w-full p-6 animate-fade-in-up">
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">
              Yêu cầu trả lại hàng
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Lý do trả lại hàng <span className="text-red-500">*</span>
              </label>
              <textarea
                value={returnReason}
                onChange={(e) => setReturnReason(e.target.value)}
                placeholder="Vui lòng nhập lý do trả lại hàng (ví dụ: Sản phẩm không đúng mô tả, bị lỗi, không vừa, v.v.)"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-orange-500 resize-none"
                rows={4}
                maxLength={500}
              />
              <div className="mt-1 flex justify-between items-center">
                <p className="text-xs text-gray-500">
                  {returnReason.length < 10 ? (
                    <span className="text-orange-600">Cần ít nhất 10 ký tự (còn {10 - returnReason.length} ký tự)</span>
                  ) : (
                    <span className="text-gray-500">Độ dài hợp lệ</span>
                  )}
                </p>
                <p className="text-xs text-gray-500">
                  {returnReason.length}/500 ký tự
                </p>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                ⚠️ Bạn chỉ có thể yêu cầu trả lại hàng trong vòng 3 ngày kể từ ngày nhận hàng
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowReturnModal(null);
                  setReturnReason("");
                }}
                disabled={processingReturn === showReturnModal}
                className="flex-1 px-4 py-2.5 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                onClick={() => handleRequestReturn(showReturnModal)}
                disabled={processingReturn === showReturnModal || !returnReason.trim() || returnReason.trim().length < 10}
                className={`flex-1 px-4 py-2.5 text-white font-semibold rounded-lg transition-all ${
                  processingReturn === showReturnModal || !returnReason.trim() || returnReason.trim().length < 10
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                }`}
              >
                {processingReturn === showReturnModal ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Đang gửi...
                  </span>
                ) : (
                  "Gửi yêu cầu"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog - Hủy đơn hàng */}
      <ConfirmDialog
        open={cancelConfirm.open}
        onClose={() => setCancelConfirm({ open: false, orderId: null })}
        onConfirm={handleCancelOrder}
        title="Xác nhận hủy đơn hàng"
        message="Bạn có chắc chắn muốn hủy đơn hàng này? Hành động này không thể hoàn tác."
        type="danger"
        confirmText="Hủy đơn hàng"
      />

      {/* Confirm Dialog - Xác nhận nhận hàng */}
      <ConfirmDialog
        open={receiveConfirm.open}
        onClose={() => setReceiveConfirm({ open: false, orderId: null })}
        onConfirm={async () => {
          if (!receiveConfirm.orderId) return;
          const orderId = receiveConfirm.orderId;
          setReceiveConfirm({ open: false, orderId: null });
          try {
            const response = await orderApi.confirmDelivery(orderId);
            toast.success("Xác nhận nhận hàng thành công!");
            window.location.reload();
          } catch (err: any) {
            console.error("Lỗi xác nhận nhận hàng:", err);
            const errorMessage = err.response?.data?.message 
              || err.message 
              || "Lỗi khi xác nhận nhận hàng!";
            toast.error(`Lỗi: ${errorMessage}`);
          }
        }}
        title="Xác nhận nhận hàng"
        message="Bạn đã nhận được hàng? Xác nhận sẽ chuyển đơn hàng sang trạng thái 'Đã nhận hàng' và bạn có thể đánh giá sản phẩm."
        type="info"
        confirmText="Xác nhận"
      />
    </div>
  );
};

export default ProfileOrders;
