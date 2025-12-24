import React, { useState } from "react";
import { Truck, Clock, Zap } from "lucide-react";

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
    <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border-2 border-gray-100 overflow-hidden">
      <div className="bg-[#2F5FEB]/5 p-4 sm:p-6 border-b-2 border-gray-200">
        <h2 className="text-xl sm:text-2xl font-bold text-[#2F5FEB] flex items-center gap-2 sm:gap-3">
          <Truck className="w-5 h-5 sm:w-6 h-6" />
          Phương thức vận chuyển
        </h2>
        <p className="text-gray-600 text-xs sm:text-sm mt-1">Chọn cách giao hàng</p>
      </div>
      <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
        {/* Giao hàng tiêu chuẩn */}
        <label
          className={`flex items-start p-4 sm:p-5 border-2 rounded-xl sm:rounded-2xl cursor-pointer transition-all duration-300 transform hover:scale-105 ${
            selected === "standard" 
              ? "border-[#2F5FEB] bg-[#2F5FEB]/6 shadow-lg" 
              : "border-gray-300 hover:border-[#2F5FEB] hover:bg-[#2F5FEB]/5"
          }`}
          onClick={() => handleSelect("standard")}
        >
          <input
            type="radio"
            name="delivery"
            checked={selected === "standard"}
            onChange={() => handleSelect("standard")}
            className="mt-1 mr-3 sm:mr-4 w-4 h-4 sm:w-5 sm:h-5 cursor-pointer flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-2">
              <p className="font-bold text-base sm:text-lg text-gray-900 flex items-center gap-2">
                <Truck className="w-4 h-4 sm:w-5 sm:h-5" />
                Giao hàng tiêu chuẩn
              </p>
              <span className="px-3 sm:px-4 py-1 bg-[#2F5FEB] text-white text-xs sm:text-sm font-bold rounded-full w-fit">
                30.000₫
              </span>
            </div>
            <p className="text-sm sm:text-base text-gray-600 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Nhận hàng vào 3-5 ngày làm việc
            </p>
          </div>
        </label>

        {/* Giao hàng nhanh */}
        <label
          className={`flex items-start p-4 sm:p-5 border-2 rounded-xl sm:rounded-2xl cursor-pointer transition-all duration-300 transform hover:scale-105 ${
            selected === "express" 
              ? "border-[#2F5FEB] bg-[#2F5FEB]/6 shadow-lg" 
              : "border-gray-300 hover:border-[#2F5FEB] hover:bg-[#2F5FEB]/5"
          }`}
          onClick={() => handleSelect("express")}
        >
          <input
            type="radio"
            name="delivery"
            checked={selected === "express"}
            onChange={() => handleSelect("express")}
            className="mt-1 mr-3 sm:mr-4 w-4 h-4 sm:w-5 sm:h-5 cursor-pointer flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-2">
              <p className="font-bold text-base sm:text-lg text-gray-900 flex items-center gap-2">
                <Zap className="w-4 h-4 sm:w-5 sm:h-5" />
                Giao hàng nhanh
              </p>
              <span className="px-3 sm:px-4 py-1 bg-[#2F5FEB] text-white text-xs sm:text-sm font-bold rounded-full w-fit">
                50.000₫
              </span>
            </div>
            <p className="text-sm sm:text-base text-gray-600 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Nhận hàng vào 1-2 ngày làm việc
            </p>
          </div>
        </label>
      </div>
    </div>
  );
};

export default Delivery;
