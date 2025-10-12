import React from "react";
import { useNavigate } from "react-router-dom";
import axiosClient from "../../../api/axiosClient";
import type { StoreType } from "../../../types/store";

interface StoreCardProps extends Partial<StoreType> {
  storeId: string;
  ownerId: string;
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

  const handleChatNow = async () => {
    try {
      const stored = localStorage.getItem("user");
      if (!stored) {
        alert("Vui lòng đăng nhập để chat với cửa hàng");
        return;
      }

      const currentUser = JSON.parse(stored);
      const senderId = currentUser._id || currentUser.id;
      const receiverId = ownerId;

      if (!senderId || !receiverId) {
        alert("Không tìm thấy ID người dùng hoặc chủ cửa hàng");
        return;
      }

      const res = await axiosClient.post("/api/messages/conversation", {
        senderId,
        receiverId,
      });

      navigate(`/messages/${res.data._id}`);
    } catch (err) {
      console.error(err);
      alert("Không thể mở cuộc trò chuyện. Vui lòng thử lại.");
    }
  };

  const joinDate = createdAt ? new Date(createdAt).toLocaleDateString() : "—";
  const statusText = isActive ? "Đang online" : "Offline";
  const tags = customCategory ? [customCategory] : [];

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
