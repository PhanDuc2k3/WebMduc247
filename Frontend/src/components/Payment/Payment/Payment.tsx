import React, { useState } from "react";

interface PaymentProps {
  onChange?: (methodId: "cod" | "momo" | "vietqr" | "wallet") => void; // ✅ khớp với CheckoutPage
}

const Payment: React.FC<PaymentProps> = ({ onChange }) => {
  const [selectedMethod, setSelectedMethod] = useState<"cod" | "momo" | "vietqr" | "wallet">("cod");

  const methods: { id: "cod" | "momo" | "vietqr" | "wallet"; label: string }[] = [
    { id: "cod", label: "Thanh toán khi nhận hàng (COD)" },
    { id: "momo", label: "Ví MoMo" },
    { id: "vietqr", label: "VietQR" },
    { id: "wallet", label: "Ví của tôi" },
  ];

  const handleSelect = (methodId: "cod" | "momo" | "vietqr" | "wallet") => {
    setSelectedMethod(methodId);
    onChange?.(methodId);
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-6 border-b-2 border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          Phương thức thanh toán
        </h2>
        <p className="text-gray-600 text-sm mt-1">Chọn cách thanh toán</p>
      </div>
      <div className="p-6 space-y-4">
        {methods.map((method) => (
          <label
            key={method.id}
            className={`flex items-center p-5 border-2 rounded-2xl cursor-pointer transition-all duration-300 transform hover:scale-105 ${
              selectedMethod === method.id
                ? method.id === "cod" 
                  ? "border-green-500 bg-gradient-to-br from-green-50 to-emerald-50 shadow-lg" 
                  : method.id === "momo"
                  ? "border-pink-500 bg-gradient-to-br from-pink-50 to-rose-50 shadow-lg"
                  : method.id === "vietqr"
                  ? "border-blue-500 bg-gradient-to-br from-blue-50 to-cyan-50 shadow-lg"
                  : "border-purple-500 bg-gradient-to-br from-purple-50 to-indigo-50 shadow-lg"
                : "border-gray-300 hover:border-blue-300"
            }`}
            onClick={() => handleSelect(method.id)}
          >
            <input
              type="radio"
              name="payment"
              checked={selectedMethod === method.id}
              onChange={() => handleSelect(method.id)}
              className="mr-4 w-5 h-5 cursor-pointer"
            />
            <span className="font-bold text-lg text-gray-900">
              {method.label}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
};

export default Payment;
