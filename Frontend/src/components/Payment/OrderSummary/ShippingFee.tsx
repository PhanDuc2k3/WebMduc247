import React from "react";

interface ShippingFeeProps {
  shippingFee: number;
  shippingDiscount?: number;
}

const ShippingFee: React.FC<ShippingFeeProps> = ({ shippingFee, shippingDiscount = 0 }) => {
  const finalShippingFee = Math.max(0, shippingFee - shippingDiscount);
  
  return (
    <div className="flex justify-between items-center bg-blue-50 border-2 border-blue-200 rounded-lg sm:rounded-xl p-3 sm:p-4 mb-3 gap-2">
      <div className="flex flex-col min-w-0">
        <span className="font-semibold text-blue-700 flex items-center gap-2 text-xs sm:text-sm">
          Phí vận chuyển
        </span>
        {shippingDiscount > 0 && (
          <span className="text-xs text-green-600 font-semibold">
            Giảm: -{shippingDiscount.toLocaleString("vi-VN")}₫
          </span>
        )}
      </div>
      <div className="flex flex-col items-end flex-shrink-0">
        {shippingDiscount > 0 && (
          <span className="text-xs sm:text-sm text-gray-400 line-through">
            {shippingFee.toLocaleString("vi-VN")}₫
          </span>
        )}
        <span className="text-blue-600 font-bold text-base sm:text-lg break-words">
          {finalShippingFee.toLocaleString("vi-VN")}₫
        </span>
      </div>
    </div>
  );
};

export default ShippingFee;
