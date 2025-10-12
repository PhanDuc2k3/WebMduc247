import axiosClient from "./axiosClient";

interface ReviewData {
  rating: number;
  comment: string;
  images?: File[];
}

const reviewApi = {
  // Tạo review (POST /api/review/:orderId/reviews)
  createReview: (orderId: string, data: FormData) =>
    axiosClient.post(`/api/review/${orderId}/reviews`, data, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  // Lấy tất cả review của 1 sản phẩm (GET /api/review/:productId/reviews)
  getReviewsByProduct: (productId: string) =>
    axiosClient.get(`/api/review/${productId}/reviews`),
};

export default reviewApi;
