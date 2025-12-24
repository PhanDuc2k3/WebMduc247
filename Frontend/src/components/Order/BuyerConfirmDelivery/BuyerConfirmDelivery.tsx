import React, { useState } from "react";
import { Package, CheckCircle, XCircle } from "lucide-react";
import ConfirmDialog from "../../ui/ConfirmDialog";
import orderApi from "../../../api/orderApi";
import { toast } from "react-toastify";

interface BuyerConfirmDeliveryProps {
  orderId: string;
  onConfirm: () => void;
}

const BuyerConfirmDelivery: React.FC<BuyerConfirmDeliveryProps> = ({ orderId, onConfirm }) => {
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleConfirmClick = () => {
    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    setShowConfirm(false);
    setLoading(true);
    try {
      const response = await orderApi.confirmDelivery(orderId);
      toast.success(
        <div className="flex items-center gap-2">
          <CheckCircle className="text-green-500" size={18} />
          <span>Xác nhận nhận hàng thành công!</span>
        </div>
      );
      onConfirm();
    } catch (err: any) {
      console.error("Lỗi xác nhận nhận hàng:", err);
      const errorMessage = err.response?.data?.message 
        || err.message 
        || "Lỗi khi xác nhận nhận hàng!";
      toast.error(
        <div className="flex items-center gap-2">
          <XCircle className="text-red-500" size={18} />
          <span>Lỗi: {errorMessage}</span>
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
          <Package size={20} className="sm:w-6 sm:h-6 text-[#2F5FEB]" />
          Xác nhận nhận hàng
        </h2>
        <p className="text-gray-600 text-xs sm:text-sm mt-1">Đơn hàng đã được giao, vui lòng xác nhận bạn đã nhận được hàng</p>
      </div>
      <div className="p-4 sm:p-6">
        <button
          onClick={handleConfirmClick}
          disabled={loading}
          className={`w-full px-4 sm:px-6 py-2.5 sm:py-3 text-white text-sm sm:text-base font-bold rounded-lg sm:rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-2 ${
            loading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-[#2F5FEB] hover:bg-[#244ACC]"
          }`}
        >
          {loading ? (
            <>
              <span className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              <span>Đang xác nhận...</span>
            </>
          ) : (
            <>
              <Package size={18} className="sm:w-5 sm:h-5" />
              <span>Đã nhận hàng</span>
            </>
          )}
        </button>
      </div>

      <ConfirmDialog
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirm}
        title="Xác nhận nhận hàng"
        message="Bạn đã nhận được hàng? Xác nhận sẽ chuyển đơn hàng sang trạng thái 'Đã nhận hàng' và bạn có thể đánh giá sản phẩm."
        type="info"
        loading={loading}
        confirmText="Xác nhận"
      />
    </div>
  );
};

export default BuyerConfirmDelivery;
