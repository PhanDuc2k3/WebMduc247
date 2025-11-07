import axiosClient from "./axiosClient";

export interface WalletData {
  _id: string;
  userId: string;
  balance: number;
  transactionCount: number;
}

export interface Transaction {
  _id?: string;
  type: 'deposit' | 'withdraw' | 'payment' | 'refund';
  amount: number;
  method: 'momo' | 'vietqr' | 'wallet' | 'cod' | 'system';
  orderCode?: string;
  description?: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  paymentId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface DepositData {
  amount: number;
  method: 'momo' | 'vietqr';
  orderCode?: string;
  paymentId?: string;
  description?: string;
}

export interface WithdrawData {
  amount: number;
  bankName: string;
  accountNumber: string;
}

export interface PayWithWalletData {
  orderCode: string;
  amount: number;
}

const walletApi = {
  // Lấy thông tin ví
  getWallet: () => axiosClient.get<{ wallet: WalletData }>("/api/wallet"),

  // Lấy lịch sử giao dịch
  getTransactions: (page = 1, limit = 20) =>
    axiosClient.get<{ transactions: Transaction[]; total: number; page: number; totalPages: number }>(
      `/api/wallet/transactions?page=${page}&limit=${limit}`
    ),

  // Nạp tiền
  deposit: (data: DepositData) =>
    axiosClient.post<{ message: string; wallet: { balance: number; transaction: Transaction } }>(
      "/api/wallet/deposit",
      data
    ),

  // Rút tiền
  withdraw: (data: WithdrawData) =>
    axiosClient.post<{ message: string; wallet: { balance: number; transaction: Transaction } }>(
      "/api/wallet/withdraw",
      data
    ),

  // Thanh toán bằng ví
  payWithWallet: (data: PayWithWalletData) =>
    axiosClient.post<{ message: string; wallet: { balance: number }; order: { orderCode: string; paymentStatus: string } }>(
      "/api/wallet/pay",
      data
    ),
};

export default walletApi;
