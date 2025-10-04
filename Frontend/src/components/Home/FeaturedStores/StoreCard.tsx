import React from "react";
import { useNavigate } from "react-router-dom";

interface StoreCardProps {
  storeId: string;               // id của cửa hàng (để xem cửa hàng)
  ownerId: string;               // id của chủ shop (receiverId để chat)
  name: string;
  description: string;
  join: string;
  status?: "Đang online" | "Offline";
  tags?: string[];
  logoUrl?: string;
  bannerUrl?: string;
}

const StoreCard: React.FC<StoreCardProps> = ({
  storeId,
  ownerId,
  name,
  description,
  join,
  status = "Offline",
  tags = [],
  logoUrl,
  bannerUrl,
}) => {
  const navigate = useNavigate();

  // 🟢 Xử lý nút "Chat ngay"
  const handleChatNow = async () => {
    try {
      // Lấy user hiện tại
      const stored = localStorage.getItem("user");
      console.log("📦 [FE] storedUser từ localStorage:", stored);

      if (!stored) {
        alert("Vui lòng đăng nhập để chat với cửa hàng");
        return;
      }

      const currentUser = JSON.parse(stored);
      // Lấy id từ localStorage (có thể là _id hoặc id tùy backend)
      const senderId = currentUser._id || currentUser.id;
      const receiverId = ownerId; // id chủ shop

      if (!senderId) {
        alert("Không tìm thấy ID người dùng đăng nhập. Vui lòng đăng nhập lại.");
        return;
      }

      if (!receiverId) {
        alert("Không tìm thấy ID chủ cửa hàng.");
        return;
      }

      console.log("📤 [FE] Gọi API tạo/lấy conversation:", { senderId, receiverId });

      // Gọi API tạo hoặc lấy conversation
      const res = await fetch("http://localhost:5000/api/messages/conversation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderId, receiverId }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`HTTP ${res.status}: ${errorText}`);
      }

      const conversation = await res.json();
      console.log("✅ [FE] Conversation nhận được:", conversation);

      // Chuyển hướng tới trang message
      navigate(`/messages/${conversation._id}`);
    } catch (err) {
      console.error("❌ [FE] Lỗi khi tạo conversation:", err);
      alert("Không thể mở cuộc trò chuyện. Vui lòng thử lại.");
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm hover:shadow-md transition p-6 flex flex-col overflow-hidden min-w-[250px]">
      {/* Banner */}
      {bannerUrl && (
        <div className="h-32 w-full overflow-hidden rounded-lg mb-4">
          <img src={bannerUrl} alt={name} className="w-full h-full object-cover" />
        </div>
      )}

      {/* Info */}
      <div className="flex flex-col flex-1">
        {/* Logo + tên */}
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
            <div className="text-xs text-gray-500">{join}</div>
          </div>
        </div>

        {/* Mô tả */}
        <div className="text-gray-600 text-sm mb-3 flex-1">{description}</div>

        {/* Tags + trạng thái */}
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
              status === "Đang online"
                ? "bg-green-100 text-green-700"
                : "bg-gray-200 text-gray-600"
            }`}
          >
            {status}
          </span>
        </div>

        {/* Nút hành động */}
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
