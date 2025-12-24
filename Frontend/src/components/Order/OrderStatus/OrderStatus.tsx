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
      delivered: 90,    // Đã giao hàng: 90%
      received: 100,    // Đã nhận hàng: 100%
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
      delivered: { title: "Đã giao hàng", description: "Đơn hàng đã được giao đến khách hàng" },
      received: { title: "Đã nhận hàng", description: "Khách hàng đã xác nhận nhận hàng" },
      cancelled: { title: "Hủy đơn", description: "Đơn hàng đã bị hủy" },
    };

    // Thứ tự hiển thị các bước (không bao gồm cancelled trong flow chính)
    const statusOrder = ["pending", "confirmed", "packed", "shipped", "delivered", "received"];
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
    <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border-2 border-gray-100 overflow-hidden animate-fade-in-up">
      <div className="bg-[#2F5FEB]/5 p-4 sm:p-6 border-b-2 border-gray-200">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0">
          <h2 className="text-xl sm:text-2xl font-bold text-[#2F5FEB] flex items-center gap-2 sm:gap-3">
            Trạng thái đơn hàng
          </h2>
          <span className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-bold rounded-full bg-[#2F5FEB]/10 border-2 border-[#2F5FEB]/40 text-[#2F5FEB] w-fit">
            {steps.find((s) => !s.done)?.title || "Hoàn tất"}
          </span>
        </div>
      </div>
      <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
        <div className="w-full bg-gray-200 h-2.5 sm:h-3 rounded-full overflow-hidden">
          <div
            className={`h-2.5 sm:h-3 rounded-full transition-all duration-1000 ${
              currentStatus === "cancelled" 
                ? "bg-gradient-to-r from-red-500 to-red-600" 
                : "bg-[#2F5FEB]"
            }`}
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <div className="flex justify-between items-center">
          <p className="text-xs sm:text-sm font-semibold text-gray-600">Tiến trình đơn hàng</p>
          <p className={`text-base sm:text-lg font-bold ${
            currentStatus === "cancelled" ? "text-red-600" : "text-[#2F5FEB]"
          }`}>
            {progress}%
          </p>
        </div>

        <div className="space-y-3 sm:space-y-4">
          {steps.map((step, idx) => (
            <div 
              key={idx} 
              className="flex items-start justify-between p-3 sm:p-4 rounded-xl sm:rounded-2xl border-2 transition-all duration-300 animate-fade-in-up hover:shadow-lg gap-2 sm:gap-0"
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
              <div className="flex items-start space-x-2 sm:space-x-3 flex-1 min-w-0">
                {step.done ? (
                  <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center mt-0.5 flex-shrink-0 ${
                    step.title === "Hủy đơn" ? "bg-red-500" : "bg-green-500"
                  }`}>
                    <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                ) : (
                  <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gray-300 flex items-center justify-center mt-0.5 flex-shrink-0">
                    <Circle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm sm:text-base font-bold ${step.done ? "text-gray-900" : "text-gray-500"} break-words`}>
                    {step.title}
                  </p>
                  <p className={`text-xs sm:text-sm mt-1 ${step.done ? "text-gray-600" : "text-gray-400"} break-words`}>
                    {step.description}
                  </p>
                </div>
              </div>
              {step.time && (
                <span className={`text-xs font-semibold px-2 sm:px-3 py-1 rounded-full flex-shrink-0 ${
                  step.done 
                    ? (step.title === "Hủy đơn" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700")
                    : "bg-gray-100 text-gray-500"
                }`}>
                  <span className="hidden sm:inline">{step.time}</span>
                  <span className="sm:hidden">{new Date(step.time).toLocaleDateString("vi-VN")}</span>
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
