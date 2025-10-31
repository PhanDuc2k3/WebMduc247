import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axiosClient from "../../../api/axiosClient";
import type { StoreType } from "../../../types/store";

interface StoreCardProps extends Partial<StoreType> {
  storeId: string;
  ownerId?: string; // ID chủ cửa hàng
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
  const statusText = isActive ? "Đang online" : "Offline";
  const tags = customCategory ? [customCategory] : [];

  if (!storeId) {
    console.warn("[StoreCard] ⚠️ Không có storeId — không render được");
    return <div className="p-4 text-red-500">❌ Không tìm thấy cửa hàng</div>;
  }

  return (
    <div className="bg-white border border-gray-300 rounded-xl shadow-sm hover:shadow-md hover:border-gray-400 hover:bg-gray-50 transition-all duration-200 p-6 flex flex-col overflow-hidden min-w-[250px]">
      {bannerUrl && (
        <div className="h-32 w-full overflow-hidden rounded-lg mb-4">
          <img src={bannerUrl} alt={name} className="w-full h-full object-cover" />
        </div>
      )}

      <div className="flex flex-col flex-1">
        <div className="flex items-center gap-3 mb-2">
          {logoUrl && (
            <img
              src={logoUrl}
              alt={name}
              className="w-12 h-12 rounded border object-cover"
            />
          )}
          <div>
            <div className="text-lg font-semibold text-gray-900">{name}</div>
            <div className="text-xs text-gray-500">{joinDate}</div>
          </div>
        </div>

        <div className="text-gray-600 text-sm mb-3 flex-1">{description}</div>

        <div className="flex flex-wrap gap-2 mb-3">
          {tags.map((tag, i) => (
            <span
              key={i}
              className="text-xs bg-gray-100 text-blue-600 px-2 py-1 rounded font-medium"
            >
              {tag}
            </span>
          ))}
          <span
            className={`text-xs px-2 py-1 rounded font-medium ${
              isActive ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-600"
            }`}
          >
            {statusText}
          </span>
        </div>

        <div className="mt-auto flex gap-3">
          <button
            onClick={() => navigate(`/store/${storeId}`)}
            className="flex-1 bg-gray-900 text-white py-2 rounded-md font-semibold hover:bg-gray-800 transition"
          >
            Xem cửa hàng
          </button>

          <button
            onClick={handleChatNow}
            className="flex-1 border border-gray-300 text-gray-900 py-2 rounded-md font-semibold hover:bg-gray-100 transition"
          >
            Chat ngay
          </button>
        </div>
      </div>
    </div>
  );
};

export default StoreCard;
