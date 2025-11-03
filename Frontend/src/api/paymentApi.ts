import axiosClient from "./axiosClient";

export interface CreateMoMoPaymentData {
  amount: number;
  orderInfo: string;
  orderCode: string;
}

export interface MoMoPaymentResponse {
  payUrl: string;
  resultCode?: number;
  message?: string;
}

const paymentApi = {
  // Tạo thanh toán MoMo
  createMoMoPayment: (data: CreateMoMoPaymentData) =>
    axiosClient.post<MoMoPaymentResponse>("/api/payment/momo", data),

  // Đánh dấu đơn hàng đã thanh toán (từ redirect)
  markOrderPaid: (orderCode: string) =>
    axiosClient.post(`/api/payment/mark-paid/${orderCode}`),
};

export default paymentApi;

