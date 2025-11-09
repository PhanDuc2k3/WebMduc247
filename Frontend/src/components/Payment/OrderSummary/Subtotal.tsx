import React from "react";
import { Package } from "lucide-react";

interface SubtotalProps {
  subtotal: number;
}

const Subtotal: React.FC<SubtotalProps> = ({ subtotal }) => {
  return (
    <div className="flex justify-between items-center text-gray-900 mb-3 gap-2">
      <span className="font-semibold flex items-center gap-2 text-sm sm:text-base">
        <Package className="w-4 h-4 sm:w-5 sm:h-5" />
        Tạm tính
      </span>
      <span className="font-bold text-base sm:text-lg break-words">{subtotal.toLocaleString("vi-VN")}₫</span>
    </div>
  );
};

export default Subtotal;
