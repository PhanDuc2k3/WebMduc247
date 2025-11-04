import React, { useMemo } from "react";
import { CheckCircle, Circle } from "lucide-react";

interface Step {
  title: string;
  description: string;
  time?: string;
  done: boolean;
}

interface StatusHistory {
  status: string;
  note?: string;
  timestamp: string;
}

interface OrderStatusProps {
  statusHistory: StatusHistory[];
}

export default function OrderStatus({ statusHistory }: OrderStatusProps) {
  // Lấy trạng thái cuối cùng (mới nhất)
  const currentStatus = statusHistory.length > 0 
    ? statusHistory[statusHistory.length - 1].status 
    : "pending";

  // Tính progress dựa trên trạng thái hiện tại
  const getProgress = (status: string): number => {
    const progressMap: Record<string, number> = {
      pending: 20,      // Đặt hàng: 20%
      confirmed: 40,    // Xác nhận: 40%
      packed: 60,       // Đóng gói: 60%
      shipped: 80,      // Vận chuyển: 80%
      delivered: 100,   // Giao hàng: 100%
      cancelled: 100,   // Hủy đơn: 100%
    };
    return progressMap[status] || 0;
  };

  const progress = getProgress(currentStatus);

  const steps: Step[] = useMemo(() => {
    const statusMap: Record<string, { title: string; description: string }> = {
      pending: { title: "Đặt hàng", description: "Đơn hàng đã được đặt thành công" },
      confirmed: { title: "Xác nhận", description: "Đơn hàng đã được xác nhận" },
      packed: { title: "Đóng gói", description: "Sản phẩm đã được đóng gói" },
      shipped: { title: "Vận chuyển", description: "Đơn hàng đang vận chuyển" },
      delivered: { title: "Giao hàng", description: "Đơn hàng đã được giao" },
      cancelled: { title: "Hủy đơn", description: "Đơn hàng đã bị hủy" },
    };

    // Thứ tự hiển thị các bước (không bao gồm cancelled trong flow chính)
    const statusOrder = ["pending", "confirmed", "packed", "shipped", "delivered"];
    const hasCancelled = currentStatus === "cancelled" || statusHistory.some((h) => h.status === "cancelled");

    // Tạo danh sách các bước chính (pending -> delivered)
    const mainSteps = statusOrder.map((key) => {
      const history = statusHistory.find((h) => h.status === key);
      // Đánh dấu done nếu có trong history hoặc đã vượt qua trạng thái này
      const statusIndex = statusOrder.indexOf(key);
      const currentIndex = statusOrder.indexOf(currentStatus);
      // Nếu đã bị hủy, chỉ hiển thị pending là done (nếu có)
      const done = hasCancelled 
        ? (key === "pending" && !!statusHistory.find((h) => h.status === "pending"))
        : (!!history || (currentIndex > statusIndex && !hasCancelled));
      
      return {
        title: statusMap[key].title,
        description: statusMap[key].description,
        time: history ? new Date(history.timestamp).toLocaleString("vi-VN") : undefined,
        done,
      };
    });

    // Nếu đã hủy, thêm bước cancelled vào cuối
    if (hasCancelled) {
      const cancelledHistory = statusHistory.find((h) => h.status === "cancelled");
      mainSteps.push({
        title: statusMap.cancelled.title,
        description: statusMap.cancelled.description,
        time: cancelledHistory?.timestamp 
          ? new Date(cancelledHistory.timestamp).toLocaleString("vi-VN")
          : undefined,
        done: true,
      });
    }

    return mainSteps;
  }, [statusHistory, currentStatus]);

  return (
    <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 overflow-hidden animate-fade-in-up">
      <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-6 border-b-2 border-gray-200">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            Trạng thái đơn hàng
          </h2>
          <span className="px-4 py-2 text-sm font-bold rounded-full bg-gradient-to-r from-orange-100 to-yellow-100 border-2 border-orange-300 text-orange-700">
            {steps.find((s) => !s.done)?.title || "Hoàn tất"}
          </span>
        </div>
      </div>
      <div className="p-6 space-y-6">
        <div className="w-full bg-gray-200 h-3 rounded-full overflow-hidden">
          <div
            className={`h-3 rounded-full transition-all duration-1000 ${
              currentStatus === "cancelled" 
                ? "bg-gradient-to-r from-red-500 to-red-600" 
                : "bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"
            }`}
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <div className="flex justify-between items-center">
          <p className="text-sm font-semibold text-gray-600">Tiến trình đơn hàng</p>
          <p className={`text-lg font-bold ${
            currentStatus === "cancelled" ? "text-red-600" : "text-blue-600"
          }`}>
            {progress}%
          </p>
        </div>

        <div className="space-y-4">
          {steps.map((step, idx) => (
            <div 
              key={idx} 
              className="flex items-start justify-between p-4 rounded-2xl border-2 transition-all duration-300 animate-fade-in-up hover:shadow-lg"
              style={{ 
                animationDelay: `${idx * 0.1}s`,
                borderColor: step.done 
                  ? (step.title === "Hủy đơn" ? '#ef4444' : '#10b981')
                  : '#e5e7eb',
                backgroundColor: step.done 
                  ? (step.title === "Hủy đơn" ? '#fef2f2' : '#f0fdf4')
                  : 'transparent'
              }}
            >
              <div className="flex items-start space-x-3">
                {step.done ? (
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mt-0.5 ${
                    step.title === "Hủy đơn" ? "bg-red-500" : "bg-green-500"
                  }`}>
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center mt-0.5">
                    <Circle className="w-5 h-5 text-white" />
                  </div>
                )}
                <div>
                  <p className={`text-base font-bold ${step.done ? "text-gray-900" : "text-gray-500"}`}>
                    {step.title}
                  </p>
                  <p className={`text-sm mt-1 ${step.done ? "text-gray-600" : "text-gray-400"}`}>
                    {step.description}
                  </p>
                </div>
              </div>
              {step.time && (
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                  step.done 
                    ? (step.title === "Hủy đơn" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700")
                    : "bg-gray-100 text-gray-500"
                }`}>
                  {step.time}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
