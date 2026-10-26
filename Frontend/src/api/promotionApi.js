import axiosClient from "./axiosClient";
const promotionApi = {
    // Lấy tất cả tin tức khuyến mãi
    getAllPromotions: (params) => axiosClient.get("/api/promotions", { params }),
    // Lấy chi tiết tin tức khuyến mãi
    getPromotionById: (id) => axiosClient.get(`/api/promotions/${id}`),
    // Tạo tin tức khuyến mãi mới (admin)
    createPromotion: (data) => axiosClient.post("/api/promotions", data, {
        headers: { "Content-Type": "multipart/form-data" },
    }),
    // Cập nhật tin tức khuyến mãi (admin)
    updatePromotion: (id, data) => axiosClient.put(`/api/promotions/${id}`, data, {
        headers: { "Content-Type": "multipart/form-data" },
    }),
    // Xóa tin tức khuyến mãi (admin)
    deletePromotion: (id) => axiosClient.delete(`/api/promotions/${id}`),
    // Tăng lượt xem
    increaseViews: (id) => axiosClient.post(`/api/promotions/${id}/views`),
};
export default promotionApi;
