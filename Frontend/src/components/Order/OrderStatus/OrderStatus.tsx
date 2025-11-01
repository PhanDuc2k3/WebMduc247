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
  const steps: Step[] = useMemo(() => {
    const statusMap: Record<string, { title: string; description: string }> = {
      pending: { title: "Đặt hàng", description: "Đơn hàng đã được đặt thành công" },
      confirmed: { title: "Xác nhận", description: "Đơn hàng đã được xác nhận" },
      packed: { title: "Đóng gói", description: "Sản phẩm đã được đóng gói" },
      shipped: { title: "Vận chuyển", description: "Đơn hàng đang vận chuyển" },
      delivered: { title: "Giao hàng", description: "Đơn hàng đã được giao" },
      cancelled: { title: "Hủy đơn", description: "Đơn hàng đã bị hủy" },
    };

    return Object.keys(statusMap).map((key) => {
      const history = statusHistory.find((h) => h.status === key);
      return {
        title: statusMap[key].title,
        description: statusMap[key].description,
        time: history ? new Date(history.timestamp).toLocaleString("vi-VN") : undefined,
        done: !!history,
      };
    });
  }, [statusHistory]);

  return (
    <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 overflow-hidden animate-fade-in-up">
      <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-6 border-b-2 border-gray-200">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <span>📦</span> Trạng thái đơn hàng
          </h2>
          <span className="px-4 py-2 text-sm font-bold rounded-full bg-gradient-to-r from-orange-100 to-yellow-100 border-2 border-orange-300 text-orange-700">
            {steps.find((s) => !s.done)?.title || "✅ Hoàn tất"}
          </span>
        </div>
      </div>
      <div className="p-6 space-y-6">
        <div className="w-full bg-gray-200 h-3 rounded-full overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 h-3 rounded-full transition-all duration-1000"
            style={{ width: `${(steps.filter((s) => s.done).length / steps.length) * 100}%` }}
          ></div>
        </div>
        <div className="flex justify-between items-center">
          <p className="text-sm font-semibold text-gray-600">Tiến trình đơn hàng</p>
          <p className="text-lg font-bold text-blue-600">
            {Math.round((steps.filter((s) => s.done).length / steps.length) * 100)}%
          </p>
        </div>

        <div className="space-y-4">
          {steps.map((step, idx) => (
            <div 
              key={idx} 
              className="flex items-start justify-between p-4 rounded-2xl border-2 transition-all duration-300 animate-fade-in-up hover:shadow-lg"
              style={{ 
                animationDelay: `${idx * 0.1}s`,
                borderColor: step.done ? '#10b981' : '#e5e7eb',
                backgroundColor: step.done ? '#f0fdf4' : 'transparent'
              }}
            >
              <div className="flex items-start space-x-3">
                {step.done ? (
                  <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center mt-0.5">
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
                  step.done ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
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
