import axiosClient from "./axiosClient";
import type { ProductType } from "../types/product";

const productApi = {
  // 🟢 Tạo sản phẩm mới
  createProduct: (data: FormData) =>
    axiosClient.post("/api/products", data, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  // 🟡 Lấy danh sách sản phẩm (phân trang, lọc, sắp xếp)
  getProducts: (params?: Record<string, any>) =>
    axiosClient.get("/api/products", { params }),

  // ⭐ Lấy sản phẩm nổi bật
  getFeaturedProducts: () => axiosClient.get("/api/products/featured"),

  // ⚡ Lấy sản phẩm flash sale (hoặc sản phẩm giảm giá)
  getFlashSaleProducts: () => axiosClient.get("/api/products/sale?limit=5"),

  // 💡 Lấy sản phẩm đề xuất (hoặc tất cả sản phẩm)
  getRecommendedProducts: () => axiosClient.get("/api/products?limit=10"),

  // 🔍 Lấy chi tiết sản phẩm theo ID
  getProductById: (id: string) => axiosClient.get(`/api/products/${id}`),

  // 👤 Lấy sản phẩm của người bán hiện tại
  getMyProducts: () => axiosClient.get("/api/products/my-products"),

  // 🏪 Lấy sản phẩm theo cửa hàng
  getProductsByStore: (storeId: string) =>
    axiosClient.get(`/api/products/store/${storeId}/products`),

  // ✏️ Cập nhật sản phẩm
  updateProduct: (id: string, data: FormData) =>
    axiosClient.put(`/api/products/${id}`, data, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  // ❌ Xóa (ẩn) sản phẩm
  deleteProduct: (id: string) => axiosClient.delete(`/api/products/${id}`),

  // 🔄 Khôi phục sản phẩm (bán trở lại)
  restoreProduct: (id: string) => axiosClient.patch(`/api/products/${id}/restore`),

  // 👁️‍🗨️ Tăng lượt xem sản phẩm
  increaseView: (id: string) => axiosClient.patch(`/api/products/${id}/view`),

  // 📊 Lấy thống kê lượt xem
  getViewsStats: (storeId: string, range = 7) =>
    axiosClient.get("/api/products/views-stats", {
      params: { storeId, range },
    }),

  // 🧮 Lấy số lượng sản phẩm theo danh mục
  getProductCountByCategory: () =>
    axiosClient.get("/api/products/count-by-category"),

  // 🔍 Tìm kiếm sản phẩm
  searchProducts: (keyword: string, limit: number = 10) =>
    axiosClient.get(`/api/products/search?keyword=${encodeURIComponent(keyword)}&limit=${limit}`),
};

export default productApi;
