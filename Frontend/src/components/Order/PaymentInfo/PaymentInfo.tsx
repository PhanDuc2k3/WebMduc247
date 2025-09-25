import React from "react";

export default function PaymentInfo() {
  return (
    <div className="max-w-4xl mx-10 p-6 bg-white rounded-lg shadow-md mt-6 space-y-4">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Thông tin thanh toán</h2>

      <div className="space-y-2 text-sm text-gray-700">
        <div className="flex justify-between">
          <span>Tạm tính</span>
          <span>29.990.000₫</span>
        </div>
        <div className="flex justify-between">
          <span>Phí vận chuyển</span>
          <span>50.000₫</span>
        </div>
        <div className="flex justify-between text-red-500">
          <span>Giảm giá</span>
          <span>-500.000₫</span>
        </div>
        <div className="border-t pt-2 flex justify-between font-semibold text-gray-900">
          <span>Tổng cộng</span>
          <span>29.540.000₫</span>
        </div>
        <div className="flex justify-between pt-2">
          <span>Phương thức</span>
          <span className="font-medium text-gray-800">COD</span>
        </div>
      </div>

      <button className="mt-4 w-full py-2 px-4 bg-yellow-100 text-yellow-700 font-semibold rounded-md hover:bg-yellow-200 transition">
        Chưa thanh toán
      </button>
    </div>
  );
}
