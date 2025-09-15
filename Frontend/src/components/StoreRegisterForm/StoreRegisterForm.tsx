import React, { useRef } from "react";

const StoreRegisterForm: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
  const logoRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);

  return (
    <div className="bg-white rounded-2xl shadow-lg max-w-xl mx-auto p-8">
      <div className="flex flex-col items-center mb-6">
        <div className="bg-gradient-to-br from-blue-400 to-purple-500 rounded-full w-16 h-16 flex items-center justify-center mb-2">
          <svg width="32" height="32" fill="none" viewBox="0 0 24 24">
            <rect x="4" y="7" width="16" height="10" rx="2" stroke="#fff" strokeWidth="2" />
            <path d="M2 7l10-5 10 5" stroke="#fff" strokeWidth="2" />
          </svg>
        </div>
        <h2 className="font-bold text-xl mb-1">Đăng ký mở cửa hàng</h2>
        <p className="text-gray-500 text-center">
          Điền thông tin để tạo cửa hàng của bạn trên ShopMduc247
        </p>
      </div>
      <form>
        <div className="grid grid-cols-2 gap-6 mb-4">
          <div>
            <label className="font-medium text-sm mb-1 block">
              Tên cửa hàng <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full border rounded-lg px-3 py-2 bg-gray-50"
              placeholder="VD: Thời trang ABC Store"
              required
            />
          </div>
          <div>
            <label className="font-medium text-sm mb-1 block">
              Danh mục kinh doanh <span className="text-red-500">*</span>
            </label>
            <select className="w-full border rounded-lg px-3 py-2 bg-gray-50" required>
              <option value="">Chọn danh mục chính</option>
              <option value="fashion">Thời trang</option>
              <option value="electronics">Điện tử</option>
              <option value="beauty">Làm đẹp</option>
              <option value="home">Nhà cửa</option>
              {/* ...thêm danh mục khác nếu cần */}
            </select>
          </div>
        </div>
        <div className="mb-4">
          <label className="font-medium text-sm mb-1 block">
            Mô tả cửa hàng <span className="text-red-500">*</span>
          </label>
          <textarea
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
            className="w-full border rounded-lg px-3 py-2 bg-gray-50"
            placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố"
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-6 mb-4">
          <div>
            <label className="font-medium text-sm mb-1 block">Số điện thoại liên hệ</label>
            <input
              type="text"
              className="w-full border rounded-lg px-3 py-2 bg-gray-50"
              placeholder="0987654321"
              required
            />
          </div>
          <div>
            <label className="font-medium text-sm mb-1 block">Email liên hệ</label>
            <input
              type="email"
              className="w-full border rounded-lg px-3 py-2 bg-gray-50"
              placeholder="contact@store.com"
              required
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-6 mb-4">
          <div className="border rounded-lg p-4 flex flex-col items-center">
            <label className="font-medium text-sm mb-2 block">Logo cửa hàng</label>
            <div className="mb-2 text-gray-400 text-xs">Logo vuông (khuyến nghị)</div>
            <button
              type="button"
              className="bg-gray-100 px-4 py-2 rounded-lg font-medium text-gray-700 hover:bg-gray-200"
              onClick={() => logoRef.current?.click()}
            >
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" className="inline mr-2">
                <path d="M12 16v-4m0 0V8m0 4h4m-4 0H8" stroke="#1976d2" strokeWidth="2" strokeLinecap="round" />
                <rect x="4" y="4" width="16" height="16" rx="4" stroke="#1976d2" strokeWidth="2" />
              </svg>
              Chọn ảnh
            </button>
            <input type="file" ref={logoRef} className="hidden" accept="image/*" />
          </div>
          <div className="border rounded-lg p-4 flex flex-col items-center">
            <label className="font-medium text-sm mb-2 block">Ảnh bìa cửa hàng</label>
            <div className="mb-2 text-gray-400 text-xs">Tỷ lệ 16:9 (khuyến nghị)</div>
            <button
              type="button"
              className="bg-gray-100 px-4 py-2 rounded-lg font-medium text-gray-700 hover:bg-gray-200"
              onClick={() => bannerRef.current?.click()}
            >
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" className="inline mr-2">
                <path d="M12 16v-4m0 0V8m0 4h4m-4 0H8" stroke="#1976d2" strokeWidth="2" strokeLinecap="round" />
                <rect x="2" y="6" width="20" height="12" rx="4" stroke="#1976d2" strokeWidth="2" />
              </svg>
              Chọn ảnh
            </button>
            <input type="file" ref={bannerRef} className="hidden" accept="image/*" />
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-gray-700 mb-6">
          <div className="font-semibold mb-2">Lưu ý quan trọng:</div>
          <ul className="list-disc ml-5 space-y-1">
            <li>Thông tin cửa hàng sẽ được hiển thị công khai với khách hàng</li>
            <li>Sau khi đăng ký, bạn có thể chỉnh sửa thông tin trong phần quản lý cửa hàng</li>
            <li>ShopMduc247 sẽ xem xét và phê duyệt cửa hàng trong vòng 24h</li>
          </ul>
        </div>
        <div className="flex gap-4">
          <button
            type="submit"
            className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold py-3 rounded-lg hover:opacity-90 transition"
          >
            <span className="inline-block align-middle mr-2">+</span> Tạo cửa hàng
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