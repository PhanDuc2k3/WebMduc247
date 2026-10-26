import axiosClient from "./axiosClient";
const reviewApi = {
    // Tạo review (POST /api/review/:orderId/reviews)
    createReview: (orderId, data) => axiosClient.post(`/api/review/${orderId}/reviews`, data, {
        headers: { "Content-Type": "multipart/form-data" },
    }),
    // Lấy tất cả review của 1 sản phẩm (GET /api/review/product/:productId/reviews)
    getReviewsByProduct: (productId) => axiosClient.get(`/api/review/product/${productId}/reviews`),
    // Lấy review của user cho sản phẩm trong đơn hàng cụ thể
    getReviewByUserAndProduct: (orderId, productId) => axiosClient.get(`/api/review/order/${orderId}/product/${productId}/user-review`),
    // Cập nhật review (PUT /api/review/:reviewId)
    updateReview: (reviewId, data) => axiosClient.put(`/api/review/${reviewId}`, data, {
        headers: { "Content-Type": "multipart/form-data" },
    }),
};
export default reviewApi;
