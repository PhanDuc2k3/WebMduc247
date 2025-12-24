import React, { useState } from "react";
import { RotateCcw, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import orderApi from "../../../api/orderApi";
import { toast } from "react-toastify";

interface ReturnRequestProps {
  orderId: string;
  order: {
    statusHistory?: Array<{ status: string; timestamp: string | Date }>;
    returnRequest?: {
      status?: string;
      requestedAt?: string | Date;
      reason?: string;
    };
  };
  onRequestSuccess: () => void;
}

const ReturnRequest: React.FC<ReturnRequestProps> = ({ orderId, order, onRequestSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [reason, setReason] = useState("");

  // Kiểm tra xem có thể yêu cầu trả lại không
  const canRequestReturn = () => {
    const currentStatus = order.statusHistory && order.statusHistory.length > 0
      ? order.statusHistory[order.statusHistory.length - 1]?.status
      : null;

    // Chỉ cho phép khi đã nhận hàng và chưa có yêu cầu trả lại
    if (currentStatus !== "received") return false;
    if (order.returnRequest && order.returnRequest.status) return false;

    // Kiểm tra trong vòng 3 ngày
    const receivedStatus = order.statusHistory?.find(s => s.status === "received");
    if (!receivedStatus) return false;

    const receivedDate = new Date(receivedStatus.timestamp);
    const now = new Date();
    const daysDiff = Math.floor((now.getTime() - receivedDate.getTime()) / (1000 * 60 * 60 * 24));

    return daysDiff <= 3;
  };

  // Kiểm tra trạng thái yêu cầu trả lại
  const getReturnStatus = () => {
    if (!order.returnRequest || !order.returnRequest.status) return null;
    return order.returnRequest.status;
  };

  const handleRequestReturn = async () => {
    const trimmedReason = reason.trim();
    
    if (!trimmedReason) {
      toast.error("Vui lòng nhập lý do trả lại hàng", {
        containerId: "general-toast",
      });
      return;
    }

    if (trimmedReason.length < 10) {
      toast.error("Lý do trả lại hàng phải có ít nhất 10 ký tự", {
        containerId: "general-toast",
      });
      return;
    }

    if (trimmedReason.length > 500) {
      toast.error("Lý do trả lại hàng không được vượt quá 500 ký tự", {
        containerId: "general-toast",
      });
      return;
    }

    setLoading(true);
    try {
      await orderApi.requestReturn(orderId, trimmedReason);
      toast.success(
        <div className="flex items-center gap-2">
          <CheckCircle className="text-green-500" size={18} />
          <span>Yêu cầu trả lại hàng đã được gửi thành công!</span>
        </div>,
        {
          containerId: "general-toast",
        }
      );
      setShowModal(false);
      setReason("");
      onRequestSuccess();
    } catch (err: any) {
      console.error("Lỗi yêu cầu trả lại hàng:", err);
      const errorMessage = err.response?.data?.message 
        || err.message 
        || "Lỗi khi yêu cầu trả lại hàng!";
      toast.error(
        <div className="flex items-center gap-2">
          <XCircle className="text-red-500" size={18} />
          <span>{errorMessage}</span>
        </div>,
        {
          containerId: "general-toast",
        }
      );
    } finally {
      setLoading(false);
    }
  };

  const returnStatus = getReturnStatus();
  const canRequest = canRequestReturn();

  // Nếu đã có yêu cầu trả lại, hiển thị trạng thái
  if (returnStatus) {
    const statusMessages = {
      pending: {
        message: "Yêu cầu trả lại hàng đang chờ xử lý",
        icon: AlertCircle,
        color: "text-[#2F5FEB]",
        bgColor: "from-[#2F5FEB]/10 to-[#2F5FEB]/5",
        borderColor: "border-[#2F5FEB]/40",
      },
      approved: {
        message: "Yêu cầu trả lại hàng đã được phê duyệt. Tiền sẽ được hoàn lại trong vòng 5-7 ngày làm việc.",
        icon: CheckCircle,
        color: "text-green-600",
        bgColor: "from-green-50 to-emerald-50",
        borderColor: "border-green-200",
      },
      rejected: {
        message: "Yêu cầu trả lại hàng đã bị từ chối",
        icon: XCircle,
        color: "text-red-600",
        bgColor: "from-red-50 to-rose-50",
        borderColor: "border-red-200",
      },
      completed: {
        message: "Đơn hàng đã được trả lại thành công",
        icon: CheckCircle,
        color: "text-[#2F5FEB]",
        bgColor: "from-[#2F5FEB]/10 to-[#2F5FEB]/5",
        borderColor: "border-[#2F5FEB]/40",
      },
    };

    const statusInfo = statusMessages[returnStatus as keyof typeof statusMessages] || statusMessages.pending;
    const StatusIcon = statusInfo.icon;

    return (
      <div className={`bg-white rounded-xl sm:rounded-2xl shadow-lg border-2 ${statusInfo.borderColor} overflow-hidden animate-fade-in-up`}>
        <div className={`bg-gradient-to-r ${statusInfo.bgColor} p-4 sm:p-6 border-b-2 ${statusInfo.borderColor}`}>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
            <StatusIcon size={20} className={`sm:w-6 sm:h-6 ${statusInfo.color}`} />
            Trạng thái trả lại hàng
          </h2>
        </div>
        <div className="p-4 sm:p-6">
          <p className={`text-sm sm:text-base font-semibold ${statusInfo.color} mb-2`}>
            {statusInfo.message}
          </p>
          {order.returnRequest?.reason && (
            <p className="text-xs sm:text-sm text-gray-600 mt-2">
              <span className="font-semibold">Lý do:</span> {order.returnRequest.reason}
            </p>
          )}
          {order.returnRequest?.requestedAt && (
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Yêu cầu vào: {new Date(order.returnRequest.requestedAt).toLocaleString("vi-VN")}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Nếu không thể yêu cầu trả lại, không hiển thị gì
  if (!canRequest) {
    return null;
  }

  return (
    <>
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border-2 border-gray-100 overflow-hidden animate-fade-in-up">
        <div className="bg-[#2F5FEB]/5 p-4 sm:p-6 border-b-2 border-gray-200">
          <h2 className="text-xl sm:text-2xl font-bold text-[#2F5FEB] flex items-center gap-2 sm:gap-3">
            <RotateCcw size={20} className="sm:w-6 sm:h-6 text-[#2F5FEB]" />
            Trả lại hàng
          </h2>
          <p className="text-gray-600 text-xs sm:text-sm mt-1">
            Bạn có thể yêu cầu trả lại hàng trong vòng 3 ngày kể từ ngày nhận hàng
          </p>
        </div>
        <div className="p-4 sm:p-6">
          <button
            onClick={() => setShowModal(true)}
            className="w-full px-4 sm:px-6 py-2.5 sm:py-3 bg-[#2F5FEB] text-white text-sm sm:text-base font-bold rounded-lg sm:rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 hover:bg-[#244ACC] flex items-center justify-center gap-2"
          >
            <RotateCcw size={18} className="sm:w-5 sm:h-5" />
            <span>Yêu cầu trả lại hàng</span>
          </button>
        </div>
      </div>

      {/* Modal nhập lý do */}
      {showModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="bg-white rounded-xl sm:rounded-2xl shadow-2xl max-w-md w-full p-6 animate-fade-in-up">
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">
              Yêu cầu trả lại hàng
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Lý do trả lại hàng <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Vui lòng nhập lý do trả lại hàng (ví dụ: Sản phẩm không đúng mô tả, bị lỗi, không vừa, v.v.)"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-[#2F5FEB] resize-none"
                rows={4}
                maxLength={500}
              />
              <div className="mt-1 flex justify-between items-center">
                <p className="text-xs text-gray-500">
                  {reason.length < 10 ? (
                    <span className="text-[#2F5FEB]">Cần ít nhất 10 ký tự (còn {10 - reason.length} ký tự)</span>
                  ) : (
                    <span className="text-gray-500">Độ dài hợp lệ</span>
                  )}
                </p>
                <p className="text-xs text-gray-500">
                  {reason.length}/500 ký tự
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowModal(false);
                  setReason("");
                }}
                disabled={loading}
                className="flex-1 px-4 py-2.5 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                onClick={handleRequestReturn}
                disabled={loading || !reason.trim() || reason.trim().length < 10}
                className={`flex-1 px-4 py-2.5 text-white font-semibold rounded-lg transition-all ${
                  loading || !reason.trim() || reason.trim().length < 10
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-[#2F5FEB] hover:bg-[#244ACC]"
                }`}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Đang gửi...
                  </span>
                ) : (
                  "Gửi yêu cầu"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ReturnRequest;

