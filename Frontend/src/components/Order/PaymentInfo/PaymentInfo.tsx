import React from "react";

interface PaymentInfoProps {
  order: {
    subtotal: number;
    shippingFee: number;
    discount: number;
    total: number;
    paymentInfo: {
      method: string;
      status: string;
    };
  };
}

export default function PaymentInfo({ order }: PaymentInfoProps) {
  return (
    <div className="max-w-4xl mx-10 p-6 bg-white rounded-lg shadow-md mt-6 space-y-4">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Thông tin thanh toán</h2>

      <div className="space-y-2 text-sm text-gray-700">
        <div className="flex justify-between">
          <span>Tạm tính</span>
          <span>{order.subtotal.toLocaleString("vi-VN")}₫</span>
        </div>
        <div className="flex justify-between">
          <span>Phí vận chuyển</span>
          <span>{order.shippingFee.toLocaleString("vi-VN")}₫</span>
        </div>
        <div className="flex justify-between text-red-500">
          <span>Giảm giá</span>
          <span>-{order.discount.toLocaleString("vi-VN")}₫</span>
        </div>
        <div className="border-t pt-2 flex justify-between font-semibold text-gray-900">
          <span>Tổng cộng</span>
          <span>{order.total.toLocaleString("vi-VN")}₫</span>
        </div>
        <div className="flex justify-between pt-2">
          <span>Phương thức</span>
          <span className="font-medium text-gray-800">{order.paymentInfo.method}</span>
        </div>
      </div>

      <button
        className={`mt-4 w-full py-2 px-4 font-semibold rounded-md transition ${
          order.paymentInfo.status === "paid"
            ? "bg-green-100 text-green-700 hover:bg-green-200"
            : "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
        }`}
      >
        {order.paymentInfo.status === "paid" ? "Đã thanh toán" : "Chưa thanh toán"}
      </button>
    </div>
  );
}
