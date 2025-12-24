import React from "react";

interface TotalAmountProps {
  total: number;
}

const TotalAmount: React.FC<TotalAmountProps> = ({ total }) => {
  return (
    <div className="flex justify-between items-center gap-2">
      <span className="text-xl sm:text-2xl font-extrabold text-gray-900 flex items-center gap-2">
        Tổng cộng
      </span>
      <span className="text-2xl sm:text-3xl font-extrabold text-red-600 break-words">{total.toLocaleString("vi-VN")}₫</span>
    </div>
  );
};

export default TotalAmount;
