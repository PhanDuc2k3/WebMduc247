import React, { useState } from "react";
import { X } from "lucide-react";
import type { VoucherType } from "../../../api/voucherApi";
import voucherApi from "../../../api/voucherApi";

interface VoucherFormProps {
  onClose?: () => void;
  onSuccess?: () => void;
}

// Mở rộng VoucherType để dùng trong form
interface VoucherFormData extends VoucherType {
  title?: string;
  condition?: string;
  categories: string[]; // dùng array
  global: boolean;      // dùng trong form, không gửi lên API
}

const VoucherForm: React.FC<VoucherFormProps> = ({ onClose, onSuccess }) => {
  const [formData, setFormData] = useState<VoucherFormData>({
    code: "",
    title: "",
    description: "",
    condition: "",
    discountType: "fixed",
    discountValue: 0,
    minOrderValue: 0,
    maxDiscount: 0,
    global: false,
    startDate: "",
    endDate: "",
    usageLimit: 100,
    categories: [],
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Xử lý input
const handleChange = (
  e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
) => {
  const { name, type, value } = e.target;

  let newValue: string | number | boolean;

  if (type === "checkbox") {
    // Cast e.target thành HTMLInputElement để lấy checked
    newValue = (e.target as HTMLInputElement).checked;
  } else if (type === "number") {
    newValue = Number(value);
  } else if (name === "discountType") {
    newValue = value === "percentage" ? "percentage" : "fixed";
  } else if (name === "categories") {
    // Chuyển string input thành array
    const val = value as string;
    setFormData((prev) => ({
      ...prev,
      categories: val.split(",").map((c) => c.trim()),
    }));
    return; // return để tránh gán sai type
  } else {
    newValue = value;
  }

  setFormData((prev) => ({
    ...prev,
    [name]: newValue,
  }));
};


  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      // Chuẩn hóa data gửi lên API
      const dataToSend: VoucherType = {
        code: formData.code,
        description: formData.description,
        discountType: formData.discountType,
        discountValue: formData.discountValue,
        minOrderValue: formData.minOrderValue,
        maxDiscount: formData.maxDiscount,
        startDate: formData.startDate,
        endDate: formData.endDate,
        usageLimit: formData.usageLimit,
      };

      // Nếu backend hỗ trợ categories
      if (formData.categories.length > 0) {
        (dataToSend as any).categories = formData.categories;
      }

      await voucherApi.createVoucher(dataToSend);

      setMessage("✅ Tạo voucher thành công!");
      setFormData({
        code: "",
        title: "",
        description: "",
        condition: "",
        discountType: "fixed",
        discountValue: 0,
        minOrderValue: 0,
        maxDiscount: 0,
        global: false,
        startDate: "",
        endDate: "",
        usageLimit: 100,
        categories: [],
      });

      onSuccess?.();
    } catch (err) {
      console.error(err);
      setMessage("❌ Lỗi khi tạo voucher");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative max-w-lg mx-auto bg-white shadow-xl rounded-xl p-5 mt-6 h-[600px] overflow-y-auto">
      {/* Nút đóng */}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 p-1.5 rounded-full bg-red-500 text-white hover:bg-red-600 transition"
        >
          <X size={18} />
        </button>
      )}

      <h2 className="text-2xl font-bold mb-4 text-center">Tạo Voucher Mới</h2>

      {message && <div className="mb-3 text-center text-sm font-medium">{message}</div>}

      <form onSubmit={handleSubmit} className="space-y-3 text-sm">
        <div>
          <label className="block font-semibold mb-1">Mã voucher</label>
          <input
            type="text"
            name="code"
            value={formData.code}
            onChange={handleChange}
            required
            className="w-full border rounded-lg p-2"
            placeholder="VD: SALE2025"
          />
        </div>

        <div>
          <label className="block font-semibold mb-1">Tiêu đề</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            className="w-full border rounded-lg p-2"
          />
        </div>

        <div>
          <label className="block font-semibold mb-1">Mô tả</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            required
            className="w-full border rounded-lg p-2"
          />
        </div>

        <div>
          <label className="block font-semibold mb-1">Điều kiện áp dụng</label>
          <input
            type="text"
            name="condition"
            value={formData.condition}
            onChange={handleChange}
            required
            className="w-full border rounded-lg p-2"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold mb-1">Loại giảm giá</label>
            <select
              name="discountType"
              value={formData.discountType}
              onChange={handleChange}
              className="w-full border rounded-lg p-2"
            >
              <option value="fixed">Giảm cố định</option>
              <option value="percentage">Giảm theo %</option>
            </select>
          </div>
          <div>
            <label className="block font-semibold mb-1">Giá trị giảm</label>
            <input
              type="number"
              name="discountValue"
              value={formData.discountValue}
              onChange={handleChange}
              className="w-full border rounded-lg p-2"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold mb-1">Đơn hàng tối thiểu</label>
            <input
              type="number"
              name="minOrderValue"
              value={formData.minOrderValue}
              onChange={handleChange}
              className="w-full border rounded-lg p-2"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">Giảm tối đa (nếu %)</label>
            <input
              type="number"
              name="maxDiscount"
              value={formData.maxDiscount}
              onChange={handleChange}
              className="w-full border rounded-lg p-2"
            />
          </div>
        </div>

        <div>
          <label className="block font-semibold mb-1">Danh mục áp dụng</label>
          <input
            type="text"
            name="categories"
            value={formData.categories.join(", ")}
            onChange={handleChange}
            className="w-full border rounded-lg p-2"
            placeholder="VD: Mỹ phẩm, Thời trang"
          />
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            name="global"
            checked={formData.global}
            onChange={handleChange}
          />
          <label className="font-semibold">Áp dụng toàn hệ thống</label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold mb-1">Ngày bắt đầu</label>
            <input
              type="date"
              name="startDate"
              value={formData.startDate}
              onChange={handleChange}
              className="w-full border rounded-lg p-2"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">Ngày kết thúc</label>
            <input
              type="date"
              name="endDate"
              value={formData.endDate}
              onChange={handleChange}
              className="w-full border rounded-lg p-2"
            />
          </div>
        </div>

        <div>
          <label className="block font-semibold mb-1">Giới hạn lượt dùng</label>
          <input
            type="number"
            name="usageLimit"
            value={formData.usageLimit}
            onChange={handleChange}
            className="w-full border rounded-lg p-2"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
        >
          {loading ? "Đang tạo..." : "Tạo voucher"}
        </button>
      </form>
    </div>
  );
};

export default VoucherForm;
