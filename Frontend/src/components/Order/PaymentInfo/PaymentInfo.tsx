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
    <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border-2 border-gray-100 overflow-hidden animate-fade-in-up">
      <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-4 sm:p-6 border-b-2 border-gray-200">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
          Thông tin thanh toán
        </h2>
        <p className="text-gray-600 text-xs sm:text-sm mt-1">Chi tiết thanh toán đơn hàng</p>
      </div>
      <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
        <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg sm:rounded-xl gap-2">
            <span className="font-semibold flex items-center gap-2">
              Tạm tính
            </span>
            <span className="font-bold text-gray-900 break-words">{order.subtotal.toLocaleString("vi-VN")}₫</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg sm:rounded-xl gap-2">
            <span className="font-semibold flex items-center gap-2">
              Phí vận chuyển
            </span>
            <span className="font-bold text-gray-900 break-words">{order.shippingFee.toLocaleString("vi-VN")}₫</span>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between items-center p-3 bg-green-50 border-2 border-green-200 rounded-lg sm:rounded-xl gap-2">
              <span className="font-semibold text-green-700 flex items-center gap-2">
                Giảm giá
              </span>
              <span className="font-bold text-red-600 break-words">-{order.discount.toLocaleString("vi-VN")}₫</span>
            </div>
          )}
          <div className="border-t-2 border-gray-300 pt-3 sm:pt-4 mt-3 sm:mt-4">
            <div className="flex justify-between items-center p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg sm:rounded-xl gap-2">
              <span className="text-lg sm:text-xl font-extrabold text-gray-900 flex items-center gap-2">
                Tổng cộng
              </span>
              <span className="text-xl sm:text-2xl font-extrabold text-green-600 break-words">{order.total.toLocaleString("vi-VN")}₫</span>
            </div>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg sm:rounded-xl mt-3 sm:mt-4 gap-2">
            <span className="font-semibold flex items-center gap-2">
              Phương thức
            </span>
            <span className="font-bold text-gray-900 break-words">{order.paymentInfo.method}</span>
          </div>
        </div>

        <button
          className={`w-full py-3 sm:py-4 px-4 sm:px-6 font-bold rounded-lg sm:rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 text-sm sm:text-base ${
            order.paymentInfo.status === "paid"
              ? "bg-gradient-to-r from-green-500 to-emerald-600 text-white hover:from-green-600 hover:to-emerald-700"
              : "bg-gradient-to-r from-yellow-400 to-orange-500 text-white hover:from-yellow-500 hover:to-orange-600"
          }`}
        >
          {order.paymentInfo.status === "paid" ? "Đã thanh toán" : "Chưa thanh toán"}
        </button>
      </div>
    </div>
  );
}
