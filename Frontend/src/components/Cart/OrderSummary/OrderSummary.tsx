import React from "react";
import { useNavigate } from "react-router-dom";

interface OrderSummaryProps {
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  voucherId?: string; // thêm props voucherId nếu có
}

const OrderSummary: React.FC<OrderSummaryProps> = ({
  subtotal,
  discount,
  shippingFee,
  total,
  voucherId,
}) => {
  const navigate = useNavigate();

  const handleCheckout = () => {
    // Lưu dữ liệu vào localStorage
    const voucherData = {
      voucherId: voucherId || null,
      discount,
    };

    localStorage.setItem("appliedVoucher", JSON.stringify(voucherData));
    console.log("Voucher saved:", voucherData);

    // Chuyển hướng sang trang checkout
    navigate("/checkout");
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="font-semibold text-lg mb-4">Tóm tắt đơn hàng</div>

      <div className="flex justify-between text-gray-700 mb-2">
        <span>Tạm tính</span>
        <span className="font-medium">{subtotal.toLocaleString("vi-VN")}₫</span>
      </div>

      <div className="flex justify-between text-gray-700 mb-2">
        <span>Giảm giá</span>
        <span className="text-red-500 font-medium">
          -{discount.toLocaleString("vi-VN")}₫
        </span>
      </div>

      <div className="flex justify-between text-gray-700 mb-4">
        <span>Phí vận chuyển</span>
        <span className="text-green-600 font-medium">
          {shippingFee > 0
            ? `${shippingFee.toLocaleString("vi-VN")}₫`
            : "Miễn phí"}
        </span>
      </div>

      <div className="border-t pt-4 flex justify-between items-center text-lg font-bold">
        <span>Tổng cộng</span>
        <span className="text-red-500">{total.toLocaleString("vi-VN")}₫</span>
      </div>

      <button
        onClick={handleCheckout}
        className="w-full mt-6 bg-blue-600 text-white py-3 rounded font-semibold text-lg hover:bg-blue-700 transition"
      >
        Thanh toán
      </button>
    </div>
  );
};

export default OrderSummary;
