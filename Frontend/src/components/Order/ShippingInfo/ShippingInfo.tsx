import React from "react";

export default function ShippingInfo() {
  return (
    <div className="max-w-3xl mx-10 p-6 bg-white rounded-lg shadow-md mt-6 space-y-4">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Thông tin vận chuyển</h2>

      <div className="space-y-2 text-sm text-gray-700">
        <div>
          <p className="font-medium text-gray-900">Địa chỉ giao hàng</p>
          <p>123 Đường ABC, Phường XYZ, Quận 1, TP. Hồ Chí Minh</p>
        </div>

        <div className="flex justify-between">
          <span>Đơn vị vận chuyển:</span>
          <span className="font-medium text-gray-800">Giao hàng nhanh</span>
        </div>

        <div className="flex justify-between">
          <span>Mã vận đơn:</span>
          <span className="text-gray-600">GHN123456789</span>
        </div>

        <div className="flex justify-between">
          <span>Dự kiến giao:</span>
          <span className="text-gray-600">17:00 12/09/2024</span>
        </div>
      </div>

      <button className="mt-4 w-full py-2 px-4 bg-indigo-100 text-indigo-700 font-semibold rounded-md hover:bg-indigo-200 transition">
        Theo dõi vận đơn
      </button>
    </div>
  );
}
