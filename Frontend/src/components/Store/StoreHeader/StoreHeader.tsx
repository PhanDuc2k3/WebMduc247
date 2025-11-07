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
    <div className="w-full relative animate-fade-in-up">
      {/* Banner */}
      {store.bannerUrl && (
        <div className="w-full h-32 sm:h-48 md:h-64 lg:h-80 overflow-hidden rounded-xl md:rounded-2xl shadow-2xl relative group">
          <img
            src={store.bannerUrl}
            alt="Store Banner"
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
        </div>
      )}

      {/* Container */}
      <div className="relative -mt-12 sm:-mt-16 md:-mt-20 animate-fade-in-up delay-200">
        <div className="bg-white rounded-xl md:rounded-2xl shadow-2xl border-2 border-gray-100 p-4 md:p-6 lg:p-8">
          {/* Header: Logo + Info + Buttons */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 md:gap-6">
            {/* Store info */}
            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 w-full lg:w-auto items-center sm:items-start">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full blur opacity-50 animate-pulse"></div>
                <img
                  src={store.logoUrl || "/default-store.png"}
                  alt={store.name}
                  className="relative w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full border-4 border-white shadow-2xl object-cover flex-shrink-0 transform hover:scale-110 transition-transform duration-300"
                />
                {store.isActive && (
                  <span className="absolute bottom-0 right-0 w-5 h-5 md:w-6 md:h-6 bg-green-500 border-2 md:border-4 border-white rounded-full animate-pulse shadow-lg"></span>
                )}
              </div>
              <div className="flex flex-col justify-center flex-1 min-w-0 text-center sm:text-left">
                <div className="flex flex-wrap items-center gap-1.5 md:gap-2 mb-1.5 md:mb-2 justify-center sm:justify-start">
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">
                    {store.name}
                  </h2>
                  <span className="text-[10px] md:text-xs bg-gradient-to-r from-blue-100 to-purple-100 text-blue-600 px-2 py-0.5 md:px-3 md:py-1 rounded-full font-bold shadow-sm">
                    🏪 Mall
                  </span>
                  <span className="text-[10px] md:text-xs bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 px-2 py-0.5 md:px-3 md:py-1 rounded-full font-bold shadow-sm">
                    ✓ Chính hãng
                  </span>
                </div>
                <p className="text-sm md:text-base text-gray-600 mb-1.5 md:mb-2 line-clamp-2">{store.description}</p>
                {store.storeAddress && (
                  <p className="text-xs md:text-sm text-gray-500 flex items-center gap-1.5 md:gap-2 justify-center sm:justify-start">
                    <MapPin className="w-3.5 h-3.5 md:w-4 md:h-4 text-gray-500 flex-shrink-0" />
                    <span className="truncate">{store.storeAddress}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-2 md:gap-3 flex-wrap w-full sm:w-auto justify-center sm:justify-end">
              <button className="px-4 py-2 md:px-6 md:py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg md:rounded-xl font-bold hover:from-blue-600 hover:to-purple-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 text-xs md:text-sm lg:text-base">
                💬 Chat ngay
              </button>
              <button className="px-4 py-2 md:px-6 md:py-3 border-2 border-gray-300 rounded-lg md:rounded-xl font-bold text-gray-700 hover:bg-gray-50 hover:border-blue-400 hover:text-blue-600 transition-all duration-300 shadow-sm hover:shadow-md transform hover:scale-105 text-xs md:text-sm lg:text-base">
                ⭐ Theo dõi
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-4 pt-6 md:pt-8 border-t border-gray-200">
            {/* Rating */}
            <div className="flex flex-col items-center gap-1 md:gap-2 p-2 md:p-4 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg md:rounded-xl border-2 border-yellow-200 hover:border-yellow-400 transition-all duration-300 transform hover:scale-105">
              <div className="flex items-center gap-1 justify-center">
                <Star className="w-4 h-4 md:w-5 md:h-5 text-yellow-500 fill-yellow-500" />
                <span className="text-lg md:text-xl font-bold text-gray-900">{store.rating?.toFixed(1) || "0.0"}</span>
              </div>
              <p className="text-gray-600 text-[10px] md:text-xs font-semibold">⭐ Đánh giá</p>
            </div>

            {/* Products */}
            <div className="flex flex-col items-center gap-1 md:gap-2 p-2 md:p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg md:rounded-xl border-2 border-blue-200 hover:border-blue-400 transition-all duration-300 transform hover:scale-105">
              <span className="text-xl md:text-2xl font-bold text-blue-600">{store.products || 0}</span>
              <p className="text-gray-600 text-[10px] md:text-xs font-semibold">📦 Sản phẩm</p>
            </div>

            {/* Reviews count */}
            <div className="flex flex-col items-center gap-1 md:gap-2 p-2 md:p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg md:rounded-xl border-2 border-purple-200 hover:border-purple-400 transition-all duration-300 transform hover:scale-105">
              <span className="text-xl md:text-2xl font-bold text-purple-600">{store.reviewsCount || 0}</span>
              <p className="text-gray-600 text-[10px] md:text-xs font-semibold">👥 Người đánh giá</p>
            </div>

            {/* Join date */}
            <div className="flex flex-col items-center gap-1 md:gap-2 p-2 md:p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg md:rounded-xl border-2 border-green-200 hover:border-green-400 transition-all duration-300 transform hover:scale-105">
              <span className="text-sm md:text-lg font-bold text-green-600">
                {store.joinDate ? new Date(store.joinDate).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" }) : "—"}
              </span>
              <p className="text-gray-600 text-[10px] md:text-xs font-semibold">📅 Ngày tạo</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoreHeader;
