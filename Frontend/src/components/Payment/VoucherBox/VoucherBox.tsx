import React, { useState } from "react";
import voucherApi from "../../../api/voucherApi";
import type { VoucherPreviewRequest, VoucherPreviewResponse } from "../../../api/voucherApi";


interface VoucherBoxProps {
  subtotal: number;
  onPreview: (discount: number, code: string) => void; // gửi discount tạm thời về parent
}

interface VoucherInfo {
  code: string;
  title: string;
  description: string;
  minOrderValue: number;
  valid: boolean; // đơn hàng có đạt điều kiện minOrderValue
}

const VoucherBox: React.FC<VoucherBoxProps> = ({ subtotal, onPreview }) => {
  const [voucher, setVoucher] = useState("");
  const [info, setInfo] = useState<VoucherInfo | null>(null);

  const previewVoucher = async () => {
    if (!voucher) {
      alert("Vui lòng nhập mã voucher!");
      return;
    }

    try {
      const reqData: VoucherPreviewRequest = {
        code: voucher,
        orderTotal: subtotal,
      };

      // Gọi API preview voucher qua axios
      const res = await voucherApi.previewVoucher(reqData);
      const data: VoucherPreviewResponse = res.data;

      if (data.discountAmount === undefined) {
        alert(data.message || "❌ Voucher không hợp lệ hoặc lỗi server");
        return;
      }

      const vInfo: VoucherInfo = {
        code: data.code,
        title: `Giảm ${data.discountAmount.toLocaleString("vi-VN")}₫`, // hiển thị tạm
        description: "Voucher áp dụng cho đơn hàng",
        minOrderValue: 0, // nếu backend trả minOrderValue có thể lấy
        valid: subtotal >= (data.finalTotal + data.discountAmount), // kiểm tra đơn hàng đạt điều kiện
      };

      setInfo(vInfo);

      if (vInfo.valid) {
        onPreview(data.discountAmount, vInfo.code);
        alert("✅ Voucher hợp lệ, đã áp dụng tạm thời!");
      } else {
        alert(`Đơn hàng chưa đạt điều kiện, không thể áp dụng voucher`);
      }
    } catch (err) {
      console.error(err);
      alert("Lỗi server");
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 overflow-hidden">
      <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-6 border-b-2 border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <span>🎁</span> Mã giảm giá
        </h2>
        <p className="text-gray-600 text-sm mt-1">Nhập mã voucher của bạn</p>
      </div>
      <div className="p-6 space-y-4">
        <div className="flex gap-3">
          <input
            type="text"
            value={voucher}
            onChange={(e) => setVoucher(e.target.value)}
            placeholder="🎫 Nhập mã voucher"
            className="flex-1 border-2 border-gray-200 rounded-xl px-5 py-3 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all duration-300"
          />
          <button
            onClick={previewVoucher}
            className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold hover:from-green-600 hover:to-emerald-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 whitespace-nowrap"
          >
            ✅ Áp dụng
          </button>
        </div>

        {info && (
          <div
            className={`border-2 p-5 rounded-2xl animate-scale-in ${
              info.valid
                ? "bg-gradient-to-br from-green-50 to-emerald-50 border-green-300"
                : "bg-gradient-to-br from-red-50 to-rose-50 border-red-300"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="font-bold text-xl">
                {info.valid ? "✅" : "❌"} {info.title}
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                info.valid ? "bg-green-200 text-green-700" : "bg-red-200 text-red-700"
              }`}>
                {info.code}
              </span>
            </div>
            <div className="text-gray-700 text-sm">
              <p>📝 {info.description}</p>
              <p>💵 Điều kiện: từ {(info.minOrderValue ?? 0).toLocaleString("vi-VN")}₫</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VoucherBox;
