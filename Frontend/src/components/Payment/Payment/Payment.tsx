import React, { useState } from "react";

const Payment = () => {
  const [selectedMethod, setSelectedMethod] = useState("card");

  const methods = [
    { id: "card", label: "Thẻ tín dụng/Ghi nợ" },
    { id: "momo", label: "Ví MoMo" },
    { id: "bank", label: "Chuyển khoản ngân hàng" },
    { id: "cod", label: "Thanh toán khi nhận hàng" },
  ];

  return (
    <div className="bg-white p-4 rounded-md shadow-sm border space-y-4">
      <h2 className="text-base font-semibold text-gray-800">Phương thức thanh toán</h2>

      <div className="space-y-3 text-sm">
        {methods.map((method) => (
          <label
            key={method.id}
            className={`flex items-center p-3 border rounded-md cursor-pointer ${
              selectedMethod === method.id ? "border-blue-500 bg-blue-50" : "border-gray-300"
            }`}
            onClick={() => setSelectedMethod(method.id)}
          >
            <input
              type="radio"
              name="payment"
              checked={selectedMethod === method.id}
              onChange={() => setSelectedMethod(method.id)}
              className="mr-3"
            />
            <span>{method.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
};

export default Payment;