import React from "react";

export default function OrderProduct() {
  return (
    <div className="max-w-4xl mx-10 p-6 bg-white rounded-lg shadow-md mt-6 space-y-4">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Sản phẩm đặt hàng</h2>

      <div className="flex justify-between items-start">
        <div>
          <p className="text-base font-medium text-gray-900">iPhone 15 Pro Max 256GB</p>
          <p className="text-sm text-gray-600">Phân loại: Titanium Tự nhiên</p>
          <p className="text-sm text-gray-600">Số lượng: 1</p>
        </div>
        <div className="text-right">
          <p className="text-base font-semibold text-gray-900">29.990.000đ</p>
          <p className="text-sm text-gray-500">Tổng: 29.990.000đ</p>
        </div>
      </div>
    </div>
  );
}