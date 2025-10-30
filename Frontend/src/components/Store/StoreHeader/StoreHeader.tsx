// components/Store/StoreInfo.tsx
import React from "react";
import type { StoreType } from "../../../types/store";
import { MapPin, Star } from "lucide-react";

interface StoreInfoProps {
  store: StoreType;
}

const StoreHeader: React.FC<StoreInfoProps> = ({ store }) => {
  if (!store) return <p>Không tìm thấy cửa hàng</p>;

  return (
    <div className="w-full relative">
      {/* Banner */}
      {store.bannerUrl && (
        <div className="w-screen relative left-1/2 -ml-[50vw] h-36 sm:h-48 md:h-64 overflow-hidden">
          <img
            src={store.bannerUrl}
            alt="Store Banner"
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Container */}
      <div className="max-w-6xl mx-auto relative -mt-8 sm:-mt-12 px-2 sm:px-4 md:px-6">
        <div className="bg-white rounded-lg shadow p-3 sm:p-6">
          {/* Header: Logo + Info + Buttons */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 md:gap-6">
            {/* Store info */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
              <img
                src={store.logoUrl}
                alt={store.name}
                className="w-20 h-20 rounded-full border-4 border-white shadow-lg object-cover flex-shrink-0"
              />
              <div className="flex flex-col justify-center">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h2 className="text-lg font-semibold">{store.name}</h2>
                  <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded">
                    Mall
                  </span>
                  <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                    Chính hãng
                  </span>
                </div>
                <p className="text-sm text-gray-600">{store.description}</p>
                <p className="text-sm text-gray-500 mt-1 flex items-center gap-1 truncate">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  {store.storeAddress}
                </p>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-2 flex-wrap mt-2 md:mt-0">
              <button className="bg-blue-500 text-white px-3 py-1.5 rounded hover:bg-blue-600 text-sm">
                Chat ngay
              </button>
              <button className="border px-3 py-1.5 rounded hover:bg-gray-100 text-sm">
                Theo dõi
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 sm:gap-4 mt-5 text-sm text-gray-700 text-center">
            <div className="flex flex-col items-center gap-1">
              <Star className="w-4 h-4 text-yellow-400" />
              {store.rating.toFixed(1)}
              <p className="text-gray-500 text-xs">Đánh giá</p>
            </div>
            <div className="flex flex-col items-center gap-1">
              {store.products}
              <p className="text-gray-500 text-xs">Sản phẩm</p>
            </div>
            <div className="flex flex-col items-center gap-1">
              {store.responseRate}%
              <p className="text-gray-500 text-xs">Tỉ lệ phản hồi</p>
            </div>
            <div className="flex flex-col items-center gap-1">
              {store.responseTime}
              <p className="text-gray-500 text-xs">Phản hồi</p>
            </div>
            <div className="flex flex-col items-center gap-1">
              {store.joinDate}
              <p className="text-gray-500 text-xs">Tham gia</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoreHeader;
