import React from "react";

interface TotalAmountProps {
  total: number;
}

const TotalAmount: React.FC<TotalAmountProps> = ({ total }) => {
  return (
    <div className="border-t pt-4 flex justify-between items-center text-lg font-bold">
      <span>Tổng cộng</span>
      <span className="text-red-500">{total.toLocaleString("vi-VN")}₫</span>
    </div>
  );
};

export default TotalAmount;
