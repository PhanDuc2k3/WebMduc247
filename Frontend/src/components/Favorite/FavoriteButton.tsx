import React, { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import favoriteApi from "../../api/favoriteApi";
import { toast } from "react-toastify";

interface FavoriteButtonProps {
  productId?: string;
  storeId?: string;
  className?: string;
  iconSize?: number;
}

const FavoriteButton: React.FC<FavoriteButtonProps> = ({
  productId,
  storeId,
  className = "",
  iconSize = 18,
}) => {
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    checkFavoriteStatus();
  }, [productId, storeId]);

  const checkFavoriteStatus = async () => {
    try {
      const response = await favoriteApi.checkFavorite(productId, storeId);
      setIsFavorite(response.data.isFavorite);
    } catch (error: any) {
      // Nếu chưa đăng nhập, không hiển thị lỗi
      if (error.response?.status === 401) {
        return;
      }
      console.error("Error checking favorite:", error);
    }
  };

  const handleToggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Kiểm tra đăng nhập
    const user = localStorage.getItem("user");
    if (!user) {
      toast.warning("Vui lòng đăng nhập để thêm vào yêu thích");
      return;
    }

    setIsLoading(true);

    try {
      if (isFavorite) {
        // Xóa khỏi yêu thích
        await favoriteApi.removeFavorite({ productId, storeId });
        setIsFavorite(false);
        toast.success("Đã xóa khỏi yêu thích");
      } else {
        // Thêm vào yêu thích
        await favoriteApi.addFavorite({ productId, storeId });
        setIsFavorite(true);
        toast.success("Đã thêm vào yêu thích");
      }
    } catch (error: any) {
      console.error("Error toggling favorite:", error);
      toast.error(
        error.response?.data?.message || "Có lỗi xảy ra khi cập nhật yêu thích"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggleFavorite}
      disabled={isLoading}
      className={`bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-lg hover:bg-red-50 transition-all duration-300 hover:scale-110 ${className} ${
        isLoading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
      } ${isFavorite ? "bg-red-50" : ""}`}
      title={isFavorite ? "Xóa khỏi yêu thích" : "Thêm vào yêu thích"}
    >
      <Heart
        size={iconSize}
        className={`${
          isFavorite
            ? "text-red-500 fill-red-500"
            : "text-red-500"
        } transition-all duration-300`}
      />
    </button>
  );
};

export default FavoriteButton;

