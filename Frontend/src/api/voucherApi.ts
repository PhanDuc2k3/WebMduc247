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
  getAvailableVouchers: () => axiosClient.get<VoucherType[]>("/api/vouchers"),

  // Tạo voucher mới
  createVoucher: (data: VoucherType) => axiosClient.post<VoucherType>("/api/vouchers", data),

  // Cập nhật voucher
  updateVoucher: (id: string, data: VoucherType) =>
    axiosClient.put<VoucherType>(`/api/vouchers/${id}`, data),

  // Xóa voucher
  deleteVoucher: (id: string) =>
    axiosClient.delete<{ message: string }>(`/api/vouchers/${id}`),

  // Xem trước voucher: tính discount dựa trên tổng tiền đơn hàng
  previewVoucher: (data: VoucherPreviewRequest) =>
    axiosClient.post<VoucherPreviewResponse>("/api/vouchers/preview", data),

  // Áp dụng voucher vào đơn hàng
  applyVoucher: (data: VoucherPreviewRequest) =>
    axiosClient.post<VoucherPreviewResponse>("/api/vouchers/apply", data),
};

export default voucherApi;
