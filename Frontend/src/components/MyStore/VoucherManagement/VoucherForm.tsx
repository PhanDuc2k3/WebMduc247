import React, { useState } from "react";
import { X } from "lucide-react"; // icon đóng gọn, đẹp

const VoucherForm: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const [formData, setFormData] = useState({
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
    categories: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value, type } = e.target;
    const newValue =
      type === "checkbox" && "checked" in e.target
        ? (e.target as HTMLInputElement).checked
        : value;

    setFormData((prev) => ({
      ...prev,
      [name]: newValue,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const dataToSend = {
        ...formData,
        categories: formData.categories
          ? formData.categories.split(",").map((c) => c.trim())
          : [],
      };

const res = await fetch("http://localhost:5000/api/vouchers", {
  method: "POST",
  headers: { 
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("token")}`, // 👈 thêm dòng này
  },
  body: JSON.stringify(dataToSend),
});


      if (!res.ok) throw new Error("Server error");

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
        categories: "",
      });
    } catch {
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

      {message && (
        <div className="mb-3 text-center text-sm font-medium">{message}</div>
      )}

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
              <option value="percent">Giảm theo %</option>
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
            <label className="block font-semibold mb-1">
              Đơn hàng tối thiểu
            </label>
            <input
              type="number"
              name="minOrderValue"
              value={formData.minOrderValue}
              onChange={handleChange}
              className="w-full border rounded-lg p-2"
            />
          </div>
          <div>
            <label className="block font-semibold mb-1">
              Giảm tối đa (nếu %)
            </label>
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
            value={formData.categories}
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
