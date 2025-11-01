// StoreOverview.tsx
import React from "react";
import type { StoreType } from "../../../types/store";

interface StoreOverviewProps {
  store: StoreType;
}

const StoreOverview: React.FC<StoreOverviewProps> = ({ store }) => {
  if (!store) return null;

  return (
    <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 p-6 lg:p-8 animate-fade-in-up">
      {/* Tiêu đề thông tin cửa hàng */}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">ℹ️</span>
        <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 gradient-text">
          Thông tin cửa hàng
        </h2>
      </div>

      <div className="bg-gradient-to-br from-gray-50 to-blue-50 p-6 rounded-xl border border-gray-200">
        <p className="text-base lg:text-lg text-gray-700 leading-relaxed font-medium">
          {store.description || "Cửa hàng chưa có mô tả"}
        </p>
      </div>

      {/* Additional Info */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {store.storeAddress && (
          <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-xl border border-blue-200">
            <span className="text-2xl">📍</span>
            <div>
              <p className="text-sm font-semibold text-gray-600 mb-1">Địa chỉ</p>
              <p className="text-gray-800">{store.storeAddress}</p>
            </div>
          </div>
        )}
        
        {store.customCategory && (
          <div className="flex items-start gap-3 p-4 bg-purple-50 rounded-xl border border-purple-200">
            <span className="text-2xl">🏷️</span>
            <div>
              <p className="text-sm font-semibold text-gray-600 mb-1">Danh mục</p>
              <p className="text-gray-800">{store.customCategory}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StoreOverview;
