import React, { useState } from "react";

interface PaymentProps {
  onChange?: (methodId: "cod" | "momo" | "vnpay") => void; // ✅ khớp với CheckoutPage
}

const Payment: React.FC<PaymentProps> = ({ onChange }) => {
  const [selectedMethod, setSelectedMethod] = useState<"cod" | "momo" | "vnpay">("cod");

  const methods: { id: "cod" | "momo" | "vnpay"; label: string }[] = [
    { id: "cod", label: "Thanh toán khi nhận hàng (COD)" },
    { id: "momo", label: "Ví MoMo" },
    { id: "vnpay", label: "VNPay" },
  ];

  const handleSelect = (methodId: "cod" | "momo" | "vnpay") => {
    setSelectedMethod(methodId);
    onChange?.(methodId);
  };

  return (
    <div className="bg-white p-4 rounded-md shadow-sm border space-y-4">
      <h2 className="text-base font-semibold text-gray-800">
        Phương thức thanh toán
      </h2>

      <div className="space-y-3 text-sm">
        {methods.map((method) => (
          <label
            key={method.id}
            className={`flex items-center p-3 border rounded-md cursor-pointer ${
              selectedMethod === method.id
                ? "border-blue-500 bg-blue-50"
                : "border-gray-300"
            }`}
            onClick={() => handleSelect(method.id)}
          >
            <input
              type="radio"
              name="payment"
              checked={selectedMethod === method.id}
              onChange={() => handleSelect(method.id)}
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
