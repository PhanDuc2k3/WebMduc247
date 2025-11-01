import React from "react";

interface TotalAmountProps {
  total: number;
}

const TotalAmount: React.FC<TotalAmountProps> = ({ total }) => {
  return (
    <div className="flex justify-between items-center">
      <span className="text-2xl font-extrabold text-gray-900 flex items-center gap-2">
        <span>💰</span> Tổng cộng
      </span>
      <span className="text-3xl font-extrabold text-green-600">{total.toLocaleString("vi-VN")}₫</span>
    </div>
  );
};

export default TotalAmount;
