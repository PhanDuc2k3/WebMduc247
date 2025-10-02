import React, { useState, useEffect } from "react";

interface OrderUpdateProps {
  orderId: string;
  currentStatus: string; // trạng thái hiện tại của order
}

const OrderUpdate: React.FC<OrderUpdateProps> = ({ orderId, currentStatus }) => {
  const [status, setStatus] = useState(currentStatus);
  const [note, setNote] = useState("Khách hàng yêu cầu gọi trước khi giao hàng");
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem("token");
  const serverHost = "http://localhost:5000";

  // Danh sách trạng thái có thể cập nhật
  const statusOptions = [
    { label: "Đã đặt hàng", value: "pending" },
    { label: "Đã xác nhận", value: "confirmed" },
    { label: "Đã đóng gói", value: "packed" },
    { label: "Đang vận chuyển", value: "shipped" },
    { label: "Đã giao hàng", value: "delivered" },
    { label: "Đã hủy", value: "cancelled" },
  ];

  // Đồng bộ trạng thái khi currentStatus từ props thay đổi
  useEffect(() => {
    setStatus(currentStatus);
  }, [currentStatus]);

  const handleUpdate = async () => {
    if (!token) {
      alert("Vui lòng đăng nhập để cập nhật đơn hàng!");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${serverHost}/api/orders/${orderId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status, note }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Cập nhật thất bại");

      alert("✅ Cập nhật trạng thái đơn hàng thành công!");
    } catch (err: any) {
      console.error("🔥 Lỗi cập nhật đơn hàng:", err);
      alert(`❌ Lỗi: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-10 p-6 bg-white rounded-lg shadow-md mt-6 space-y-4">
      <h2 className="text-lg font-semibold text-gray-800">Cập nhật đơn hàng</h2>

      {/* Chọn trạng thái */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Trạng thái đơn hàng
        </label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          {statusOptions.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {/* Ghi chú */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Ghi chú
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="Nhập ghi chú cho khách hàng"
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Nút hành động */}
      <div className="flex flex-wrap gap-3 pt-2">
        <button
          onClick={handleUpdate}
          disabled={loading}
          className={`px-4 py-2 text-white text-sm font-medium rounded transition ${
            loading
              ? "bg-indigo-400 cursor-not-allowed"
              : "bg-indigo-600 hover:bg-indigo-700"
          }`}
        >
          {loading ? "Đang cập nhật..." : "Cập nhật đơn hàng"}
        </button>

        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded hover:bg-gray-200 transition"
        >
          In hóa đơn
        </button>
      </div>
    </div>
  );
};

export default OrderUpdate;
