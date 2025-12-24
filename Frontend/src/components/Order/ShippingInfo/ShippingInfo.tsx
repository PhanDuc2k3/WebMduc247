import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Truck, MapPin, Phone, User, Building2, FileText, Clock, Share2, Loader2, AlertTriangle, XCircle } from "lucide-react";
import messageApi from "../../../api/messageApi";
import axiosClient from "../../../api/axiosClient";
import { toast } from "react-toastify";

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

    let message = `Thông tin đơn hàng #${order.orderCode}\n\n`;
    message += `Sản phẩm:\n`;
    order.items.forEach((item, index) => {
      message += `${index + 1}. ${item.name} x${item.quantity} - ${item.subtotal.toLocaleString("vi-VN")}₫\n`;
    });
    message += `\nChi tiết thanh toán:\n`;
    message += `- Tạm tính: ${order.subtotal.toLocaleString("vi-VN")}₫\n`;
    message += `- Phí vận chuyển: ${order.shippingFee.toLocaleString("vi-VN")}₫\n`;
    if (order.discount > 0) {
      message += `- Giảm giá: -${order.discount.toLocaleString("vi-VN")}₫\n`;
    }
    message += `- Tổng tiền: ${order.total.toLocaleString("vi-VN")}₫\n`;
    message += `\nPhương thức thanh toán: ${order.paymentInfo.method}\n`;
    message += `Trạng thái: ${statusMap[currentStatus.status] || currentStatus.status}\n`;
    message += `\nĐịa chỉ giao hàng:\n`;
    message += `${shippingAddress.fullName}\n`;
    message += `${shippingAddress.phone}\n`;
    message += `${shippingAddress.address}`;
    message += `\n\nXem chi tiết đơn hàng: ${window.location.origin}/order/${order._id}`;

    return message;
  };

  const handleShareOrder = async () => {
    if (!ownerId || !order) {
      toast.warning(
        <div className="flex items-center gap-2">
          <AlertTriangle className="text-yellow-500" size={18} />
          <span>Không tìm thấy thông tin chủ cửa hàng hoặc đơn hàng</span>
        </div>
      );
      return;
    }

    try {
      // Lấy user hiện tại
      const storedUser = localStorage.getItem("user");
      if (!storedUser) {
        toast.warning(
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-yellow-500" size={18} />
            <span>Vui lòng đăng nhập để chia sẻ đơn hàng</span>
          </div>
        );
        return;
      }

      const currentUser = JSON.parse(storedUser);
      const senderId = currentUser._id || currentUser.id;

      if (!senderId) {
        toast.error(
          <div className="flex items-center gap-2">
            <XCircle className="text-red-500" size={18} />
            <span>Không tìm thấy ID người dùng</span>
          </div>
        );
        return;
      }

      setIsSharing(true);

      // Lấy thông tin chủ cửa hàng (owner)
      let ownerName = storeName || "Cửa hàng";
      let ownerAvatar = "/default-avatar.png";
      
      try {
        const ownerRes = await axiosClient.get(`/api/users/${ownerId}`);
        if (ownerRes.data?.user) {
          ownerName = ownerRes.data.user.fullName || ownerRes.data.user.name || ownerName;
          ownerAvatar = ownerRes.data.user.avatarUrl || ownerAvatar;
        }
      } catch (err) {
        console.warn("Không thể lấy thông tin chủ cửa hàng, sử dụng tên mặc định");
      }

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

      // Navigate đến trang message (room chat) với tên chủ cửa hàng
      navigate(`/messages/${conversationId}`, {
        state: {
          chatUser: {
            _id: ownerId,
            name: ownerName,
            avatar: ownerAvatar,
          },
          initialMessages,
          fromOrderShare: true,
        },
      });
    } catch (error: any) {
      console.error("Lỗi khi chia sẻ đơn hàng:", error);
      toast.error(
        <div className="flex items-center gap-2">
          <XCircle className="text-red-500" size={18} />
          <span>{error.response?.data?.message || "Lỗi khi chia sẻ đơn hàng. Vui lòng thử lại!"}</span>
        </div>
      );
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <>
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border-2 border-gray-100 overflow-hidden animate-fade-in-up">
        <div className="bg-[#2F5FEB]/5 p-4 sm:p-6 border-b-2 border-gray-200">
          <h2 className="text-xl sm:text-2xl font-bold text-[#2F5FEB] flex items-center gap-2 sm:gap-3">
            <Truck className="w-5 h-5 sm:w-6 sm:h-6" />
            Thông tin vận chuyển
          </h2>
          <p className="text-gray-600 text-xs sm:text-sm mt-1">Chi tiết địa chỉ và vận đơn</p>
        </div>
        <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
          <div className="p-3 sm:p-4 bg-[#2F5FEB]/5 border-2 border-[#2F5FEB]/40 rounded-lg sm:rounded-xl">
            <p className="font-bold text-gray-900 mb-2 flex items-center gap-2 text-sm sm:text-base">
              <MapPin className="w-4 h-4 sm:w-5 sm:h-5" />
              Địa chỉ giao hàng
            </p>
            <p className="text-gray-700 mb-2 text-xs sm:text-sm break-words">{shippingAddress.address}</p>
            <p className="text-gray-700 text-xs sm:text-sm break-words flex items-center gap-1">
              <Phone className="w-3 h-3 flex-shrink-0" />
              {shippingAddress.phone}
            </p>
            <p className="text-gray-700 text-xs sm:text-sm break-words flex items-center gap-1">
              <User className="w-3 h-3 flex-shrink-0" />
              {shippingAddress.fullName}
            </p>
          </div>

          <div className="space-y-2 sm:space-y-3">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg sm:rounded-xl gap-2">
              <span className="font-semibold flex items-center gap-2 text-xs sm:text-sm">
                <Building2 className="w-3 h-3 sm:w-4 sm:h-4" />
                Đơn vị vận chuyển
              </span>
              <span className="font-bold text-gray-900 text-xs sm:text-sm break-words">{shippingInfo.method}</span>
            </div>

            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg sm:rounded-xl gap-2">
              <span className="font-semibold flex items-center gap-2 text-xs sm:text-sm">
                <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
                Mã vận đơn
              </span>
              <span className="font-bold text-[#2F5FEB] text-xs sm:text-sm break-all">
                {shippingInfo.trackingNumber || orderCode}
              </span>
            </div>

            <div className="flex justify-between items-center p-3 bg-[#2F5FEB]/5 border-2 border-[#2F5FEB]/40 rounded-lg sm:rounded-xl gap-2">
              <span className="font-semibold flex items-center gap-2 text-xs sm:text-sm">
                <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                Dự kiến giao
              </span>
              <span className="font-bold text-orange-700 text-xs sm:text-sm break-words">
                {deliveryDate.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })}
              </span>
            </div>
          </div>

          {ownerId && order && (
            <button
              onClick={handleShareOrder}
              disabled={isSharing}
              className="w-full py-2.5 sm:py-3 px-4 bg-[#2F5FEB] text-white font-bold rounded-lg sm:rounded-xl hover:bg-[#244ACC] transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 mt-3 sm:mt-4 text-xs sm:text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSharing ? (
                <>
                  <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                  Đang chia sẻ...
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
                  Chia sẻ đơn hàng
                </>
              )}
            </button>
          )}
        </div>
      </div>

    </>
  );
}
