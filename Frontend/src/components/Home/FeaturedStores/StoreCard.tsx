import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Calendar, Circle, Store, MessageCircle, AlertTriangle, XCircle } from "lucide-react";
import axiosClient from "../../../api/axiosClient";
import type { StoreType } from "../../../types/store";
import FavoriteButton from "../../Favorite/FavoriteButton";
import { toast } from "react-toastify";

interface StoreCardProps extends Partial<StoreType> {
  storeId: string;
  ownerId?: string; // ID chủ cửa hàng
  isOnline?: boolean; // Real-time online status from socket
}

const StoreCard: React.FC<StoreCardProps> = ({
  storeId,
  ownerId,
  name,
  description,
  logoUrl,
  bannerUrl,
  createdAt,
  isActive,
  customCategory,
  isOnline = false,
}) => {
  const navigate = useNavigate();

  // Removed debug logs

  const handleChatNow = async () => {
    try {
      const stored = localStorage.getItem("user");
      if (!stored) {
        toast.warning(
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-yellow-500" size={18} />
            <span>Vui lòng đăng nhập để chat với cửa hàng</span>
          </div>
        );
        return;
      }

      const currentUser = JSON.parse(stored);
      const senderId = currentUser._id || currentUser.id;
      const receiverId = ownerId;

      if (!senderId || !receiverId) {
        toast.error(
          <div className="flex items-center gap-2">
            <XCircle className="text-red-500" size={18} />
            <span>Không tìm thấy ID người dùng hoặc chủ cửa hàng</span>
          </div>
        );
        return;
      }

      // ✅ Tạo hoặc lấy conversation
      const res = await axiosClient.post("/api/messages/conversation", {
        senderId,
        receiverId,
      });

      const conversation = res.data.conversation || res.data;

      // ✅ Xây chatUser (vì BE không trả thông tin người nhận)
      const chatUser = {
        _id: receiverId,
        name: name || "Cửa hàng",
        avatar: logoUrl || "/default-avatar.png",
      };

      // ✅ Lấy tin nhắn ban đầu
      const msgRes = await axiosClient.get(`/api/messages/${conversation._id}`);
      const initialMessages = msgRes.data || [];

      // ✅ Điều hướng đến trang chat + truyền dữ liệu
      navigate(`/messages/${conversation._id}`, {
        state: {
          chatUser,
          initialMessages,
          fromStoreCard: true,
        },
      });
    } catch (err) {
      console.error("Lỗi khi mở chat:", err);
      toast.error(
        <div className="flex items-center gap-2">
          <XCircle className="text-red-500" size={18} />
          <span>Không thể mở cuộc trò chuyện. Vui lòng thử lại.</span>
        </div>
      );
    }
  };

  // 🕒 Thông tin hiển thị - xử lý date với nhiều format
  const getJoinDate = () => {
    if (!createdAt) {
      // Nếu không có createdAt, thử lấy từ joinDate hoặc trả về mặc định
      return "—";
    }
    
    try {
      // Xử lý MongoDB date format (nếu có $date)
      let dateValue = createdAt;
      
      // Nếu là object với $date
      if (typeof createdAt === 'object' && createdAt !== null) {
        if (createdAt.$date) {
          dateValue = createdAt.$date.$numberLong 
            ? new Date(parseInt(createdAt.$date.$numberLong))
            : createdAt.$date;
        } else if (createdAt instanceof Date) {
          dateValue = createdAt;
        } else if (createdAt.toString) {
          // Thử parse string representation
          dateValue = new Date(createdAt.toString());
        }
      }
      
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) {
        // Nếu parse thất bại, thử format khác
        if (typeof createdAt === 'string') {
          const altDate = new Date(createdAt.replace(/-/g, '/'));
          if (!isNaN(altDate.getTime())) {
            return altDate.toLocaleDateString("vi-VN", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit"
            });
          }
        }
        return "—";
      }
      
      return date.toLocaleDateString("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      });
    } catch (err) {
      // Silent fail - không log error để tránh spam console
      return "—";
    }
  };
  
  const joinDate = getJoinDate();
  // Use real-time online status if available, otherwise fallback to isActive
  const showOnline = isOnline !== undefined ? isOnline : isActive;
  const statusText = showOnline ? "Đang online" : "Offline";
  const tags = customCategory ? [customCategory] : [];

  if (!storeId) {
    return (
      <div className="p-4 text-red-500 flex items-center gap-2">
        <AlertCircle className="w-5 h-5" />
        <span>Không tìm thấy cửa hàng</span>
      </div>
    );
  }

  return (
    <div className="bg-white border-2 border-gray-200 rounded-xl md:rounded-2xl shadow-md hover:shadow-2xl hover:border-gray-400 transition-all duration-500 p-3 md:p-4 lg:p-6 flex flex-col overflow-hidden min-w-0 group" style={{ position: 'relative', zIndex: 1 }}>
      {bannerUrl && (
        <div className="h-24 sm:h-28 md:h-32 w-full overflow-hidden rounded-lg md:rounded-xl mb-3 md:mb-4 relative">
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"></div>
          <img 
            src={bannerUrl} 
            alt={name} 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
            loading="lazy"
          />
          <div className="absolute top-1.5 right-1.5 md:top-2 md:right-2 z-20">
            <FavoriteButton storeId={storeId} iconSize={16} />
          </div>
        </div>
      )}
      {!bannerUrl && (
        <div className="absolute top-1.5 right-1.5 md:top-2 md:right-2 z-20">
          <FavoriteButton storeId={storeId} iconSize={16} />
        </div>
      )}

      <div className="flex flex-col flex-1">
        <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3 transform group-hover:translate-x-1 transition-transform duration-300">
          {logoUrl && (
            <div className="relative flex-shrink-0">
              <div className="absolute inset-0 bg-gray-500 rounded-full blur opacity-0 group-hover:opacity-30 transition-opacity duration-300"></div>
              <img
                src={logoUrl}
                alt={name}
                className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full border-2 border-gray-200 object-cover relative z-10 group-hover:border-gray-400 transition-all duration-300 group-hover:scale-110 shadow-lg"
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-sm sm:text-base md:text-lg font-bold text-gray-900 group-hover:text-gray-600 transition-colors duration-300 truncate">
              {name}
            </div>
            <div className="text-[10px] sm:text-xs text-gray-500 flex items-center gap-1 mt-0.5 md:mt-1">
              <Calendar className="w-3 h-3 flex-shrink-0" />
              <span>{joinDate}</span>
            </div>
          </div>
        </div>

        <div className="text-gray-600 text-xs sm:text-sm mb-3 md:mb-4 flex-1 line-clamp-2 group-hover:text-gray-700 transition-colors duration-300">
          {description}
        </div>

        <div className="flex flex-wrap gap-1.5 md:gap-2 mb-3 md:mb-4">
          {tags.map((tag, i) => (
            <span
              key={i}
              className="text-[10px] sm:text-xs bg-gradient-to-r from-gray-100 to-gray-200 text-gray-600 px-2 py-0.5 md:px-3 md:py-1 rounded-full font-semibold shadow-sm group-hover:shadow-md transition-shadow duration-300"
            >
              {tag}
            </span>
          ))}
          <span
            className={`text-[10px] sm:text-xs px-2 py-0.5 md:px-3 md:py-1 rounded-full font-semibold shadow-sm transition-all duration-300 flex items-center gap-1 ${
              showOnline 
                ? "bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 group-hover:from-green-200 group-hover:to-emerald-200" 
                : "bg-gray-100 text-gray-600"
            }`}
          >
            <Circle className={`w-2 h-2 flex-shrink-0 ${showOnline ? "fill-green-600 text-green-600" : "fill-gray-600 text-gray-600"}`} />
            <span>{statusText}</span>
          </span>
        </div>

        <div className="mt-auto flex gap-2 md:gap-3">
          <button
            onClick={() => navigate(`/store/${storeId}`)}
            className="flex-1 bg-gradient-to-r from-gray-900 to-gray-800 text-white py-2 md:py-2.5 rounded-lg md:rounded-xl font-bold text-xs sm:text-sm md:text-base hover:from-gray-800 hover:to-gray-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 touch-manipulation flex items-center justify-center gap-1.5 sm:gap-2"
          >
            <Store className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
            <span>Xem cửa hàng</span>
          </button>

          <button
            onClick={handleChatNow}
            className="flex-1 border-2 border-gray-300 text-gray-900 py-2 md:py-2.5 rounded-lg md:rounded-xl font-bold text-xs sm:text-sm md:text-base hover:bg-gray-100 hover:border-gray-400 hover:text-gray-600 transition-all duration-300 shadow-sm hover:shadow-md transform hover:scale-105 active:scale-95 touch-manipulation flex items-center justify-center gap-1.5 sm:gap-2"
          >
            <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
            <span>Chat</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default StoreCard;
