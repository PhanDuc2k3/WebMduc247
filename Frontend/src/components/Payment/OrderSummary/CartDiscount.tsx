import React from "react";

interface CartDiscountProps {
  voucherDiscount?: number; // chỉ voucher
}

const CartDiscount: React.FC<CartDiscountProps> = ({ voucherDiscount = 0 }) => {
  if (voucherDiscount <= 0) return null; // không hiển thị nếu không có voucher

  return (
    <div className="flex justify-between items-center bg-green-50 border-2 border-green-200 rounded-xl p-4 mb-3">
      <span className="font-semibold text-green-700 flex items-center gap-2">
        <span>🎁</span> Giảm giá Voucher
      </span>
      <span className="text-red-600 font-bold text-lg">
        -{voucherDiscount.toLocaleString("vi-VN")}₫
      </span>
    </div>
  );
};

export default CartDiscount;
