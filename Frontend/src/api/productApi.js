import axiosClient from "./axiosClient";
const productApi = {
    // 🟢 Tạo sản phẩm mới
    createProduct: (data) => axiosClient.post("/api/products", data, {
        headers: { "Content-Type": "multipart/form-data" },
    }),
    // 🟡 Lấy danh sách sản phẩm (phân trang, lọc, sắp xếp)
    getProducts: (params) => axiosClient.get("/api/products", { params }),
    // ⭐ Lấy sản phẩm nổi bật
    getFeaturedProducts: () => axiosClient.get("/api/products/featured"),
    // ⚡ Lấy sản phẩm flash sale (hoặc sản phẩm giảm giá)
    getFlashSaleProducts: () => axiosClient.get("/api/products/sale?limit=5"),
    // 💡 Lấy sản phẩm đề xuất (hoặc tất cả sản phẩm)
    getRecommendedProducts: () => axiosClient.get("/api/products?limit=10"),
    // 🔍 Lấy chi tiết sản phẩm theo ID
    getProductById: (id) => axiosClient.get(`/api/products/${id}`),
    // 👤 Lấy sản phẩm của người bán hiện tại
    getMyProducts: () => axiosClient.get("/api/products/my-products"),
    // 🏪 Lấy sản phẩm theo cửa hàng
    getProductsByStore: (storeId) => axiosClient.get(`/api/products/store/${storeId}/products`),
    // ✏️ Cập nhật sản phẩm
    updateProduct: (id, data) => axiosClient.put(`/api/products/${id}`, data, {
        headers: { "Content-Type": "multipart/form-data" },
    }),
    // ❌ Xóa (ẩn) sản phẩm
    deleteProduct: (id) => axiosClient.delete(`/api/products/${id}`),
    // 🔄 Khôi phục sản phẩm (bán trở lại)
    restoreProduct: (id) => axiosClient.patch(`/api/products/${id}/restore`),
    // 👁️‍🗨️ Tăng lượt xem sản phẩm
    increaseView: (id) => axiosClient.patch(`/api/products/${id}/view`),
    // 📊 Lấy thống kê lượt xem
    getViewsStats: (storeId, range = 7) => axiosClient.get("/api/products/views-stats", {
        params: { storeId, range },
    }),
    // 🧮 Lấy số lượng sản phẩm theo danh mục
    getProductCountByCategory: () => axiosClient.get("/api/products/count-by-category"),
    // 🔍 Tìm kiếm sản phẩm
    searchProducts: (keyword, limit = 10) => axiosClient.get(`/api/products/search?keyword=${encodeURIComponent(keyword)}&limit=${limit}`),
};
export default productApi;
