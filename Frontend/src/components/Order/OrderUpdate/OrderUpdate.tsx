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
    <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 overflow-hidden animate-fade-in-up">
      <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-6 border-b-2 border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <span>⚙️</span> Cập nhật đơn hàng
        </h2>
        <p className="text-gray-600 text-sm mt-1">Chỉnh sửa trạng thái đơn hàng</p>
      </div>
      <div className="p-6 space-y-5">
        {/* Chọn trạng thái */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            <span>📋</span> Trạng thái đơn hàng
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
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
          <label className="block text-sm font-bold text-gray-700 mb-2">
            <span>📝</span> Ghi chú
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            placeholder="Nhập ghi chú cho khách hàng..."
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 resize-none"
          />
        </div>

        {/* Nút hành động */}
        <div className="flex flex-col gap-3 pt-2">
          <button
            onClick={handleUpdate}
            disabled={loading}
            className={`w-full px-6 py-3 text-white text-sm font-bold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-2 ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
            }`}
          >
            {loading ? (
              <>
                <span className="animate-spin">⏳</span>
                <span>Đang cập nhật...</span>
              </>
            ) : (
              <>
                <span>💾</span>
                <span>Cập nhật đơn hàng</span>
              </>
            )}
          </button>

          <button
            onClick={() => window.print()}
            className="w-full px-6 py-3 bg-gradient-to-r from-gray-400 to-gray-600 text-white text-sm font-bold rounded-xl hover:from-gray-500 hover:to-gray-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-2"
          >
            <span>🖨️</span> In hóa đơn
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderUpdate;
