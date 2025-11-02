import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axiosClient from "../../../api/axiosClient";
import type { StoreType } from "../../../types/store";
import FavoriteButton from "../../Favorite/FavoriteButton";

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

  useEffect(() => {
    console.group("[StoreCard] 🏪 Props nhận được");
    console.log("storeId:", storeId);
    console.log("ownerId:", ownerId);
    console.log("name:", name);
    console.log("description:", description);
    console.groupEnd();
  }, [storeId, ownerId]);

  const handleChatNow = async () => {
    try {
      console.group("[StoreCard] 💬 handleChatNow");

      const stored = localStorage.getItem("user");
      if (!stored) {
        alert("⚠️ Vui lòng đăng nhập để chat với cửa hàng");
        console.groupEnd();
        return;
      }

      const currentUser = JSON.parse(stored);
      const senderId = currentUser._id || currentUser.id;
      const receiverId = ownerId;

      if (!senderId || !receiverId) {
        console.error("❌ Thiếu senderId hoặc receiverId");
        alert("Không tìm thấy ID người dùng hoặc chủ cửa hàng");
        console.groupEnd();
        return;
      }

      console.log("[StoreCard] 👤 senderId:", senderId);
      console.log("[StoreCard] 🏪 receiverId:", receiverId);

      // ✅ Tạo hoặc lấy conversation
      const res = await axiosClient.post("/api/messages/conversation", {
        senderId,
        receiverId,
      });

      const conversation = res.data.conversation || res.data;
      console.log("✅ Conversation response:", conversation);

      // ✅ Xây chatUser (vì BE không trả thông tin người nhận)
      const chatUser = {
        _id: receiverId,
        name: name || "Cửa hàng",
        avatar: logoUrl || "/default-avatar.png",
      };

      // ✅ Lấy tin nhắn ban đầu
      const msgRes = await axiosClient.get(`/api/messages/${conversation._id}`);
      const initialMessages = msgRes.data || [];

      console.log("[StoreCard] 💬 Initial messages:", initialMessages);

      // ✅ Điều hướng đến trang chat + truyền dữ liệu
      navigate(`/messages/${conversation._id}`, {
        state: {
          chatUser,
          initialMessages,
          fromStoreCard: true, // flag giúp ChatInterface biết là click từ cửa hàng
        },
      });

      console.groupEnd();
    } catch (err) {
      console.error("[StoreCard] ❌ Lỗi khi mở chat:", err);
      alert("Không thể mở cuộc trò chuyện. Vui lòng thử lại.");
      console.groupEnd();
    }
  };

  // 🕒 Thông tin hiển thị
  const joinDate = createdAt ? new Date(createdAt).toLocaleDateString() : "—";
  // Use real-time online status if available, otherwise fallback to isActive
  const showOnline = isOnline !== undefined ? isOnline : isActive;
  const statusText = showOnline ? "Đang online" : "Offline";
  const tags = customCategory ? [customCategory] : [];

  if (!storeId) {
    console.warn("[StoreCard] ⚠️ Không có storeId — không render được");
    return <div className="p-4 text-red-500">❌ Không tìm thấy cửa hàng</div>;
  }

  return (
    <div className="bg-white border-2 border-gray-200 rounded-2xl shadow-md hover:shadow-2xl hover:border-blue-400 transition-all duration-500 p-6 flex flex-col overflow-hidden min-w-[250px] transform hover:-translate-y-2 animate-scale-in group relative">
      {bannerUrl && (
        <div className="h-32 w-full overflow-hidden rounded-xl mb-4 relative">
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10"></div>
          <img 
            src={bannerUrl} 
            alt={name} 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
            loading="lazy"
          />
          <div className="absolute top-2 right-2 z-20">
            <FavoriteButton storeId={storeId} />
          </div>
        </div>
      )}
      {!bannerUrl && (
        <div className="absolute top-2 right-2 z-20">
          <FavoriteButton storeId={storeId} />
        </div>
      )}

      <div className="flex flex-col flex-1">
        <div className="flex items-center gap-3 mb-3 transform group-hover:translate-x-1 transition-transform duration-300">
          {logoUrl && (
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500 rounded-full blur opacity-0 group-hover:opacity-30 transition-opacity duration-300"></div>
              <img
                src={logoUrl}
                alt={name}
                className="w-14 h-14 rounded-full border-2 border-gray-200 object-cover relative z-10 group-hover:border-blue-400 transition-all duration-300 group-hover:scale-110 shadow-lg"
              />
            </div>
          )}
          <div className="flex-1">
            <div className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors duration-300">
              {name}
            </div>
            <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
              📅 {joinDate}
            </div>
          </div>
        </div>

        <div className="text-gray-600 text-sm mb-4 flex-1 line-clamp-2 group-hover:text-gray-700 transition-colors duration-300">
          {description}
        </div>

        <div className="flex flex-wrap gap-2 mb-4">
          {tags.map((tag, i) => (
            <span
              key={i}
              className="text-xs bg-gradient-to-r from-blue-50 to-blue-100 text-blue-600 px-3 py-1 rounded-full font-semibold shadow-sm group-hover:shadow-md transition-shadow duration-300"
            >
              {tag}
            </span>
          ))}
          <span
            className={`text-xs px-3 py-1 rounded-full font-semibold shadow-sm transition-all duration-300 ${
              showOnline 
                ? "bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 group-hover:from-green-200 group-hover:to-emerald-200" 
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {showOnline ? "🟢 " : "⚫ "}{statusText}
          </span>
        </div>

        <div className="mt-auto flex gap-3">
          <button
            onClick={() => navigate(`/store/${storeId}`)}
            className="flex-1 bg-gradient-to-r from-gray-900 to-gray-800 text-white py-2.5 rounded-xl font-bold hover:from-gray-800 hover:to-gray-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95"
          >
            🏪 Xem cửa hàng
          </button>

          <button
            onClick={handleChatNow}
            className="flex-1 border-2 border-gray-300 text-gray-900 py-2.5 rounded-xl font-bold hover:bg-blue-50 hover:border-blue-400 hover:text-blue-600 transition-all duration-300 shadow-sm hover:shadow-md transform hover:scale-105 active:scale-95"
          >
            💬 Chat
          </button>
        </div>
      </div>
    </div>
  );
};

export default StoreCard;
