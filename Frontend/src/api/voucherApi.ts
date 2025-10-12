import axiosClient from "./axiosClient";

export interface VoucherType {
  _id?: string;
  code: string;
  description?: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  minOrderValue?: number;
  maxDiscount?: number; // áp dụng nếu discountType = percentage
  startDate: string;    // ISO string
  endDate: string;      // ISO string
  usageLimit?: number;
  usedCount?: number;
  isActive?: boolean;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Kiểu request để preview/apply voucher
export interface VoucherPreviewRequest {
  code: string;
  orderTotal: number;
}

export interface VoucherPreviewResponse {
  code: string;
  discountAmount: number;
  finalTotal: number;
  message?: string;
}

const voucherApi = {
  // Lấy danh sách voucher khả dụng
  getAvailableVouchers: () => axiosClient.get<VoucherType[]>("/api/voucher"),

  // Tạo voucher mới
  createVoucher: (data: VoucherType) => axiosClient.post<VoucherType>("/api/voucher", data),

  // Cập nhật voucher
  updateVoucher: (id: string, data: VoucherType) =>
    axiosClient.put<VoucherType>(`/api/voucher/${id}`, data),

  // Xóa voucher
  deleteVoucher: (id: string) =>
    axiosClient.delete<{ message: string }>(`/api/voucher/${id}`),

  // Xem trước voucher: tính discount dựa trên tổng tiền đơn hàng
  previewVoucher: (data: VoucherPreviewRequest) =>
    axiosClient.post<VoucherPreviewResponse>("/api/voucher/preview", data),

  // Áp dụng voucher vào đơn hàng
  applyVoucher: (data: VoucherPreviewRequest) =>
    axiosClient.post<VoucherPreviewResponse>("/api/voucher/apply", data),
};

export default voucherApi;
