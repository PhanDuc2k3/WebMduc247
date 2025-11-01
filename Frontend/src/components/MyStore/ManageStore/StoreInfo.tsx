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
    <div className="bg-white p-4 rounded shadow flex gap-6">
      <div className="flex flex-col items-center gap-4 w-1/3">
        <label className="font-semibold mb-1">Banner</label>
        <div
          className="w-full h-32 rounded overflow-hidden cursor-pointer mb-2"
          onClick={() => bannerInputRef.current?.click()}
        >
          <img
            src={bannerFile ? URL.createObjectURL(bannerFile) : store.bannerUrl}
            alt="Banner"
            className="w-full h-full object-cover"
          />
        </div>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          ref={bannerInputRef}
          onChange={(e) => e.target.files?.[0] && setBannerFile(e.target.files[0])}
        />

        <label className="font-semibold mb-1">Logo cửa hàng</label>
        <div
          className="w-24 h-24 rounded-full overflow-hidden cursor-pointer"
          onClick={() => logoInputRef.current?.click()}
        >
          <img
            src={logoFile ? URL.createObjectURL(logoFile) : store.logoUrl}
            alt="Logo"
            className="w-full h-full object-cover"
          />
        </div>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          ref={logoInputRef}
          onChange={(e) => e.target.files?.[0] && setLogoFile(e.target.files[0])}
        />
      </div>

      <div className="flex-1 flex flex-col gap-3">
        <div>
          <label className="font-semibold">Tên cửa hàng</label>
          <input
            type="text"
            className="border p-2 w-full"
            value={store.name}
            onChange={(e) => setStore({ ...store, name: e.target.value })}
          />
        </div>

        <div>
          <label className="font-semibold">Mô tả</label>
          <textarea
            className="border p-2 w-full"
            value={store.description}
            onChange={(e) => setStore({ ...store, description: e.target.value })}
          />
        </div>

        <div>
          <label className="font-semibold">Địa chỉ</label>
          <input
            type="text"
            className="border p-2 w-full"
            value={store.storeAddress || ""}
            onChange={(e) => setStore({ ...store, storeAddress: e.target.value })}
          />
        </div>

        <button
          className="px-4 py-2 bg-blue-500 text-white rounded self-start mt-2"
          onClick={handleStoreUpdate}
        >
          Cập nhật cửa hàng
        </button>
      </div>
    </div>
  );
};

export default StoreInfo;
