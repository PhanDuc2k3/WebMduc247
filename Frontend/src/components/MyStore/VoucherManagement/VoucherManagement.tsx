// VoucherDashboard.tsx
import React, { useState, useEffect } from "react";
import ConfirmDialog from "../../ui/ConfirmDialog";
import {
  Percent,
  Truck,
  BadgeDollarSign,
  ShoppingCart,
  Plus,
  Pencil,
  Eye,
  Trash2,
  Search,
} from "lucide-react";
import VoucherForm from "./VoucherForm";
import voucherApi from "../../../api/voucherApi";
import type { VoucherType } from "../../../api/voucherApi";

// Kiểu nội bộ state Voucher
interface Voucher extends VoucherType {
  title: string;
  condition: string;
}

const VoucherDashboard: React.FC = () => {
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const fetchVouchers = async () => {
    try {
      setLoading(true);
      const res = await voucherApi.getAvailableVouchers();
      // Map từ VoucherType sang Voucher để có đầy đủ title & condition
      const mapped: Voucher[] = (res.data || []).map((v) => ({
        ...v,
        title: (v as any).title || v.code, // API chưa có title → dùng code
        condition: (v as any).condition || "",
      }));
      setVouchers(mapped);
    } catch (err) {
      console.error("❌ Lỗi khi fetch vouchers:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVouchers();
  }, []);

  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; voucherId: string | null }>({ open: false, voucherId: null });

  const deleteVoucherClick = (id: string) => {
    setDeleteConfirm({ open: true, voucherId: id });
  };

  const deleteVoucher = async () => {
    if (!deleteConfirm.voucherId) return;
    const id = deleteConfirm.voucherId;
    setDeleteConfirm({ open: false, voucherId: null });
    try {
      await voucherApi.deleteVoucher(id);
      setVouchers((prev) => prev.filter((v) => v._id !== id));
    } catch (err) {
      console.error("❌ Lỗi xóa voucher:", err);
    }
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-8 text-center animate-fade-in">
        <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-t-4 border-b-4 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600 text-sm sm:text-lg font-medium">Đang tải voucher...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in-up">
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4 animate-fade-in">
          <div className="relative w-full max-w-2xl bg-white rounded-xl sm:rounded-2xl shadow-2xl animate-scale-in">
            <div className="absolute -top-10 sm:-top-12 right-0">
              <button
                onClick={() => setShowForm(false)}
                className="text-white bg-gray-800 hover:bg-gray-700 px-3 sm:px-4 py-2 rounded-lg text-sm sm:text-base font-semibold transition-colors touch-manipulation"
              >
                ✕ Đóng
              </button>
            </div>
            <VoucherForm
              onSuccess={() => {
                fetchVouchers();
                setShowForm(false);
              }}
              onClose={() => setShowForm(false)}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatBox
          title="Tổng voucher"
          value={vouchers.length.toString()}
          percent="+0%"
          icon={<BadgeDollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-white" />}
          color="from-blue-500 to-cyan-600"
        />
        <StatBox
          title="Đang hoạt động"
          value={vouchers.filter((v) => v.isActive).length.toString()}
          percent="+0%"
          icon={<Percent className="w-5 h-5 sm:w-6 sm:h-6 text-white" />}
          color="from-green-500 to-emerald-600"
        />
        <StatBox
          title="Lượt sử dụng"
          value={vouchers
            .reduce((sum, v) => sum + (v.usedCount || 0), 0)
            .toString()}
          percent="+0%"
          icon={<ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6 text-white" />}
          color="from-purple-500 to-pink-600"
        />
        <StatBox
          title="Đang hết hạn"
          value={vouchers
            .filter((v) => new Date(v.endDate) < new Date())
            .length.toString()}
          percent="+0%"
          icon={<Truck className="w-5 h-5 sm:w-6 sm:h-6 text-white" />}
          color="from-orange-500 to-red-600"
        />
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div className="relative w-full sm:max-w-md">
          <input
            type="text"
            placeholder="Tìm kiếm voucher..."
            className="w-full px-4 sm:px-5 py-2.5 sm:py-3 pl-10 sm:pl-12 text-sm sm:text-base border-2 border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white transition-all duration-300"
          />
          <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="w-full sm:w-auto px-4 sm:px-5 py-2.5 sm:py-3 text-sm sm:text-base bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg sm:rounded-xl font-bold flex items-center justify-center gap-2 hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl active:scale-95 sm:hover:scale-105 touch-manipulation whitespace-nowrap"
        >
          <Plus className="w-4 h-4 sm:w-5 sm:h-5" /> <span>Tạo voucher mới</span>
        </button>
      </div>

      <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border-2 border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-gray-50 to-blue-50 p-4 sm:p-6 border-b-2 border-gray-200">
          <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
            <BadgeDollarSign className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            <span>Danh sách voucher</span>
          </h3>
          <p className="text-gray-600 text-xs sm:text-sm mt-1">{vouchers.length} voucher</p>
        </div>
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-sm min-w-[700px]">
            <thead>
              <tr className="text-left text-gray-600 border-b border-gray-200 bg-gray-50">
                <th className="px-3 sm:px-4 py-3 text-xs sm:text-sm font-bold">Mã</th>
                <th className="px-3 sm:px-4 py-3 text-xs sm:text-sm font-bold">Tên</th>
                <th className="px-3 sm:px-4 py-3 text-xs sm:text-sm font-bold">Loại</th>
                <th className="px-3 sm:px-4 py-3 text-xs sm:text-sm font-bold">Giá trị</th>
                <th className="px-3 sm:px-4 py-3 text-xs sm:text-sm font-bold">Hạn sử dụng</th>
                <th className="px-3 sm:px-4 py-3 text-xs sm:text-sm font-bold">Trạng thái</th>
                <th className="px-3 sm:px-4 py-3 text-xs sm:text-sm font-bold text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {vouchers.length > 0 ? (
                vouchers.map((v, index) => (
                  <tr key={v._id} className="border-b border-gray-100 hover:bg-blue-50 transition-all duration-200 animate-fade-in-up" style={{ animationDelay: `${index * 0.05}s` }}>
                    <td className="px-3 sm:px-4 py-3 font-semibold text-xs sm:text-sm text-gray-900">{v.code}</td>
                    <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm text-gray-900 truncate max-w-[150px] sm:max-w-none">{v.title}</td>
                    <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm text-gray-700">
                      {v.discountType === "percentage" ? "Phần trăm" : "Số tiền"}
                    </td>
                    <td className="px-3 sm:px-4 py-3">
                      <span className="font-bold text-xs sm:text-sm text-green-600">
                        {v.discountType === "percentage"
                          ? `${v.discountValue}%`
                          : `${v.discountValue.toLocaleString("vi-VN")}₫`}
                      </span>
                    </td>
                    <td className="px-3 sm:px-4 py-3 text-xs sm:text-sm text-gray-600">
                      <div className="flex flex-col">
                        <span>{new Date(v.startDate).toLocaleDateString("vi-VN")}</span>
                        <span className="text-gray-400">→</span>
                        <span>{new Date(v.endDate).toLocaleDateString("vi-VN")}</span>
                      </div>
                    </td>
                    <td className="px-3 sm:px-4 py-3">
                      <span
                        className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs font-bold border-2 whitespace-nowrap ${
                          v.isActive
                            ? "bg-green-100 text-green-700 border-green-300"
                            : "bg-gray-100 text-gray-700 border-gray-300"
                        }`}
                      >
                        {v.isActive ? "Đang hoạt động" : "Ngừng hoạt động"}
                      </span>
                    </td>
                    <td className="px-3 sm:px-4 py-3">
                      <div className="flex items-center justify-center gap-1 sm:gap-2">
                        <button 
                          title="Chỉnh sửa"
                          className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-blue-100 text-blue-600 hover:bg-blue-200 hover:text-blue-700 active:scale-95 sm:hover:scale-110 flex items-center justify-center transition-all duration-300 touch-manipulation"
                        >
                          <Pencil className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
                        </button>
                        <button 
                          title="Xem chi tiết"
                          className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-700 active:scale-95 sm:hover:scale-110 flex items-center justify-center transition-all duration-300 touch-manipulation"
                        >
                          <Eye className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
                        </button>
                        <button
                          title="Xóa voucher"
                          onClick={() => deleteVoucherClick(v._id!)}
                          className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-red-100 text-red-600 hover:bg-red-200 hover:text-red-700 active:scale-95 sm:hover:scale-110 flex items-center justify-center transition-all duration-300 touch-manipulation"
                        >
                          <Trash2 className="w-4 h-4 sm:w-[18px] sm:h-[18px]" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-8 sm:py-12">
                    <div className="flex justify-center mb-4">
                      <BadgeDollarSign className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400" />
                    </div>
                    <p className="text-gray-500 text-sm sm:text-lg font-medium mb-2">Chưa có voucher nào</p>
                    <p className="text-gray-400 text-xs sm:text-sm">Tạo voucher mới để bắt đầu</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        open={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, voucherId: null })}
        onConfirm={deleteVoucher}
        title="Xác nhận xóa voucher"
        message="Bạn có chắc muốn xóa voucher này không?"
        type="danger"
        confirmText="Xóa"
      />
    </div>
  );
};

const StatBox: React.FC<{
  title: string;
  value: string;
  percent: string;
  icon: React.ReactNode;
  color: string;
}> = ({ title, value, percent, icon, color }) => (
  <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border-2 border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95 sm:active:scale-100 animate-fade-in-up touch-manipulation">
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div className={`w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-lg sm:rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white shadow-lg`}>
          {icon}
        </div>
        <span className={`text-xs font-bold px-2 sm:px-3 py-1 rounded-full whitespace-nowrap ${percent.startsWith("-") ? "bg-red-100 text-red-600 border-2 border-red-300" : "bg-green-100 text-green-600 border-2 border-green-300"}`}>
          {percent}
        </span>
      </div>
      <div className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-gray-900 mb-1 break-words">{value}</div>
      <div className="text-xs sm:text-sm font-semibold text-gray-600">{title}</div>
    </div>
  </div>
);

export default VoucherDashboard;
