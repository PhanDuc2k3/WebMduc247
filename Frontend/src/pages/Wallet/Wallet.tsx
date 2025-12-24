import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import walletApi, { Transaction } from '../../api/walletApi';
import paymentApi from '../../api/paymentApi';
import { Wallet, ArrowDown, ArrowUp, History, Plus, Minus, Mail } from 'lucide-react';
import { toast } from 'react-toastify';

const WalletPage: React.FC = () => {
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [depositAmount, setDepositAmount] = useState<string>('');
  const [depositMethod, setDepositMethod] = useState<'momo' | 'vietqr'>('momo');
  const [showDeposit, setShowDeposit] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [bankName, setBankName] = useState<string>('');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [emailCode, setEmailCode] = useState<string>('');
  const [showEmailCodeInput, setShowEmailCodeInput] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);

  // Danh sách ngân hàng Việt Nam
  const vietnamBanks = [
    'Vietcombank (VCB)',
    'BIDV',
    'VietinBank (CTG)',
    'Agribank',
    'Techcombank (TCB)',
    'MBBank (MB)',
    'ACB',
    'VPBank',
    'TPBank',
    'HDBank',
    'Sacombank (STB)',
    'VietABank',
    'Eximbank',
    'SHB',
    'MSB',
    'VIB',
    'SeABank',
    'PGBank',
    'NamABank',
    'OCB',
    'PVcomBank',
    'BacABank',
    'SCB',
    'DongABank',
    'GPBank',
    'Kienlongbank',
    'LienVietPostBank',
    'VietBank',
    'ABBank',
    'NCB',
    'OceanBank',
    'PublicBank',
    'Shinhan Bank',
    'Woori Bank',
    'HSBC Vietnam',
    'Standard Chartered',
    'Hong Leong Bank',
    'ANZ Vietnam',
    'Indovina Bank',
    'CIMB Bank',
    'UOB Vietnam',
  ];
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
      toast.error('Vui lòng nhập số tiền hợp lệ');
      return;
    }

    if (amount < 10000) {
      toast.error('Số tiền nạp tối thiểu là 10,000₫');
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
      toast.error(err.response?.data?.message || 'Không thể tạo thanh toán');
    }
  };

  const handleSendWithdrawalCode = async () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) {
      toast.error('Vui lòng nhập số tiền hợp lệ');
      return;
    }

    if (amount < 10000) {
      toast.error('Số tiền rút tối thiểu là 10,000₫');
      return;
    }

    if (amount > balance) {
      toast.error('Số dư không đủ để rút tiền');
      return;
    }

    if (!bankName) {
      toast.error('Vui lòng chọn ngân hàng');
      return;
    }

    if (!accountNumber || accountNumber.trim() === '') {
      toast.error('Vui lòng nhập số tài khoản ngân hàng');
      return;
    }

    setSendingCode(true);
    try {
      await walletApi.sendWithdrawalCode({
        amount: amount,
        bankName: bankName,
        accountNumber: accountNumber.trim(),
      });

      setShowEmailCodeInput(true);
      toast.success('Đã gửi mã xác thực đến email của bạn. Vui lòng kiểm tra email và nhập mã.');
    } catch (err: any) {
      console.error('Lỗi gửi mã:', err);
      toast.error(err.response?.data?.message || 'Không thể gửi mã xác thực');
    } finally {
      setSendingCode(false);
    }
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0) {
      toast.error('Vui lòng nhập số tiền hợp lệ');
      return;
    }

    if (!emailCode || emailCode.length !== 6) {
      toast.error('Vui lòng nhập mã xác thực 6 chữ số từ email');
      return;
    }

    setWithdrawLoading(true);
    try {
      const res = await walletApi.withdraw({
        amount: amount,
        bankName: bankName,
        accountNumber: accountNumber.trim(),
        emailCode: emailCode,
      });

      setBalance(res.data.wallet.balance);
      setWithdrawAmount('');
      setBankName('');
      setAccountNumber('');
      setEmailCode('');
      setShowEmailCodeInput(false);
      setShowWithdraw(false);
      toast.success('Yêu cầu rút tiền đã được gửi, vui lòng chờ xử lý!');
      
      // Refresh transactions
      fetchTransactions();
    } catch (err: any) {
      console.error('Lỗi rút tiền:', err);
      toast.error(err.response?.data?.message || 'Không thể rút tiền');
    } finally {
      setWithdrawLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-12 w-12 md:h-16 md:w-16 border-t-4 border-b-4 border-[#2F5FEB]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-3 md:py-4 lg:py-8 px-3 md:px-4 bg-gradient-to-br from-[#2F5FEB]/5 via-white to-[#2F5FEB]/5">
      <div className="max-w-4xl mx-auto space-y-3 md:space-y-4 lg:space-y-6">
        {/* Header */}
        <div className="bg-white rounded-xl md:rounded-2xl shadow-xl p-4 md:p-6 border-2 border-gray-200">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-1 md:mb-2 text-[#2F5FEB] flex items-center gap-2 md:gap-3">
            <Wallet className="text-[#2F5FEB]" size={20} />
            Ví của tôi
          </h1>
          <p className="text-gray-600 text-sm md:text-base">
            Quản lý <span className="text-[#2F5FEB] font-semibold">số dư và giao dịch</span>
          </p>
        </div>

        {/* Balance Card */}
        <div className="bg-[#2F5FEB] rounded-xl md:rounded-2xl shadow-xl p-4 md:p-6 lg:p-8 text-white">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex-1">
              <p className="text-white/80 text-xs sm:text-sm mb-1 md:mb-2">Số dư hiện tại</p>
              <p className="text-2xl sm:text-3xl md:text-4xl font-bold">{balance.toLocaleString('vi-VN')}₫</p>
            </div>
            <div className="flex gap-2 md:gap-3 w-full sm:w-auto">
              <button
                onClick={() => {
                  setShowDeposit(!showDeposit);
                  setShowWithdraw(false);
                }}
                className="flex-1 sm:flex-none bg-white text-[#2F5FEB] px-4 py-2 md:px-6 md:py-3 rounded-lg md:rounded-xl font-bold text-xs sm:text-sm md:text-base hover:bg-[#e5efff] transition-all flex items-center justify-center gap-1.5 md:gap-2"
              >
                <Plus size={16} />
                Nạp tiền
              </button>
              <button
                onClick={() => {
                  setShowWithdraw(!showWithdraw);
                  setShowDeposit(false);
                  if (!showWithdraw) {
                    // Reset form when opening
                    setEmailCode('');
                    setShowEmailCodeInput(false);
                  }
                }}
                className="flex-1 sm:flex-none bg-transparent text-white border-2 border-white/70 px-4 py-2 md:px-6 md:py-3 rounded-lg md:rounded-xl font-bold text-xs sm:text-sm md:text-base hover:bg-white/10 transition-all flex items-center justify-center gap-1.5 md:gap-2"
              >
                <Minus size={16} />
                Rút tiền
              </button>
            </div>
          </div>
        </div>

        {/* Deposit Form */}
        {showDeposit && (
          <div className="bg-white rounded-xl md:rounded-2xl shadow-xl p-4 md:p-6 border-2 border-gray-200 animate-fade-in">
            <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-3 md:mb-4">Nạp tiền vào ví</h2>
            
            <div className="space-y-3 md:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 md:mb-2">
                  Số tiền nạp (VNĐ)
                </label>
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="Nhập số tiền (tối thiểu 10,000₫)"
                  min="10000"
                  step="1000"
                  className="w-full px-3 py-2.5 md:px-4 md:py-3 border-2 border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-[#2F5FEB] focus:border-transparent text-sm md:text-base"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 md:mb-2">
                  Phương thức thanh toán
                </label>
                <div className="grid grid-cols-2 gap-2 md:gap-4">
                  <button
                    onClick={() => setDepositMethod('momo')}
                    className={`p-3 md:p-4 border-2 rounded-lg md:rounded-xl font-semibold text-xs sm:text-sm md:text-base transition-all ${
                      depositMethod === 'momo'
                        ? 'border-[#2F5FEB] bg-[#2F5FEB]/10 text-[#2F5FEB]'
                        : 'border-gray-300 hover:border-[#2F5FEB]/60'
                    }`}
                  >
                    Ví MoMo
                  </button>
                  <button
                    onClick={() => setDepositMethod('vietqr')}
                    className={`p-3 md:p-4 border-2 rounded-lg md:rounded-xl font-semibold text-xs sm:text-sm md:text-base transition-all ${
                      depositMethod === 'vietqr'
                        ? 'border-[#2F5FEB] bg-[#2F5FEB]/10 text-[#2F5FEB]'
                        : 'border-gray-300 hover:border-[#2F5FEB]/60'
                    }`}
                  >
                    VietQR
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
                <button
                  onClick={handleDeposit}
                  className="flex-1 bg-[#2F5FEB] text-white px-4 py-2.5 md:px-6 md:py-3 rounded-lg md:rounded-xl font-bold text-xs sm:text-sm md:text-base hover:bg-[#244ACC] transition-all"
                >
                  Xác nhận nạp tiền
                </button>
                <button
                  onClick={() => setShowDeposit(false)}
                  className="px-4 py-2.5 md:px-6 md:py-3 border-2 border-gray-300 rounded-lg md:rounded-xl font-semibold text-xs sm:text-sm md:text-base text-gray-700 hover:bg-gray-50 transition-all"
                >
                  Hủy
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Withdraw Form */}
        {showWithdraw && (
          <div className="bg-white rounded-xl md:rounded-2xl shadow-xl p-4 md:p-6 border-2 border-gray-200 animate-fade-in">
            <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-3 md:mb-4">Rút tiền từ ví</h2>
            
            <div className="space-y-3 md:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 md:mb-2">
                  Tên ngân hàng <span className="text-red-500">*</span>
                </label>
                <select
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  disabled={showEmailCodeInput}
                  className="w-full px-3 py-2.5 md:px-4 md:py-3 border-2 border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-[#2F5FEB] focus:border-transparent text-sm md:text-base bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                >
                  <option value="">-- Chọn ngân hàng --</option>
                  {vietnamBanks.map((bank) => (
                    <option key={bank} value={bank}>
                      {bank}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 md:mb-2">
                  Số tài khoản ngân hàng <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="Nhập số tài khoản ngân hàng"
                  disabled={showEmailCodeInput}
                  className="w-full px-3 py-2.5 md:px-4 md:py-3 border-2 border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-[#2F5FEB] focus:border-transparent text-sm md:text-base disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 md:mb-2">
                  Số tiền rút (VNĐ) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder={`Nhập số tiền (tối thiểu 10,000₫, tối đa ${balance.toLocaleString('vi-VN')}₫)`}
                  min="10000"
                  max={balance}
                  step="1000"
                  disabled={showEmailCodeInput}
                  className="w-full px-3 py-2.5 md:px-4 md:py-3 border-2 border-gray-300 rounded-lg md:rounded-xl focus:ring-2 focus:ring-[#2F5FEB] focus:border-transparent text-sm md:text-base disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Số dư khả dụng: <span className="font-bold text-[#2F5FEB]">{balance.toLocaleString('vi-VN')}₫</span>
                </p>
              </div>

              {showEmailCodeInput && (
                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-1.5 sm:mb-2 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#2F5FEB]" />
                    <span>Mã xác thực từ email <span className="text-red-500">*</span></span>
                  </label>
                  <input
                    type="text"
                    value={emailCode}
                    onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    className="w-full px-3 py-2.5 sm:px-4 sm:py-3 border-2 border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm sm:text-base text-center text-xl sm:text-2xl font-mono tracking-widest"
                  />
                  <p className="text-xs text-gray-500 mt-1.5 sm:mt-2">
                    Mã xác thực đã được gửi đến email của bạn. Vui lòng kiểm tra hộp thư.
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
                {!showEmailCodeInput ? (
                  <>
                    <button
                      onClick={handleSendWithdrawalCode}
                      disabled={sendingCode}
                      className="flex-1 bg-[#2F5FEB] text-white px-4 py-2.5 md:px-6 md:py-3 rounded-lg md:rounded-xl font-bold text-xs sm:text-sm md:text-base hover:bg-[#244ACC] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sendingCode ? 'Đang gửi mã...' : 'Gửi mã xác thực'}
                    </button>
                    <button
                      onClick={() => {
                        setShowWithdraw(false);
                        setWithdrawAmount('');
                        setBankName('');
                        setAccountNumber('');
                        setEmailCode('');
                        setShowEmailCodeInput(false);
                      }}
                      className="px-4 py-2.5 md:px-6 md:py-3 border-2 border-gray-300 rounded-lg md:rounded-xl font-semibold text-xs sm:text-sm md:text-base text-gray-700 hover:bg-gray-50 transition-all"
                    >
                      Hủy
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={handleWithdraw}
                      disabled={withdrawLoading || emailCode.length !== 6}
                      className="flex-1 bg-[#2F5FEB] text-white px-4 py-2.5 md:px-6 md:py-3 rounded-lg md:rounded-xl font-bold text-xs sm:text-sm md:text-base hover:bg-[#244ACC] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {withdrawLoading ? 'Đang xử lý...' : 'Xác nhận rút tiền'}
                    </button>
                    <button
                      onClick={handleSendWithdrawalCode}
                      disabled={sendingCode}
                      className="px-4 py-2.5 md:px-6 md:py-3 border-2 border-[#2F5FEB]/60 text-[#2F5FEB] rounded-lg md:rounded-xl font-semibold text-xs sm:text-sm md:text-base hover:bg-[#2F5FEB]/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sendingCode ? 'Đang gửi...' : 'Gửi lại mã'}
                    </button>
                    <button
                      onClick={() => {
                        setShowWithdraw(false);
                        setWithdrawAmount('');
                        setBankName('');
                        setAccountNumber('');
                        setEmailCode('');
                        setShowEmailCodeInput(false);
                      }}
                      className="px-4 py-2.5 md:px-6 md:py-3 border-2 border-gray-300 rounded-lg md:rounded-xl font-semibold text-xs sm:text-sm md:text-base text-gray-700 hover:bg-gray-50 transition-all"
                    >
                      Hủy
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Transactions History */}
        <div className="bg-white rounded-xl md:rounded-2xl shadow-xl p-4 md:p-6 border-2 border-gray-200">
          <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
            <History className="text-[#2F5FEB]" size={20} />
            <h2 className="text-lg md:text-xl font-bold text-[#2F5FEB]">Lịch sử giao dịch</h2>
          </div>

          {transactions.length === 0 ? (
            <div className="text-center py-8 md:py-12 text-gray-500">
              <p className="text-sm md:text-base">Chưa có giao dịch nào</p>
            </div>
          ) : (
            <div className="space-y-2 md:space-y-3">
              {transactions.map((transaction) => (
                <div
                  key={transaction._id || Math.random()}
                  className="flex items-center justify-between p-3 md:p-4 border-2 border-gray-200 rounded-lg md:rounded-xl hover:bg-gray-50 transition-all gap-2 md:gap-4"
                >
                  <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
                    <div
                      className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                        transaction.type === 'deposit' || transaction.type === 'refund'
                          ? 'bg-green-100'
                          : transaction.type === 'withdraw'
                          ? 'bg-orange-100'
                          : transaction.type === 'payment'
                          ? 'bg-red-100'
                          : 'bg-blue-100'
                      }`}
                    >
                      {transaction.type === 'deposit' || transaction.type === 'refund' ? (
                        <ArrowDown className="text-green-600" size={18} />
                      ) : transaction.type === 'withdraw' ? (
                        <ArrowUp className="text-orange-600" size={18} />
                      ) : (
                        <ArrowUp className="text-red-600" size={18} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-xs sm:text-sm md:text-base truncate">
                        {transaction.description || transaction.type}
                      </p>
                      <p className="text-[10px] sm:text-xs text-gray-500 truncate">
                        {transaction.orderCode && `Mã: ${transaction.orderCode}`}
                        {transaction.orderCode && transaction.createdAt && ' • '}
                        {transaction.createdAt &&
                          new Date(transaction.createdAt).toLocaleString('vi-VN', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p
                      className={`font-bold text-sm sm:text-base md:text-lg ${
                        transaction.type === 'deposit' || transaction.type === 'refund'
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}
                    >
                      {transaction.type === 'deposit' || transaction.type === 'refund' ? '+' : '-'}
                      {transaction.amount.toLocaleString('vi-VN')}₫
                    </p>
                    <p className="text-[10px] sm:text-xs text-gray-500 capitalize">
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
