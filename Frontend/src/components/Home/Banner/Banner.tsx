import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import bannerApi from "../../../api/bannerApi";
import type { Banner } from "../../../api/bannerApi";

const Banner: React.FC = () => {
  const [mainBanners, setMainBanners] = useState<Banner[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        // Lấy tất cả banner chính
        const mainRes = await bannerApi.getBannersByType("main");
        if (mainRes.data && mainRes.data.length > 0) {
          setMainBanners(mainRes.data);
        }
      } catch (err) {
        console.error("Lỗi khi fetch banner:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchBanners();
  }, []);

  // Auto slide
  useEffect(() => {
    if (mainBanners.length <= 1) return;
    
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % mainBanners.length);
    }, 5000); // Đổi slide mỗi 5 giây

    return () => clearInterval(interval);
  }, [mainBanners.length]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? mainBanners.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % mainBanners.length);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      goToNext();
    }
    if (isRightSwipe) {
      goToPrevious();
    }
  };

  if (loading) {
    return (
      <div className="mt-4 sm:mt-6 lg:mt-8">
        <div className="h-[200px] sm:h-[250px] md:h-[300px] lg:h-[380px] bg-gray-200 animate-pulse rounded-xl sm:rounded-2xl"></div>
      </div>
    );
  }

  if (mainBanners.length === 0) {
    return (
      <div className="w-full text-center py-12 text-gray-500 mt-4 sm:mt-6 lg:mt-8">
        <p>Chưa có banner nào được thiết lập</p>
      </div>
    );
  }

  return (
    <div className="mt-4 sm:mt-6 lg:mt-8 relative">
      {/* Carousel Container */}
      <div 
        ref={carouselRef}
        className="relative rounded-xl sm:rounded-2xl overflow-hidden w-full h-[200px] sm:h-[250px] md:h-[300px] lg:h-[380px] shadow-xl"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Slides */}
        <div 
          className="flex transition-transform duration-500 ease-in-out h-full"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {mainBanners.map((banner) => (
            <div
              key={banner._id}
              className="min-w-full h-full relative flex-shrink-0 group"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600/20 via-blue-600/20 to-pink-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10"></div>
              <img
                src={banner.imageUrl}
                alt={banner.title}
                className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent flex flex-col justify-end p-4 sm:p-5 md:p-6 lg:p-8 text-white transition-all duration-500 group-hover:from-black/70 group-hover:via-black/40 z-20">
                <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500 delay-100">
                  <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-3xl xl:text-4xl font-bold mb-2 sm:mb-3 opacity-90 group-hover:opacity-100 transition-all duration-500 group-hover:mb-4">
                    {banner.title}
                  </h2>
                  {banner.link && (
                    <Link
                      to={banner.link}
                      className="inline-block bg-white text-[#3a5ef7] px-4 sm:px-6 lg:px-8 py-2 sm:py-2.5 md:py-3 rounded-lg sm:rounded-xl font-bold hover:bg-[#f0f4ff] transition-all duration-300 text-xs sm:text-sm lg:text-base shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transform group-hover:scale-110"
                    >
                      Mua ngay →
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Navigation Arrows */}
        {mainBanners.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-30 bg-white/80 hover:bg-white text-gray-800 rounded-full p-2 sm:p-3 shadow-lg transition-all duration-300 hover:scale-110 active:scale-95"
              aria-label="Banner trước"
            >
              <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
            </button>
            <button
              onClick={goToNext}
              className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-30 bg-white/80 hover:bg-white text-gray-800 rounded-full p-2 sm:p-3 shadow-lg transition-all duration-300 hover:scale-110 active:scale-95"
              aria-label="Banner sau"
            >
              <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
            </button>
          </>
        )}

        {/* Dots Indicator */}
        {mainBanners.length > 1 && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex gap-2">
            {mainBanners.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`transition-all duration-300 rounded-full ${
                  index === currentIndex
                    ? "w-8 h-2 sm:h-3 bg-white"
                    : "w-2 h-2 sm:h-3 bg-white/50 hover:bg-white/75"
                }`}
                aria-label={`Đi tới banner ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Banner;
