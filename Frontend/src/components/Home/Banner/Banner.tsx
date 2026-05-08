import React, { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, ShoppingBag } from "lucide-react";

const demoBanners = [
  {
    _id: "1",
    title: "#Big Fashion Sale",
    subtitle: "Redefine Your Everyday Style",
    badge: "Limited Time Offer!",
    discount: "50%",
    ctaText: "Shop Now →",
    ctaLink: "/products",
    images: [
      "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=400&h=400&fit=crop",
      "https://images.unsplash.com/photo-1445205170230-053b83016050?w=300&h=300&fit=crop",
      "https://images.unsplash.com/photo-1483985988355-763728e1935b?w=300&h=300&fit=crop",
    ],
  },
  {
    _id: "2",
    title: "New Season Collection",
    subtitle: "Discover the Latest Trends",
    badge: "Just Dropped!",
    discount: "30%",
    ctaText: "Explore Now →",
    ctaLink: "/products",
    images: [
      "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?w=400&h=400&fit=crop",
      "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=300&h=300&fit=crop",
      "https://images.unsplash.com/photo-1485462537746-965f33f7f6a7?w=300&h=300&fit=crop",
    ],
  },
  {
    _id: "3",
    title: "Summer Vibes",
    subtitle: "Light & Breezy Styles for Days",
    badge: "Summer Sale!",
    discount: "40%",
    ctaText: "Shop Summer →",
    ctaLink: "/products",
    images: [
      "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=400&h=400&fit=crop",
      "https://images.unsplash.com/photo-1516762689617-e1cffcef479d?w=300&h=300&fit=crop",
      "https://images.unsplash.com/photo-1503342217505-b0a15ec3261c?w=300&h=300&fit=crop",
    ],
  },
];

const BannerSlider: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Auto slide every 5 seconds
  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % demoBanners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? demoBanners.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % demoBanners.length);
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
    if (distance > 50) goToNext();
    if (distance < -50) goToPrevious();
  };

  const banner = demoBanners[currentIndex];

  return (
    <div className="mt-4 sm:mt-6 lg:mt-8 relative">
      <div
        ref={carouselRef}
        className="relative rounded-xl sm:rounded-2xl overflow-hidden w-full h-[180px] sm:h-[220px] md:h-[280px] lg:h-[380px] shadow-xl"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Background Gradient - Cool Gray */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-700 via-gray-600 to-gray-800"></div>

        {/* Decorative Circles */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2"></div>
        <div className="absolute top-1/2 left-1/4 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2"></div>

        {/* Content */}
        <div className="relative h-full flex flex-col lg:flex-row items-center justify-between px-6 sm:px-10 lg:px-16 py-6 sm:py-8">
          {/* Left - Text */}
          <div className="flex-1 text-white z-10 text-center lg:text-left">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm px-4 sm:px-5 py-2 rounded-full mb-3 sm:mb-4">
              <ShoppingBag size={14} className="sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm font-semibold tracking-wide">{banner.badge}</span>
            </div>

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-black mb-1 sm:mb-2 leading-tight">
              {banner.title}
            </h1>
            <p className="text-white/80 text-xs sm:text-sm md:text-base mb-3 sm:mb-4 font-medium max-w-md mx-auto lg:mx-0">
              {banner.subtitle}
            </p>

            {/* Discount */}
            <div className="flex items-center justify-center lg:justify-start gap-1.5 sm:gap-2 mb-4 sm:mb-5">
              <span className="text-sm sm:text-xl md:text-2xl font-bold text-gray-200">Up to</span>
              <span className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black">{banner.discount}</span>
              <span className="text-sm sm:text-xl md:text-2xl font-bold text-gray-200">OFF!</span>
            </div>

            {/* CTA */}
            <Link
              to={banner.ctaLink}
              className="inline-block bg-gray-200 text-gray-800 font-bold px-5 sm:px-8 lg:px-10 py-2.5 sm:py-3 rounded-full hover:bg-white hover:shadow-2xl transition-all duration-300 shadow-xl transform hover:scale-105 text-xs sm:text-sm md:text-base"
            >
              {banner.ctaText}
            </Link>
          </div>

          {/* Right - Images */}
          <div className="hidden lg:flex flex-1 items-center justify-end z-10">
            <div className="relative w-[400px] h-[320px]">
              {/* Main large image */}
              <div className="absolute top-0 right-0 w-48 h-48 rounded-2xl overflow-hidden shadow-2xl transform rotate-3 hover:rotate-0 transition-transform duration-500">
                <img
                  src={banner.images[0]}
                  alt="Fashion"
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Second image */}
              <div className="absolute bottom-8 right-24 w-36 h-36 rounded-2xl overflow-hidden shadow-2xl transform -rotate-6 hover:rotate-0 transition-transform duration-500">
                <img
                  src={banner.images[1]}
                  alt="Fashion"
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Third image */}
              <div className="absolute bottom-0 left-0 w-32 h-32 rounded-2xl overflow-hidden shadow-2xl transform rotate-6 hover:rotate-0 transition-transform duration-500">
                <img
                  src={banner.images[2]}
                  alt="Fashion"
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Discount badge */}
              <div className="absolute top-12 left-0 bg-gray-200 rounded-full w-16 h-16 flex items-center justify-center shadow-xl">
                <span className="text-gray-800 font-black text-lg">{banner.discount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Arrows */}
        <button
          onClick={goToPrevious}
          className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 z-30 bg-gray-200/90 hover:bg-gray-200 text-gray-800 rounded-full p-2 sm:p-3 shadow-xl transition-all duration-300 hover:scale-110 active:scale-95"
          aria-label="Banner trước"
        >
          <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
        <button
          onClick={goToNext}
          className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 z-30 bg-gray-200/90 hover:bg-gray-200 text-gray-800 rounded-full p-2 sm:p-3 shadow-xl transition-all duration-300 hover:scale-110 active:scale-95"
          aria-label="Banner sau"
        >
          <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        {/* Dots */}
        <div className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-30 flex gap-2">
          {demoBanners.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-6 sm:w-10 h-2 rounded-full transition-all duration-300 ${
                index === currentIndex
                  ? "bg-gray-200 w-10 sm:w-12"
                  : "bg-white/40 hover:bg-white/60"
              }`}
              aria-label={`Đi tới banner ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default BannerSlider;
