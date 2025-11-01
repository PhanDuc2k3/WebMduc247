import React from "react";

interface SubtotalProps {
  subtotal: number;
}

const Subtotal: React.FC<SubtotalProps> = ({ subtotal }) => {
  return (
    <div className="flex justify-between items-center text-gray-900 mb-3">
      <span className="font-semibold flex items-center gap-2">
        <span>📦</span> Tạm tính
      </span>
      <span className="font-bold text-lg">{subtotal.toLocaleString("vi-VN")}₫</span>
    </div>
  );
};

export default Subtotal;
