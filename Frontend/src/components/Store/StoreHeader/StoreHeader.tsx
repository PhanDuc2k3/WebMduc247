import React, { useEffect, useState } from "react";

interface Store {
  name: string;
  description: string;
  storeAddress: string;
  logoUrl: string;
  bannerUrl?: string;
  contactPhone?: string;
  contactEmail?: string;
  category: string;
  customCategory?: string;
  rating?: number;
  products?: number;
  followers?: number;
  responseRate?: number;
  responseTime?: string;
  joinDate?: string;
}

const StoreInfo: React.FC<{ storeId: string }> = ({ storeId }) => {
  const [store, setStore] = useState<Store | null>(null);

  // ✅ Call API
  useEffect(() => {
    const fetchStore = async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/stores/${storeId}`);
        const data = await res.json();
        console.log("Store Info nhận:", data);
        setStore(data.store); // nhớ backend trả { store: {...} }
      } catch (error) {
        console.error("Lỗi fetch store:", error);
      }
    };
    fetchStore();
  }, [storeId]);

  if (!store) return <p>Đang tải thông tin cửa hàng...</p>;

  return (
    <div className="w-full relative">
      {/* Banner full width */}
      {store.bannerUrl && (
        <div className="w-screen relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] h-48 md:h-64 overflow-hidden">
          <img
            src={store.bannerUrl}
            alt="Store Banner"
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Container chính đè lên banner */}
      <div className="max-w-6xl mx-auto relative -mt-12">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-start">
            {/* Trái: logo + thông tin */}
            <div className="flex gap-4">
              <img
                src={store.logoUrl}
                alt={store.name}
                className="w-20 h-20 rounded-full border-4 border-white shadow-lg object-cover"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold">{store.name}</h2>
                  <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded">
                    Mall
                  </span>
                  <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                    Chính hãng
                  </span>
                </div>
                <p className="text-sm text-gray-600">{store.description}</p>
                <p className="text-sm text-gray-500 mt-1">
                  📍 {store.storeAddress}
                </p>
              </div>
            </div>

            {/* Phải: button */}
            <div className="flex gap-2">
              <button className="bg-blue-500 text-white px-3 py-1.5 rounded hover:bg-blue-600 text-sm">
                Chat ngay
              </button>
              <button className="border px-3 py-1.5 rounded hover:bg-gray-100 text-sm">
                Theo dõi
              </button>
            </div>
          </div>

          {/* Stats hàng ngang */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-4 text-sm text-gray-700 mt-6 text-center">
            <div>
              ⭐ {(store.rating ?? 0).toFixed(1)}
              <p className="text-gray-500">Đánh giá</p>
            </div>
            <div>
              {store.products ?? 0}
              <p className="text-gray-500">Sản phẩm</p>
            </div>
            <div>
              {(store.followers ?? 0).toLocaleString()}
              <p className="text-gray-500">Người theo dõi</p>
            </div>
            <div>
              {store.responseRate ?? 0}%
              <p className="text-gray-500">Tỉ lệ phản hồi</p>
            </div>
            <div>
              {store.responseTime ?? "—"}
              <p className="text-gray-500">Phản hồi</p>
            </div>
            <div>
              {store.joinDate ?? "—"}
              <p className="text-gray-500">Tham gia</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoreInfo;
