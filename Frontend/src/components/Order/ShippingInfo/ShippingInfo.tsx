import React from "react";

interface ShippingInfoProps {
  orderCode: string; // thêm orderCode
  shippingAddress: {
    fullName: string;
    phone: string;
    address: string;
    email?: string;
  };
  shippingInfo: {
    method: string;
    estimatedDelivery: number | { $date: { $numberLong: string } };
    trackingNumber: string;
  };
}

export default function ShippingInfo({ orderCode, shippingAddress, shippingInfo }: ShippingInfoProps) {
  // Convert estimatedDelivery nếu là object
  let estimatedDeliveryTime = typeof shippingInfo.estimatedDelivery === "number"
    ? shippingInfo.estimatedDelivery
    : parseInt((shippingInfo.estimatedDelivery as any).$date.$numberLong);

  const deliveryDate = new Date(estimatedDeliveryTime);

  return (
    <div className="max-w-3xl mx-10 p-6 bg-white rounded-lg shadow-md mt-6 space-y-4">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Thông tin vận chuyển</h2>

      <div className="space-y-2 text-sm text-gray-700">
        <div>
          <p className="font-medium text-gray-900">Địa chỉ giao hàng</p>
          <p>{shippingAddress.address}</p>
          <p>📞 {shippingAddress.phone}</p>
          <p>👤 {shippingAddress.fullName}</p>
        </div>

        <div className="flex justify-between">
          <span>Đơn vị vận chuyển:</span>
          <span className="font-medium text-gray-800">{shippingInfo.method}</span>
        </div>

        <div className="flex justify-between">
          <span>Mã vận đơn:</span>
          <span className="text-gray-600">
            {shippingInfo.trackingNumber }  {orderCode}
          </span>
        </div>

        <div className="flex justify-between">
          <span>Dự kiến giao:</span>
          <span className="text-gray-600">
            {deliveryDate.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })}
          </span>
        </div>
      </div>

      <button className="mt-4 w-full py-2 px-4 bg-indigo-100 text-indigo-700 font-semibold rounded-md hover:bg-indigo-200 transition">
        Theo dõi vận đơn
      </button>
    </div>
  );
}
