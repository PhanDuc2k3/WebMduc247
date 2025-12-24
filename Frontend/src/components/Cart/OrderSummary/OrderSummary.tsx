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

  // ✅ Kiểm tra xem có nhiều cửa hàng được chọn không
  const getStoreId = (item: any): string => {
    return typeof item.storeId === "string" ? item.storeId : item.storeId?._id || "";
  };

  // ✅ Tính toán trực tiếp từ cart.items và selectedItems để đảm bảo luôn có dữ liệu mới nhất
  const { selectedProducts, storeIds, subtotal, total } = useMemo(() => {
    const safeCart = Array.isArray(cart?.items) ? cart.items : [];
    const filtered = safeCart.filter((item: any) => selectedItems.includes(item._id));
    
    // Tính tổng tiền trực tiếp - luôn tính lại từ quantity để đảm bảo chính xác
    const calculatedSubtotal = filtered.reduce((sum, item) => {
      const price = Number(item.salePrice ?? item.price ?? 0);
      const extra = Number(item.variation?.additionalPrice ?? 0);
      const qty = Number(item.quantity) || 0;
      const itemSubtotal = (price + extra) * qty;
      return sum + itemSubtotal;
    }, 0);

    // Tính storeIds
    const ids = new Set(filtered.map((item: any) => getStoreId(item)));
    
    return {
      selectedProducts: filtered,
      storeIds: Array.from(ids),
      subtotal: calculatedSubtotal,
      total: calculatedSubtotal
    };
  }, [cart?.items, selectedItems]); // ✅ Tính toán trực tiếp từ cart.items và selectedItems

  const hasMultipleStores = storeIds.length > 1;

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
        <h2 className="text-2xl font-bold text-[#2F5FEB]">Tóm tắt đơn hàng</h2>
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
        <div className="flex justify-between items-center p-4 bg-[#2F5FEB]/5 rounded-xl border-2 border-[#2F5FEB]/40">
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
            ? "bg-[#2F5FEB] text-white hover:bg-[#244ACC] hover:scale-105 active:scale-95"
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
