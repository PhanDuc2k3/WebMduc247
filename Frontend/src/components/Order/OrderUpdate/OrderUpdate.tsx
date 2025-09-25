import React, { useState } from "react";

export default function OrderUpdate() {
  const [status, setStatus] = useState("Đang vận chuyển");
  const [note, setNote] = useState("Khách hàng yêu cầu gọi trước khi giao hàng");

  return (
    <div className="max-w-3xl mx-10 p-6 bg-white rounded-lg shadow-md mt-6 space-y-4">
      <h2 className="text-lg font-semibold text-gray-800">Cập nhật đơn hàng</h2>

      {/* Trạng thái đơn hàng */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái đơn hàng</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option>Đã đặt hàng</option>
          <option>Đã xác nhận</option>
          <option>Đã đóng gói</option>
          <option>Đang vận chuyển</option>
          <option>Đã giao hàng</option>
        </select>
      </div>

      {/* Ghi chú */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Buttons */}
      <div className="flex flex-wrap gap-3 pt-2">
        <button className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded hover:bg-indigo-700 transition">
          Cập nhật đơn hàng
        </button>
        <button className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded hover:bg-gray-200 transition">
          In hóa đơn
        </button>
        <button className="px-4 py-2 bg-yellow-100 text-yellow-700 text-sm font-medium rounded hover:bg-yellow-200 transition">
          Chỉnh sửa
        </button>
      </div>
    </div>
  );
}