import React from "react";

const StoreLoading: React.FC = () => (
  <div className="w-full py-16 flex items-center justify-center animate-fade-in">
    <div className="text-center">
      <div className="text-6xl mb-4 animate-pulse">🏪</div>
      <p className="text-gray-600 text-lg font-medium">Đang tải danh sách cửa hàng...</p>
    </div>
  </div>
);

export default StoreLoading;
