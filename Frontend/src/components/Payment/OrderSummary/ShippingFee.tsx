import React from "react";

interface ShippingFeeProps {
  shippingFee: number;
}

const ShippingFee: React.FC<ShippingFeeProps> = ({ shippingFee }) => {
  return (
    <div className="flex justify-between text-gray-700 mb-4">
      <span>Phí vận chuyển</span>
      <span className="text-green-600 font-medium">
        {shippingFee > 0
          ? `${shippingFee.toLocaleString("vi-VN")}₫`
          : "Miễn phí"}
      </span>
    </div>
  );
};

export default ShippingFee;
