import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const PaymentSuccess: React.FC = () => {
  const [status, setStatus] = useState<'pending' | 'success' | 'fail'>('pending');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const orderCode = searchParams.get("orderCode"); // <-- dùng orderCode từ URL

    if (!orderCode || !token) {
      setStatus("fail");
      return;
    }

    const resultCode = searchParams.get("resultCode");

    // Nếu MoMo resultCode = 0 → gọi mark-paid ngay
    if (resultCode === "0") {
      const markPaid = async () => {
        try {
          const res = await fetch(`http://localhost:5000/api/payment/mark-paid/${orderCode}`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.message || "Không thể mark paid");
          console.log("Order marked paid:", data);
          setStatus("success");
          localStorage.removeItem("lastOrderId");
          localStorage.removeItem("lastOrderCode");
          // redirect sang trang chi tiết đơn hàng
          setTimeout(() => navigate(`/order/${data.orderId}`), 1000);
        } catch (err) {
          console.error("Mark paid failed:", err);
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
        const res = await fetch(`http://localhost:5000/api/orders/code/${orderCode}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Không lấy được trạng thái");

        if (data.paymentInfo?.status === "paid") {
          setStatus("success");
          clearInterval(intervalId);
          clearTimeout(timeoutId);
          setTimeout(() => navigate(`/order/${data._id}`), 1000);
        } else if (data.paymentInfo?.status === "failed") {
          setStatus("fail");
          clearInterval(intervalId);
          clearTimeout(timeoutId);
        }
      } catch (err) {
        console.error(err);
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
