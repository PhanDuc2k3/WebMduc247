import React, { useState, useEffect } from "react";
import { AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import { toast } from "react-toastify";

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
      toast.warning(
        <div className="flex items-center gap-2">
          <AlertTriangle className="text-yellow-500" size={18} />
          <span>Vui lòng đăng nhập để cập nhật đơn hàng!</span>
        </div>
      );
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

      toast.success(
        <div className="flex items-center gap-2">
          <CheckCircle className="text-green-500" size={18} />
          <span>Cập nhật trạng thái đơn hàng thành công!</span>
        </div>
      );
    } catch (err: any) {
      console.error("Lỗi cập nhật đơn hàng:", err);
      toast.error(
        <div className="flex items-center gap-2">
          <XCircle className="text-red-500" size={18} />
          <span>Lỗi: {err.message}</span>
        </div>
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border-2 border-gray-100 overflow-hidden animate-fade-in-up">
      <div className="bg-[#2F5FEB]/5 p-4 sm:p-6 border-b-2 border-gray-200">
        <h2 className="text-xl sm:text-2xl font-bold text-[#2F5FEB] flex items-center gap-2 sm:gap-3">
          Cập nhật đơn hàng
        </h2>
        <p className="text-gray-600 text-xs sm:text-sm mt-1">Chỉnh sửa trạng thái đơn hàng</p>
      </div>
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
        {/* Chọn trạng thái */}
        <div>
          <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2">
            Trạng thái đơn hàng
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="w-full border-2 border-gray-200 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#2F5FEB] focus:border-[#2F5FEB] transition-all duration-300"
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
          <label className="block text-xs sm:text-sm font-bold text-gray-700 mb-2">
            Ghi chú
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            placeholder="Nhập ghi chú cho khách hàng..."
            className="w-full border-2 border-gray-200 rounded-lg sm:rounded-xl px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#2F5FEB] focus:border-[#2F5FEB] transition-all duration-300 resize-none"
          />
        </div>

        {/* Nút hành động */}
        <div className="flex flex-col gap-2 sm:gap-3 pt-2">
          <button
            onClick={handleUpdate}
            disabled={loading}
            className={`w-full px-4 sm:px-6 py-2.5 sm:py-3 text-white text-xs sm:text-sm font-bold rounded-lg sm:rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-2 ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-[#2F5FEB] hover:bg-[#244ACC]"
            }`}
          >
            {loading ? (
              <>
                <span>Đang cập nhật...</span>
              </>
            ) : (
              <>
                <span>Cập nhật đơn hàng</span>
              </>
            )}
          </button>

          <button
            onClick={() => window.print()}
            className="w-full px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-gray-400 to-gray-600 text-white text-xs sm:text-sm font-bold rounded-lg sm:rounded-xl hover:from-gray-500 hover:to-gray-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-2"
          >
            <span>In hóa đơn</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderUpdate;
