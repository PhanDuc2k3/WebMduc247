import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle } from "lucide-react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

interface SummaryItem {
  _id: string;
  storeId: string | { _id: string };
  price: number;
  salePrice?: number;
  quantity: number;
  variation?: { additionalPrice?: number };
}

interface OrderSummaryProps {
  selectedItems: string[];
  cart: { items: SummaryItem[] } | null;
  discount?: number;
}

const OrderSummary: React.FC<OrderSummaryProps> = ({ selectedItems, cart, discount = 0 }) => {
  const navigate = useNavigate();
  const [shippingMethod, setShippingMethod] = useState("standard");

  // ✅ Kiểm tra xem có nhiều cửa hàng được chọn không
  const getStoreId = (item: SummaryItem): string => {
    return typeof item.storeId === "string" ? item.storeId : item.storeId?._id || "";
  };

  // ✅ Tính toán trực tiếp từ cart.items và selectedItems để đảm bảo luôn có dữ liệu mới nhất
  const { selectedProducts, storeIds, subtotal } = useMemo(() => {
    const safeCart = Array.isArray(cart?.items) ? cart.items : [];
    const filtered = safeCart.filter((item) => selectedItems.includes(item._id));
    
    // Tính tổng tiền trực tiếp - luôn tính lại từ quantity để đảm bảo chính xác
    const calculatedSubtotal = filtered.reduce((sum, item) => {
      const price = Number(item.salePrice ?? item.price ?? 0);
      const extra = Number(item.variation?.additionalPrice ?? 0);
      const qty = Number(item.quantity) || 0;
      const itemSubtotal = (price + extra) * qty;
      return sum + itemSubtotal;
    }, 0);

    // Tính storeIds
    const ids = new Set(filtered.map((item) => getStoreId(item)));
    
    return {
      selectedProducts: filtered,
      storeIds: Array.from(ids),
      subtotal: calculatedSubtotal
    };
  }, [cart?.items, selectedItems]); // ✅ Tính toán trực tiếp từ cart.items và selectedItems

  const hasMultipleStores = storeIds.length > 1;
  const shippingFee = shippingMethod === "express" ? 49000 : subtotal >= 499000 || subtotal === 0 ? 0 : 30000;
  const total = Math.max(0, subtotal + shippingFee - discount);

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
    <div className="cart-summary animate-fade-in-right">
      <div className="cart-summary__header"><h2>Tóm tắt đơn hàng</h2></div>

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

      <div className="cart-summary__rows"><div><span>Tạm tính</span><strong>{formatPrice(subtotal)}</strong></div><label>Phương thức vận chuyển<select value={shippingMethod} onChange={(event) => setShippingMethod(event.target.value)}><option value="standard">Tiêu chuẩn - miễn phí từ 499.000₫</option><option value="express">Giao nhanh - 49.000₫</option></select></label><div><span>Phí vận chuyển</span><strong>{shippingFee ? formatPrice(shippingFee) : "Miễn phí"}</strong></div><div><span>Giảm giá</span><strong className="is-discount">-{formatPrice(discount)}</strong></div></div>
      <div className="cart-summary__total"><div><span>Tổng cộng</span><strong>{formatPrice(total)}</strong></div><small>Đã bao gồm VAT nếu có</small></div>

      {/* Checkout button */}
      <button
        onClick={handleCheckout}
        disabled={!selectedProducts || selectedProducts.length === 0 || hasMultipleStores}
        className={`cart-summary__checkout ${
          selectedProducts && selectedProducts.length > 0 && !hasMultipleStores
            ? "bg-[#4B5563] text-white hover:bg-[#374151] hover:scale-105 active:scale-95"
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

      <p className="cart-summary__preview-note">◇ Bước thanh toán được hiển thị ở chế độ xem trước</p>

      {/* Additional info */}
      <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
        <p className="text-xs text-yellow-800">
          Vui lòng kiểm tra kỹ thông tin đơn hàng trước khi thanh toán.
        </p>
      </div>
      <div className="cart-summary__payments"><span>VISA</span><span>Mastercard</span><span>Ví điện tử</span></div>
    </div>
  );
};

export default OrderSummary;
