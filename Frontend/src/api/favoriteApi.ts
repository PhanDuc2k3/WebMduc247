import axiosClient from "./axiosClient";
import type { ProductType } from "../types/product";
import type { StoreType } from "../types/store";

export interface FavoriteResponse {
  products: ProductType[];
  stores: StoreType[];
  totalProducts: number;
  totalStores: number;
}

const favoriteApi = {
  // ❤️ Thêm vào yêu thích
  addFavorite: (data: { productId?: string; storeId?: string }) =>
    axiosClient.post("/api/favorites", data),

  // 💔 Xóa khỏi yêu thích
  removeFavorite: (data: { productId?: string; storeId?: string }) =>
    axiosClient.delete("/api/favorites", { data }),

  // ❓ Kiểm tra đã yêu thích chưa
  checkFavorite: (productId?: string, storeId?: string) => {
    const path = productId 
      ? `/api/favorites/check/product/${productId}`
      : `/api/favorites/check/store/${storeId}`;
    return axiosClient.get<{ isFavorite: boolean }>(path);
  },

  // 📋 Lấy tất cả yêu thích của user
  getMyFavorites: () => 
    axiosClient.get<FavoriteResponse>("/api/favorites/my"),

  // 🔢 Đếm số lượng yêu thích (public, không cần đăng nhập)
  getFavoriteCount: (productId?: string, storeId?: string) => {
    const path = productId 
      ? `/api/favorites/count/product/${productId}`
      : `/api/favorites/count/store/${storeId}`;
    return axiosClient.get<{ count: number }>(path);
  },
};

export default favoriteApi;

