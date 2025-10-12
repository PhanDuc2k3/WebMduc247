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
    <div className="bg-white rounded-lg shadow p-6">
      <div className="font-semibold text-lg mb-4">Mã giảm giá</div>
      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={voucher}
          onChange={(e) => setVoucher(e.target.value)}
          placeholder="Nhập mã voucher"
          className="flex-1 border rounded px-3 py-2 text-sm"
        />
        <button
          onClick={previewVoucher}
          className="bg-green-600 text-white px-4 rounded hover:bg-green-700"
        >
          Áp dụng
        </button>
      </div>

      {info && (
        <div
          className={`border p-3 rounded text-sm ${
            info.valid
              ? "bg-green-50 border-green-200 text-green-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          <div className="font-medium">{info.title}</div>
          <div>Code: {info.code}</div>
          <div>Mô tả: {info.description}</div>
          <div>
            Điều kiện: từ {(info.minOrderValue ?? 0).toLocaleString("vi-VN")}₫
          </div>
        </div>
      )}
    </div>
  );
};

export default VoucherBox;
