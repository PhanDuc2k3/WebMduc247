  import axiosClient from "./axiosClient";

  export interface VoucherType {
    _id?: string;
    code: string;
    title: string;
    description: string;
    condition: string;
    voucherType?: "product" | "freeship";
    discountType: "percent" | "fixed";
    discountValue: number;
    minOrderValue?: number;
    maxDiscount?: number; // Áp dụng nếu discountType = percent
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
    subtotal?: number; // Subtotal của các sản phẩm được chọn trong checkout
    shippingFee?: number; // Để tính discount freeship chính xác
  }

  export interface VoucherPreviewResponse {
    message: string;
    discount: number;
    voucher: {
      id: string;
      code: string;
      title: string;
      description: string;
      voucherType: "product" | "freeship";
      minOrderValue: number;
      discountValue: number;
      storeName: string;
      storeCategory: string;
      usagePercent: number;
      used: boolean;
    };
  }

  // Interface cho voucher khả dụng trong checkout
  export interface AvailableVoucher {
    id: string;
    code: string;
    title: string;
    description: string;
    condition: string;
    voucherType: "product" | "freeship";
    discountType: "percent" | "fixed";
    discountValue: number;
    maxDiscount?: number;
    minOrderValue: number;
    storeName: string;
    storeCategory: string;
    isGlobal: boolean;
    discount: number; // Discount đã tính toán sẵn
    usagePercent: number;
    used: boolean;
  }

  export interface AvailableVouchersResponse {
    productVouchers: AvailableVoucher[];
    freeshipVouchers: AvailableVoucher[];
    subtotal: number;
  }

  const voucherApi = {
    // Lấy danh sách voucher khả dụng
    getAvailableVouchers: () => axiosClient.get<VoucherType[]>("/api/vouchers"),

    // Lấy tất cả voucher cho admin (bao gồm cả đã khóa)
    getAllVouchers: () => axiosClient.get<VoucherType[]>("/api/vouchers/all"),

    // Lấy danh sách voucher khả dụng cho checkout (dựa trên selectedItems)
    getAvailableVouchersForCheckout: (data: { subtotal?: number; selectedItems?: string[] }) =>
      axiosClient.post<AvailableVouchersResponse>("/api/vouchers/checkout", data),

    // Tạo voucher mới
    createVoucher: (data: VoucherType) => axiosClient.post<VoucherType>("/api/vouchers", data),

    // Cập nhật voucher
    updateVoucher: (id: string, data: VoucherType) =>
      axiosClient.put<VoucherType>(`/api/vouchers/${id}`, data),

    // Bật/tắt khóa voucher
    toggleVoucherStatus: (id: string) =>
      axiosClient.put<{ message: string; voucher: VoucherType }>(`/api/vouchers/${id}/toggle-status`),

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
