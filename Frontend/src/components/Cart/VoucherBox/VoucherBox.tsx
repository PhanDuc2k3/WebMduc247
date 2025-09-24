import React, { useState } from "react";

interface VoucherBoxProps {
  subtotal: number;
  onPreview: (discount: number, code: string) => void; 
}

interface VoucherInfo {
  code: string;
  title: string;
  description: string;
  minOrderValue: number;
  valid: boolean; 
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
      const res = await fetch("http://localhost:5000/api/vouchers/preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ code: voucher }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "❌ Voucher không hợp lệ hoặc lỗi server");
        return;
      }

      // Lấy thông tin voucher từ backend
      const vInfo: VoucherInfo = {
        code: data.voucher.code,
        title: data.voucher.title,
        description: data.voucher.description,
        minOrderValue: data.voucher.minOrderValue || 0,
        valid: subtotal >= (data.voucher.minOrderValue || 0),
      };
      setInfo(vInfo);

      if (vInfo.valid) {
        onPreview(data.discount, vInfo.code);
        alert("✅ Voucher hợp lệ, đã áp dụng tạm thời!");
      } else {
        alert(
          ` Đơn hàng chưa đạt ${vInfo.minOrderValue.toLocaleString(
            "vi-VN"
          )}₫, không thể áp dụng voucher`
        );
      }
    } catch (err) {
      console.error(err);
      alert(" Lỗi server");
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
