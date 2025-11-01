import React from "react";

interface ShippingFeeProps {
  shippingFee: number;
}

const ShippingFee: React.FC<ShippingFeeProps> = ({ shippingFee }) => {
  return (
    <div className="flex justify-between items-center text-gray-900 mb-3">
      <span className="font-semibold flex items-center gap-2">
        <span>🚚</span> Phí vận chuyển
      </span>
      <span className="text-green-600 font-bold text-lg">
        {shippingFee > 0
          ? `${shippingFee.toLocaleString("vi-VN")}₫`
          : "Miễn phí"}
      </span>
    </div>
  );
};

export default ShippingFee;
