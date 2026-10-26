import axiosClient from "./axiosClient";
const storeApi = {
    createStore: async (data) => {
        if (data instanceof FormData) {
            console.log("📦 [storeApi] FormData gửi lên:");
            for (const pair of data.entries()) {
                console.log(`👉 ${pair[0]}:`, pair[1]);
            }
        }
        else {
            console.log("📦 [storeApi] JSON gửi lên:", data);
        }
        try {
            const res = await axiosClient.post("/api/stores", data);
            console.log("✅ [storeApi] Tạo cửa hàng thành công:", res.data);
            return res;
        }
        catch (err) {
            console.error("🔥 [storeApi] Lỗi khi tạo cửa hàng:", err.response?.data || err.message);
            throw err;
        }
    },
    getMyStore: () => axiosClient.get("/api/stores/me"),
    getStoreById: (id) => axiosClient.get(`/api/stores/${id}`),
    getAllActiveStores: () => axiosClient.get("/api/stores"),
    updateStore: (data) => axiosClient.put("/api/stores", data, data instanceof FormData ? { headers: { "Content-Type": "multipart/form-data" } } : {}),
    activateStore: () => axiosClient.patch("/api/stores/activate"),
    deactivateStore: () => axiosClient.patch("/api/stores/deactivate"),
    // Admin: Lấy tất cả cửa hàng (bao gồm inactive)
    getAllStores: () => axiosClient.get("/api/stores"),
    // Admin: Xóa cửa hàng
    deleteStore: (storeId) => axiosClient.delete(`/api/stores/${storeId}`),
    // Admin: Cập nhật cửa hàng theo ID
    updateStoreById: (storeId, data) => axiosClient.put(`/api/stores/${storeId}`, data, data instanceof FormData ? { headers: { "Content-Type": "multipart/form-data" } } : {}),
    // ========================
    // QUẢN LÝ DANH MỤC
    // ========================
    addCategory: (storeId, name) => axiosClient.post(`/api/stores/${storeId}/categories`, { name }),
    editCategory: (storeId, categoryId, name) => axiosClient.put(`/api/stores/${storeId}/categories/${categoryId}`, { name }),
    deleteCategory: (storeId, categoryId) => axiosClient.delete(`/api/stores/${storeId}/categories/${categoryId}`),
    getCategories: (storeId) => axiosClient.get(`/api/stores/${storeId}/categories`),
    // ========================
    // QUẢN LÝ SẢN PHẨM TRONG DANH MỤC
    // ========================
    addProductsToCategory: (storeId, categoryId, productIds) => axiosClient.post(`/api/stores/${storeId}/categories/${categoryId}/products`, { productIds }),
    removeProductFromCategory: (storeId, categoryId, productId) => axiosClient.delete(`/api/stores/${storeId}/categories/${categoryId}/products/${productId}`),
    getProductsByCategory: (storeId, categoryId) => axiosClient.get(`/api/stores/${storeId}/categories/${categoryId}/products`),
    // Tìm kiếm stores
    searchStores: (keyword, limit = 10) => axiosClient.get(`/api/stores/search?keyword=${encodeURIComponent(keyword)}&limit=${limit}`),
};
export default storeApi;
