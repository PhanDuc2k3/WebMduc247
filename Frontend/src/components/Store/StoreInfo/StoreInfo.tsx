// StoreOverview.tsx
import React from "react";
import { Info, Tag as TagIcon } from "lucide-react";
import type { StoreType } from "../../../types/store";

interface StoreOverviewProps {
  store: StoreType;
}

const StoreOverview: React.FC<StoreOverviewProps> = ({ store }) => {
  if (!store) return null;

  return (
    <div className="bg-white rounded-xl md:rounded-2xl shadow-lg border-2 border-gray-100 p-4 md:p-6 lg:p-8 animate-fade-in-up">
      {/* Tiêu đề thông tin cửa hàng */}
      <div className="flex items-center gap-2 sm:gap-3 pb-4 md:pb-6">
        <Info className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-blue-600 flex-shrink-0" />
        <h2 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900">
          Thông tin cửa hàng
        </h2>
      </div>

      <div className="bg-gradient-to-br from-gray-50 to-blue-50 p-4 md:p-6 rounded-lg md:rounded-xl border border-gray-200">
        <p className="text-sm md:text-base lg:text-lg text-gray-700 leading-relaxed font-medium">
          {store.description || "Cửa hàng chưa có mô tả"}
        </p>
      </div>

      {/* Additional Info */}
      {store.customCategory && (
        <div className="pt-4 md:pt-6">
          <div className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 bg-purple-50 rounded-lg md:rounded-xl border border-purple-200">
            <TagIcon className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600 flex-shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-xs sm:text-sm font-semibold text-gray-600 mb-1">Danh mục</p>
              <p className="text-sm sm:text-base text-gray-800 break-words">{store.customCategory}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoreOverview;
