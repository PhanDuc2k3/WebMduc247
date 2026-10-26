import axiosClient from "./axiosClient";
const walletApi = {
    // Lấy thông tin ví
    getWallet: () => axiosClient.get("/api/wallet"),
    // Lấy lịch sử giao dịch
    getTransactions: (page = 1, limit = 20) => axiosClient.get(`/api/wallet/transactions?page=${page}&limit=${limit}`),
    // Nạp tiền
    deposit: (data) => axiosClient.post("/api/wallet/deposit", data),
    // Gửi mã xác thực email cho rút tiền
    sendWithdrawalCode: (data) => axiosClient.post("/api/wallet/withdraw/send-code", data),
    // Rút tiền
    withdraw: (data) => axiosClient.post("/api/wallet/withdraw", data),
    // Gửi mã xác thực email cho thanh toán bằng ví
    sendPaymentCode: (data) => axiosClient.post("/api/wallet/pay/send-code", data),
    // Thanh toán bằng ví
    payWithWallet: (data) => axiosClient.post("/api/wallet/pay", data),
};
export default walletApi;
