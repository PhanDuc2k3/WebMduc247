import React from "react";

interface CustomerInfoProps {
  customer: {
    fullName: string;
    role: string;
    phone: string;
    email: string;
    avatarUrl?: string;
  };
}

const CustomerInfo: React.FC<CustomerInfoProps> = ({ customer }) => {
  return (
    <div className="max-w-2xl mx-10 p-6 bg-white rounded-lg shadow-md mt-6 flex items-center space-x-4">
      {/* Avatar */}
      <img
        src={customer.avatarUrl || "/avatar.png"}
        alt="Avatar"
        className="w-16 h-16 rounded-full object-cover"
      />

      {/* Customer details */}
      <div className="flex-1">
        <h2 className="text-lg font-semibold text-gray-800">{customer.fullName}</h2>
        <p className="text-sm text-gray-500">{customer.role}</p>
        <p className="text-sm text-gray-700 mt-1">📞 {customer.phone}</p>
        <p className="text-sm text-gray-700">✉️ {customer.email}</p>
      </div>

      {/* Actions */}
      <div className="flex flex-col space-y-2">
        <button className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded hover:bg-blue-200 transition">
          Nhắn tin
        </button>
        <button className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded hover:bg-green-200 transition">
          Gọi
        </button>
      </div>
    </div>
  );
};

export default CustomerInfo;
