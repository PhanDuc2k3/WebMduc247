import React from "react";

interface CartDiscountProps {
  voucherDiscount?: number; // chỉ voucher
}

const CartDiscount: React.FC<CartDiscountProps> = ({ voucherDiscount = 0 }) => {
  if (voucherDiscount <= 0) return null; // không hiển thị nếu không có voucher

  return (
    <div className="flex justify-between text-gray-700 mb-2">
      <span>Giảm giá Voucher</span>
      <span className="text-red-500 font-medium">
        -{voucherDiscount.toLocaleString("vi-VN")}₫
      </span>
    </div>
  );
};

export default CartDiscount;
