// components/Store/StoreHeader.tsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { StoreType } from "../../../types/store";
import { Star, Heart, MessageCircle, Loader2, Store, CheckCircle, Package, Users, Calendar } from "lucide-react";
import favoriteApi from "../../../api/favoriteApi";
import axiosClient from "../../../api/axiosClient";
import { toast } from "react-toastify";

interface StoreInfoProps {
  store: StoreType;
}

const StoreHeader: React.FC<StoreInfoProps> = ({ store }) => {
  const navigate = useNavigate();
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLoadingFavorite, setIsLoadingFavorite] = useState(false);
  const [isLoadingChat, setIsLoadingChat] = useState(false);

  // Kiểm tra xem store đã được yêu thích chưa
  useEffect(() => {
    const checkFavoriteStatus = async () => {
      try {
        const response = await favoriteApi.checkFavorite(undefined, store._id);
        setIsFavorite(response.data.isFavorite);
      } catch (error: any) {
        // Nếu chưa đăng nhập, không hiển thị lỗi
        if (error.response?.status === 401) {
          return;
        }
        // Chỉ log lỗi nếu không phải lỗi network hoặc 404
        if (error.code !== "ERR_NETWORK" && error.response?.status !== 404) {
          console.error("Error checking favorite:", error);
          console.error("Error details:", {
            message: error.message,
            status: error.response?.status,
            data: error.response?.data,
            url: error.config?.url,
          });
        }
      }
    };
    checkFavoriteStatus();
  }, [store._id]);

  // Xử lý yêu thích - giống FavoriteButton
  const handleFavorite = async () => {
    // Kiểm tra đăng nhập
    const user = localStorage.getItem("user");
    if (!user) {
      toast.warning("Vui lòng đăng nhập để thêm vào yêu thích");
      return;
    }

    // Kiểm tra store._id
    if (!store?._id) {
      console.error("❌ Store ID is missing:", store);
      toast.error("Không tìm thấy ID cửa hàng");
      return;
    }

    console.log("🏪 Adding favorite for store:", store._id, store.name);

    setIsLoadingFavorite(true);

    try {
      if (isFavorite) {
        // Xóa khỏi yêu thích
        console.log("🗑️ Removing favorite for store:", store._id);
        await favoriteApi.removeFavorite({ storeId: store._id });
        setIsFavorite(false);
        toast.success("Đã xóa khỏi yêu thích");
      } else {
        // Thêm vào yêu thích
        console.log("❤️ Adding favorite for store:", store._id);
        const res = await favoriteApi.addFavorite({ storeId: store._id });
        console.log("✅ Add favorite response:", res.data);
        setIsFavorite(true);
        toast.success("Đã thêm vào yêu thích");
      }
    } catch (error: any) {
      console.error("Error toggling favorite:", error);
      console.error("Error details:", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url,
      });

      // Xử lý các loại lỗi khác nhau
      if (error.code === "ERR_NETWORK") {
        toast.error("Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.");
      } else if (error.response?.status === 401) {
        toast.warning("Vui lòng đăng nhập để thêm vào yêu thích");
      } else if (error.response?.status === 404) {
        toast.error("Không tìm thấy cửa hàng");
      } else {
        toast.error(
          error.response?.data?.message || "Có lỗi xảy ra khi cập nhật yêu thích"
        );
      }
    } finally {
      setIsLoadingFavorite(false);
    }
  };

  // Xử lý chat - giống y hệt StoreCard
  const handleChat = async () => {
    try {
      const stored = localStorage.getItem("user");
      if (!stored) {
        toast.warning("Vui lòng đăng nhập để chat với cửa hàng");
        return;
      }

      const currentUser = JSON.parse(stored);
      const senderId = currentUser._id || currentUser.id;
      const receiverId = typeof store.owner === "string" ? store.owner : store.owner._id;

      if (!senderId || !receiverId) {
        toast.error("Không tìm thấy ID người dùng hoặc chủ cửa hàng");
        return;
      }

      setIsLoadingChat(true);

      // ✅ Tạo hoặc lấy conversation
      const res = await axiosClient.post("/api/messages/conversation", {
        senderId,
        receiverId,
      });

      const conversation = res.data.conversation || res.data;

      // ✅ Xây chatUser (vì BE không trả thông tin người nhận)
      const chatUser = {
        _id: receiverId,
        name: store.name || "Cửa hàng",
        avatar: store.logoUrl || "/default-avatar.png",
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
    } catch (err: any) {
      console.error("Lỗi khi mở chat:", err);
      toast.error("Không thể mở cuộc trò chuyện. Vui lòng thử lại.");
    } finally {
      setIsLoadingChat(false);
    }
  };

  if (!store) return <p>Không tìm thấy cửa hàng</p>;

  return (
    <div className="w-full relative animate-fade-in-up">
      {/* Banner */}
      {store.bannerUrl && (
        <div className="w-full h-32 sm:h-48 md:h-64 lg:h-80 overflow-hidden rounded-xl md:rounded-2xl shadow-2xl relative group">
          <img
            src={store.bannerUrl}
            alt="Store Banner"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
        </div>
      )}

      {/* Container */}
      <div className="relative -mt-12 sm:-mt-16 md:-mt-20 animate-fade-in-up delay-200">
        <div className="bg-white rounded-xl md:rounded-2xl shadow-2xl border-2 border-gray-100 p-4 md:p-6 lg:p-8">
          {/* Header: Logo + Info + Buttons */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 md:gap-6">
            {/* Store info */}
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 w-full lg:w-auto items-center sm:items-start">
              <div className="relative">
                <div className="absolute inset-0 bg-[#4B5563] rounded-full blur opacity-40"></div>
                <img
                  src={store.logoUrl || "/default-store.png"}
                  alt={store.name}
                  className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full border-4 border-white shadow-2xl object-cover flex-shrink-0 transform hover:scale-110 transition-transform duration-300"
                />
                {store.isActive && (
                  <span className="absolute bottom-0 right-0 w-5 h-5 md:w-6 md:h-6 bg-green-500 border-2 md:border-4 border-white rounded-full animate-pulse shadow-lg"></span>
                )}
              </div>
              <div className="flex flex-col justify-center flex-1 min-w-0 text-center sm:text-left">
                <div className="flex flex-wrap items-center gap-1.5 md:gap-2 mb-1.5 md:mb-2 justify-center sm:justify-start">
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
                    {store.name}
                  </h2>
                  <span className="text-[10px] md:text-xs bg-[#4B5563]/10 text-[#4B5563] px-2 py-0.5 md:px-3 md:py-1 rounded-full font-bold shadow-sm flex items-center gap-1">
                    <Store className="w-2.5 h-2.5 md:w-3 md:h-3" />
                    <span>Mall</span>
                  </span>
                  <span className="text-[10px] md:text-xs bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 px-2 py-0.5 md:px-3 md:py-1 rounded-full font-bold shadow-sm flex items-center gap-1">
                    <CheckCircle className="w-2.5 h-2.5 md:w-3 md:h-3" />
                    <span>Chính hãng</span>
                  </span>
                </div>
                <p className="text-sm md:text-base text-gray-600 mb-1.5 md:mb-2 line-clamp-2">{store.description}</p>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-2 md:gap-3 flex-wrap w-full sm:w-auto justify-center sm:justify-end">
              <button
                onClick={handleChat}
                disabled={isLoadingChat}
                className="px-3 py-2 sm:px-4 sm:py-2.5 md:px-6 md:py-3 bg-[#4B5563] text-white rounded-lg md:rounded-xl font-bold hover:bg-[#374151] transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 text-xs sm:text-sm md:text-base disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none touch-manipulation flex items-center gap-1.5 sm:gap-2"
              >
                {isLoadingChat ? (
                  <>
                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin" />
                    <span>Đang tải...</span>
                  </>
                ) : (
                  <>
                    <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span>Chat ngay</span>
                  </>
                )}
              </button>
              <button
                onClick={handleFavorite}
                disabled={isLoadingFavorite}
                className={`px-3 py-2 sm:px-4 sm:py-2.5 md:px-6 md:py-3 border-2 rounded-lg md:rounded-xl font-bold transition-all duration-300 shadow-sm hover:shadow-md transform hover:scale-105 active:scale-95 text-xs sm:text-sm md:text-base disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center gap-1.5 sm:gap-2 touch-manipulation ${
                  isFavorite
                    ? "bg-gradient-to-r from-red-50 to-pink-50 border-red-400 text-red-600 hover:border-red-500"
                    : "border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-[#4B5563] hover:text-[#4B5563]"
                }`}
              >
                <Heart
                  size={16}
                  className={`flex-shrink-0 ${isFavorite ? "fill-red-600 text-red-600" : ""}`}
                />
                <span className="hidden sm:inline">{isFavorite ? "Đã yêu thích" : "Yêu thích"}</span>
                <span className="sm:hidden">{isFavorite ? "Đã thích" : "Thích"}</span>
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-4 pt-6 md:pt-8 border-t border-gray-200">
            {/* Rating */}
            <div className="flex flex-col items-center gap-1 md:gap-2 p-2 md:p-4 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg md:rounded-xl border-2 border-yellow-200 hover:border-yellow-400 transition-all duration-300 transform hover:scale-105">
              <div className="flex items-center gap-1 justify-center">
                <Star className="w-4 h-4 md:w-5 md:h-5 text-yellow-500 fill-yellow-500" />
                <span className="text-lg md:text-xl font-bold text-gray-900">{store.rating?.toFixed(1) || "0.0"}</span>
              </div>
              <p className="text-gray-600 text-[10px] md:text-xs font-semibold">Đánh giá</p>
            </div>

            {/* Products */}
            <div className="flex flex-col items-center gap-1 md:gap-2 p-2 md:p-4 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg md:rounded-xl border-2 border-gray-200 hover:border-gray-400 transition-all duration-300 transform hover:scale-105">
              <span className="text-xl md:text-2xl font-bold text-gray-600">{store.products || 0}</span>
              <p className="text-gray-600 text-[10px] md:text-xs font-semibold flex items-center gap-1">
                <Package className="w-3 h-3 text-gray-500" />
                <span>Sản phẩm</span>
              </p>
            </div>

            {/* Reviews count */}
            <div className="flex flex-col items-center gap-1 md:gap-2 p-2 md:p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg md:rounded-xl border-2 border-purple-200 hover:border-purple-400 transition-all duration-300 transform hover:scale-105">
              <span className="text-xl md:text-2xl font-bold text-purple-600">{store.reviewsCount || 0}</span>
              <p className="text-gray-600 text-[10px] md:text-xs font-semibold flex items-center gap-1">
                <Users className="w-3 h-3 text-purple-500" />
                <span>Người đánh giá</span>
              </p>
            </div>

            {/* Join date */}
            <div className="flex flex-col items-center gap-1 md:gap-2 p-2 md:p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg md:rounded-xl border-2 border-green-200 hover:border-green-400 transition-all duration-300 transform hover:scale-105">
              <span className="text-sm md:text-lg font-bold text-green-600">
                {store.joinDate ? new Date(store.joinDate).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }) : "—"}
              </span>
              <p className="text-gray-600 text-[10px] md:text-xs font-semibold flex items-center gap-1">
                <Calendar className="w-3 h-3 text-green-500" />
                <span>Ngày tạo</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoreHeader;
