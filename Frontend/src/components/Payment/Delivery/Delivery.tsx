import React, { useState } from "react";

interface DeliveryProps {
  onChange: (fee: number) => void; // callback để truyền shippingFee ra ngoài
}

const Delivery: React.FC<DeliveryProps> = ({ onChange }) => {
  const [selected, setSelected] = useState("standard");

  const handleSelect = (method: "standard" | "express") => {
    setSelected(method);

    const fee = method === "standard" ? 30000 : 50000;
    console.log("👉 Chọn phương thức:", method, "Phí:", fee);
    onChange(fee);
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-6 border-b-2 border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <span>🚚</span> Phương thức vận chuyển
        </h2>
        <p className="text-gray-600 text-sm mt-1">Chọn cách giao hàng</p>
      </div>
      <div className="p-6 space-y-4">
        {/* Giao hàng tiêu chuẩn */}
        <label
          className={`flex items-start p-5 border-2 rounded-2xl cursor-pointer transition-all duration-300 transform hover:scale-105 ${
            selected === "standard" 
              ? "border-blue-500 bg-gradient-to-br from-blue-50 to-purple-50 shadow-lg" 
              : "border-gray-300 hover:border-blue-300"
          }`}
          onClick={() => handleSelect("standard")}
        >
          <input
            type="radio"
            name="delivery"
            checked={selected === "standard"}
            onChange={() => handleSelect("standard")}
            className="mt-1 mr-4 w-5 h-5 cursor-pointer"
          />
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <p className="font-bold text-lg text-gray-900">🚚 Giao hàng tiêu chuẩn</p>
              <span className="px-4 py-1 bg-blue-500 text-white text-sm font-bold rounded-full">
                30.000₫
              </span>
            </div>
            <p className="text-gray-600">⏰ Nhận hàng vào 3-5 ngày làm việc</p>
          </div>
        </label>

        {/* Giao hàng nhanh */}
        <label
          className={`flex items-start p-5 border-2 rounded-2xl cursor-pointer transition-all duration-300 transform hover:scale-105 ${
            selected === "express" 
              ? "border-orange-500 bg-gradient-to-br from-orange-50 to-yellow-50 shadow-lg" 
              : "border-gray-300 hover:border-orange-300"
          }`}
          onClick={() => handleSelect("express")}
        >
          <input
            type="radio"
            name="delivery"
            checked={selected === "express"}
            onChange={() => handleSelect("express")}
            className="mt-1 mr-4 w-5 h-5 cursor-pointer"
          />
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <p className="font-bold text-lg text-gray-900">⚡ Giao hàng nhanh</p>
              <span className="px-4 py-1 bg-orange-500 text-white text-sm font-bold rounded-full">
                50.000₫
              </span>
            </div>
            <p className="text-gray-600">⏰ Nhận hàng vào 1-2 ngày làm việc</p>
          </div>
        </label>
      </div>
    </div>
  );
};

export default Delivery;
