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
    <div className="bg-white p-4 rounded-md shadow-sm border space-y-4">
      <h2 className="text-base font-semibold text-gray-800">Phương thức vận chuyển</h2>

      <div className="space-y-3 text-sm">
        {/* Giao hàng tiêu chuẩn */}
        <label
          className={`flex items-start p-3 border rounded-md cursor-pointer ${
            selected === "standard" ? "border-blue-500 bg-blue-50" : "border-gray-300"
          }`}
          onClick={() => handleSelect("standard")}
        >
          <input
            type="radio"
            name="delivery"
            checked={selected === "standard"}
            onChange={() => handleSelect("standard")}
            className="mt-1 mr-3"
          />
          <div>
            <p className="font-medium">Giao hàng tiêu chuẩn</p>
            <p className="text-gray-500">Nhận hàng vào 3-5 ngày làm việc</p>
            <p className="text-red-600 font-semibold mt-1">30.000₫</p>
          </div>
        </label>

        {/* Giao hàng nhanh */}
        <label
          className={`flex items-start p-3 border rounded-md cursor-pointer ${
            selected === "express" ? "border-blue-500 bg-blue-50" : "border-gray-300"
          }`}
          onClick={() => handleSelect("express")}
        >
          <input
            type="radio"
            name="delivery"
            checked={selected === "express"}
            onChange={() => handleSelect("express")}
            className="mt-1 mr-3"
          />
          <div>
            <p className="font-medium">Giao hàng nhanh</p>
            <p className="text-gray-500">Nhận hàng vào 1-2 ngày làm việc</p>
            <p className="text-red-600 font-semibold mt-1">50.000₫</p>
          </div>
        </label>
      </div>
    </div>
  );
};

export default Delivery;
