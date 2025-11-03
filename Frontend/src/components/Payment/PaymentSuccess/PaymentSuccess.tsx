import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import orderApi from '../../../api/orderApi';
import paymentApi from '../../../api/paymentApi';

const PaymentSuccess: React.FC = () => {
  const [status, setStatus] = useState<'pending' | 'success' | 'fail'>('pending');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const orderCode = searchParams.get("orderCode");

    if (!orderCode || !token) {
      setStatus("fail");
      return;
    }

    const resultCode = searchParams.get("resultCode");

    // Nếu MoMo resultCode = 0 → gọi mark-paid ngay
    if (resultCode === "0") {
      const markPaid = async () => {
        try {
          const res = await paymentApi.markOrderPaid(orderCode);
          const data = res.data;
          console.log("Order marked paid:", data);
          setStatus("success");
          localStorage.removeItem("lastOrderId");
          localStorage.removeItem("lastOrderCode");
          // redirect sang trang chi tiết đơn hàng
          setTimeout(() => navigate(`/order/${data.orderId}`), 1000);
        } catch (err: any) {
          console.error("Mark paid failed:", err);
          const errorMessage = err.response?.data?.message || err.message || "Không thể đánh dấu đã thanh toán";
          alert(errorMessage);
          setStatus("fail");
        }
      };
      markPaid();
      return;
    }

    // Backup polling nếu resultCode != 0 hoặc tạm pending
    let intervalId: number;
    let timeoutId: number;

    const checkPayment = async () => {
      try {
        const res = await orderApi.getOrderByCode(orderCode);
        const data = res.data;

        if (data.paymentInfo?.status === "paid") {
          setStatus("success");
          clearInterval(intervalId);
          clearTimeout(timeoutId);
          localStorage.removeItem("lastOrderId");
          localStorage.removeItem("lastOrderCode");
          setTimeout(() => navigate(`/order/${data._id}`), 1000);
        } else if (data.paymentInfo?.status === "failed") {
          setStatus("fail");
          clearInterval(intervalId);
          clearTimeout(timeoutId);
        }
      } catch (err: any) {
        console.error("Check payment failed:", err);
        setStatus("fail");
        clearInterval(intervalId);
        clearTimeout(timeoutId);
      }
    };

    checkPayment();
    intervalId = window.setInterval(checkPayment, 3000);
    timeoutId = window.setTimeout(() => {
      setStatus("fail");
      clearInterval(intervalId);
    }, 60000);

    return () => {
      clearInterval(intervalId);
      clearTimeout(timeoutId);
    };
  }, [searchParams, navigate]);

  if (status === 'pending') return <div>Đang kiểm tra thanh toán...</div>;
  if (status === 'success') return <div>🎉 Thanh toán thành công! Đang chuyển tới chi tiết đơn hàng...</div>;
  return <div>❌ Thanh toán thất bại hoặc bị hủy</div>;
};

export default PaymentSuccess;
