import React from "react";
import { Building2 } from "lucide-react";

interface PlatformFeeProps {
  platformFee: number;
}

const PlatformFee: React.FC<PlatformFeeProps> = ({ platformFee }) => {
  if (platformFee <= 0) return null;

  return (
    <div className="flex justify-between items-center bg-purple-50 border-2 border-purple-200 rounded-lg sm:rounded-xl p-3 sm:p-4 mb-3 gap-2">
      <span className="font-semibold text-purple-700 flex items-center gap-2 text-xs sm:text-sm">
        <Building2 className="w-4 h-4 sm:w-5 sm:h-5" />
        Phí sàn (10%)
      </span>
      <span className="text-purple-600 font-bold text-base sm:text-lg break-words">
        {platformFee.toLocaleString("vi-VN")}₫
      </span>
    </div>
  );
};

export default PlatformFee;

