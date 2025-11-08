import React, { useRef } from "react";
import type { StoreType } from "../../../types/store";

interface Props {
  store: StoreType;
  setStore: (store: StoreType) => void;
  logoFile: File | null;
  setLogoFile: (file: File | null) => void;
  bannerFile: File | null;
  setBannerFile: (file: File | null) => void;
  handleStoreUpdate: () => void;
}

const StoreInfo: React.FC<Props> = ({
  store,
  setStore,
  logoFile,
  setLogoFile,
  bannerFile,
  setBannerFile,
  handleStoreUpdate,
}) => {
  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg border border-gray-200 p-4 sm:p-6 lg:p-8 animate-fade-in-up">
      <div className="mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-1">Thông tin cửa hàng</h2>
        <p className="text-gray-600 text-xs sm:text-sm">Cập nhật thông tin và hình ảnh cửa hàng của bạn</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 lg:gap-8">
        {/* Left: Images */}
        <div className="flex flex-col items-center gap-4 sm:gap-6 w-full lg:w-1/3">
          <div className="w-full">
            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">Banner cửa hàng</label>
            <div
              className="w-full h-32 sm:h-40 lg:h-48 rounded-lg sm:rounded-xl overflow-hidden cursor-pointer border-2 border-dashed border-gray-300 hover:border-blue-500 active:border-blue-600 transition-all duration-300 group relative touch-manipulation"
              onClick={() => bannerInputRef.current?.click()}
            >
              <img
                src={bannerFile ? URL.createObjectURL(bannerFile) : store.bannerUrl || '/placeholder-banner.jpg'}
                alt="Banner"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-black/0 group-active:bg-black/20 transition-all duration-300 flex items-center justify-center">
                <span className="text-white opacity-0 group-active:opacity-100 text-xs sm:text-sm font-medium px-2 text-center">Chạm để thay đổi</span>
              </div>
            </div>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={bannerInputRef}
              onChange={(e) => e.target.files?.[0] && setBannerFile(e.target.files[0])}
            />
          </div>

          <div className="w-full flex flex-col items-center">
            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">Logo cửa hàng</label>
            <div
              className="w-24 h-24 sm:w-32 sm:h-32 rounded-full overflow-hidden cursor-pointer border-4 border-gray-200 hover:border-blue-500 active:border-blue-600 transition-all duration-300 shadow-lg group relative touch-manipulation"
              onClick={() => logoInputRef.current?.click()}
            >
              <img
                src={logoFile ? URL.createObjectURL(logoFile) : store.logoUrl || '/placeholder-logo.jpg'}
                alt="Logo"
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-black/0 group-active:bg-black/30 transition-all duration-300 flex items-center justify-center">
                <span className="text-white opacity-0 group-active:opacity-100 text-xs font-medium text-center px-2">Thay đổi</span>
              </div>
            </div>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={logoInputRef}
              onChange={(e) => e.target.files?.[0] && setLogoFile(e.target.files[0])}
            />
          </div>
        </div>

        {/* Right: Form */}
        <div className="flex-1 flex flex-col gap-4 sm:gap-5">
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
              Tên cửa hàng <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 font-medium text-gray-900"
              placeholder="Nhập tên cửa hàng"
              value={store.name}
              onChange={(e) => setStore({ ...store, name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">
              Mô tả cửa hàng <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={4}
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 font-medium text-gray-900 resize-none"
              placeholder="Nhập mô tả về cửa hàng của bạn"
              value={store.description}
              onChange={(e) => setStore({ ...store, description: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2">Địa chỉ cửa hàng</label>
            <input
              type="text"
              className="w-full px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base border-2 border-gray-300 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 font-medium text-gray-900"
              placeholder="Nhập địa chỉ cửa hàng"
              value={store.storeAddress || ""}
              onChange={(e) => setStore({ ...store, storeAddress: e.target.value })}
            />
          </div>

          <div className="pt-1 sm:pt-2">
            <button
              className="w-full sm:w-auto px-5 sm:px-6 py-2.5 sm:py-3 text-sm sm:text-base bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg sm:rounded-xl font-bold shadow-lg hover:shadow-xl active:scale-95 sm:hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2 touch-manipulation"
              onClick={handleStoreUpdate}
            >
              <span>Cập nhật cửa hàng</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoreInfo;
