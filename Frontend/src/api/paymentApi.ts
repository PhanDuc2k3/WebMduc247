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

export interface CreateVietQRPaymentData {
  amount: number;
  orderInfo: string;
  orderCode: string;
}

export interface VietQRPaymentResponse {
  qrCodeUrl: string;
  qrContent: string;
  amount: number;
  accountNo: string;
  accountName: string;
  orderInfo: string;
}

const paymentApi = {
  // Tạo thanh toán MoMo
  createMoMoPayment: (data: CreateMoMoPaymentData) =>
    axiosClient.post<MoMoPaymentResponse>("/api/payment/momo", data),

  // Tạo thanh toán VietQR
  createVietQRPayment: (data: CreateVietQRPaymentData) =>
    axiosClient.post<VietQRPaymentResponse>("/api/payment/vietqr", data),

  // Đánh dấu đơn hàng đã thanh toán (từ redirect)
  markOrderPaid: (orderCode: string) =>
    axiosClient.post(`/api/payment/mark-paid/${orderCode}`),
};

export default paymentApi;

