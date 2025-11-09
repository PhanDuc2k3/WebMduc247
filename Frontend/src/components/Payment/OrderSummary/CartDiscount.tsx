import React from "react";

interface CartDiscountProps {
  voucherDiscount?: number; // chỉ voucher
}

const CartDiscount: React.FC<CartDiscountProps> = ({ voucherDiscount = 0 }) => {
  if (voucherDiscount <= 0) return null; // không hiển thị nếu không có voucher

  return (
    <div className="flex justify-between items-center bg-green-50 border-2 border-green-200 rounded-lg sm:rounded-xl p-3 sm:p-4 mb-3 gap-2">
      <span className="font-semibold text-green-700 flex items-center gap-2 text-xs sm:text-sm">
        Giảm giá Voucher
      </span>
      <span className="text-red-600 font-bold text-base sm:text-lg break-words">
        -{voucherDiscount.toLocaleString("vi-VN")}₫
      </span>
    </div>
  );
};

export default CartDiscount;
