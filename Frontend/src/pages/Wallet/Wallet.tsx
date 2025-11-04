import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import walletApi, { Transaction } from '../../api/walletApi';
import paymentApi from '../../api/paymentApi';
import { Wallet, ArrowDown, ArrowUp, History, Plus } from 'lucide-react';

const WalletPage: React.FC = () => {
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [depositAmount, setDepositAmount] = useState<string>('');
  const [depositMethod, setDepositMethod] = useState<'momo' | 'vietqr'>('momo');
  const [showDeposit, setShowDeposit] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchWallet();
    fetchTransactions();
  }, []);

  const fetchWallet = async () => {
    try {
      const res = await walletApi.getWallet();
      setBalance(res.data.wallet.balance);
    } catch (err) {
      console.error('Lỗi lấy ví:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const res = await walletApi.getTransactions(1, 20);
      setTransactions(res.data.transactions);
    } catch (err) {
      console.error('Lỗi lấy lịch sử:', err);
    }
  };

  const handleDeposit = async () => {
    const amount = parseFloat(depositAmount);
    if (!amount || amount <= 0) {
      alert('Vui lòng nhập số tiền hợp lệ');
      return;
    }

    if (amount < 10000) {
      alert('Số tiền nạp tối thiểu là 10,000₫');
      return;
    }

    try {
      // Tạo order code cho nạp tiền
      const depositOrderCode = `DEP-${Date.now()}`;
      
      if (depositMethod === 'momo') {
        // Nạp bằng MoMo
        const payRes = await paymentApi.createMoMoPayment({
          amount: amount,
          orderInfo: `Nạp tiền vào ví ${amount.toLocaleString('vi-VN')}₫`,
          orderCode: depositOrderCode,
        });

        // Lưu thông tin nạp tiền vào localStorage
        localStorage.setItem('walletDeposit', JSON.stringify({
          amount,
          method: 'momo',
          orderCode: depositOrderCode,
        }));

        window.location.href = payRes.data.payUrl;
      } else if (depositMethod === 'vietqr') {
        // Nạp bằng VietQR
        const payRes = await paymentApi.createVietQRPayment({
          amount: amount,
          orderInfo: `Nạp tiền vào ví ${amount.toLocaleString('vi-VN')}₫`,
          orderCode: depositOrderCode,
        });

        // Lưu thông tin nạp tiền vào localStorage
        localStorage.setItem('walletDeposit', JSON.stringify({
          amount,
          method: 'vietqr',
          orderCode: depositOrderCode,
        }));

        // Lưu QR data
        localStorage.setItem('vietqrData', JSON.stringify({
          ...payRes.data,
          orderCode: depositOrderCode,
        }));

        navigate(`/payment-qr?orderCode=${encodeURIComponent(depositOrderCode)}&type=deposit`);
      }
    } catch (err: any) {
      console.error('Lỗi nạp tiền:', err);
      alert(err.response?.data?.message || 'Không thể tạo thanh toán');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4 bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 border-2 border-gray-200">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-3">
            <Wallet className="text-purple-600" size={32} />
            Ví của tôi
          </h1>
          <p className="text-gray-600">Quản lý số dư và giao dịch</p>
        </div>

        {/* Balance Card */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl shadow-xl p-8 text-white">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-white/80 text-sm mb-2">Số dư hiện tại</p>
              <p className="text-4xl font-bold">{balance.toLocaleString('vi-VN')}₫</p>
            </div>
            <button
              onClick={() => setShowDeposit(!showDeposit)}
              className="bg-white text-purple-600 px-6 py-3 rounded-xl font-bold hover:bg-purple-50 transition-all flex items-center gap-2"
            >
              <Plus size={20} />
              Nạp tiền
            </button>
          </div>
        </div>

        {/* Deposit Form */}
        {showDeposit && (
          <div className="bg-white rounded-2xl shadow-xl p-6 border-2 border-gray-200 animate-fade-in">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Nạp tiền vào ví</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Số tiền nạp (VNĐ)
                </label>
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="Nhập số tiền (tối thiểu 10,000₫)"
                  min="10000"
                  step="1000"
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Phương thức thanh toán
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setDepositMethod('momo')}
                    className={`p-4 border-2 rounded-xl font-semibold transition-all ${
                      depositMethod === 'momo'
                        ? 'border-pink-500 bg-pink-50 text-pink-700'
                        : 'border-gray-300 hover:border-pink-300'
                    }`}
                  >
                    Ví MoMo
                  </button>
                  <button
                    onClick={() => setDepositMethod('vietqr')}
                    className={`p-4 border-2 rounded-xl font-semibold transition-all ${
                      depositMethod === 'vietqr'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 hover:border-blue-300'
                    }`}
                  >
                    VietQR
                  </button>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleDeposit}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:from-purple-700 hover:to-blue-700 transition-all"
                >
                  Xác nhận nạp tiền
                </button>
                <button
                  onClick={() => setShowDeposit(false)}
                  className="px-6 py-3 border-2 border-gray-300 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 transition-all"
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Transactions History */}
        <div className="bg-white rounded-2xl shadow-xl p-6 border-2 border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <History className="text-purple-600" size={24} />
            <h2 className="text-xl font-bold text-gray-900">Lịch sử giao dịch</h2>
          </div>

          {transactions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>Chưa có giao dịch nào</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transactions.map((transaction) => (
                <div
                  key={transaction._id || Math.random()}
                  className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        transaction.type === 'deposit'
                          ? 'bg-green-100'
                          : transaction.type === 'payment'
                          ? 'bg-red-100'
                          : 'bg-blue-100'
                      }`}
                    >
                      {transaction.type === 'deposit' ? (
                        <ArrowDown className="text-green-600" size={20} />
                      ) : (
                        <ArrowUp className="text-red-600" size={20} />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        {transaction.description || transaction.type}
                      </p>
                      <p className="text-sm text-gray-500">
                        {transaction.orderCode && `Mã: ${transaction.orderCode}`}
                        {transaction.createdAt &&
                          ` • ${new Date(transaction.createdAt).toLocaleString('vi-VN')}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-bold text-lg ${
                        transaction.type === 'deposit' ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {transaction.type === 'deposit' ? '+' : '-'}
                      {transaction.amount.toLocaleString('vi-VN')}₫
                    </p>
                    <p className="text-xs text-gray-500 capitalize">
                      {transaction.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WalletPage;
