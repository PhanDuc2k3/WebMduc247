import React, { useState, useEffect } from "react";
import { X, Store } from "lucide-react";
import type { VoucherType } from "../../../api/voucherApi";
import voucherApi from "../../../api/voucherApi";
import storeApi from "../../../api/storeApi";

interface VoucherFormProps {
  onClose?: () => void;
  onSuccess?: () => void;
  voucher?: VoucherType & { title?: string; condition?: string }; // Voucher để edit (nếu có)
}

// Mở rộng VoucherType để dùng trong form
interface VoucherFormData extends VoucherType {
  title?: string;
  condition?: string;
}

const VoucherForm: React.FC<VoucherFormProps> = ({ onClose, onSuccess, voucher }) => {
  // Khởi tạo form data từ voucher (nếu edit) hoặc giá trị mặc định (nếu tạo mới)
  const initializeFormData = (): VoucherFormData => {
    if (voucher) {
      // Format dates cho input type="date" (YYYY-MM-DD)
      const formatDate = (dateString: string) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        return date.toISOString().split("T")[0];
      };

      return {
        code: voucher.code || "",
        title: (voucher as any).title || "",
        description: voucher.description || "",
        condition: (voucher as any).condition || "",
        discountType: voucher.discountType || "fixed",
        discountValue: voucher.discountValue || 0,
        minOrderValue: voucher.minOrderValue || 0,
        maxDiscount: voucher.maxDiscount || 0,
        startDate: formatDate(voucher.startDate),
        endDate: formatDate(voucher.endDate),
        usageLimit: voucher.usageLimit || 100,
      };
    }
    return {
      code: "",
      title: "",
      description: "",
      condition: "",
      discountType: "fixed" as "fixed" | "percent",
      discountValue: 0,
      minOrderValue: 0,
      maxDiscount: 0,
      startDate: "",
      endDate: "",
      usageLimit: 100,
    };
  };

  const [formData, setFormData] = useState<VoucherFormData>(initializeFormData());

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [storeName, setStoreName] = useState<string>("");

  // Lấy thông tin cửa hàng của seller
  useEffect(() => {
    const fetchStoreInfo = async () => {
      try {
        const res = await storeApi.getMyStore();
        const store = res.data.store || res.data;
        if (store?.name) {
          setStoreName(store.name);
        }
      } catch (err) {
        console.error("Lỗi khi lấy thông tin cửa hàng:", err);
      }
    };
    fetchStoreInfo();
  }, []);

  // Cập nhật form data khi voucher prop thay đổi
  useEffect(() => {
    if (voucher) {
      const formatDate = (dateString: string) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        return date.toISOString().split("T")[0];
      };

      setFormData({
        code: voucher.code || "",
        title: (voucher as any).title || "",
        description: voucher.description || "",
        condition: (voucher as any).condition || "",
        discountType: voucher.discountType || "fixed",
        discountValue: voucher.discountValue || 0,
        minOrderValue: voucher.minOrderValue || 0,
        maxDiscount: voucher.maxDiscount || 0,
        startDate: formatDate(voucher.startDate),
        endDate: formatDate(voucher.endDate),
        usageLimit: voucher.usageLimit || 100,
      });
    } else {
      // Reset về giá trị mặc định khi không có voucher (tạo mới)
      setFormData({
        code: "",
        title: "",
        description: "",
        condition: "",
        discountType: "fixed" as "fixed" | "percent",
        discountValue: 0,
        minOrderValue: 0,
        maxDiscount: 0,
        startDate: "",
        endDate: "",
        usageLimit: 100,
      });
    }
  }, [voucher]);

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
    newValue = value === "percent" ? "percent" : "fixed";
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
      // Lưu ý: Seller không được gửi global, categories, stores
      // Backend sẽ tự động gán voucher cho cửa hàng của seller
      const dataToSend: VoucherType = {
        code: formData.code,
        title: formData.title || "",
        description: formData.description,
        condition: formData.condition || "",
        discountType: formData.discountType,
        discountValue: formData.discountValue,
        minOrderValue: formData.minOrderValue,
        startDate: formData.startDate,
        endDate: formData.endDate,
        usageLimit: formData.usageLimit,
      };

      // Chỉ gửi maxDiscount khi discountType là "percent"
      if (formData.discountType === "percent") {
        dataToSend.maxDiscount = formData.maxDiscount;
      }

      if (voucher?._id) {
        // Cập nhật voucher
        await voucherApi.updateVoucher(voucher._id, dataToSend);
        setMessage("✅ Cập nhật voucher thành công!");
      } else {
        // Tạo voucher mới
        await voucherApi.createVoucher(dataToSend);
        setMessage("✅ Tạo voucher thành công!");
        // Reset form chỉ khi tạo mới thành công
        setFormData({
          code: "",
          title: "",
          description: "",
          condition: "",
          discountType: "fixed" as "fixed" | "percent",
          discountValue: 0,
          minOrderValue: 0,
          maxDiscount: 0,
          startDate: "",
          endDate: "",
          usageLimit: 100,
        });
      }

      onSuccess?.();
    } catch (err) {
      console.error(err);
      setMessage(voucher ? "❌ Lỗi khi cập nhật voucher" : "❌ Lỗi khi tạo voucher");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative w-full h-full sm:h-auto sm:max-h-[90vh] bg-white p-5 sm:p-6 md:p-8 overflow-y-auto">
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

      <h2 className="text-2xl font-bold mb-4 text-center">
        {voucher ? "Chỉnh sửa Voucher" : "Tạo Voucher Mới"}
      </h2>

      {/* Thông báo về phạm vi áp dụng voucher */}
      {storeName && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-2">
            <Store className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">Voucher sẽ chỉ áp dụng cho cửa hàng của bạn</p>
              <p className="text-blue-700">
                <span className="font-medium">Cửa hàng:</span> {storeName}
              </p>
              <p className="text-blue-600 text-xs mt-1">
                Số tiền giảm giá sẽ được trừ từ doanh thu của cửa hàng bạn.
              </p>
            </div>
          </div>
        </div>
      )}

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

        {/* Hiển thị trường dựa trên loại giảm giá */}
        {formData.discountType === "fixed" ? (
          <div>
            <label className="block font-semibold mb-1">Giá trị giảm (₫)</label>
            <input
              type="number"
              name="discountValue"
              value={formData.discountValue}
              onChange={handleChange}
              min="0"
              required
              className="w-full border rounded-lg p-2"
              placeholder="VD: 50000"
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold mb-1">Giảm theo %</label>
              <input
                type="number"
                name="discountValue"
                value={formData.discountValue}
                onChange={handleChange}
                min="0"
                max="100"
                required
                className="w-full border rounded-lg p-2"
                placeholder="VD: 10"
              />
            </div>
            <div>
              <label className="block font-semibold mb-1">Giảm tối đa (₫)</label>
              <input
                type="number"
                name="maxDiscount"
                value={formData.maxDiscount}
                onChange={handleChange}
                min="0"
                required
                className="w-full border rounded-lg p-2"
                placeholder="VD: 100000"
              />
            </div>
          </div>
        )}

        <div>
          <label className="block font-semibold mb-1">Đơn hàng tối thiểu (₫)</label>
          <input
            type="number"
            name="minOrderValue"
            value={formData.minOrderValue}
            onChange={handleChange}
            min="0"
            className="w-full border rounded-lg p-2"
            placeholder="VD: 100000"
          />
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
          {loading ? (voucher ? "Đang cập nhật..." : "Đang tạo...") : (voucher ? "Cập nhật voucher" : "Tạo voucher")}
        </button>
      </form>
    </div>
  );
};

export default VoucherForm;
