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
    <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border-2 border-gray-100 overflow-hidden">
      <div className="bg-[#2F5FEB]/5 p-4 sm:p-6 border-b-2 border-gray-200">
        <h2 className="text-xl sm:text-2xl font-bold text-[#2F5FEB] flex items-center gap-2 sm:gap-3">
          Phương thức thanh toán
        </h2>
        <p className="text-gray-600 text-xs sm:text-sm mt-1">Chọn cách thanh toán</p>
      </div>
      <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
        {methods.map((method) => (
          <label
            key={method.id}
            className={`flex items-center p-4 sm:p-5 border-2 rounded-xl sm:rounded-2xl cursor-pointer transition-all duration-300 transform hover:scale-105 ${
              selectedMethod === method.id
                ? "border-[#2F5FEB] bg-[#2F5FEB]/6 shadow-lg"
                : "border-gray-300 hover:border-[#2F5FEB]"
            }`}
            onClick={() => handleSelect(method.id)}
          >
            <input
              type="radio"
              name="payment"
              checked={selectedMethod === method.id}
              onChange={() => handleSelect(method.id)}
              className="mr-3 sm:mr-4 w-4 h-4 sm:w-5 sm:h-5 cursor-pointer flex-shrink-0"
            />
            <span className="font-bold text-sm sm:text-base lg:text-lg text-gray-900 break-words">
              {method.label}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
};

export default Payment;
