import React, { useState } from "react";
import { Package } from "lucide-react";
import orderApi from "../../../api/orderApi";

interface BuyerConfirmDeliveryProps {
  orderId: string;
  onConfirm: () => void;
}

const BuyerConfirmDelivery: React.FC<BuyerConfirmDeliveryProps> = ({ orderId, onConfirm }) => {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    if (!window.confirm("Bạn đã nhận được hàng? Xác nhận sẽ chuyển đơn hàng sang trạng thái 'Đã nhận hàng' và bạn có thể đánh giá sản phẩm.")) {
      return;
    }

    setLoading(true);
    try {
      const response = await orderApi.confirmDelivery(orderId);
      alert("Xác nhận nhận hàng thành công!");
      onConfirm();
    } catch (err: any) {
      console.error("Lỗi xác nhận nhận hàng:", err);
      const errorMessage = err.response?.data?.message 
        || err.message 
        || "Lỗi khi xác nhận nhận hàng!";
      alert(`Lỗi: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 overflow-hidden animate-fade-in-up">
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 border-b-2 border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <Package size={24} className="text-green-600" />
          Xác nhận nhận hàng
        </h2>
        <p className="text-gray-600 text-sm mt-1">Đơn hàng đã được giao, vui lòng xác nhận bạn đã nhận được hàng</p>
      </div>
      <div className="p-6">
        <button
          onClick={handleConfirm}
          disabled={loading}
          className={`w-full px-6 py-3 text-white text-base font-bold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-2 ${
            loading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
          }`}
        >
          {loading ? (
            <>
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              <span>Đang xác nhận...</span>
            </>
          ) : (
            <>
              <Package size={20} />
              <span>Đã nhận hàng</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default BuyerConfirmDelivery;
