  import axiosClient from "./axiosClient";
  import type { ProductType } from "../types/product";

  const productApi = {
    // Tạo sản phẩm mới
    createProduct: (data: FormData) =>
      axiosClient.post("/api/products", data, {
        headers: { "Content-Type": "multipart/form-data" },
      }),

    // Lấy tất cả sản phẩm (phân trang, lọc, sắp xếp)
    getProducts: (params?: Record<string, any>) =>
      axiosClient.get("/api/products", { params }),

    // Lấy sản phẩm nổi bật
    getFeaturedProducts: () => axiosClient.get("/api/products/featured"),

    // Lấy sản phẩm theo ID
    getProductById: (id: string) => axiosClient.get(`/api/products/${id}`),

    // Lấy sản phẩm của chính người bán
    getMyProducts: () => axiosClient.get("/api/products/my-products"),

    // Lấy sản phẩm theo cửa hàng
    getProductsByStore: (storeId: string) =>
      axiosClient.get(`/api/products/store/${storeId}/products`),

    // Cập nhật sản phẩm
    updateProduct: (id: string, data: FormData) =>
      axiosClient.put(`/api/products/${id}`, data, {
        headers: { "Content-Type": "multipart/form-data" },
      }),

    // Xóa sản phẩm (ẩn)
    deleteProduct: (id: string) => axiosClient.delete(`/api/products/${id}`),

    // Tăng lượt xem
    increaseView: (id: string) => axiosClient.patch(`/api/products/${id}/view`),

    // Lấy thống kê lượt xem
    getViewsStats: (storeId: string, range = 7) =>
      axiosClient.get("/api/products/views-stats", {
        params: { storeId, range },
      }),
  };

  export default productApi;
