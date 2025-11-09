import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { XCircle } from 'lucide-react';
import orderApi from '../../api/orderApi';
import paymentApi from '../../api/paymentApi';
import walletApi from '../../api/walletApi';
import { toast } from 'react-toastify';

interface VietQRData {
  qrCodeUrl: string;
  amount: number;
  accountNo: string;
  accountName: string;
  orderInfo: string;
  orderCode: string;
}

const PaymentQR: React.FC = () => {
  const [vietqrData, setVietqrData] = useState<VietQRData | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paid' | 'checking'>('pending');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const orderCode = searchParams.get('orderCode');
  const type = searchParams.get('type'); // "deposit" nếu là nạp tiền vào ví

  useEffect(() => {
    // Lấy dữ liệu QR từ localStorage
    const saved = localStorage.getItem('vietqrData');
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setVietqrData(data);
        setLoading(false);
      } catch (err) {
        console.error('Lỗi parse vietqrData:', err);
        setLoading(false);
      }
    } else {
      setLoading(false);
    }

    // Kiểm tra nếu là nạp tiền (không phải đơn hàng)
    const isDeposit = type === 'deposit' || (orderCode && orderCode.startsWith('DEP-'));

    // Polling để check trạng thái thanh toán (chỉ cho đơn hàng thực, không phải nạp tiền)
    if (orderCode && !isDeposit) {
      const checkPayment = async () => {
        try {
          const res = await orderApi.getOrderByCode(orderCode);
          const data = res.data;

          if (data.paymentInfo?.status === 'paid') {
            setPaymentStatus('paid');
            localStorage.removeItem('vietqrData');
            setTimeout(() => {
              navigate(`/order/${data._id}`);
            }, 2000);
          }
        } catch (err) {
          console.error('Check payment failed:', err);
        }
      };

      // Check ngay lập tức
      checkPayment();

      // Polling mỗi 3 giây
      const intervalId = window.setInterval(checkPayment, 3000);
      const timeoutId = window.setTimeout(() => {
        clearInterval(intervalId);
      }, 300000); // 5 phút

      return () => {
        clearInterval(intervalId);
        clearTimeout(timeoutId);
      };
    }
  }, [orderCode, navigate, type]);

  const handleMarkPaid = async () => {
    if (!orderCode) return;

    setPaymentStatus('checking');
    try {
      // Nếu là nạp tiền vào ví
      if (type === 'deposit') {
        const walletDeposit = localStorage.getItem('walletDeposit');
        if (walletDeposit) {
          const depositInfo = JSON.parse(walletDeposit);
          // Nạp tiền vào ví
          await walletApi.deposit({
            amount: depositInfo.amount,
            method: 'vietqr',
            orderCode: depositInfo.orderCode,
            description: 'Nạp tiền vào ví qua VietQR',
          });
          
          localStorage.removeItem('walletDeposit');
          localStorage.removeItem('vietqrData');
          setPaymentStatus('paid');
          setTimeout(() => {
            navigate('/wallet');
          }, 1500);
          return;
        }
      }
      
      // Xử lý thanh toán đơn hàng bình thường
      await paymentApi.markOrderPaid(orderCode);
      
      // Kiểm tra lại trạng thái
      const res = await orderApi.getOrderByCode(orderCode);
      const data = res.data;
      
      setPaymentStatus('paid');
      localStorage.removeItem('vietqrData');
      setTimeout(() => {
        navigate(`/order/${data._id}`);
      }, 1500);
    } catch (err: any) {
      console.error('Mark paid failed:', err);
      toast.error(
        <div className="flex items-center gap-2">
          <XCircle className="text-red-500" size={18} />
          <span>{err.response?.data?.message || 'Không thể đánh dấu đã thanh toán'}</span>
        </div>
      );
      setPaymentStatus('pending');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Đang tải thông tin thanh toán...</p>
        </div>
      </div>
    );
  }

  if (!vietqrData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Không tìm thấy thông tin QR code</h2>
          <p className="text-gray-600 mb-6">Vui lòng quay lại trang thanh toán và thử lại.</p>
          <button
            onClick={() => navigate('/checkout')}
            className="px-6 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors"
          >
            Quay lại thanh toán
          </button>
        </div>
      </div>
    );
  }

  if (paymentStatus === 'paid') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Thanh toán thành công!</h2>
          <p className="text-gray-600 mb-6">Đang chuyển đến trang đơn hàng...</p>
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4 bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 text-white text-center">
            <h1 className="text-3xl font-bold mb-2">Thanh toán bằng VietQR</h1>
            <p className="text-white/90">Quét mã QR để thanh toán</p>
          </div>

          <div className="p-8 space-y-6">
            {/* QR Code */}
            <div className="flex flex-col items-center">
              <div className="bg-white p-6 rounded-2xl shadow-lg border-4 border-blue-200 mb-4">
                <img
                  src={vietqrData.qrCodeUrl}
                  alt="VietQR Code"
                  className="w-64 h-64 object-contain"
                  onError={(e) => {
                    console.error('Lỗi tải QR code');
                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/256?text=QR+Code+Error';
                  }}
                />
              </div>
              <p className="text-sm text-gray-500 text-center max-w-xs">
                Mở ứng dụng ngân hàng trên điện thoại và quét mã QR để thanh toán
              </p>
            </div>

            {/* Thông tin thanh toán */}
            <div className="bg-gray-50 rounded-xl p-6 space-y-4 border-2 border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Thông tin thanh toán</h2>
              
              <div className="flex justify-between items-center py-2 border-b border-gray-300">
                <span className="text-gray-600 font-semibold">Mã đơn hàng:</span>
                <span className="text-gray-900 font-bold">{vietqrData.orderCode}</span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-gray-300">
                <span className="text-gray-600 font-semibold">Số tiền:</span>
                <span className="text-green-600 font-bold text-xl">
                  {vietqrData.amount.toLocaleString('vi-VN')}₫
                </span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-gray-300">
                <span className="text-gray-600 font-semibold">Số tài khoản:</span>
                <span className="text-gray-900 font-bold">{vietqrData.accountNo}</span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-gray-300">
                <span className="text-gray-600 font-semibold">Chủ tài khoản:</span>
                <span className="text-gray-900 font-bold">{vietqrData.accountName}</span>
              </div>

              <div className="flex justify-between items-start py-2">
                <span className="text-gray-600 font-semibold">Nội dung:</span>
                <span className="text-gray-900 font-bold text-right max-w-xs">
                  {vietqrData.orderInfo}
                </span>
              </div>
            </div>

            {/* Hướng dẫn */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
              <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                <span>📱</span> Hướng dẫn thanh toán
              </h3>
              <ol className="list-decimal list-inside space-y-2 text-blue-800 text-sm">
                <li>Mở ứng dụng ngân hàng trên điện thoại</li>
                <li>Chọn chức năng "Quét QR" hoặc "Thanh toán QR"</li>
                <li>Quét mã QR ở trên</li>
                <li>Xác nhận thông tin và hoàn tất thanh toán</li>
                <li>Nhấn nút "Tôi đã thanh toán" bên dưới sau khi thanh toán thành công</li>
              </ol>
            </div>

            {/* Nút hành động */}
            <div className="flex flex-col gap-4 pt-4">
              <button
                onClick={handleMarkPaid}
                disabled={paymentStatus === 'checking'}
                className={`w-full py-4 px-6 rounded-xl font-bold text-lg transition-all duration-300 ${
                  paymentStatus === 'checking'
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105'
                }`}
              >
                {paymentStatus === 'checking' ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                    Đang kiểm tra...
                  </span>
                ) : (
                  '✅ Tôi đã thanh toán'
                )}
              </button>

              <button
                onClick={() => navigate('/checkout')}
                className="w-full py-3 px-6 rounded-xl font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                Quay lại thanh toán
              </button>
            </div>

            {/* Lưu ý */}
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
              <p className="text-yellow-800 text-sm text-center">
                ⚠️ Vui lòng chỉ nhấn "Tôi đã thanh toán" sau khi bạn đã hoàn tất thanh toán trong ứng dụng ngân hàng
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentQR;
