import React from "react";
import { CheckCircle, Circle } from "lucide-react";

interface Step {
  title: string;
  description: string;
  time?: string;
  done: boolean;
}

const steps: Step[] = [
  {
    title: "Đặt hàng",
    description: "Đơn hàng đã được đặt thành công",
    time: "10:30 08/09/2024",
    done: true,
  },
  {
    title: "Xác nhận",
    description: "Đơn hàng đã được xác nhận và chuẩn bị",
    time: "14:15 08/09/2024",
    done: true,
  },
  {
    title: "Đóng gói",
    description: "Sản phẩm đã được đóng gói",
    time: "09:00 09/09/2024",
    done: true,
  },
  {
    title: "Vận chuyển",
    description: "Đơn hàng đang được vận chuyển",
    time: "15:30 09/09/2024",
    done: true,
  },
  {
    title: "Giao hàng",
    description: "Dự kiến giao hàng",
    time: "17:00 12/09/2024",
    done: false,
  },
];

export default function OrderStatus() {
  return (
    <div className="max-w-4xl mx-10 p-6 bg-white rounded-lg shadow-md mt-6 space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-gray-800 font-semibold flex items-center gap-2">
          <span className="text-xl">📦</span> Trạng thái đơn hàng
        </h2>
        <span className="px-3 py-1 text-xs rounded bg-orange-100 text-orange-600">
          Đang chuẩn bị
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 h-1.5 rounded mb-2">
        <div
          className="bg-gray-800 h-1.5 rounded"
          style={{ width: "80%" }}
        ></div>
      </div>
      <p className="text-right text-xs text-gray-600 mb-4">80%</p>

      {/* Steps */}
      <div className="space-y-3">
        {steps.map((step, idx) => (
          <div key={idx} className="flex items-start justify-between">
            {/* Left (icon + text) */}
            <div className="flex items-start space-x-2">
              {step.done ? (
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
              ) : (
                <Circle className="w-4 h-4 text-gray-400 mt-0.5" />
              )}
              <div>
                <p
                  className={`text-sm font-medium ${
                    step.done ? "text-gray-800" : "text-gray-500"
                  }`}
                >
                  {step.title}
                </p>
                <p
                  className={`text-xs ${
                    step.done ? "text-gray-600" : "text-gray-400"
                  }`}
                >
                  {step.description}
                </p>
              </div>
            </div>

            {/* Time */}
            <span
              className={`text-xs ${
                step.done ? "text-gray-600" : "text-gray-400"
              }`}
            >
              {step.time}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
