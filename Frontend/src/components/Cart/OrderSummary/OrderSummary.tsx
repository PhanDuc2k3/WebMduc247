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
    <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-2xl border-2 border-gray-200 p-6 lg:p-8 animate-fade-in-right">
      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">📋</span>
        <h2 className="text-2xl font-bold text-gray-900 gradient-text">Tóm tắt đơn hàng</h2>
      </div>

      {/* Order details */}
      <div className="space-y-4 mb-6">
        <div className="flex justify-between items-center p-4 bg-blue-50 rounded-xl border border-blue-200">
          <span className="text-gray-700 font-semibold flex items-center gap-2">
            <span>💰</span> Tạm tính
          </span>
          <span className="font-bold text-lg text-gray-900">{formatPrice(subtotal)}</span>
        </div>

        <div className="flex justify-between items-center p-4 bg-red-50 rounded-xl border border-red-200">
          <span className="text-gray-700 font-semibold flex items-center gap-2">
            <span>🎁</span> Giảm giá
          </span>
          <span className="font-bold text-lg text-red-600">
            {discount > 0 ? `-${formatPrice(discount)}` : "0₫"}
          </span>
        </div>

        <div className={`flex justify-between items-center p-4 rounded-xl border ${
          shippingFee > 0 ? "bg-green-50 border-green-200" : "bg-purple-50 border-purple-200"
        }`}>
          <span className="text-gray-700 font-semibold flex items-center gap-2">
            <span>🚚</span> Phí vận chuyển
          </span>
          <span className={`font-bold text-lg ${shippingFee > 0 ? "text-green-600" : "text-purple-600"}`}>
            {shippingFee > 0 ? formatPrice(shippingFee) : "✨ Miễn phí"}
          </span>
        </div>
      </div>

      {/* Total */}
      <div className="border-t-2 border-gray-300 pt-6 mb-6">
        <div className="flex justify-between items-center p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border-2 border-blue-300">
          <span className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span>💳</span> Tổng cộng
          </span>
          <span className="text-2xl font-extrabold text-red-600">{formatPrice(total)}</span>
        </div>
      </div>

      {/* Checkout button */}
      <button
        onClick={handleCheckout}
        disabled={!selectedItems || selectedItems.length === 0}
        className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 ${
          selectedItems && selectedItems.length > 0
            ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700"
            : "bg-gray-300 text-gray-500 cursor-not-allowed"
        }`}
      >
        {selectedItems && selectedItems.length > 0 ? (
          <span className="flex items-center justify-center gap-2">
            <span>💳</span> Thanh toán ({selectedItems.length} sản phẩm)
          </span>
        ) : (
          "Vui lòng chọn sản phẩm"
        )}
      </button>

      {/* Additional info */}
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
        <p className="text-xs text-yellow-800 flex items-center gap-2">
          <span>⚠️</span>
          <span>Vui lòng kiểm tra kỹ thông tin đơn hàng trước khi thanh toán</span>
        </p>
      </div>
    </div>
  );
};

export default OrderSummary;
