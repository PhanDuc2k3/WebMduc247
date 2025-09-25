import React from "react";

export default function CustomerInfo() {
  return (
    <div className="max-w-2xl mx-10 p-6 bg-white rounded-lg shadow-md mt-6 flex items-center space-x-4">
      {/* Avatar */}
      <img
        src="/avatar.png" // Thay bằng đường dẫn ảnh thật nếu có
        alt="Avatar"
        className="w-16 h-16 rounded-full object-cover"
      />

      {/* Customer details */}
      <div className="flex-1">
        <h2 className="text-lg font-semibold text-gray-800">Nguyễn Văn A</h2>
        <p className="text-sm text-gray-500">Khách hàng</p>
        <p className="text-sm text-gray-700 mt-1">📞 0987654321</p>
        <p className="text-sm text-gray-700">✉️ nguyenvana@email.com</p>
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
}
