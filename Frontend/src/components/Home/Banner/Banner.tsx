import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import bannerApi from "../../../api/bannerApi";
import type { Banner } from "../../../api/bannerApi";

const Banner: React.FC = () => {
  const [mainBanner, setMainBanner] = useState<Banner | null>(null);
  const [subBanners, setSubBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        // Lấy banner chính
        const mainRes = await bannerApi.getBannersByType("main");
        if (mainRes.data && mainRes.data.length > 0) {
          setMainBanner(mainRes.data[0]); // Lấy banner đầu tiên
        }

        // Lấy banner phụ (tối đa 2)
        const subRes = await bannerApi.getBannersByType("sub");
        if (subRes.data && subRes.data.length > 0) {
          setSubBanners(subRes.data.slice(0, 2));
        }
      } catch (err) {
        console.error("Lỗi khi fetch banner:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchBanners();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 lg:gap-8 mt-4 sm:mt-6 lg:mt-8">
        <div className="lg:flex-[2] h-[200px] sm:h-[250px] md:h-[300px] lg:h-[380px] bg-gray-200 animate-pulse rounded-xl sm:rounded-2xl"></div>
        <div className="lg:flex-1 flex flex-col gap-3 sm:gap-4 lg:gap-6 h-[380px]">
          <div className="flex-1 bg-gray-200 animate-pulse rounded-xl sm:rounded-2xl"></div>
          <div className="flex-1 bg-gray-200 animate-pulse rounded-xl sm:rounded-2xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 lg:gap-8 mt-4 sm:mt-6 lg:mt-8">
      {/* Banner chính */}
      {mainBanner && (
        <div className="lg:flex-[2] relative rounded-xl sm:rounded-2xl overflow-hidden w-full flex h-[200px] sm:h-[250px] md:h-[300px] lg:h-[380px] shadow-xl hover:shadow-2xl transition-all duration-500 group">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 via-blue-600/20 to-pink-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10"></div>
          <img
            src={mainBanner.imageUrl}
            alt={mainBanner.title}
            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent flex flex-col justify-end p-4 sm:p-5 md:p-6 lg:p-8 text-white transition-all duration-500 group-hover:from-black/70 group-hover:via-black/40 z-20">
            <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500 delay-100">
              <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-3xl xl:text-4xl font-bold mb-2 sm:mb-3 opacity-90 group-hover:opacity-100 transition-all duration-500 group-hover:mb-4">
                {mainBanner.title}
              </h2>
              {mainBanner.link && (
                <Link
                  to={mainBanner.link}
                  className="inline-block bg-white text-[#3a5ef7] px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5 md:py-3 rounded-lg sm:rounded-xl font-bold hover:bg-[#f0f4ff] transition-all duration-300 text-xs sm:text-sm lg:text-base shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transform group-hover:scale-110"
                >
                  Mua ngay →
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Banner phụ */}
      {subBanners.length > 0 && (
        <div className="lg:flex-1 flex flex-col gap-3 sm:gap-4 lg:gap-6 h-[380px]">
          {subBanners.map((banner, index) => (
            <div key={banner._id} className="flex-1 relative rounded-xl sm:rounded-2xl overflow-hidden w-full shadow-lg hover:shadow-xl transition-all duration-500 group">
              <div className={`absolute inset-0 ${
                index === 0 
                  ? "bg-gradient-to-br from-orange-500/30 to-red-500/30" 
                  : "bg-gradient-to-br from-blue-400/30 to-cyan-400/30"
              } opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10`}></div>
              <img
                src={banner.imageUrl}
                alt={banner.title}
                className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent flex flex-col justify-end p-3 sm:p-4 lg:p-5 text-white transition-all duration-500 group-hover:from-black/70 z-20">
                <div className="transform translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
                  <div className="text-base sm:text-lg lg:text-xl font-bold opacity-90 group-hover:opacity-100 transition-opacity duration-300">
                    {banner.title}
                  </div>
                  {banner.link && (
                    <Link
                      to={banner.link}
                      className={`inline-block bg-white ${
                        index === 0 ? "text-[#ff7e5f] hover:bg-[#fff5f2]" : "text-[#00c6fb] hover:bg-[#e6f7ff]"
                      } px-3 sm:px-4 py-1.5 sm:py-2 rounded-md sm:rounded-lg font-semibold transition-all duration-300 text-xs sm:text-sm lg:text-base shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transform mt-2`}
                    >
                      Xem ngay →
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Fallback nếu không có banner nào */}
      {!mainBanner && subBanners.length === 0 && (
        <div className="w-full text-center py-12 text-gray-500">
          <p>Chưa có banner nào được thiết lập</p>
        </div>
      )}
    </div>
  );
};

export default Banner;
