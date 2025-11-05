import axiosClient from "./axiosClient";

export interface PromotionType {
  _id?: string;
  title: string;
  description: string;
  content?: string;
  category: "Sale lớn" | "Flash Sale" | "Freeship" | "Hoàn tiền" | "Đặc biệt" | "Tân thủ" | "Khác";
  tags?: string[];
  imageUrl?: string;
  startDate: string;
  endDate: string;
  views?: number;
  isActive?: boolean;
  createdBy?: {
    _id: string;
    fullName: string;
    email: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

const promotionApi = {
  // Lấy tất cả tin tức khuyến mãi
  getAllPromotions: (params?: { category?: string; isActive?: boolean }) => 
    axiosClient.get<PromotionType[]>("/api/promotions", { params }),

  // Lấy chi tiết tin tức khuyến mãi
  getPromotionById: (id: string) => 
    axiosClient.get<PromotionType>(`/api/promotions/${id}`),

  // Tạo tin tức khuyến mãi mới (admin)
  createPromotion: (data: FormData) => 
    axiosClient.post<{ message: string; promotion: PromotionType }>("/api/promotions", data, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  // Cập nhật tin tức khuyến mãi (admin)
  updatePromotion: (id: string, data: FormData) => 
    axiosClient.put<{ message: string; promotion: PromotionType }>(`/api/promotions/${id}`, data, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  // Xóa tin tức khuyến mãi (admin)
  deletePromotion: (id: string) => 
    axiosClient.delete<{ message: string }>(`/api/promotions/${id}`),

  // Tăng lượt xem
  increaseViews: (id: string) => 
    axiosClient.post<{ views: number }>(`/api/promotions/${id}/views`),
};

export default promotionApi;
