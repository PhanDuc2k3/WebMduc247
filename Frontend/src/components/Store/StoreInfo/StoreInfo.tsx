// StoreOverview.tsx
import React from "react";
import type { StoreType } from "../../../types/store";

interface StoreOverviewProps {
  store: StoreType;
}

const StoreOverview: React.FC<StoreOverviewProps> = ({ store }) => {
  if (!store) return null;

  return (
    <div className="bg-white rounded-lg shadow p-4 sm:p-6 mb-6">
      {/* Tiêu đề thông tin cửa hàng */}
      <h2 className="text-lg font-semibold mb-4">Thông tin cửa hàng</h2>

      <p className="text-sm text-gray-700 font-medium">{store.description}</p>
    </div>
  );
};

export default StoreOverview;
