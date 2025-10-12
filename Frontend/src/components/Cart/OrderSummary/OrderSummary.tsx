import React from "react";
import { useNavigate } from "react-router-dom";

interface OrderSummaryProps {
  subtotal: number;
  discount: number;
  shippingFee: number;
  total: number;
  voucherId?: string;
  selectedItems: string[];
}

const OrderSummary: React.FC<OrderSummaryProps> = ({
  subtotal,
  discount,
  shippingFee,
  total,
  voucherId,
  selectedItems,
}) => {
  const navigate = useNavigate();

  const handleCheckout = () => {
    if (!selectedItems || selectedItems.length === 0) {
      alert("Vui lòng chọn ít nhất một sản phẩm để thanh toán!");
      return;
    }

    // Lưu voucher nếu có
    localStorage.setItem(
      "appliedVoucher",
      JSON.stringify({
        voucherId: voucherId || null,
        discount: discount || 0,
      })
    );

    // Lưu sản phẩm được chọn
    localStorage.setItem("checkoutItems", JSON.stringify(selectedItems));

    // Điều hướng sang trang checkout
    navigate("/checkout");
  };

  const formatPrice = (value: number) => value.toLocaleString("vi-VN") + "₫";

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="font-semibold text-lg mb-4">Tóm tắt đơn hàng</h2>

      <div className="flex justify-between text-gray-700 mb-2">
        <span>Tạm tính</span>
        <span className="font-medium">{formatPrice(subtotal)}</span>
      </div>

      <div className="flex justify-between text-gray-700 mb-2">
        <span>Giảm giá</span>
        <span className="text-red-500 font-medium">-{formatPrice(discount)}</span>
      </div>

      <div className="flex justify-between text-gray-700 mb-4">
        <span>Phí vận chuyển</span>
        <span className={`font-medium ${shippingFee > 0 ? "text-green-600" : ""}`}>
          {shippingFee > 0 ? formatPrice(shippingFee) : "Miễn phí"}
        </span>
      </div>

      <div className="border-t pt-4 flex justify-between items-center text-lg font-bold">
        <span>Tổng cộng</span>
        <span className="text-red-500">{formatPrice(total)}</span>
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
