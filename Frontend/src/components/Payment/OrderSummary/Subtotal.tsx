import React from "react";

interface SubtotalProps {
  subtotal: number;
}

const Subtotal: React.FC<SubtotalProps> = ({ subtotal }) => {
  return (
    <div className="flex justify-between text-gray-700 mb-2">
      <span>Tạm tính</span>
      <span className="font-medium">{subtotal.toLocaleString("vi-VN")}₫</span>
    </div>
  );
};

export default Subtotal;
