import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { TrendingUp, ChevronRight, Star, ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import storeApi from "../../../api/storeApi";
import type { StoreType } from "../../../types/store";
import { useChat } from "../../../context/chatContext";

interface StoreForCard extends StoreType {
  isOnline?: boolean;
}

const BestSellingStores: React.FC = () => {
  const [stores, setStores] = useState<StoreForCard[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { onlineStores } = useChat();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchStores = async () => {
      try {
        const { data } = await storeApi.getAllActiveStores();
        const allStores = data.stores || [];
        const sortedStores = allStores
          .sort((a: any, b: any) => (b.rating || 0) - (a.rating || 0))
          .slice(0, 8)
          .map((s: any) => ({
            ...s,
            rating: s.rating ?? 0,
            products: s.products ?? 0,
            followers: s.followers ?? 0,
            isOnline: onlineStores.includes(s._id),
          }));
        setStores(sortedStores);
      } catch (err) {
        console.error("Lỗi khi fetch stores:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStores();
  }, [onlineStores]);

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -320, behavior: "smooth" });
    }
  };

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 320, behavior: "smooth" });
    }
  };

  if (loading) {
    return (
      <section className="mt-3 sm:mt-6 lg:mt-8">
        <div className="bg-white rounded-lg sm:rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 p-3 sm:p-4 sm:p-5 md:p-6 overflow-hidden">
          <div className="flex gap-2 sm:gap-3 overflow-hidden">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex-shrink-0 w-[220px] xs:w-[240px] sm:w-[280px] bg-gray-100 rounded-lg sm:rounded-xl p-3 sm:p-4 animate-pulse">
                <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                  <div className="w-10 h-10 xs:w-11 xs:h-11 sm:w-12 sm:h-12 bg-gray-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="bg-gray-200 h-3 sm:h-4 rounded w-3/4 mb-1.5 sm:mb-2"></div>
                    <div className="bg-gray-200 h-3 sm:h-4 rounded w-1/2"></div>
                  </div>
                </div>
                <div className="bg-gray-200 h-20 sm:h-24 rounded-lg"></div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (stores.length === 0) {
    return null;
  }

  return (
    <section className="mt-3 sm:mt-6 lg:mt-8">
      <div className="bg-white rounded-lg sm:rounded-xl sm:rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-2 sm:px-3 sm:px-5 md:px-6 py-2.5 sm:py-3 sm:py-4">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <TrendingUp className="w-4 h-4 xs:w-5 xs:h-5 sm:w-6 sm:h-6 text-green-500" />
            <h3 className="text-sm xs:text-base sm:text-lg md:text-xl font-bold text-gray-900">
              Best Selling Store
            </h3>
          </div>
          <div className="flex items-center gap-1 sm:gap-2">
            <Link
              to="/store"
              className="flex items-center gap-0.5 sm:gap-1 text-gray-600 font-semibold hover:text-gray-700 transition-colors text-[10px] xs:text-xs sm:text-sm"
            >
              Xem tất cả <ChevronRight className="w-3 h-3 xs:w-3.5 xs:h-3.5 sm:w-4 sm:h-4" />
            </Link>
            <button
              onClick={scrollLeft}
              className="w-6 h-6 xs:w-7 xs:h-7 sm:w-8 sm:h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors flex-shrink-0"
              aria-label="Cuộn sang trái"
            >
              <ChevronLeft className="w-3.5 h-3.5 xs:w-4 xs:h-4 text-gray-600" />
            </button>
            <button
              onClick={scrollRight}
              className="w-6 h-6 xs:w-7 xs:h-7 sm:w-8 sm:h-8 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center transition-colors flex-shrink-0"
              aria-label="Cuộn sang phải"
            >
              <ChevronRight className="w-3.5 h-3.5 xs:w-4 xs:h-4 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Stores Horizontal Scroll */}
        <div
          ref={scrollRef}
          className="flex gap-2 sm:gap-3 px-2 sm:px-3 sm:px-5 md:px-6 pb-3 sm:pb-4 sm:pb-5 overflow-x-auto no-scrollbar scroll-smooth"
        >
          {stores.map((store) => (
            <div
              key={store._id}
              onClick={() => navigate(`/store/${store._id}`)}
              className="flex-shrink-0 w-[200px] xs:w-[220px] sm:w-[240px] sm:w-[280px] bg-gradient-to-br from-gray-50 to-white border border-gray-100 rounded-lg sm:rounded-xl p-2.5 sm:p-3 sm:p-4 cursor-pointer hover:shadow-lg hover:border-gray-300 transition-all duration-300"
            >
              {/* Store Header */}
              <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                <div className="relative flex-shrink-0">
                  {store.logoUrl ? (
                    <img
                      src={store.logoUrl}
                      alt={store.name}
                      className="w-9 h-9 xs:w-10 xs:h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl object-cover shadow-md"
                    />
                  ) : (
                    <div className="w-9 h-9 xs:w-10 xs:h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-gray-500 to-gray-700 rounded-lg sm:rounded-xl flex items-center justify-center shadow-md">
                      <span className="text-white font-bold text-sm xs:text-base sm:text-lg">
                        {store.name?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  {store.isOnline && (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 xs:w-3.5 xs:h-3.5 sm:w-4 sm:h-4 bg-green-500 border-2 border-white rounded-full"></span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-gray-900 text-[11px] xs:text-xs sm:text-sm truncate">
                    {store.name}
                  </h4>
                  <div className="flex items-center gap-0.5 text-[10px] xs:text-xs text-gray-500">
                    <Star className="w-2.5 h-2.5 xs:w-3 xs:h-3 text-yellow-400 fill-yellow-400" />
                    <span className="font-semibold">{store.rating.toFixed(1)}</span>
                    <span>({store.followers || 0})</span>
                  </div>
                </div>
              </div>

              {/* Store Stats */}
              <div className="flex gap-1.5 sm:gap-2">
                <div className="flex-1 bg-gray-100 rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 sm:py-2 text-center">
                  <p className="text-[9px] xs:text-[10px] sm:text-xs text-gray-500">Sản phẩm</p>
                  <p className="font-bold text-gray-600 text-[10px] xs:text-xs sm:text-sm">
                    {store.products || 0}
                  </p>
                </div>
                <div className="flex-1 bg-green-50 rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 sm:py-2 text-center">
                  <p className="text-[9px] xs:text-[10px] sm:text-xs text-gray-500">Người theo dõi</p>
                  <p className="font-bold text-green-600 text-[10px] xs:text-xs sm:text-sm">
                    {store.followers || 0}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BestSellingStores;
