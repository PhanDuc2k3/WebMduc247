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
    <div className="max-w-4xl mx-10 p-6 bg-white rounded-lg shadow-md mt-6 space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-gray-800 font-semibold flex items-center gap-2">
          <span className="text-xl">📦</span> Trạng thái đơn hàng
        </h2>
        <span className="px-3 py-1 text-xs rounded bg-orange-100 text-orange-600">
          {steps.find((s) => !s.done)?.title || "Hoàn tất"}
        </span>
      </div>

      <div className="w-full bg-gray-200 h-1.5 rounded mb-2">
        <div
          className="bg-gray-800 h-1.5 rounded"
          style={{ width: `${(steps.filter((s) => s.done).length / steps.length) * 100}%` }}
        ></div>
      </div>
      <p className="text-right text-xs text-gray-600 mb-4">
        {Math.round((steps.filter((s) => s.done).length / steps.length) * 100)}%
      </p>

      <div className="space-y-3">
        {steps.map((step, idx) => (
          <div key={idx} className="flex items-start justify-between">
            <div className="flex items-start space-x-2">
              {step.done ? (
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
              ) : (
                <Circle className="w-4 h-4 text-gray-400 mt-0.5" />
              )}
              <div>
                <p className={`text-sm font-medium ${step.done ? "text-gray-800" : "text-gray-500"}`}>
                  {step.title}
                </p>
                <p className={`text-xs ${step.done ? "text-gray-600" : "text-gray-400"}`}>
                  {step.description}
                </p>
              </div>
            </div>
            <span className={`text-xs ${step.done ? "text-gray-600" : "text-gray-400"}`}>
              {step.time}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
