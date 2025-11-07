import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import messageApi from "../../../api/messageApi";
import axiosClient from "../../../api/axiosClient";

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  subtotal: number;
}

interface Order {
  _id: string;
  orderCode: string;
  items: OrderItem[];
  subtotal: number;
  shippingFee: number;
  discount: number;
  total: number;
  paymentInfo: {
    method: string;
    status: string;
  };
  statusHistory: Array<{
    status: string;
    note?: string;
    timestamp: string;
  }>;
}

interface ShippingInfoProps {
  orderCode: string;
  shippingAddress: {
    fullName: string;
    phone: string;
    address: string;
    email?: string;
  };
  shippingInfo: {
    method: string;
    estimatedDelivery?: number | { $date?: { $numberLong?: string } };
    trackingNumber?: string;
  };
  ownerId?: string; // ID của chủ cửa hàng
  order?: Order; // Thông tin order để chia sẻ
  storeName?: string; // Tên cửa hàng
}

export default function ShippingInfo({
  orderCode,
  shippingAddress,
  shippingInfo,
  ownerId,
  order,
  storeName,
}: ShippingInfoProps) {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const navigate = useNavigate();

  // Convert estimatedDelivery nếu là object, nếu không có thì fallback thành now
  let estimatedDeliveryTime = Date.now();

  if (shippingInfo.estimatedDelivery) {
    if (typeof shippingInfo.estimatedDelivery === "number") {
      estimatedDeliveryTime = shippingInfo.estimatedDelivery;
    } else if (shippingInfo.estimatedDelivery.$date?.$numberLong) {
      estimatedDeliveryTime = parseInt(shippingInfo.estimatedDelivery.$date.$numberLong);
    }
  }

  const deliveryDate = new Date(estimatedDeliveryTime);

  // Format thông tin order thành message text
  const formatOrderMessage = (order: Order): string => {
    if (!order) return "";

    const currentStatus = order.statusHistory[order.statusHistory.length - 1];
    const statusMap: Record<string, string> = {
      pending: "Đã đặt hàng",
      confirmed: "Đã xác nhận",
      packed: "Đã đóng gói",
      shipped: "Đang vận chuyển",
      delivered: "Đã giao hàng",
      received: "Đã nhận hàng",
      cancelled: "Đã hủy",
    };

    let message = `📦 Thông tin đơn hàng #${order.orderCode}\n\n`;
    message += `🛍️ Sản phẩm:\n`;
    order.items.forEach((item, index) => {
      message += `${index + 1}. ${item.name} x${item.quantity} - ${item.subtotal.toLocaleString("vi-VN")}₫\n`;
    });
    message += `\n💰 Chi tiết thanh toán:\n`;
    message += `- Tạm tính: ${order.subtotal.toLocaleString("vi-VN")}₫\n`;
    message += `- Phí vận chuyển: ${order.shippingFee.toLocaleString("vi-VN")}₫\n`;
    if (order.discount > 0) {
      message += `- Giảm giá: -${order.discount.toLocaleString("vi-VN")}₫\n`;
    }
    message += `- Tổng tiền: ${order.total.toLocaleString("vi-VN")}₫\n`;
    message += `\n💳 Phương thức thanh toán: ${order.paymentInfo.method}\n`;
    message += `📊 Trạng thái: ${statusMap[currentStatus.status] || currentStatus.status}\n`;
    message += `\n📍 Địa chỉ giao hàng:\n`;
    message += `${shippingAddress.fullName}\n`;
    message += `${shippingAddress.phone}\n`;
    message += `${shippingAddress.address}`;
    message += `\n\n🔗 Xem chi tiết đơn hàng: ${window.location.origin}/order/${order._id}`;

    return message;
  };

  const handleShareOrder = async () => {
    if (!ownerId || !order) {
      alert("Không tìm thấy thông tin chủ cửa hàng hoặc đơn hàng");
      return;
    }

    try {
      // Lấy user hiện tại
      const storedUser = localStorage.getItem("user");
      if (!storedUser) {
        alert("Vui lòng đăng nhập để chia sẻ đơn hàng");
        return;
      }

      const currentUser = JSON.parse(storedUser);
      const senderId = currentUser._id || currentUser.id;

      if (!senderId) {
        alert("Không tìm thấy ID người dùng");
        return;
      }

      setIsSharing(true);

      // Tạo hoặc lấy conversation
      const convRes = await messageApi.getOrCreateConversation({
        senderId,
        receiverId: ownerId,
      });

      const conversation = convRes.data;
      const conversationId = conversation._id || conversation;

      // Format message với thông tin order
      const orderMessage = formatOrderMessage(order);

      // Gửi message - backend yêu cầu field là "sender" không phải "senderId"
      await axiosClient.post("/api/messages/send", {
        conversationId,
        sender: senderId,
        text: orderMessage,
      });

      // Lấy thông tin conversation và messages để navigate
      const msgRes = await axiosClient.get(`/api/messages/${conversationId}`);
      const initialMessages = msgRes.data || [];

      // Đóng modal
      setShowConfirmModal(false);

      // Navigate đến trang message
      navigate(`/messages/${conversationId}`, {
        state: {
          chatUser: {
            _id: ownerId,
            name: storeName || "Cửa hàng",
            avatar: "/default-avatar.png",
          },
          initialMessages,
          fromOrderShare: true,
        },
      });
    } catch (error: any) {
      console.error("Lỗi khi chia sẻ đơn hàng:", error);
      alert(error.response?.data?.message || "Lỗi khi chia sẻ đơn hàng. Vui lòng thử lại!");
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <>
      <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 overflow-hidden animate-fade-in-up">
        <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-6 border-b-2 border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <span>🚚</span> Thông tin vận chuyển
          </h2>
          <p className="text-gray-600 text-sm mt-1">Chi tiết địa chỉ và vận đơn</p>
        </div>
        <div className="p-6 space-y-4">
          <div className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl">
            <p className="font-bold text-gray-900 mb-2 flex items-center gap-2">
              <span>📍</span> Địa chỉ giao hàng
            </p>
            <p className="text-gray-700 mb-2">{shippingAddress.address}</p>
            <p className="text-gray-700">📞 {shippingAddress.phone}</p>
            <p className="text-gray-700">👤 {shippingAddress.fullName}</p>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
              <span className="font-semibold flex items-center gap-2">
                <span>🏢</span> Đơn vị vận chuyển
              </span>
              <span className="font-bold text-gray-900">{shippingInfo.method}</span>
            </div>

            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
              <span className="font-semibold flex items-center gap-2">
                <span>📋</span> Mã vận đơn
              </span>
              <span className="font-bold text-blue-600">
                {shippingInfo.trackingNumber || orderCode}
              </span>
            </div>

            <div className="flex justify-between items-center p-3 bg-gradient-to-r from-orange-50 to-yellow-50 border-2 border-orange-200 rounded-xl">
              <span className="font-semibold flex items-center gap-2">
                <span>⏰</span> Dự kiến giao
              </span>
              <span className="font-bold text-orange-700">
                {deliveryDate.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })}
              </span>
            </div>
          </div>

          {ownerId && order && (
            <button
              onClick={() => setShowConfirmModal(true)}
              className="w-full py-3 px-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 mt-4"
            >
              <span className="flex items-center justify-center gap-2">
                <span>📤</span> Chia sẻ đơn hàng
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Modal xác nhận chia sẻ */}
      {showConfirmModal && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
          onClick={() => !isSharing && setShowConfirmModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl border-2 border-gray-200 p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span>📤</span> Chia sẻ đơn hàng
            </h3>
            <p className="text-gray-700 mb-6">
              Bạn muốn chia sẻ đơn hàng này cho chủ cửa hàng{" "}
              <span className="font-bold">{storeName || "cửa hàng"}</span>? Thông tin đơn hàng sẽ
              được gửi qua tin nhắn.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmModal(false)}
                disabled={isSharing}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-xl hover:bg-gray-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Hủy
              </button>
              <button
                onClick={handleShareOrder}
                disabled={isSharing}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSharing ? (
                  <>
                    <span className="animate-spin">⏳</span> Đang chia sẻ...
                  </>
                ) : (
                  <>
                    <span>✓</span> Đồng ý
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
