import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

interface OrderSummaryProps {
  selectedItems: string[]; // ✅ danh sách id sản phẩm được chọn
  cart: any; // ✅ cart từ Cart.tsx
}

const OrderSummary: React.FC<OrderSummaryProps> = ({ selectedItems, cart }) => {
  const navigate = useNavigate();

  // ✅ Bảo vệ cart luôn là mảng
  const safeCart = Array.isArray(cart?.items) ? cart.items : [];

  // ✅ Lọc ra sản phẩm được chọn
  const selectedProducts = safeCart.filter((item: any) =>
    selectedItems.includes(item._id)
  );

  // ✅ Kiểm tra xem có nhiều cửa hàng được chọn không
  const getStoreId = (item: any): string => {
    return typeof item.storeId === "string" ? item.storeId : item.storeId?._id || "";
  };

  const storeIds = useMemo(() => {
    const ids = new Set(selectedProducts.map((item: any) => getStoreId(item)));
    return Array.from(ids);
  }, [selectedProducts]);

  const hasMultipleStores = storeIds.length > 1;

  // ✅ Tính toán giá trị đơn hàng
  const { subtotal, total } = useMemo(() => {
    const subtotal = selectedProducts.reduce((sum, item) => {
      // Sử dụng subtotal từ item nếu có, nếu không thì tính toán
      if (item.subtotal) {
        return sum + item.subtotal;
      }
      const price = item.salePrice ?? item.price ?? 0;
      const extra = item.variation?.additionalPrice ?? 0;
      const qty = item.quantity ?? 0;
      return sum + (price + extra) * qty;
    }, 0);

    const total = subtotal;
    return { subtotal, total };
  }, [selectedProducts]);

  // ✅ Thanh toán
  const handleCheckout = () => {
    if (!selectedProducts || selectedProducts.length === 0) {
      toast.warning(
        "Vui lòng chọn ít nhất một sản phẩm để thanh toán!",
        { containerId: "general-toast" }
      );
      return;
    }

    // ✅ Kiểm tra chỉ cho phép thanh toán từ 1 cửa hàng
    if (hasMultipleStores) {
      toast.error(
        "Chỉ có thể thanh toán sản phẩm từ cùng một cửa hàng!",
        { containerId: "general-toast" }
      );
      return;
    }

    // Lưu voucher nếu có
    const appliedVoucher = JSON.parse(localStorage.getItem("appliedVoucher") || "null") || {
      voucherId: null,
      discount: 0,
    };
    localStorage.setItem("appliedVoucher", JSON.stringify(appliedVoucher));

    // Lưu sản phẩm được chọn
    localStorage.setItem("checkoutItems", JSON.stringify(selectedProducts));

    // Điều hướng sang trang checkout
    navigate("/checkout");
  };

  const formatPrice = (value: number) => (value || 0).toLocaleString("vi-VN") + "₫";

  return (
    <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-2xl border-2 border-gray-200 p-6 lg:p-8 animate-fade-in-right">
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-2xl font-bold text-gray-900 gradient-text">Tóm tắt đơn hàng</h2>
      </div>

      {/* ✅ Cảnh báo nếu có nhiều cửa hàng */}
      {hasMultipleStores && (
        <div className="mb-4 p-4 bg-red-50 border-2 border-red-300 rounded-xl">
          <div className="flex items-start gap-2">
            <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={18} />
            <p className="text-sm text-red-800 font-medium">
              Bạn đang chọn sản phẩm từ {storeIds.length} cửa hàng khác nhau. Vui lòng chỉ chọn sản phẩm từ một cửa hàng để thanh toán.
            </p>
          </div>
        </div>
      )}

      {/* Total */}
      <div className="mb-6">
        <div className="flex justify-between items-center p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border-2 border-blue-300">
          <span className="text-xl font-bold text-gray-900">Tổng cộng</span>
          <span className="text-2xl font-extrabold text-red-600">
            {formatPrice(total)}
          </span>
        </div>
      </div>

      {/* Checkout button */}
      <button
        onClick={handleCheckout}
        disabled={!selectedProducts || selectedProducts.length === 0 || hasMultipleStores}
        className={`w-full py-4 rounded-xl font-bold text-lg transition-all duration-300 shadow-lg hover:shadow-xl transform ${
          selectedProducts && selectedProducts.length > 0 && !hasMultipleStores
            ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 hover:scale-105 active:scale-95"
            : "bg-gray-300 text-gray-500 cursor-not-allowed"
        }`}
      >
        {selectedProducts && selectedProducts.length > 0 ? (
          <span className="flex items-center justify-center gap-2">
            Thanh toán ({selectedProducts.length} sản phẩm)
          </span>
        ) : (
          "Vui lòng chọn sản phẩm"
        )}
      </button>

      {/* Additional info */}
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
        <p className="text-xs text-yellow-800">
          Vui lòng kiểm tra kỹ thông tin đơn hàng trước khi thanh toán.
        </p>
      </div>
    </div>
  );
};

export default OrderSummary;
