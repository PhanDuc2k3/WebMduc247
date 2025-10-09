import React, { useState, useEffect } from "react";
import {
Percent,
Truck,
BadgeDollarSign,
ShoppingCart,
Plus,
Pencil,
Eye,
Trash2,
} from "lucide-react";
import VoucherForm from "./VoucherForm";

interface Voucher {
_id: string;
code: string;
title: string;
description: string;
condition: string;
discountType: "fixed" | "percent";
discountValue: number;
minOrderValue: number;
maxDiscount?: number;
store?: string;
categories?: string[];
global?: boolean;
startDate: string;
endDate: string;
usageLimit: number;
usedCount: number;
isActive: boolean;
}

const VoucherDashboard: React.FC = () => {
const [vouchers, setVouchers] = useState<Voucher[]>([]);
const [loading, setLoading] = useState(true);
const [showForm, setShowForm] = useState(false);

const fetchVouchers = async () => {
try {
setLoading(true);
const token = localStorage.getItem("token");

  const res = await fetch("http://localhost:5000/api/vouchers", {
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
    },
  });

  const data = await res.json();

  if (Array.isArray(data)) {
    setVouchers(data);
  } else if (data?.data && Array.isArray(data.data)) {
    setVouchers(data.data);
  } else {
    setVouchers([]);
  }
} catch (err) {
  console.error("❌ Lỗi khi fetch vouchers:", err);
} finally {
  setLoading(false);
}

};

useEffect(() => {
fetchVouchers();
}, []);

const deleteVoucher = async (id: string) => {
if (!window.confirm("Bạn có chắc muốn xóa voucher này?")) return;
try {
const token = localStorage.getItem("token");
const res = await fetch(`http://localhost:5000/api/vouchers/${id}`, {
method: "DELETE",
headers: {
Authorization: `Bearer ${token}`,
},
});
if (res.ok) {
setVouchers((prev) => prev.filter((v) => v._id !== id));
}
} catch (err) {
console.error("❌ Lỗi xóa voucher:", err);
}
};

if (loading) return <div className="p-6">Đang tải voucher...</div>;

return ( <div className="p-6 bg-gray-50 min-h-screen font-sans relative">
{showForm && ( <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50"> <div className="relative w-full max-w-2xl"> <div className="absolute top-[-30px] right-0">
<button
onClick={() => setShowForm(false)}
className="text-white bg-gray-800 hover:bg-gray-700 px-3 py-1 rounded-lg"
>
✕ Đóng </button> </div> <VoucherForm /> </div> </div>
)}

```
  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
    <StatBox
      title="Tổng voucher"
      value={vouchers.length.toString()}
      percent="+0%"
      icon={<BadgeDollarSign className="w-6 h-6 text-gray-700" />}
    />
    <StatBox
      title="Đang hoạt động"
      value={vouchers.filter((v) => v.isActive).length.toString()}
      percent="+0%"
      icon={<Percent className="w-6 h-6 text-gray-700" />}
    />
    <StatBox
      title="Lượt sử dụng"
      value={vouchers
        .reduce((sum, v) => sum + (v.usedCount || 0), 0)
        .toString()}
      percent="+0%"
      icon={<ShoppingCart className="w-6 h-6 text-gray-700" />}
    />
    <StatBox
      title="Đang hết hạn"
      value={vouchers
        .filter((v) => new Date(v.endDate) < new Date())
        .length.toString()}
      percent="+0%"
      icon={<Truck className="w-6 h-6 text-gray-700" />}
    />
  </div>

  <div className="flex justify-between items-center mb-6">
    <input
      type="text"
      placeholder="Tìm kiếm voucher..."
      className="w-full max-w-md px-4 py-2 border rounded shadow-sm focus:outline-none focus:ring"
    />
    <button
      onClick={() => setShowForm(true)}
      className="bg-black text-white px-5 py-2.5 rounded-lg font-semibold flex items-center gap-2 hover:bg-gray-800 transition"
    >
      <Plus size={18} /> Tạo voucher mới
    </button>
  </div>

  <div className="bg-white rounded-xl shadow p-6">
    <div className="font-semibold text-lg mb-6">Danh sách voucher</div>
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-gray-500 border-b">
          <th className="px-4 py-3">Mã</th>
          <th className="px-4 py-3">Tên</th>
          <th className="px-4 py-3">Loại</th>
          <th className="px-4 py-3">Giá trị</th>
          <th className="px-4 py-3">Hạn sử dụng</th>
          <th className="px-4 py-3">Trạng thái</th>
          <th className="px-4 py-3">Thao tác</th>
        </tr>
      </thead>
      <tbody>
        {vouchers.map((v) => (
          <tr key={v._id} className="border-b hover:bg-gray-50">
            <td className="px-4 py-3">{v.code}</td>
            <td className="px-4 py-3">{v.title}</td>
            <td className="px-4 py-3">{v.discountType}</td>
            <td className="px-4 py-3">
              {v.discountType === "percent"
                ? `${v.discountValue}%`
                : `${v.discountValue.toLocaleString()}đ`}
            </td>
            <td className="px-4 py-3">
              {v.startDate.split("T")[0]} → {v.endDate.split("T")[0]}
            </td>
            <td className="px-4 py-3">
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  v.isActive
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-200 text-gray-800"
                }`}
              >
                {v.isActive ? "Đang hoạt động" : "Ngừng hoạt động"}
              </span>
            </td>
            <td className="px-4 py-3 flex items-center gap-3">
              <button className="text-blue-600 hover:text-blue-800">
                <Pencil size={18} />
              </button>
              <button className="text-gray-600 hover:text-gray-800">
                <Eye size={18} />
              </button>
              <button
                onClick={() => deleteVoucher(v._id)}
                className="text-red-600 hover:text-red-800"
              >
                <Trash2 size={18} />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</div>

);
};

const StatBox: React.FC<{
title: string;
value: string;
percent: string;
icon: React.ReactNode;
}> = ({ title, value, percent, icon }) => (

  <div className="bg-white rounded-lg shadow flex flex-col justify-between p-6 h-32">
    <div className="flex items-center gap-2 mb-2">
      {icon}
      <span className="font-medium text-gray-600">{title}</span>
    </div>
    <div className="font-bold text-2xl">{value}</div>
    <div
      className={`text-sm ${
        percent.startsWith("-") ? "text-red-600" : "text-green-600"
      }`}
    >
      {percent}
    </div>
  </div>
);

export default VoucherDashboard;
