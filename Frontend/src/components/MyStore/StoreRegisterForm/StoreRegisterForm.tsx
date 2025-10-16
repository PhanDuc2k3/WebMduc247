import React, { useRef, useState } from "react";
import userApi from "../../../api/userApi";

interface StoreRegisterFormProps {
  onClose?: () => void;
  onSuccess?: () => void;
}

const StoreRegisterForm: React.FC<StoreRegisterFormProps> = ({ onClose, onSuccess }) => {
  const logoRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: "",
    category: "",
    description: "",
    address: "",
    contactPhone: "",
    contactEmail: "",
  });

  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: "logo" | "banner") => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      if (type === "logo") setLogoPreview(url);
      if (type === "banner") setBannerPreview(url);
    }
  };

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();

  try {
    const form = new FormData();

    // ✅ Các field text — đúng key theo backend
    form.append("name", formData.name);
    form.append("category", formData.category);
    form.append("description", formData.description);
    form.append("storeAddress", formData.address);
    form.append("contactPhone", formData.contactPhone);
    form.append("contactEmail", formData.contactEmail);
    
    // ✅ Các file upload — đúng key
    if (logoRef.current?.files?.[0]) {
      form.append("logo", logoRef.current.files[0]); // ✅ đổi lại từ logoUrl → logo
    }
    if (bannerRef.current?.files?.[0]) {
      form.append("banner", bannerRef.current.files[0]); // ✅ đổi lại từ bannerUrl → banner
    } 
    
    // ✅ Gọi API đúng hàm requestSeller
    const res = await userApi.requestSeller(
      {
        name: formData.name,
        category: formData.category,
        description: formData.description,
        storeAddress: formData.address,
        contactPhone: formData.contactPhone,
        contactEmail: formData.contactEmail,
      },
      {
        logo: logoRef.current?.files?.[0],
        banner: bannerRef.current?.files?.[0],
      }
    );

    alert(res.data.message || "Đăng ký cửa hàng thành công!");
    onSuccess?.();
    onClose?.();
  } catch (error: any) {
    console.error("❌ Lỗi khi tạo cửa hàng:", error);
    alert(error?.response?.data?.message || "Có lỗi xảy ra, vui lòng thử lại!");
  }
};


  return (
    <div className="bg-white rounded-2xl shadow-lg max-w-xl mx-auto p-8">
      <div className="flex flex-col items-center mb-6">
        <div className="bg-gradient-to-br from-blue-400 to-purple-500 rounded-full w-16 h-16 flex items-center justify-center mb-2">
          <svg width="32" height="32" fill="none" viewBox="0 0 24 24">
            <rect
              x="4"
              y="7"
              width="16"
              height="10"
              rx="2"
              stroke="#fff"
              strokeWidth="2"
            />
            <path d="M2 7l10-5 10 5" stroke="#fff" strokeWidth="2" />
          </svg>
        </div>
        <h2 className="font-bold text-xl mb-1">Đăng ký mở cửa hàng</h2>
        <p className="text-gray-500 text-center">
          Điền thông tin để tạo cửa hàng của bạn trên ShopMduc247
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-2 gap-6 mb-4">
          <div>
            <label className="font-medium text-sm mb-1 block">
              Tên cửa hàng <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2 bg-gray-50"
              placeholder="VD: Thời trang ABC Store"
              required
            />
          </div>

          <div>
            <label className="font-medium text-sm mb-1 block">
              Danh mục kinh doanh <span className="text-red-500">*</span>
            </label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2 bg-gray-50"
              required
            >
              <option value="">Chọn danh mục chính</option>
              <option value="fashion">Thời trang</option>
              <option value="electronics">Điện tử</option>
              <option value="books">Sách</option>
              <option value="home">Nhà cửa</option>
              <option value="other">Khác</option>
            </select>
          </div>
        </div>

        <div className="mb-4">
          <label className="font-medium text-sm mb-1 block">
            Mô tả cửa hàng <span className="text-red-500">*</span>
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="w-full border rounded-lg px-3 py-2 bg-gray-50"
            rows={2}
            placeholder="Mô tả về sản phẩm, dịch vụ và cam kết của cửa hàng..."
            required
          />
        </div>

        <div className="mb-4">
          <label className="font-medium text-sm mb-1 block">
            Địa chỉ cửa hàng <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="address"
            value={formData.address}
            onChange={handleChange}
            className="w-full border rounded-lg px-3 py-2 bg-gray-50"
            placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-6 mb-4">
          <div>
            <label className="font-medium text-sm mb-1 block">
              Số điện thoại liên hệ
            </label>
            <input
              type="text"
              name="contactPhone"
              value={formData.contactPhone}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2 bg-gray-50"
              required
            />
          </div>

          <div>
            <label className="font-medium text-sm mb-1 block">
              Email liên hệ
            </label>
            <input
              type="email"
              name="contactEmail"
              value={formData.contactEmail}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2 bg-gray-50"
              required
            />
          </div>
        </div>

        {/* Upload + Preview */}
        <div className="grid grid-cols-2 gap-6 mb-4">
          <div className="border rounded-lg p-4 flex flex-col items-center">
            <label className="font-medium text-sm mb-2 block">
              Logo cửa hàng
            </label>
            {logoPreview && (
              <img
                src={logoPreview}
                alt="Logo Preview"
                className="w-24 h-24 object-cover rounded mb-2 border"
              />
            )}
            <div className="mb-2 text-gray-400 text-xs">
              Logo vuông (khuyến nghị)
            </div>
            <button
              type="button"
              className="bg-gray-100 px-4 py-2 rounded-lg font-medium text-gray-700 hover:bg-gray-200"
              onClick={() => logoRef.current?.click()}
            >
              Chọn ảnh
            </button>
            <input
              type="file"
              ref={logoRef}
              className="hidden"
              accept="image/*"
              onChange={(e) => handleFileChange(e, "logo")}
            />
          </div>

          <div className="border rounded-lg p-4 flex flex-col items-center">
            <label className="font-medium text-sm mb-2 block">
              Ảnh bìa cửa hàng
            </label>
            {bannerPreview && (
              <img
                src={bannerPreview}
                alt="Banner Preview"
                className="w-40 h-20 object-cover rounded mb-2 border"
              />
            )}
            <div className="mb-2 text-gray-400 text-xs">
              Tỷ lệ 16:9 (khuyến nghị)
            </div>
            <button
              type="button"
              className="bg-gray-100 px-4 py-2 rounded-lg font-medium text-gray-700 hover:bg-gray-200"
              onClick={() => bannerRef.current?.click()}
            >
              Chọn ảnh
            </button>
            <input
              type="file"
              ref={bannerRef}
              className="hidden"
              accept="image/*"
              onChange={(e) => handleFileChange(e, "banner")}
            />
          </div>
        </div>

        {/* Ghi chú */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-gray-700 mb-6">
          <div className="font-semibold mb-2">Lưu ý quan trọng:</div>
          <ul className="list-disc ml-5 space-y-1">
            <li>Thông tin cửa hàng sẽ được hiển thị công khai với khách hàng</li>
            <li>
              Sau khi đăng ký, bạn có thể chỉnh sửa thông tin trong phần quản lý
              cửa hàng
            </li>
            <li>
              ShopMduc247 sẽ xem xét và phê duyệt cửa hàng trong vòng 24h
            </li>
          </ul>
        </div>

        {/* Nút submit */}
        <div className="flex gap-4">
          <button
            type="submit"
            className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold py-3 rounded-lg hover:opacity-90 transition"
          >
            <span className="inline-block align-middle mr-2">+</span> Tạo cửa
            hàng
          </button>
          <button
            type="button"
            className="flex-1 bg-gray-100 text-gray-700 font-semibold py-3 rounded-lg hover:bg-gray-200 transition"
            onClick={onClose}
          >
            Hủy
          </button>
        </div>
      </form>
    </div>
  );
};

export default StoreRegisterForm;
