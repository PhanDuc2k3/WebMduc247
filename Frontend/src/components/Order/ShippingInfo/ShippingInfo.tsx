import React from "react";

interface ShippingInfoProps {
  orderCode: string;
  shippingAddress: {
    fullName: string;
    phone: string;
    address: string;
    email?: string;
  };
  shippingInfo: {
    method: string;
    estimatedDelivery?: number | { $date?: { $numberLong?: string } };
    trackingNumber?: string;
  };
}

export default function ShippingInfo({ orderCode, shippingAddress, shippingInfo }: ShippingInfoProps) {
  // Convert estimatedDelivery nếu là object, nếu không có thì fallback thành now
  let estimatedDeliveryTime = Date.now();

  if (shippingInfo.estimatedDelivery) {
    if (typeof shippingInfo.estimatedDelivery === "number") {
      estimatedDeliveryTime = shippingInfo.estimatedDelivery;
    } else if (shippingInfo.estimatedDelivery.$date?.$numberLong) {
      estimatedDeliveryTime = parseInt(shippingInfo.estimatedDelivery.$date.$numberLong);
    }
  }

  const deliveryDate = new Date(estimatedDeliveryTime);

  return (
    <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 overflow-hidden animate-fade-in-up">
      <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-6 border-b-2 border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <span>🚚</span> Thông tin vận chuyển
        </h2>
        <p className="text-gray-600 text-sm mt-1">Chi tiết địa chỉ và vận đơn</p>
      </div>
      <div className="p-6 space-y-4">
        <div className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl">
          <p className="font-bold text-gray-900 mb-2 flex items-center gap-2">
            <span>📍</span> Địa chỉ giao hàng
          </p>
          <p className="text-gray-700 mb-2">{shippingAddress.address}</p>
          <p className="text-gray-700">📞 {shippingAddress.phone}</p>
          <p className="text-gray-700">👤 {shippingAddress.fullName}</p>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
            <span className="font-semibold flex items-center gap-2">
              <span>🏢</span> Đơn vị vận chuyển
            </span>
            <span className="font-bold text-gray-900">{shippingInfo.method}</span>
          </div>

          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-xl">
            <span className="font-semibold flex items-center gap-2">
              <span>📋</span> Mã vận đơn
            </span>
            <span className="font-bold text-blue-600">
              {shippingInfo.trackingNumber || orderCode}
            </span>
          </div>

          <div className="flex justify-between items-center p-3 bg-gradient-to-r from-orange-50 to-yellow-50 border-2 border-orange-200 rounded-xl">
            <span className="font-semibold flex items-center gap-2">
              <span>⏰</span> Dự kiến giao
            </span>
            <span className="font-bold text-orange-700">
              {deliveryDate.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })}
            </span>
          </div>
        </div>

        <button className="w-full py-3 px-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 mt-4">
          <span className="flex items-center justify-center gap-2">
            <span>📍</span> Theo dõi vận đơn
          </span>
        </button>
      </div>
    </div>
  );
}
