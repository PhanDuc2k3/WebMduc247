import axiosClient from "./axiosClient";
const favoriteApi = {
    // ❤️ Thêm vào yêu thích
    addFavorite: (data) => axiosClient.post("/api/favorites", data),
    // 💔 Xóa khỏi yêu thích
    removeFavorite: (data) => axiosClient.delete("/api/favorites", { data }),
    // ❓ Kiểm tra đã yêu thích chưa
    checkFavorite: (productId, storeId) => {
        const path = productId
            ? `/api/favorites/check/product/${productId}`
            : `/api/favorites/check/store/${storeId}`;
        return axiosClient.get(path);
    },
    // 📋 Lấy tất cả yêu thích của user
    getMyFavorites: () => axiosClient.get("/api/favorites/my"),
    // 🔢 Đếm số lượng yêu thích (public, không cần đăng nhập)
    getFavoriteCount: (productId, storeId) => {
        const path = productId
            ? `/api/favorites/count/product/${productId}`
            : `/api/favorites/count/store/${storeId}`;
        return axiosClient.get(path);
    },
};
export default favoriteApi;
